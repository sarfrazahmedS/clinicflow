import { useState, type FormEvent } from "react";
import { useAuth } from "../auth/AuthContext";
import { ApiError } from "../api/client";

const DEMOS = [
  { label: "Clinic Admin", email: "admin@sunrise.dev" },
  { label: "Doctor", email: "dr.smith@sunrise.dev" },
  { label: "Reception", email: "reception@sunrise.dev" },
  { label: "Patient", email: "patient@sunrise.dev" },
  { label: "Super Admin", email: "superadmin@clinicflow.dev" },
];

export function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("admin@sunrise.dev");
  const [password, setPassword] = useState("Passw0rd!");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid h-full place-items-center bg-gradient-to-br from-slate-100 to-brand-50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-6 flex items-center gap-2 text-xl font-semibold text-slate-800">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-500 font-bold text-white">C</span>
          ClinicFlow
        </div>
        <h1 className="text-lg font-semibold text-slate-800">Sign in</h1>
        <p className="mb-5 text-sm text-slate-500">Multi-tenant clinic management — demo</p>

        <form onSubmit={submit} className="space-y-3">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="Email"
            autoComplete="username"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand-500"
          />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            placeholder="Password"
            autoComplete="current-password"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand-500"
          />
          {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
          <button
            disabled={busy}
            className="w-full rounded-lg bg-brand-600 py-2 font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div className="mt-5">
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
            Quick demo login (password: Passw0rd!)
          </div>
          <div className="flex flex-wrap gap-2">
            {DEMOS.map((d) => (
              <button
                key={d.email}
                type="button"
                onClick={() => {
                  setEmail(d.email);
                  setPassword("Passw0rd!");
                }}
                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600 hover:border-brand-400 hover:text-brand-700"
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
