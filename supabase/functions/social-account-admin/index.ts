import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = (origin: string | null) => ({ "Access-Control-Allow-Origin": origin || "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS", Vary: "Origin" });
const json = (body: unknown, status: number, origin: string | null) => Response.json(body, { status, headers: cors(origin) });

Deno.serve(async (request) => {
  const origin = request.headers.get("origin");
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors(origin) });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405, origin);
  const authorization = request.headers.get("authorization");
  if (!authorization) return json({ error: "Sign in to manage social accounts." }, 401, origin);
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!; const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!; const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const caller = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false } });
  const { data: { user } } = await caller.auth.getUser();
  if (!user) return json({ error: "Your session has expired. Sign in and try again." }, 401, origin);
  const { data: profile } = await caller.from("staff_profiles").select("role,is_active").eq("id", user.id).maybeSingle();
  if (!profile?.is_active || (profile.role !== "super_admin" && !(await caller.rpc("reporter_can", { p_permission: "manage_news_cuts" })).data)) return json({ error: "You do not have permission to manage News Cut publishing." }, 403, origin);
  const body = await request.json().catch(() => ({})) as { action?: string; id?: string };
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  if (body.action === "list") {
    const { data, error } = await admin.from("social_accounts").select("id,provider,account_id,account_name,expires_at,created_at").order("provider").order("account_name");
    if (error) return json({ error: "Could not load social connections." }, 500, origin);
    return json({ accounts: data }, 200, origin);
  }
  if (body.action === "disconnect") {
    if (profile.role !== "super_admin") return json({ error: "Only the Super Admin can disconnect newsroom accounts." }, 403, origin);
    if (!body.id) return json({ error: "Choose an account to disconnect." }, 400, origin);
    const { error } = await admin.from("social_accounts").delete().eq("id", body.id);
    return error ? json({ error: "Could not disconnect this account." }, 500, origin) : json({ success: true }, 200, origin);
  }
  return json({ error: "Unsupported social account action." }, 400, origin);
});
