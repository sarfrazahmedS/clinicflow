import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { PageHeader, RoleBadge, StatusBadge } from "../components/ui";
import type { Appointment, MedicalRecord, Paginated, Patient, Prescription } from "../api/types";

export function DashboardPage() {
  const { user } = useAuth();

  const patients = useQuery({
    queryKey: ["patients", "count"],
    queryFn: () => api<Paginated<Patient>>("/patients?pageSize=1"),
  });
  const appointments = useQuery({
    queryKey: ["appointments", "recent"],
    queryFn: () => api<Paginated<Appointment>>("/appointments?pageSize=6"),
  });
  const records = useQuery({
    queryKey: ["records", "count"],
    queryFn: () => api<Paginated<MedicalRecord>>("/records?pageSize=1"),
  });
  const prescriptions = useQuery({
    queryKey: ["prescriptions", "count"],
    queryFn: () => api<Paginated<Prescription>>("/prescriptions?pageSize=1"),
  });

  const stats = [
    { label: "Patients", value: patients.data?.total },
    { label: "Appointments", value: appointments.data?.total },
    { label: "Records", value: records.data?.total },
    { label: "Prescriptions", value: prescriptions.data?.total },
  ];

  return (
    <div>
      <PageHeader
        title={`Welcome, ${user?.name ?? ""}`}
        subtitle="Here's what's happening in your clinic."
        action={user ? <RoleBadge role={user.role} /> : undefined}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">{s.label}</div>
            <div className="mt-1 text-2xl font-semibold text-slate-800">{s.value ?? "—"}</div>
          </div>
        ))}
      </div>

      <h2 className="mb-3 mt-8 text-lg font-semibold text-slate-800">Upcoming appointments</h2>
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Patient</th>
              <th className="px-4 py-3 font-medium">Doctor</th>
              <th className="px-4 py-3 font-medium">When</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {appointments.data?.items.map((a) => (
              <tr key={a.id} className="border-t border-slate-100">
                <td className="px-4 py-3 text-slate-800">
                  {a.patient ? `${a.patient.firstName} ${a.patient.lastName}` : "—"}
                </td>
                <td className="px-4 py-3">{a.doctor?.name ?? "—"}</td>
                <td className="px-4 py-3">{new Date(a.scheduledAt).toLocaleString()}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={a.status} />
                </td>
              </tr>
            ))}
            {appointments.data && appointments.data.items.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                  No appointments yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
