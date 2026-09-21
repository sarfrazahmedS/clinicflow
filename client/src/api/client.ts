import * as demo from "./demo";

// In-memory access token; the refresh token lives in an httpOnly cookie the
// browser sends automatically. On a 401 we transparently refresh once and retry.
let accessToken: string | null = null;

export const setAccessToken = (t: string | null) => {
  accessToken = t;
};
export const getAccessToken = () => accessToken;

// Demo mode swaps every network call for an in-memory mock backend (see demo.ts)
// so the app runs as a static, server-less live demo. Enabled with VITE_DEMO=1.
export const IS_DEMO = import.meta.env.VITE_DEMO === "1";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface ApiOptions extends RequestInit {
  auth?: boolean; // default true
}

function request(path: string, opts: ApiOptions): Promise<Response> {
  const headers = new Headers(opts.headers);
  if (opts.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (opts.auth !== false && accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  return fetch(`/api${path}`, { ...opts, headers, credentials: "include" });
}

let refreshing: Promise<boolean> | null = null;
export function refreshSession(): Promise<boolean> {
  if (IS_DEMO) {
    return demo.refresh().then((ok) => {
      accessToken = ok ? "demo-token" : null;
      return ok;
    });
  }
  if (!refreshing) {
    refreshing = fetch("/api/auth/refresh", { method: "POST", credentials: "include" })
      .then(async (r) => {
        if (!r.ok) return false;
        const j = await r.json();
        accessToken = j.accessToken as string;
        return true;
      })
      .catch(() => false)
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

/** Fetch a binary response (e.g. a PDF) with auth + one transparent refresh. */
export async function fetchBlob(path: string): Promise<Blob> {
  if (IS_DEMO) return demo.blob(path);
  const build = () => {
    const h = new Headers();
    if (accessToken) h.set("Authorization", `Bearer ${accessToken}`);
    return fetch(`/api${path}`, { headers: h, credentials: "include" });
  };
  let res = await build();
  if (res.status === 401 && (await refreshSession())) res = await build();
  if (!res.ok) throw new ApiError(res.status, "Request failed");
  return res.blob();
}

export async function api<T = unknown>(path: string, opts: ApiOptions = {}): Promise<T> {
  if (IS_DEMO) return demo.handle<T>(path, opts);
  let res = await request(path, opts);
  if (res.status === 401 && opts.auth !== false) {
    const ok = await refreshSession();
    if (ok) res = await request(path, opts);
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string; details?: unknown };
    throw new ApiError(res.status, body.error ?? res.statusText, body.details);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
