import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type Account = { id: string; provider: "facebook" | "instagram" | "x"; account_id: string; account_name: string; token_ciphertext: string; refresh_ciphertext: string | null; expires_at: string | null; metadata: Record<string, string> };
const cors = (origin: string | null) => ({ "Access-Control-Allow-Origin": origin || "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS", Vary: "Origin" });
const json = (body: unknown, status: number, origin: string | null) => Response.json(body, { status, headers: cors(origin) });
const graph = () => `https://graph.facebook.com/${Deno.env.get("META_GRAPH_API_VERSION") || "v26.0"}`;
async function decrypt(value: string) {
  const secret = Deno.env.get("SOCIAL_TOKEN_ENCRYPTION_KEY");
  if (!secret) throw new Error("Social token encryption is not configured.");
  const keyBytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  const key = await crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, ["decrypt"]);
  const packed = Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
  return new TextDecoder().decode(await crypto.subtle.decrypt({ name: "AES-GCM", iv: packed.slice(0, 12) }, key, packed.slice(12)));
}
async function encrypt(value: string) {
  const secret = Deno.env.get("SOCIAL_TOKEN_ENCRYPTION_KEY");
  if (!secret) throw new Error("Social token encryption is not configured.");
  const keyBytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  const key = await crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12)); const data = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(value)));
  const packed = new Uint8Array(iv.length + data.length); packed.set(iv); packed.set(data, iv.length);
  return btoa(String.fromCharCode(...packed));
}
async function providerJson(response: Response) {
  const payload = await response.json().catch(() => ({})) as { error?: { message?: string; description?: string }; detail?: string; title?: string; data?: Record<string, unknown> };
  if (!response.ok) throw new Error(payload.error?.message || payload.error?.description || payload.detail || payload.title || "The social platform rejected the post.");
  return payload;
}

Deno.serve(async (request) => {
  const origin = request.headers.get("origin");
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors(origin) });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405, origin);
  const authorization = request.headers.get("authorization");
  if (!authorization) return json({ error: "Sign in to publish News Cuts." }, 401, origin);
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!; const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!; const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const caller = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false } });
  const { data: { user } } = await caller.auth.getUser();
  if (!user) return json({ error: "Your session has expired. Sign in and try again." }, 401, origin);
  const { data: profile } = await caller.from("staff_profiles").select("role,is_active").eq("id", user.id).maybeSingle();
  const { data: permitted } = profile?.role === "super_admin" ? { data: true } : await caller.rpc("reporter_can", { p_permission: "manage_news_cuts" });
  if (!profile?.is_active || !permitted) return json({ error: "You do not have permission to publish News Cuts." }, 403, origin);

  const body = await request.json().catch(() => ({})) as { accountIds?: string[]; caption?: string; imageBase64?: string };
  const accountIds = [...new Set((body.accountIds || []).filter((id) => typeof id === "string"))];
  const caption = (body.caption || "").trim(); const imageBase64 = (body.imageBase64 || "").replace(/^data:image\/png;base64,/, "");
  if (!accountIds.length) return json({ error: "Select at least one connected social account." }, 400, origin);
  if (!imageBase64 || imageBase64.length > 12_000_000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(imageBase64)) return json({ error: "The News Cut image is missing or too large. Download a smaller PNG and try again." }, 400, origin);
  if (!caption) return json({ error: "Write a caption before publishing." }, 400, origin);

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { data: accounts, error: accountError } = await admin.from("social_accounts").select("id,provider,account_id,account_name,token_ciphertext,refresh_ciphertext,expires_at,metadata").in("id", accountIds);
  if (accountError || !accounts?.length || accounts.length !== accountIds.length) return json({ error: "Some selected social accounts are no longer connected. Refresh the list and try again." }, 400, origin);
  const bytes = Uint8Array.from(atob(imageBase64), (char) => char.charCodeAt(0));
  const objectKey = `${user.id}/${crypto.randomUUID()}.png`;
  const upload = await fetch(`${supabaseUrl}/storage/v1/object/social-news-cuts/${objectKey}`, { method: "POST", headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "image/png", "x-upsert": "false" }, body: bytes });
  if (!upload.ok) { console.error("News Cut image upload failed", await upload.text()); return json({ error: "Could not prepare the image for social publishing." }, 502, origin); }
  const imageUrl = `${supabaseUrl}/storage/v1/object/public/social-news-cuts/${objectKey}`;
  const results = await Promise.all((accounts as Account[]).map(async (account) => {
    try {
      let token = await decrypt(account.token_ciphertext);
      if (account.provider === "facebook") {
        const form = new URLSearchParams({ url: imageUrl, caption, access_token: token });
        const response = await fetch(`${graph()}/${encodeURIComponent(account.account_id)}/photos`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: form });
        const result = await providerJson(response);
        return { accountId: account.id, accountName: account.account_name, provider: account.provider, success: true, postId: result.id };
      }
      if (account.provider === "instagram") {
        const form = new URLSearchParams({ image_url: imageUrl, caption, access_token: token });
        const created = await providerJson(await fetch(`${graph()}/${encodeURIComponent(account.account_id)}/media`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: form }));
        const creationId = String(created.id || ""); if (!creationId) throw new Error("Instagram did not return a media upload ID.");
        const publish = new URLSearchParams({ creation_id: creationId, access_token: token });
        const result = await providerJson(await fetch(`${graph()}/${encodeURIComponent(account.account_id)}/media_publish`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: publish }));
        return { accountId: account.id, accountName: account.account_name, provider: account.provider, success: true, postId: result.id };
      }
      if (account.expires_at && Date.parse(account.expires_at) < Date.now() + 120_000) {
        if (!account.refresh_ciphertext) throw new Error("X authorization expired. Reconnect this account.");
        const clientId = Deno.env.get("X_CLIENT_ID")!; const clientSecret = Deno.env.get("X_CLIENT_SECRET"); const refresh = await decrypt(account.refresh_ciphertext);
        const tokenBody = new URLSearchParams({ grant_type: "refresh_token", refresh_token: refresh, client_id: clientId });
        const headers: HeadersInit = { "Content-Type": "application/x-www-form-urlencoded" };
        if (clientSecret) headers.Authorization = `Basic ${btoa(`${encodeURIComponent(clientId)}:${encodeURIComponent(clientSecret)}`)}`;
        const refreshed = await providerJson(await fetch("https://api.x.com/2/oauth2/token", { method: "POST", headers, body: tokenBody })) as { access_token?: string; refresh_token?: string; expires_in?: number };
        if (!refreshed.access_token) throw new Error("X account needs to be reconnected.");
        token = refreshed.access_token;
        await admin.from("social_accounts").update({ token_ciphertext: await encrypt(token), refresh_ciphertext: refreshed.refresh_token ? await encrypt(refreshed.refresh_token) : account.refresh_ciphertext, expires_at: refreshed.expires_in ? new Date(Date.now() + refreshed.expires_in * 1000).toISOString() : null }).eq("id", account.id);
      }
      const media = await providerJson(await fetch("https://api.x.com/2/media/upload", { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ media: imageBase64, media_category: "tweet_image" }) })) as { data?: { id?: string } };
      if (!media.data?.id) throw new Error("X did not return an image upload ID.");
      const post = await providerJson(await fetch("https://api.x.com/2/tweets", { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ text: caption, media: { media_ids: [media.data.id] } }) })) as { data?: { id?: string } };
      return { accountId: account.id, accountName: account.account_name, provider: account.provider, success: true, postId: post.data?.id };
    } catch (error) {
      return { accountId: account.id, accountName: account.account_name, provider: account.provider, success: false, error: error instanceof Error ? error.message : "Publishing failed." };
    }
  }));
  return json({ results, imageUrl }, 200, origin);
});
