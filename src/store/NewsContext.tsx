/* oxlint-disable react/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { slugify } from "../data/categories";
import type { StoryMedia } from "../data/media";
import type { Badge, Placement, Story } from "../data/news";
import { backend, backendConfigured, getSession } from "../lib/backend";
import { useAuth } from "./AuthContext";

export type NewStoryInput = { title: string; excerpt?: string; body?: string; category: string; author?: string; badge?: Badge; media?: StoryMedia | StoryMedia[]; placement?: Placement; is_trending?: boolean; is_breaking?: boolean };
type DbStory = Omit<Story, "time"> & { time?: string; reporter_id?: string; created_at?: string };
const NEWS_CACHE_KEY = "gtn.published-stories.v1";
const STORY_LIST_SELECT = "id,title,excerpt,category,author,badge,media,placement,is_trending,is_breaking,seed,reporter_id,created_at";

function readCachedStories(): Story[] {
  try {
    const cached = localStorage.getItem(NEWS_CACHE_KEY);
    return cached ? (JSON.parse(cached) as Story[]) : [];
  } catch { return []; }
}

function formatPublishedAt(value?: string): string {
  if (!value) return "Just now";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently published";
  return new Intl.DateTimeFormat("en-KE", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Nairobi",
  }).format(date);
}

function normalizeStory(row: DbStory): Story {
  const publishedAt = row.created_at || row.publishedAt;
  return { ...row, publishedAt, time: formatPublishedAt(publishedAt) };
}
type NewsContextValue = { stories: Story[]; newsStories: Story[]; customStories: Story[]; deletedIds: string[]; loading: boolean; addStory: (input: NewStoryInput) => Promise<Story>; updateStory: (id: string, input: NewStoryInput) => Promise<void>; deleteStory: (id: string) => Promise<void>; refreshStories: () => Promise<void>; getStory: (id: string) => Story | undefined; categoryStories: (slug: string) => Story[]; };
const NewsContext = createContext<NewsContextValue | null>(null);

export function NewsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [customStories, setCustomStories] = useState<Story[]>(readCachedStories);
  const [deletedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(backendConfigured && readCachedStories().length === 0);
  useEffect(() => {
    if (!backendConfigured) return;
    let active = true;
    // The feed does not need full article bodies. Load those only on the article route.
    backend.rows<DbStory>("stories", `select=${STORY_LIST_SELECT}&status=eq.published&order=created_at.desc`).then((rows) => {
      if (active) setCustomStories(rows.map(normalizeStory));
    }).catch((error) => console.error("Unable to load stories from Supabase", error)).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    try { localStorage.setItem(NEWS_CACHE_KEY, JSON.stringify(customStories)); } catch { /* Cache is optional when storage is full or unavailable. */ }
  }, [customStories]);
  const stories = useMemo(() => customStories.filter((story) => !deletedIds.includes(story.id)), [customStories, deletedIds]);
  const newsStories = useMemo(() => stories.filter((story) => story.placement !== "for-you"), [stories]);
  async function refreshStories() {
    if (!backendConfigured) return;
    const rows = await backend.rows<DbStory>("stories", `select=${STORY_LIST_SELECT}&status=eq.published&order=created_at.desc`);
    setCustomStories(rows.map(normalizeStory));
  }
  async function addStory(input: NewStoryInput) {
    const draft: Story = { id: crypto.randomUUID(), title: input.title.trim(), excerpt: input.excerpt?.trim() || undefined, body: input.body?.trim() || undefined, category: input.category, time: "Just now", seed: Math.floor(Math.random() * 50) + 1, badge: input.badge, author: input.author?.trim() || user?.display_name || "GTN Newsroom", media: input.media, placement: input.placement, is_trending: input.is_trending, is_breaking: input.is_breaking };
    if (!backendConfigured) throw new Error("Connect Supabase before publishing stories.");
    const rows = await backend.insert<DbStory>("stories", { id: draft.id, title: draft.title, excerpt: draft.excerpt, body: draft.body, category: draft.category, author: draft.author, badge: draft.badge, media: draft.media, placement: draft.placement, is_trending: draft.is_trending, is_breaking: draft.is_breaking, seed: draft.seed, reporter_id: getSession()?.user.id, status: "published" });
    const saved = rows[0] ? normalizeStory(rows[0]) : draft;
    setCustomStories((prev) => [saved, ...prev]);
    // Publishing succeeds independently; report push outcome in the newsroom UI.
    void backend.invoke<{ sent: boolean; reason?: string; subscriptions?: number; delivered?: number; failed?: number }>("send-push-notifications", { story_id: saved.id }).then((result) => {
      window.dispatchEvent(new CustomEvent("gtn:push-delivery", { detail: result }));
    }).catch((error) => {
      console.warn("Story published, but push notifications could not be sent.", error);
      window.dispatchEvent(new CustomEvent("gtn:push-delivery", {
        detail: { sent: false, error: error instanceof Error ? error.message : "Unknown push error" },
      }));
    });
    return saved;
  }
  async function deleteStory(id: string) {
    if (customStories.some((story) => story.id === id)) { await backend.remove("stories", `id=eq.${encodeURIComponent(id)}`); setCustomStories((prev) => prev.filter((story) => story.id !== id)); }
  }
  async function updateStory(id: string, input: NewStoryInput) {
    await backend.update("stories", `id=eq.${encodeURIComponent(id)}`, { title: input.title.trim(), excerpt: input.excerpt?.trim() || null, body: input.body?.trim() || null, category: input.category, author: input.author?.trim() || user?.display_name || "GTN Newsroom", badge: input.badge || null, media: input.media || null, placement: input.placement || null, is_trending: input.is_trending || false, is_breaking: input.is_breaking || false });
    setCustomStories((prev) => prev.map((story) => story.id === id ? { ...story, ...input, title: input.title.trim(), author: input.author?.trim() || user?.display_name || "GTN Newsroom", time: "Just updated" } : story));
  }
  function getStory(id: string) { return stories.find((story) => story.id === id); }
  function categoryStories(slug: string) { return stories.filter((story) => slugify(story.category) === slug && story.placement !== "for-you"); }
  return <NewsContext.Provider value={{ stories, newsStories, customStories, deletedIds, loading, addStory, updateStory, deleteStory, refreshStories, getStory, categoryStories }}>{children}</NewsContext.Provider>;
}
export function useNews() { const context = useContext(NewsContext); if (!context) throw new Error("useNews must be used within a NewsProvider"); return context; }
