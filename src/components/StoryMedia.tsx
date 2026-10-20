import { useState } from "react";
import type { CSSProperties } from "react";
import type { Story } from "../data/news";
import { storyMediaItems } from "../data/media";
import type { StoryMedia as StoryMediaItem } from "../data/media";
import { useVideoUrl } from "../lib/videoStorage";
import { youtubeThumb } from "../data/media";
import StoryImage from "./StoryImage";

type Props = { story: Story; ratio?: string };
function PlayIcon() { return <svg viewBox="0 0 24 24" width="40" height="40" aria-hidden="true"><path fill="currentColor" d="M8 5.2v13.6L19 12 8 5.2Z" /></svg>; }
function UploadedImage({ story, ratio, media }: { story: Story; ratio: string; media: StoryMediaItem }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <StoryImage seed={story.seed} ratio={ratio} />;
  return <img className="story-media story-media--img" src={media.url} alt={story.title} loading="lazy" style={{ aspectRatio: ratio }} onError={() => setFailed(true)} />;
}
function VideoTile({ story, media, ratio }: { story: Story; media: StoryMediaItem; ratio: string }) {
  const src = useVideoUrl(media.url);
  if (!src) return <StoryImage seed={story.seed} ratio={ratio} />;
  return <div className="story-media story-media--video" style={{ aspectRatio: ratio }}><video className="story-media__video" src={src} muted playsInline loop preload="metadata" /><span className="story-media__play"><PlayIcon /></span></div>;
}
function MediaTile({ story, media, ratio }: { story: Story; media: StoryMediaItem; ratio: string }) {
  const style: CSSProperties = { aspectRatio: ratio };
  if (media.type === "image") return <UploadedImage story={story} ratio={ratio} media={media} />;
  if (media.type === "video") return <VideoTile story={story} media={media} ratio={ratio} />;
  if (media.type === "youtube") return <div className="story-media story-media--video" style={style} aria-hidden="true"><img src={youtubeThumb(media.url)} alt="" loading="lazy" /><span className="story-media__play"><PlayIcon /></span></div>;
  if (media.type === "tiktok") return <div className="story-media story-media--video story-media--tiktok" style={style} aria-hidden="true"><span className="story-media__tt" aria-hidden="true">♪ TikTok</span><span className="story-media__play story-media__play--tt"><PlayIcon /></span></div>;
  return <StoryImage seed={story.seed} ratio={ratio} />;
}
export default function StoryMedia({ story, ratio = "16 / 9" }: Props) {
  const media = storyMediaItems(story.media).find((item) => item.type !== "audio");
  return media ? <MediaTile story={story} media={media} ratio={ratio} /> : <StoryImage seed={story.seed} ratio={ratio} />;
}
