import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { PageHeader } from "../components/ui";
import type { Paginated, Patient } from "../api/types";

const WRITER_ROLES = ["CLINIC_ADMIN", "DOCTOR", "STAFF"];

export function PatientsPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const canWrite = !!user && WRITER_ROLES.includes(user.role);

  const list = useQuery({
    queryKey: ["patients", "list", search],
    queryFn: () => api<Paginated<Patient>>(`/patients?search=${encodeURIComponent(search)}`),
  });

  return (
    <div>
      <PageHeader
        title="Patients"
        subtitle={list.data ? `${list.data.total} registered in your clinic` : undefined}
        action={
          canWrite ? (
            <button
              onClick={() => setShowForm((v) => !v)}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              {showForm ? "Close" : "+ New patient"}
            </button>
          ) : undefined
        }
      />

      {showForm && canWrite && <NewPatientForm onDone={() => setShowForm(false)} />}

      <div className="mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, MRN or phone…"
          className="w-full max-w-sm rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
        />
      </div>

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">MRN</th>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Gender</th>
              <th className="px-4 py-3 font-medium">Phone</th>
              <th className="px-4 py-3 font-medium">Blood</th>
            </tr>
          </thead>
          <tbody>
            {list.data?.items.map((p) => (
              <tr key={p.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-mono text-xs text-slate-500">{p.mrn}</td>
                <td className="px-4 py-3 font-medium text-slate-800">
                  {p.firstName} {p.lastName}
                </td>
                <td className="px-4 py-3 capitalize">{p.gender?.toLowerCase() ?? "—"}</td>
                <td className="px-4 py-3">{p.phone ?? "—"}</td>
                <td className="px-4 py-3">{p.bloodGroup ?? "—"}</td>
              </tr>
            ))}
            {list.isLoading && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                  Loading…
                </td>
              </tr>
            )}
            {list.data && list.data.items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                  No patients found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function NewPatientForm({ onDone }: { onDone: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ firstName: "", lastName: "", gender: "MALE", phone: "" });
  const [error, setError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: () => api<{ patient: Patient }>("/patients", { method: "POST", body: JSON.stringify(form) }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["patients"] });
      onDone();
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Failed to create"),
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    create.mutate();
  };

  const field = "rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500";
  return (
    <form onSubmit={submit} className="mb-5 rounded-2xl bg-white p-5 shadow-sm">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <input required placeholder="First name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} className={field} />
        <input required placeholder="Last name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} className={field} />
        <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} className={field}>
          <option value="MALE">Male</option>
          <option value="FEMALE">Female</option>
          <option value="OTHER">Other</option>
        </select>
        <input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={field} />
      </div>
      {error && <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
      <div className="mt-3">
        <button disabled={create.isPending} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60">
          {create.isPending ? "Saving…" : "Register patient"}
        </button>
      </div>
    </form>
  );
}
