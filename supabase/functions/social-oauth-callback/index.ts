import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type TokenResult = { access_token?: string; refresh_token?: string; expires_in?: number; error?: string; error_description?: string };
type MetaPages = { data?: { id: string; name: string; access_token: string; instagram_business_account?: { id: string; username?: string }; connected_instagram_account?: { id: string; username?: string } }[]; error?: { message?: string } };
const graph = () => `https://graph.facebook.com/${Deno.env.get("META_GRAPH_API_VERSION") || "v26.0"}`;
const publicUrl = () => (Deno.env.get("PUBLIC_APP_URL") || "").replace(/\/$/, "");
const redirect = (provider: string, status: string, error?: string) => {
  const base = publicUrl();
  if (!base) return new Response("Social connection finished. Configure PUBLIC_APP_URL to return to the app.", { status: 200 });
  const url = new URL(`${base}/admin/news-cut`);
  url.searchParams.set("social_connection", status);
  url.searchParams.set("provider", provider);
  if (error) url.searchParams.set("reason", error.slice(0, 180));
  return Response.redirect(url, 302);
};
async function encrypt(value: string) {
  const secret = Deno.env.get("SOCIAL_TOKEN_ENCRYPTION_KEY");
  if (!secret) throw new Error("Social token encryption is not configured.");
  const keyBytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  const key = await crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(value)));
  const packed = new Uint8Array(iv.length + ciphertext.length); packed.set(iv); packed.set(ciphertext, iv.length);
  return btoa(String.fromCharCode(...packed));
}
function basicAuth(clientId: string, secret: string) { return `Basic ${btoa(`${encodeURIComponent(clientId)}:${encodeURIComponent(secret)}`)}`; }

Deno.serve(async (request) => {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  if (url.searchParams.get("error")) {
    if (state) {
      const { data } = await admin.from("social_oauth_states").select("provider").eq("state", state).maybeSingle();
      await admin.from("social_oauth_states").delete().eq("state", state);
      return redirect(data?.provider || "unknown", "failed", url.searchParams.get("error_description") || "Authorization was cancelled.");
    }
    return redirect("unknown", "failed", url.searchParams.get("error_description") || "Authorization was cancelled.");
  }
  if (!code || !state) return redirect("unknown", "failed", "The platform returned an incomplete authorization response.");
  const { data: oauth, error: stateError } = await admin.from("social_oauth_states").select("state,provider,staff_id,code_verifier,expires_at").eq("state", state).maybeSingle();
  if (stateError || !oauth || Date.parse(oauth.expires_at) < Date.now()) return redirect("unknown", "failed", "This connection request expired. Return to News Cut and try again.");
  await admin.from("social_oauth_states").delete().eq("state", state);
  const kind = oauth.provider as "meta" | "x";
  const callbackUri = Deno.env.get("SOCIAL_OAUTH_REDIRECT_URL") || `${supabaseUrl}/functions/v1/social-oauth-callback`;
  try {
    if (kind === "meta") {
      const clientId = Deno.env.get("META_APP_ID"); const clientSecret = Deno.env.get("META_APP_SECRET");
      if (!clientId || !clientSecret) throw new Error("Meta app credentials are missing from Supabase secrets.");
      const tokenUrl = new URL(`${graph()}/oauth/access_token`);
      tokenUrl.search = new URLSearchParams({ client_id: clientId, client_secret: clientSecret, redirect_uri: callbackUri, code }).toString();
      const tokenResponse = await fetch(tokenUrl);
      const token = await tokenResponse.json() as TokenResult;
      if (!tokenResponse.ok || !token.access_token) throw new Error(token.error_description || "Meta authorization could not be completed.");
      const pagesUrl = new URL(`${graph()}/me/accounts`);
      pagesUrl.search = new URLSearchParams({ fields: "id,name,access_token,instagram_business_account{id,username},connected_instagram_account{id,username}", access_token: token.access_token }).toString();
      const pagesResponse = await fetch(pagesUrl);
      const pages = await pagesResponse.json() as MetaPages;
      if (!pagesResponse.ok || !pages.data?.length) throw new Error(pages.error?.message || "No Facebook Pages were available. Check the selected account and granted Page permissions.");
      for (const page of pages.data) {
        const encrypted = await encrypt(page.access_token);
        const { error } = await admin.from("social_accounts").upsert({ provider: "facebook", account_id: page.id, account_name: page.name, token_ciphertext: encrypted, expires_at: null, metadata: {}, connected_by: oauth.staff_id }, { onConflict: "provider,account_id" });
        if (error) throw new Error("Could not save the Facebook Page connection.");
        const instagram = page.instagram_business_account || page.connected_instagram_account;
        if (instagram) {
          const { error: igError } = await admin.from("social_accounts").upsert({ provider: "instagram", account_id: instagram.id, account_name: instagram.username ? `@${instagram.username}` : page.name, token_ciphertext: encrypted, expires_at: null, metadata: { page_id: page.id, page_name: page.name }, connected_by: oauth.staff_id }, { onConflict: "provider,account_id" });
          if (igError) throw new Error("Could not save the Instagram connection.");
        }
      }
      return redirect("meta", "connected");
    }

    const clientId = Deno.env.get("X_CLIENT_ID"); const clientSecret = Deno.env.get("X_CLIENT_SECRET");
    if (!clientId || !oauth.code_verifier) throw new Error("X app credentials or PKCE verifier are missing.");
    const body = new URLSearchParams({ code, grant_type: "authorization_code", client_id: clientId, redirect_uri: callbackUri, code_verifier: oauth.code_verifier });
    const headers: HeadersInit = { "Content-Type": "application/x-www-form-urlencoded" };
    if (clientSecret) headers.Authorization = basicAuth(clientId, clientSecret);
    const tokenResponse = await fetch("https://api.x.com/2/oauth2/token", { method: "POST", headers, body });
    const token = await tokenResponse.json() as TokenResult;
    if (!tokenResponse.ok || !token.access_token) throw new Error(token.error_description || token.error || "X authorization could not be completed.");
    const profileResponse = await fetch("https://api.x.com/2/users/me?user.fields=id,name,username", { headers: { Authorization: `Bearer ${token.access_token}` } });
    const profile = await profileResponse.json() as { data?: { id: string; name: string; username: string }; errors?: { message?: string }[] };
    if (!profileResponse.ok || !profile.data?.id) throw new Error(profile.errors?.[0]?.message || "Could not read the connected X account.");
    const { error } = await admin.from("social_accounts").upsert({ provider: "x", account_id: profile.data.id, account_name: `@${profile.data.username}`, token_ciphertext: await encrypt(token.access_token), refresh_ciphertext: token.refresh_token ? await encrypt(token.refresh_token) : null, expires_at: token.expires_in ? new Date(Date.now() + token.expires_in * 1000).toISOString() : null, metadata: { name: profile.data.name }, connected_by: oauth.staff_id }, { onConflict: "provider,account_id" });
    if (error) throw new Error("Could not save the X connection.");
    return redirect("x", "connected");
  } catch (error) {
    console.error("Social account authorization failed", error instanceof Error ? error.message : "unknown error");
    return redirect(kind, "failed", error instanceof Error ? error.message : "The social account could not be connected.");
  }
});
