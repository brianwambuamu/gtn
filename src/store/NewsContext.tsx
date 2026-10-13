/* oxlint-disable react/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { slugify } from "../data/categories";
import type { StoryMedia } from "../data/media";
import type { Badge, Placement, Story } from "../data/news";
import { backend, backendConfigured, getSession } from "../lib/backend";
import { useAuth } from "./AuthContext";

export type NewStoryInput = { title: string; excerpt?: string; category: string; author?: string; badge?: Badge; media?: StoryMedia; placement?: Placement };
type DbStory = Story & { reporter_id?: string; created_at?: string };
type NewsContextValue = { stories: Story[]; newsStories: Story[]; customStories: Story[]; deletedIds: string[]; loading: boolean; addStory: (input: NewStoryInput) => Promise<Story>; updateStory: (id: string, input: NewStoryInput) => Promise<void>; deleteStory: (id: string) => Promise<void>; refreshStories: () => Promise<void>; getStory: (id: string) => Story | undefined; categoryStories: (slug: string) => Story[]; };
const NewsContext = createContext<NewsContextValue | null>(null);

export function NewsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [customStories, setCustomStories] = useState<Story[]>([]);
  const [deletedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(backendConfigured);
  useEffect(() => {
    if (!backendConfigured) return;
    let active = true;
    backend.rows<DbStory>("stories", "select=*&status=eq.published&order=created_at.desc").then((rows) => {
      if (active) setCustomStories(rows.map((story) => ({ ...story, time: story.created_at ? new Date(story.created_at).toLocaleDateString() : story.time })));
    }).catch((error) => console.error("Unable to load stories from Supabase", error)).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user]);
  const stories = useMemo(() => customStories.filter((story) => !deletedIds.includes(story.id)), [customStories, deletedIds]);
  const newsStories = useMemo(() => stories.filter((story) => story.placement !== "for-you"), [stories]);
  async function refreshStories() {
    if (!backendConfigured) return;
    const rows = await backend.rows<DbStory>("stories", "select=*&status=eq.published&order=created_at.desc");
    setCustomStories(rows.map((story) => ({ ...story, time: story.created_at ? new Date(story.created_at).toLocaleDateString() : story.time })));
  }
  async function addStory(input: NewStoryInput) {
    const draft: Story = { id: crypto.randomUUID(), title: input.title.trim(), excerpt: input.excerpt?.trim() || undefined, category: input.category, time: "Just now", seed: Math.floor(Math.random() * 50) + 1, badge: input.badge, author: input.author?.trim() || user?.display_name || "GTN Newsroom", media: input.media, placement: input.placement };
    if (!backendConfigured) throw new Error("Connect Supabase before publishing stories.");
    const rows = await backend.insert<DbStory>("stories", { id: draft.id, title: draft.title, excerpt: draft.excerpt, category: draft.category, author: draft.author, badge: draft.badge, media: draft.media, placement: draft.placement, seed: draft.seed, reporter_id: getSession()?.user.id, status: "published" });
    const saved = rows[0] || draft; setCustomStories((prev) => [saved, ...prev]); return saved;
  }
  async function deleteStory(id: string) {
    if (customStories.some((story) => story.id === id)) { await backend.remove("stories", `id=eq.${encodeURIComponent(id)}`); setCustomStories((prev) => prev.filter((story) => story.id !== id)); }
  }
  async function updateStory(id: string, input: NewStoryInput) {
    await backend.update("stories", `id=eq.${encodeURIComponent(id)}`, { title: input.title.trim(), excerpt: input.excerpt?.trim() || null, category: input.category, author: input.author?.trim() || user?.display_name || "GTN Newsroom", badge: input.badge || null, media: input.media || null, placement: input.placement || null });
    setCustomStories((prev) => prev.map((story) => story.id === id ? { ...story, ...input, title: input.title.trim(), author: input.author?.trim() || user?.display_name || "GTN Newsroom", time: "Just updated" } : story));
  }
  function getStory(id: string) { return stories.find((story) => story.id === id); }
  function categoryStories(slug: string) { return stories.filter((story) => slugify(story.category) === slug && story.placement !== "for-you"); }
  return <NewsContext.Provider value={{ stories, newsStories, customStories, deletedIds, loading, addStory, updateStory, deleteStory, refreshStories, getStory, categoryStories }}>{children}</NewsContext.Provider>;
}
export function useNews() { const context = useContext(NewsContext); if (!context) throw new Error("useNews must be used within a NewsProvider"); return context; }
