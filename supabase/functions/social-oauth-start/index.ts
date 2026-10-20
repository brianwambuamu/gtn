import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = (origin: string | null) => ({ "Access-Control-Allow-Origin": origin || "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS", Vary: "Origin" });
const json = (body: unknown, status: number, origin: string | null) => Response.json(body, { status, headers: cors(origin) });
const random = (bytes: number) => { const value = crypto.getRandomValues(new Uint8Array(bytes)); return btoa(String.fromCharCode(...value)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", ""); };
const sha256 = async (value: string) => new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
const base64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");

Deno.serve(async (request) => {
  const origin = request.headers.get("origin");
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors(origin) });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405, origin);
  const authorization = request.headers.get("authorization");
  if (!authorization) return json({ error: "Sign in as Super Admin to connect social accounts." }, 401, origin);
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const caller = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false } });
  const { data: { user } } = await caller.auth.getUser();
  if (!user) return json({ error: "Your session has expired. Sign in and try again." }, 401, origin);
  const { data: profile } = await caller.from("staff_profiles").select("role,is_active").eq("id", user.id).maybeSingle();
  if (profile?.role !== "super_admin" || !profile.is_active) return json({ error: "Only the Super Admin can connect the newsroom's social accounts." }, 403, origin);
  const { provider } = await request.json().catch(() => ({})) as { provider?: string };
  if (provider !== "meta" && provider !== "x") return json({ error: "Choose Meta or X to connect." }, 400, origin);
  const redirectUri = Deno.env.get("SOCIAL_OAUTH_REDIRECT_URL") || `${supabaseUrl}/functions/v1/social-oauth-callback`;
  const state = random(32);
  const codeVerifier = provider === "x" ? random(48) : null;
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { error: saveError } = await admin.from("social_oauth_states").insert({ state, provider, staff_id: user.id, code_verifier: codeVerifier, expires_at: new Date(Date.now() + 10 * 60_000).toISOString() });
  if (saveError) return json({ error: "Could not prepare a secure social account connection." }, 500, origin);
  let authorizeUrl: URL;
  if (provider === "meta") {
    const clientId = Deno.env.get("META_APP_ID");
    if (!clientId) return json({ error: "Meta connection is not configured yet. Set META_APP_ID in Supabase secrets." }, 503, origin);
    authorizeUrl = new URL(`https://www.facebook.com/${Deno.env.get("META_GRAPH_API_VERSION") || "v26.0"}/dialog/oauth`);
    authorizeUrl.search = new URLSearchParams({ client_id: clientId, redirect_uri: redirectUri, state, response_type: "code", scope: "pages_show_list,pages_read_engagement,pages_manage_posts,instagram_basic,instagram_content_publish" }).toString();
  } else {
    const clientId = Deno.env.get("X_CLIENT_ID");
    if (!clientId) return json({ error: "X connection is not configured yet. Set X_CLIENT_ID in Supabase secrets." }, 503, origin);
    const challenge = base64url(await sha256(codeVerifier!));
    authorizeUrl = new URL("https://x.com/i/oauth2/authorize");
    authorizeUrl.search = new URLSearchParams({ response_type: "code", client_id: clientId, redirect_uri: redirectUri, scope: "tweet.read tweet.write users.read media.write offline.access", state, code_challenge: challenge, code_challenge_method: "S256" }).toString();
  }
  return json({ authorizeUrl: authorizeUrl.toString() }, 200, origin);
});
