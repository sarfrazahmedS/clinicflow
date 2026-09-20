import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { PageHeader } from "../components/ui";
import type { MedicalRecord, Paginated, Patient } from "../api/types";

export function RecordsPage() {
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const isDoctor = user?.role === "DOCTOR";

  const list = useQuery({
    queryKey: ["records", "list"],
    queryFn: () => api<Paginated<MedicalRecord>>("/records?pageSize=50"),
  });

  return (
    <div>
      <PageHeader
        title="Medical Records"
        subtitle={list.data ? `${list.data.total} visit${list.data.total === 1 ? "" : "s"} recorded` : undefined}
        action={
          isDoctor ? (
            <button
              onClick={() => setShowForm((v) => !v)}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              {showForm ? "Close" : "+ New record"}
            </button>
          ) : undefined
        }
      />

      {showForm && isDoctor && <NewRecordForm onDone={() => setShowForm(false)} />}

      <div className="space-y-3">
        {list.data?.items.map((r) => (
          <div key={r.id} className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-medium text-slate-800">
                  {r.patient ? `${r.patient.firstName} ${r.patient.lastName}` : "—"}
                  <span className="ml-2 font-mono text-xs text-slate-400">{r.patient?.mrn}</span>
                </div>
                <div className="text-xs text-slate-500">
                  {r.doctor?.name} · {new Date(r.visitDate).toLocaleDateString()}
                </div>
              </div>
              {r.vitals && (
                <div className="flex gap-3 text-xs text-slate-500">
                  {r.vitals.bp && <span>BP {r.vitals.bp}</span>}
                  {r.vitals.hr != null && <span>HR {r.vitals.hr}</span>}
                  {r.vitals.tempC != null && <span>{r.vitals.tempC}°C</span>}
                </div>
              )}
            </div>
            <div className="mt-3 grid gap-1 text-sm">
              {r.chiefComplaint && (
                <div>
                  <span className="text-slate-400">Complaint: </span>
                  <span className="text-slate-700">{r.chiefComplaint}</span>
                </div>
              )}
              {r.diagnosis && (
                <div>
                  <span className="text-slate-400">Diagnosis: </span>
                  <span className="font-medium text-slate-800">{r.diagnosis}</span>
                </div>
              )}
              {r.notes && <div className="text-slate-600">{r.notes}</div>}
            </div>
          </div>
        ))}
        {list.isLoading && (
          <div className="rounded-2xl bg-white p-8 text-center text-slate-400 shadow-sm">Loading…</div>
        )}
        {list.data && list.data.items.length === 0 && (
          <div className="rounded-2xl bg-white p-8 text-center text-slate-400 shadow-sm">
            No records yet
          </div>
        )}
      </div>
    </div>
  );
}

function NewRecordForm({ onDone }: { onDone: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ patientId: "", chiefComplaint: "", diagnosis: "", bp: "", hr: "", tempC: "", notes: "" });
  const [error, setError] = useState<string | null>(null);

  const patients = useQuery({
    queryKey: ["patients", "options"],
    queryFn: () => api<Paginated<Patient>>("/patients?pageSize=100"),
  });

  const create = useMutation({
    mutationFn: () => {
      const vitals: Record<string, string | number> = {};
      if (form.bp) vitals.bp = form.bp;
      if (form.hr) vitals.hr = Number(form.hr);
      if (form.tempC) vitals.tempC = Number(form.tempC);
      return api("/records", {
        method: "POST",
        body: JSON.stringify({
          patientId: form.patientId,
          chiefComplaint: form.chiefComplaint || undefined,
          diagnosis: form.diagnosis || undefined,
          vitals: Object.keys(vitals).length ? vitals : undefined,
          notes: form.notes || undefined,
        }),
      });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["records"] });
      onDone();
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Failed to create"),
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.patientId) return setError("Select a patient");
    create.mutate();
  };

  const field = "rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500";
  const set = (patch: Partial<typeof form>) => setForm({ ...form, ...patch });

  return (
    <form onSubmit={submit} className="mb-5 rounded-2xl bg-white p-5 shadow-sm">
      <div className="grid gap-3 sm:grid-cols-2">
        <select value={form.patientId} onChange={(e) => set({ patientId: e.target.value })} className={field}>
          <option value="">Select patient…</option>
          {patients.data?.items.map((p) => (
            <option key={p.id} value={p.id}>
              {p.firstName} {p.lastName} ({p.mrn})
            </option>
          ))}
        </select>
        <input placeholder="Chief complaint" value={form.chiefComplaint} onChange={(e) => set({ chiefComplaint: e.target.value })} className={field} />
        <input placeholder="Diagnosis" value={form.diagnosis} onChange={(e) => set({ diagnosis: e.target.value })} className={field} />
        <div className="grid grid-cols-3 gap-2">
          <input placeholder="BP" value={form.bp} onChange={(e) => set({ bp: e.target.value })} className={field} />
          <input placeholder="HR" value={form.hr} onChange={(e) => set({ hr: e.target.value.replace(/\D/g, "") })} className={field} />
          <input placeholder="°C" value={form.tempC} onChange={(e) => set({ tempC: e.target.value.replace(/[^\d.]/g, "") })} className={field} />
        </div>
      </div>
      <textarea placeholder="Clinical notes" value={form.notes} onChange={(e) => set({ notes: e.target.value })} rows={2} className={`${field} mt-3 w-full`} />
      {error && <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
      <div className="mt-3">
        <button disabled={create.isPending} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60">
          {create.isPending ? "Saving…" : "Save record"}
        </button>
      </div>
    </form>
  );
}
