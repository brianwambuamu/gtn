const url = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, "");
const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;
export const backendConfigured = Boolean(url && anonKey);

type Session = { access_token: string; refresh_token?: string; user: { id: string; email?: string } };
const SESSION_KEY = "gtn.supabase-session";

export function getSession(): Session | null {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || "null") as Session | null; } catch { return null; }
}
export function saveSession(session: Session | null) {
  if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  else localStorage.removeItem(SESSION_KEY);
}

async function request<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  if (!backendConfigured) throw new Error("Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
  const currentToken = token || getSession()?.access_token;
  const send = (accessToken?: string) => fetch(`${url}${path}`, { ...options, headers: {
    apikey: anonKey!, Authorization: `Bearer ${accessToken || anonKey}`,
    "Content-Type": "application/json", ...(options.headers || {}),
  }});
  let response = await send(currentToken);
  const currentSession = getSession();
  if (response.status === 401 && token !== anonKey && currentSession?.refresh_token && !path.includes("grant_type=refresh_token")) {
    const refreshed = await fetch(`${url}/auth/v1/token?grant_type=refresh_token`, { method: "POST", headers: { apikey: anonKey!, "Content-Type": "application/json" }, body: JSON.stringify({ refresh_token: currentSession.refresh_token }) });
    if (refreshed.ok) {
      const session = await refreshed.json() as Session;
      saveSession(session);
      response = await send(session.access_token);
    } else saveSession(null);
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.msg || payload.message || payload.error_description || payload.error || "Supabase request failed");
  return payload as T;
}

export const backend = {
  auth: (path: string, body?: unknown) => request<Session>(`/auth/v1/${path}`, { method: "POST", body: JSON.stringify(body ?? {}) }, anonKey),
  changePassword: (password: string) => request<Session>("/auth/v1/user", { method: "PUT", body: JSON.stringify({ password }) }, getSession()?.access_token),
  rows: <T,>(table: string, query = "select=*") => request<T[]>(`/rest/v1/${table}?${query}`, {}, getSession()?.access_token),
  insert: <T,>(table: string, body: unknown) => request<T[]>(`/rest/v1/${table}`, { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify(body) }, getSession()?.access_token),
  update: <T,>(table: string, query: string, body: unknown) => request<T[]>(`/rest/v1/${table}?${query}`, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify(body) }, getSession()?.access_token),
  remove: (table: string, query: string) => request<unknown>(`/rest/v1/${table}?${query}`, { method: "DELETE" }, getSession()?.access_token),
  invoke: <T,>(name: string, body: unknown) => request<T>(`/functions/v1/${name}`, { method: "POST", body: JSON.stringify(body) }, getSession()?.access_token),
  async upload(file: File, bucket = "editorial-media"): Promise<string> {
    const key = `${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
    const response = await fetch(`${url}/storage/v1/object/${bucket}/${key}`, { method: "POST", headers: { apikey: anonKey!, Authorization: `Bearer ${getSession()?.access_token || anonKey}`, "Content-Type": file.type, "x-upsert": "false" }, body: file });
    if (!response.ok) throw new Error("Could not upload media to Supabase Storage.");
    return `${url}/storage/v1/object/public/${bucket}/${key}`;
  },
};
