import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { PageHeader, StatusBadge } from "../components/ui";
import type { Appointment, AppointmentStatus, Paginated } from "../api/types";

const NEXT: Record<AppointmentStatus, AppointmentStatus[]> = {
  SCHEDULED: ["CONFIRMED", "CHECKED_IN", "CANCELLED", "NO_SHOW"],
  CONFIRMED: ["CHECKED_IN", "CANCELLED", "NO_SHOW"],
  CHECKED_IN: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
};

const SCHEDULER_ROLES = ["CLINIC_ADMIN", "DOCTOR", "STAFF"];

export function AppointmentsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const canManage = !!user && SCHEDULER_ROLES.includes(user.role);

  const list = useQuery({
    queryKey: ["appointments", "list"],
    queryFn: () => api<Paginated<Appointment>>("/appointments?pageSize=50"),
  });

  const setStatus = useMutation({
    mutationFn: (vars: { id: string; status: AppointmentStatus }) =>
      api(`/appointments/${vars.id}/status`, { method: "PATCH", body: JSON.stringify({ status: vars.status }) }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["appointments"] }),
  });

  return (
    <div>
      <PageHeader
        title="Appointments"
        subtitle={list.data ? `${list.data.total} in your clinic` : undefined}
      />

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Patient</th>
              <th className="px-4 py-3 font-medium">Doctor</th>
              <th className="px-4 py-3 font-medium">When</th>
              <th className="px-4 py-3 font-medium">Reason</th>
              <th className="px-4 py-3 font-medium">Status</th>
              {canManage && <th className="px-4 py-3 font-medium">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {list.data?.items.map((a) => (
              <tr key={a.id} className="border-t border-slate-100 align-middle">
                <td className="px-4 py-3 font-medium text-slate-800">
                  {a.patient ? `${a.patient.firstName} ${a.patient.lastName}` : "—"}
                </td>
                <td className="px-4 py-3">{a.doctor?.name ?? "—"}</td>
                <td className="px-4 py-3 whitespace-nowrap">{new Date(a.scheduledAt).toLocaleString()}</td>
                <td className="px-4 py-3 text-slate-500">{a.reason ?? "—"}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={a.status} />
                </td>
                {canManage && (
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {NEXT[a.status].map((s) => (
                        <button
                          key={s}
                          disabled={setStatus.isPending}
                          onClick={() => setStatus.mutate({ id: a.id, status: s })}
                          className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:border-brand-400 hover:text-brand-700 disabled:opacity-50"
                        >
                          {s.replace(/_/g, " ").toLowerCase()}
                        </button>
                      ))}
                      {NEXT[a.status].length === 0 && <span className="text-xs text-slate-300">—</span>}
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {list.data && list.data.items.length === 0 && (
              <tr>
                <td colSpan={canManage ? 6 : 5} className="px-4 py-6 text-center text-slate-400">
                  No appointments
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
