import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError, fetchBlob } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { PageHeader } from "../components/ui";
import type { Paginated, Patient, Prescription } from "../api/types";

export function PrescriptionsPage() {
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const isDoctor = user?.role === "DOCTOR";

  const list = useQuery({
    queryKey: ["prescriptions", "list"],
    queryFn: () => api<Paginated<Prescription>>("/prescriptions?pageSize=50"),
  });

  const openPdf = async (id: string) => {
    const blob = await fetchBlob(`/prescriptions/${id}/pdf`);
    window.open(URL.createObjectURL(blob), "_blank");
  };

  return (
    <div>
      <PageHeader
        title="Prescriptions"
        subtitle={list.data ? `${list.data.total} issued` : undefined}
        action={
          isDoctor ? (
            <button
              onClick={() => setShowForm((v) => !v)}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              {showForm ? "Close" : "+ New prescription"}
            </button>
          ) : undefined
        }
      />

      {showForm && isDoctor && <NewPrescriptionForm onDone={() => setShowForm(false)} />}

      <div className="space-y-3">
        {list.data?.items.map((p) => (
          <div key={p.id} className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-medium text-slate-800">
                  {p.patient ? `${p.patient.firstName} ${p.patient.lastName}` : "—"}
                  <span className="ml-2 font-mono text-xs text-slate-400">{p.patient?.mrn}</span>
                </div>
                <div className="text-xs text-slate-500">
                  {p.doctor?.name} · {new Date(p.issuedAt).toLocaleDateString()} · {p.items.length} item
                  {p.items.length === 1 ? "" : "s"}
                </div>
              </div>
              <button
                onClick={() => void openPdf(p.id)}
                className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-1.5 text-sm font-medium text-brand-700 hover:bg-brand-100"
              >
                View PDF
              </button>
            </div>
            <ul className="mt-3 space-y-1 text-sm text-slate-600">
              {p.items.map((it) => (
                <li key={it.id} className="flex gap-2">
                  <span className="font-medium text-slate-800">{it.drugName}</span>
                  <span className="text-slate-400">
                    {[it.dosage, it.frequency, it.durationDays ? `${it.durationDays}d` : null]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
        {list.data && list.data.items.length === 0 && (
          <div className="rounded-2xl bg-white p-8 text-center text-slate-400 shadow-sm">
            No prescriptions yet
          </div>
        )}
      </div>
    </div>
  );
}

interface ItemRow {
  drugName: string;
  dosage: string;
  frequency: string;
  durationDays: string;
  instructions: string;
}
const emptyItem: ItemRow = { drugName: "", dosage: "", frequency: "", durationDays: "", instructions: "" };

function NewPrescriptionForm({ onDone }: { onDone: () => void }) {
  const qc = useQueryClient();
  const [patientId, setPatientId] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<ItemRow[]>([{ ...emptyItem }]);
  const [error, setError] = useState<string | null>(null);

  const patients = useQuery({
    queryKey: ["patients", "options"],
    queryFn: () => api<Paginated<Patient>>("/patients?pageSize=100"),
  });

  const create = useMutation({
    mutationFn: () =>
      api("/prescriptions", {
        method: "POST",
        body: JSON.stringify({
          patientId,
          notes: notes || undefined,
          items: items
            .filter((it) => it.drugName.trim())
            .map((it) => ({
              drugName: it.drugName,
              dosage: it.dosage || undefined,
              frequency: it.frequency || undefined,
              durationDays: it.durationDays ? Number(it.durationDays) : undefined,
              instructions: it.instructions || undefined,
            })),
        }),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["prescriptions"] });
      onDone();
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Failed to create"),
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!patientId) return setError("Select a patient");
    if (!items.some((it) => it.drugName.trim())) return setError("Add at least one medication");
    create.mutate();
  };

  const field = "rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500";
  const setItem = (i: number, patch: Partial<ItemRow>) =>
    setItems((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  return (
    <form onSubmit={submit} className="mb-5 rounded-2xl bg-white p-5 shadow-sm">
      <div className="grid gap-3 sm:grid-cols-2">
        <select value={patientId} onChange={(e) => setPatientId(e.target.value)} className={field}>
          <option value="">Select patient…</option>
          {patients.data?.items.map((p) => (
            <option key={p.id} value={p.id}>
              {p.firstName} {p.lastName} ({p.mrn})
            </option>
          ))}
        </select>
        <input placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} className={field} />
      </div>

      <div className="mt-4 space-y-2">
        {items.map((it, i) => (
          <div key={i} className="grid grid-cols-1 gap-2 sm:grid-cols-12">
            <input placeholder="Medication" value={it.drugName} onChange={(e) => setItem(i, { drugName: e.target.value })} className={`${field} sm:col-span-4`} />
            <input placeholder="Dosage" value={it.dosage} onChange={(e) => setItem(i, { dosage: e.target.value })} className={`${field} sm:col-span-2`} />
            <input placeholder="Frequency" value={it.frequency} onChange={(e) => setItem(i, { frequency: e.target.value })} className={`${field} sm:col-span-2`} />
            <input placeholder="Days" value={it.durationDays} onChange={(e) => setItem(i, { durationDays: e.target.value.replace(/\D/g, "") })} className={`${field} sm:col-span-1`} />
            <input placeholder="Instructions" value={it.instructions} onChange={(e) => setItem(i, { instructions: e.target.value })} className={`${field} sm:col-span-3`} />
          </div>
        ))}
      </div>
      <button type="button" onClick={() => setItems((r) => [...r, { ...emptyItem }])} className="mt-2 text-sm font-medium text-brand-600 hover:underline">
        + Add medication
      </button>

      {error && <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
      <div className="mt-4">
        <button disabled={create.isPending} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60">
          {create.isPending ? "Saving…" : "Issue prescription"}
        </button>
      </div>
    </form>
  );
}
