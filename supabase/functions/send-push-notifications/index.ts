import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendPushBatch } from "npm:@mmmike/web-push@1.0.1/send";

const cors = (origin: string | null) => ({ "Access-Control-Allow-Origin": origin || "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS", Vary: "Origin" });
const json = (body: unknown, status: number, origin: string | null) => Response.json(body, { status, headers: cors(origin) });

Deno.serve(async (request) => {
  const origin = request.headers.get("origin");
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors(origin) });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405, origin);
  try {
    const authorization = request.headers.get("Authorization");
    if (!authorization) return json({ error: "Authentication required" }, 401, origin);
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: { user }, error: authError } = await admin.auth.getUser(authorization.replace(/^Bearer\s+/i, ""));
    if (authError || !user) return json({ error: "Invalid session" }, 401, origin);
    const { data: profile } = await admin.from("staff_profiles").select("role,is_active").eq("id", user.id).maybeSingle();
    if (!profile?.is_active) return json({ error: "Active staff account required" }, 403, origin);
    if (profile.role !== "super_admin") {
      const { data: permissions } = await admin.from("reporter_permissions").select("publish_stories").eq("id", true).maybeSingle();
      if (profile.role !== "reporter" || !permissions?.publish_stories) return json({ error: "You do not have permission to publish stories" }, 403, origin);
    }

    const body = await request.json();
    const storyId = typeof body.story_id === "string" ? body.story_id : "";
    if (!storyId) return json({ error: "Story is required" }, 400, origin);
    const { data: story, error: storyError } = await admin.from("stories").select("id,title,excerpt,category,badge,is_breaking,status").eq("id", storyId).maybeSingle();
    if (storyError || !story || story.status !== "published") return json({ error: "Published story not found" }, 404, origin);
    const { data: prior } = await admin.from("push_notification_log").select("story_id").eq("story_id", storyId).maybeSingle();
    if (prior) return json({ sent: false, duplicate: true }, 200, origin);

    const savedSubscriptions: { endpoint: string; subscription: Record<string, unknown> }[] = [];
    for (let start = 0; ; start += 1000) {
      const { data: page, error } = await admin.from("push_subscriptions").select("endpoint,subscription").range(start, start + 999);
      if (error) throw error;
      savedSubscriptions.push(...(page || []));
      if (!page || page.length < 1000) break;
    }
    let deliveredCount = 0;
    if (savedSubscriptions?.length) {
      const privateKey = Deno.env.get("WEB_PUSH_PRIVATE_KEY");
      const publicKey = Deno.env.get("WEB_PUSH_PUBLIC_KEY");
      const subject = Deno.env.get("WEB_PUSH_SUBJECT") || Deno.env.get("SUPABASE_URL");
      if (!privateKey || !publicKey || !subject) return json({ error: "Push delivery is not configured" }, 503, origin);
      const isLive = story.badge === "live";
      const summary = `${story.title}${story.excerpt ? ` — ${story.excerpt}` : ""}`.trim().slice(0, 240);
      const payload = {
        title: isLive ? "GTN Live Event" : story.is_breaking ? "Breaking News" : "GTN News",
        body: summary,
        url: `/story/${encodeURIComponent(story.id)}`,
        tag: `gtn-story-${story.id}`,
        icon: "/logo.png",
        badge: "/logo.png",
        category: story.category,
      };
      const result = await sendPushBatch(savedSubscriptions.map((row) => row.subscription), payload, { publicKey, privateKey, subject });
      deliveredCount = result.delivered;
      const expiredEndpoints = result.gone.map((subscription) => subscription.endpoint);
      if (expiredEndpoints.length) await admin.from("push_subscriptions").delete().in("endpoint", expiredEndpoints);
      if (result.failed.length > 0) console.warn(`Push delivery had ${result.failed.length} unsuccessful subscription(s).`);
    }
    const { error: logError } = await admin.from("push_notification_log").insert({ story_id: storyId, delivered_count: deliveredCount });
    if (logError && logError.code !== "23505") throw logError;
    return json({ sent: true, delivered: deliveredCount }, 200, origin);
  } catch (error) {
    console.error("send-push-notifications failed", error instanceof Error ? error.message : "unexpected error");
    return json({ error: "Could not send notifications" }, 500, origin);
  }
});
