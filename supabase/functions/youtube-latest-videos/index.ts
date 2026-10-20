type VideoItem = { id: string; snippet?: { title?: string; publishedAt?: string; thumbnails?: { high?: { url?: string }; medium?: { url?: string }; default?: { url?: string } } }; contentDetails?: { duration?: string }; statistics?: { viewCount?: string }; status?: { embeddable?: boolean; privacyStatus?: string }; }
type ApiResponse = { items?: VideoItem[]; error?: { message?: string } };
type ChannelResponse = { items?: { id?: string; contentDetails?: { relatedPlaylists?: { uploads?: string } } }[]; error?: { message?: string } };
type LatestVideo = { id: string; title: string; duration: string; views: string; published: string; publishedAt: string; thumbnail: string };

const cors = (origin: string | null) => ({ "Access-Control-Allow-Origin": origin || "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS", "Cache-Control": "public, max-age=60, s-maxage=60", Vary: "Origin" });
const json = (body: unknown, status: number, origin: string | null) => Response.json(body, { status, headers: cors(origin) });
let cachedAt = 0;
let cachedVideos: LatestVideo[] = [];
let uploadsPlaylist = "";
const CACHE_MS = 15 * 60_000;

function duration(value = "") {
  const match = value.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return "";
  const hours = Number(match[1] || 0); const minutes = Number(match[2] || 0); const seconds = Number(match[3] || 0);
  return hours ? `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}` : `${minutes}:${String(seconds).padStart(2, "0")}`;
}
function published(value = "") {
  const date = new Date(value); if (Number.isNaN(date.getTime())) return "Recently";
  const days = Math.max(0, Math.floor((Date.now() - date.getTime()) / 86_400_000));
  if (days === 0) return "Today"; if (days === 1) return "1 day ago"; if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30); if (months < 12) return `${months} ${months === 1 ? "month" : "months"} ago`;
  const years = Math.floor(days / 365); return `${years} ${years === 1 ? "year" : "years"} ago`;
}

Deno.serve(async (request) => {
  const origin = request.headers.get("origin");
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors(origin) });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405, origin);
  const key = Deno.env.get("YOUTUBE_API_KEY");
  if (!key) return json({ configured: false, videos: [] }, 200, origin);
  if (Date.now() - cachedAt < CACHE_MS) return json({ configured: true, videos: cachedVideos }, 200, origin);
  try {
    if (!uploadsPlaylist) {
      const params = new URLSearchParams({ part: "contentDetails", forHandle: "gusiitelevisionnetwork", key });
      const response = await fetch(`https://www.googleapis.com/youtube/v3/channels?${params}`);
      const data = await response.json() as ChannelResponse;
      uploadsPlaylist = data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads || "";
      if (!response.ok || !uploadsPlaylist) throw new Error(data.error?.message || "Could not find the GTN YouTube uploads playlist.");
    }
    const playlistParams = new URLSearchParams({ part: "contentDetails,snippet", playlistId: uploadsPlaylist, maxResults: "25", key });
    const playlistResponse = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?${playlistParams}`);
    const playlist = await playlistResponse.json() as { items?: { contentDetails?: { videoId?: string; videoPublishedAt?: string }; snippet?: { title?: string; publishedAt?: string; resourceId?: { videoId?: string }; thumbnails?: { high?: { url?: string }; medium?: { url?: string }; default?: { url?: string } } } }[]; error?: { message?: string } };
    if (!playlistResponse.ok) throw new Error(playlist.error?.message || "YouTube could not provide the GTN uploads.");
    const ordered = (playlist.items || []).flatMap((item) => {
      const id = item.contentDetails?.videoId || item.snippet?.resourceId?.videoId;
      return id ? [{ id, title: item.snippet?.title || "GTN video", publishedAt: item.contentDetails?.videoPublishedAt || item.snippet?.publishedAt || "", thumbnail: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || `https://i.ytimg.com/vi/${id}/hqdefault.jpg` }] : [];
    });
    const ids = ordered.map((item) => item.id);
    if (!ids.length) { cachedVideos = []; cachedAt = Date.now(); return json({ configured: true, videos: cachedVideos }, 200, origin); }
    const videoParams = new URLSearchParams({ part: "contentDetails,statistics,status", id: ids.join(","), key });
    const videoResponse = await fetch(`https://www.googleapis.com/youtube/v3/videos?${videoParams}`);
    const videoData = await videoResponse.json() as ApiResponse;
    if (!videoResponse.ok) throw new Error(videoData.error?.message || "YouTube could not provide video details.");
    const details = new Map((videoData.items || []).map((item) => [item.id, item]));
    // Keep playlist order: YouTube returns it newest-first, and the details lookup order is not guaranteed.
    cachedVideos = ordered.flatMap((item): LatestVideo[] => {
      const detail = details.get(item.id);
      if (detail?.status?.privacyStatus === "private" || detail?.status?.embeddable === false) return [];
      const count = Number(detail?.statistics?.viewCount || 0);
      return [{ id: item.id, title: item.title, duration: duration(detail?.contentDetails?.duration), views: Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(count), published: published(item.publishedAt), publishedAt: item.publishedAt, thumbnail: item.thumbnail }];
    });
    cachedAt = Date.now();
    return json({ configured: true, videos: cachedVideos }, 200, origin);
  } catch (error) {
    console.error("Latest GTN video lookup failed", error instanceof Error ? error.message : "unexpected error");
    return json({ error: "GTN's latest videos are temporarily unavailable." }, 502, origin);
  }
});
