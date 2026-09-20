import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

const NAV = [
  { to: "/", label: "Dashboard" },
  { to: "/patients", label: "Patients" },
  { to: "/appointments", label: "Appointments" },
  { to: "/records", label: "Records" },
  { to: "/prescriptions", label: "Prescriptions" },
];

export function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  return (
    <div className="flex h-full">
      <aside className="flex w-60 flex-col bg-slate-900 text-slate-100">
        <div className="flex items-center gap-2 px-5 py-5 text-lg font-semibold">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-500 font-bold text-white">C</span>
          ClinicFlow
        </div>
        <nav className="flex-1 space-y-1 px-3 py-2">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === "/"}
              className={({ isActive }) =>
                `block rounded-lg px-3 py-2 text-sm font-medium ${
                  isActive ? "bg-brand-600 text-white" : "text-slate-300 hover:bg-slate-800"
                }`
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-slate-800 px-4 py-4 text-xs">
          <div className="font-medium text-slate-100">{user?.name}</div>
          <div className="text-slate-400">{user?.role.replace(/_/g, " ").toLowerCase()}</div>
          <button
            onClick={() => void logout()}
            className="mt-2 rounded-md bg-slate-800 px-2 py-1 text-slate-200 hover:bg-slate-700"
          >
            Sign out
          </button>
        </div>
      </aside>
      <main className="h-full flex-1 overflow-auto">
        <div className="mx-auto max-w-6xl p-8">{children}</div>
      </main>
    </div>
  );
}
