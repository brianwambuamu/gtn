import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type LiveEvent = { id: string; title: string; description: string; thumbnail: string; channelTitle: string };
type YouTubeSearchResponse = { items?: { id?: { videoId?: string }; snippet?: { title?: string; description?: string; channelTitle?: string; thumbnails?: { high?: { url?: string }; medium?: { url?: string }; default?: { url?: string } } } }[] };
type YouTubeChannelResponse = { items?: { id?: string }[] };

const cors = (origin: string | null) => ({ "Access-Control-Allow-Origin": origin || "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS", "Cache-Control": "public, max-age=30, s-maxage=30", Vary: "Origin" });
const json = (body: unknown, status: number, origin: string | null) => Response.json(body, { status, headers: cors(origin) });
let cachedAt = 0;
let cachedEvents: LiveEvent[] = [];
let cachedChannelId = "";
const CACHE_MS = 15 * 60_000;

Deno.serve(async (request) => {
  const origin = request.headers.get("origin");
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors(origin) });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405, origin);
  const apiKey = Deno.env.get("YOUTUBE_API_KEY");
  if (!apiKey) return json({ configured: false, events: [] }, 200, origin);
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
  if (Date.now() - cachedAt < CACHE_MS) return json({ configured: true, events: cachedEvents }, 200, origin);
  try {
    const { data: cached } = await admin.from("youtube_live_events_cache").select("events,fetched_at").eq("id", true).maybeSingle();
    if (cached && Date.now() - new Date(cached.fetched_at).getTime() < CACHE_MS) {
      cachedEvents = cached.events as LiveEvent[];
      cachedAt = Date.now();
      return json({ configured: true, events: cachedEvents }, 200, origin);
    }
    if (!cachedChannelId) {
      const channelQuery = new URLSearchParams({ part: "id", forHandle: "gusiitelevisionnetwork", key: apiKey });
      const channelResponse = await fetch(`https://www.googleapis.com/youtube/v3/channels?${channelQuery}`);
      const channelData = await channelResponse.json() as YouTubeChannelResponse & { error?: { message?: string } };
      if (!channelResponse.ok || !channelData.items?.[0]?.id) throw new Error(channelData.error?.message || "GTN's YouTube channel could not be found.");
      cachedChannelId = channelData.items[0].id;
    }
    const query = new URLSearchParams({ part: "snippet", channelId: cachedChannelId, eventType: "live", type: "video", videoEmbeddable: "true", maxResults: "10", key: apiKey });
    const response = await fetch(`https://www.googleapis.com/youtube/v3/search?${query}`);
    const data = await response.json() as YouTubeSearchResponse & { error?: { message?: string } };
    if (!response.ok) {
      console.error("YouTube live-event lookup failed", response.status, data.error?.message || "API error");
      return json({ error: "YouTube could not provide the current live events." }, 502, origin);
    }
    const events = (data.items || []).flatMap((item): LiveEvent[] => {
      const id = item.id?.videoId;
      const snippet = item.snippet;
      if (!id || !snippet?.title) return [];
      const thumbnail = snippet.thumbnails?.high?.url || snippet.thumbnails?.medium?.url || snippet.thumbnails?.default?.url || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
      return [{ id, title: snippet.title, description: snippet.description || "", thumbnail, channelTitle: snippet.channelTitle || "Gusii Television Network - GTN" }];
    });
    cachedEvents = events;
    cachedAt = Date.now();
    const { error: cacheError } = await admin.from("youtube_live_events_cache").upsert({ id: true, events, fetched_at: new Date(cachedAt).toISOString() });
    if (cacheError) console.error("YouTube live-event cache update failed", cacheError.message);
    return json({ configured: true, events }, 200, origin);
  } catch (error) {
    console.error("YouTube live-event lookup failed", error instanceof Error ? error.message : "unexpected error");
    return json({ error: "YouTube live events are temporarily unavailable." }, 502, origin);
  }
});
