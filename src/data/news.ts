import type { StoryMedia } from "./media";

export type Badge = "live" | "video" | "analysis" | "exclusive";
export type Placement = "for-you" | "news";

/** Story records are loaded from Supabase; this file contains types only. */
export type Story = {
  id: string;
  title: string;
  excerpt?: string;
  body?: string;
  category: string;
  time: string;
  publishedAt?: string;
  seed: number;
  badge?: Badge;
  author?: string;
  media?: StoryMedia | StoryMedia[];
  placement?: Placement;
  is_trending?: boolean;
  is_breaking?: boolean;
};
