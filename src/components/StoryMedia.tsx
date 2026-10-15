import { useState } from "react";
import type { CSSProperties } from "react";
import type { Story } from "../data/news";
import { useVideoUrl } from "../lib/videoStorage";
import { youtubeThumb } from "../data/media";
import StoryImage from "./StoryImage";

type Props = {
  story: Story;
  ratio?: string;
};

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" width="40" height="40" aria-hidden="true">
      <path fill="currentColor" d="M8 5.2v13.6L19 12 8 5.2Z" />
    </svg>
  );
}

function VideoTile({
  story,
  url,
  ratio,
  style,
}: {
  story: Story;
  url: string;
  ratio: string;
  style: CSSProperties;
}) {
  const src = useVideoUrl(url);

  if (!src) {
    return <StoryImage seed={story.seed} ratio={ratio} />;
  }

  return (
    <div className="story-media story-media--video" style={style}>
      <video
        className="story-media__video"
        src={src}
        muted
        playsInline
        loop
        preload="metadata"
      />
      <span className="story-media__play">
        <PlayIcon />
      </span>
    </div>
  );
}

function UploadedImage({ story, ratio, url }: { story: Story; ratio: string; url: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <StoryImage seed={story.seed} ratio={ratio} />;
  return <img className="story-media story-media--img" src={url} alt={story.title} loading="lazy" style={{ aspectRatio: ratio }} onError={() => setFailed(true)} />;
}

export default function StoryMedia({ story, ratio = "16 / 9" }: Props) {
  const media = story.media;

  if (!media) {
    return <StoryImage seed={story.seed} ratio={ratio} />;
  }

  const style: CSSProperties = { aspectRatio: ratio };

  if (media.type === "image") {
    return <UploadedImage story={story} ratio={ratio} url={media.url} />;
  }

  if (media.type === "video") {
    return (
      <VideoTile story={story} url={media.url} ratio={ratio} style={style} />
    );
  }

  if (media.type === "youtube") {
    return (
      <div
        className="story-media story-media--video"
        style={style}
        aria-hidden="true"
      >
        <img src={youtubeThumb(media.url)} alt="" loading="lazy" />
        <span className="story-media__play">
          <PlayIcon />
        </span>
      </div>
    );
  }

  return (
    <div
      className="story-media story-media--video story-media--tiktok"
      style={style}
      aria-hidden="true"
    >
      <span className="story-media__tt" aria-hidden="true">
        ♪ TikTok
      </span>
      <span className="story-media__play story-media__play--tt">
        <PlayIcon />
      </span>
    </div>
  );
}
