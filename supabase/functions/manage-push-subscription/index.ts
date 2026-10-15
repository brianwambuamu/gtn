import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = (origin: string | null) => ({ "Access-Control-Allow-Origin": origin || "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS", Vary: "Origin" });
const json = (body: unknown, status: number, origin: string | null) => Response.json(body, { status, headers: cors(origin) });

Deno.serve(async (request) => {
  const origin = request.headers.get("origin");
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors(origin) });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405, origin);
  try {
    const body = await request.json();
    const endpoint = typeof body.endpoint === "string" ? body.endpoint : "";
    if (!endpoint || endpoint.length > 4096) return json({ error: "Invalid push endpoint" }, 400, origin);
    const endpointUrl = new URL(endpoint);
    const host = endpointUrl.hostname.toLowerCase();
    const trustedPushHost = host === "fcm.googleapis.com" || host.endsWith(".push.services.mozilla.com") || host.endsWith(".push.apple.com");
    if (endpointUrl.protocol !== "https:" || !trustedPushHost) return json({ error: "Unrecognized push service endpoint" }, 400, origin);
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { autoRefreshToken: false, persistSession: false } });
    if (body.action === "unsubscribe") {
      const { error } = await admin.from("push_subscriptions").delete().eq("endpoint", endpoint);
      if (error) throw error;
      return json({ removed: true }, 200, origin);
    }
    const subscription = body.subscription;
    if (body.action !== "subscribe" || !subscription || subscription.endpoint !== endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) return json({ error: "Invalid push subscription" }, 400, origin);
    const { error } = await admin.from("push_subscriptions").upsert({ endpoint, subscription, updated_at: new Date().toISOString() });
    if (error) throw error;
    return json({ subscribed: true }, 200, origin);
  } catch (error) {
    console.error("manage-push-subscription failed", error instanceof Error ? error.message : "unexpected error");
    return json({ error: "Could not update notification subscription" }, 500, origin);
  }
});
