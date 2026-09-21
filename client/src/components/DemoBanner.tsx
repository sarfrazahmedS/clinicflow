/** A floating, non-blocking strip shown only in the static demo (VITE_DEMO=1). */
export function DemoBanner() {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center p-3">
      <div className="pointer-events-auto flex max-w-[94vw] flex-wrap items-center justify-center gap-x-2 gap-y-1 rounded-full border border-white/10 bg-slate-900/90 px-4 py-2 text-xs text-slate-200 shadow-lg backdrop-blur">
        <span className="rounded-full bg-brand-500 px-2 py-0.5 text-[10px] font-bold tracking-wide text-white">
          DEMO
        </span>
        <span className="hidden sm:inline">In-memory mock data — no real backend or patient data.</span>
        <span>
          Sign in as any role · password <code className="rounded bg-white/10 px-1">Passw0rd!</code>
        </span>
        <a
          href="https://github.com/sarfrazahmedS/clinicflow"
          target="_blank"
          rel="noreferrer"
          className="font-medium text-brand-300 hover:text-brand-200"
        >
          Source&nbsp;↗
        </a>
      </div>
    </div>
  );
}
