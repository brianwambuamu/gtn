import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = (origin: string | null) => ({
  // This function authorizes every non-preflight request by Supabase JWT and
  // the caller's database role, so CORS can reflect the calling site's origin.
  "Access-Control-Allow-Origin": origin || "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
});
const json = (body: unknown, status = 200, origin: string | null = null) => Response.json(body, { status, headers: corsHeaders(origin) });

Deno.serve(async (request) => {
  const origin = request.headers.get("origin");
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(origin) });
  try {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405, origin);
  const authorization = request.headers.get("Authorization");
  if (!authorization) return json({ error: "Authentication required" }, 401, origin);
  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const accessToken = authorization.replace(/^Bearer\s+/i, "");
  const { data: { user }, error: authError } = await admin.auth.getUser(accessToken);
  if (authError || !user) return json({ error: "Invalid session" }, 401, origin);
  const { data: profile } = await admin.from("staff_profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "super_admin") return json({ error: "Only super admins can invite reporters" }, 403, origin);
  const body = await request.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const displayName = typeof body.display_name === "string" ? body.display_name.trim() : "";
  if (!email || !displayName) return json({ error: "Reporter name and email are required" }, 400, origin);
  const appUrl = Deno.env.get("APP_URL")?.replace(/\/$/, "") || origin || "";
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { display_name: displayName },
    redirectTo: `${appUrl}/admin`,
  });
  if (error) return json({ error: error.message }, 400, origin);
  const { error: profileError } = await admin.from("staff_profiles").upsert({ id: data.user.id, email, display_name: displayName, role: "reporter" });
  if (profileError) return json({ error: "Invitation sent, but profile setup failed. Contact support." }, 500, origin);
  return json({ invited: true }, 200, origin);
  } catch (cause) {
    console.error("invite-reporter failed", cause);
    const message = cause instanceof Error ? cause.message : "Unexpected invitation error";
    return json({ error: message }, 500, origin);
  }
});
