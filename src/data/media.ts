export type StoryMedia = {
  type: "image" | "youtube" | "tiktok" | "video" | "audio";
  url: string;
  name?: string;
};

export const VIDEO_ACCEPT = "video/mp4,video/webm,video/ogg,video/quicktime";
export const VIDEO_MAX_MB = 80;

export const YOUTUBE_RE =
  /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|live\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/;

export const TIKTOK_RE =
  /^https?:\/\/(?:www\.|m\.)?tiktok\.com\/@[\w.-]+\/video\/(\d{5,})/;

export function youtubeIdFromUrl(url: string): string | null {
  const match = url.trim().match(YOUTUBE_RE);
  return match ? match[1] : null;
}

export function tiktokIdFromUrl(url: string): string | null {
  const match = url.trim().match(TIKTOK_RE);
  return match ? match[1] : null;
}

export function youtubeThumb(id: string): string {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

export function youtubeEmbedUrl(id: string): string {
  return `https://www.youtube-nocookie.com/embed/${id}?rel=0`;
}

export function tiktokEmbedUrl(id: string): string {
  return `https://www.tiktok.com/embed/v2/${id}`;
}

export function mediaError(
  url: string,
  type: "youtube" | "tiktok",
): string | null {
  if (type === "youtube" && !youtubeIdFromUrl(url)) {
    return "That does not look like a valid YouTube link.";
  }
  if (type === "tiktok" && !tiktokIdFromUrl(url)) {
    return "Use a full TikTok video link, e.g. https://www.tiktok.com/@user/video/123456789.";
  }
  return null;
}

export function storyMediaItems(media?: StoryMedia | StoryMedia[] | null): StoryMedia[] {
  if (!media) return [];
  return Array.isArray(media) ? media : [media];
}
