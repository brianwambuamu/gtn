import { useEffect, useState } from "react";
import type { Video } from "../data/videos";
import { backend, backendConfigured } from "../lib/backend";

const CACHE_KEY = "gtn.youtube-latest.v1";
const REFRESH_MS = 15 * 60_000;
function readCache() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || "null") as { videos?: Video[]; fetchedAt?: number } | null; } catch { return null; }
}
export function useLatestVideos() {
  const cached = readCache();
  const [videos, setVideos] = useState<Video[]>(cached?.videos || []);
  const [loading, setLoading] = useState(!cached?.videos?.length);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    const current = readCache();
    if (current?.fetchedAt && Date.now() - current.fetchedAt < REFRESH_MS) { setLoading(false); return; }
    if (!backendConfigured) { setLoading(false); return; }
    void backend.invoke<{ videos?: Video[]; error?: string }>("youtube-latest-videos", {}).then((result) => {
      if (!active) return;
      const latest = result.videos || [];
      setVideos(latest); setError(result.error || "");
      localStorage.setItem(CACHE_KEY, JSON.stringify({ videos: latest, fetchedAt: Date.now() }));
    }).catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "Could not load the latest GTN TV videos."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  return { videos, loading, error };
}
