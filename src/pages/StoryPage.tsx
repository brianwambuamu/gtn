import { Link, Navigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import Section from "../components/Section";
import StoryCard from "../components/StoryCard";
import StoryImage from "../components/StoryImage";
import { slugify } from "../data/categories";
import { storyMediaItems } from "../data/media";
import type { StoryMedia } from "../data/media";
import type { Story } from "../data/news";
import { tiktokEmbedUrl, youtubeEmbedUrl } from "../data/media";
import { useVideoUrl } from "../lib/videoStorage";
import { useNews } from "../store/NewsContext";
import { backend, backendConfigured } from "../lib/backend";

function StoryMediaBlock({ media, story }: { media: StoryMedia; story: Story }) {
  const src = useVideoUrl(media.type === "video" ? media.url : "");
  if (media.type === "image") return <img src={media.url} alt={story.title} loading="lazy" onError={(event) => { event.currentTarget.style.display = "none"; }} />;
  if (media.type === "video") return src ? <video src={src} controls playsInline preload="metadata" /> : <StoryImage seed={story.seed} ratio="16 / 9" />;
  if (media.type === "audio") return <div className="story-audio"><span>{media.name || "Audio report"}</span><audio src={media.url} controls preload="metadata" /></div>;
  if (media.type === "youtube") return <iframe src={youtubeEmbedUrl(media.url)} title={story.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />;
  return <iframe src={tiktokEmbedUrl(media.url)} title={story.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />;
}

export default function StoryPage() {
  const { id = "" } = useParams();
  const { getStory, categoryStories } = useNews();
  const story = getStory(id);
  const [fullBody, setFullBody] = useState("");
  useEffect(() => {
    let active = true;
    setFullBody("");
    if (!story || story.body || !backendConfigured) return () => { active = false; };
    void backend.rows<{ body?: string }>("stories", `select=body&id=eq.${encodeURIComponent(story.id)}&status=eq.published&limit=1`)
      .then((rows) => { if (active) setFullBody(rows[0]?.body || ""); })
      .catch((error) => console.error("Unable to load article text", error));
    return () => { active = false; };
  }, [story?.id, story?.body]);
  if (!story) return <Navigate to="/news" replace />;

  const related = categoryStories(slugify(story.category)).filter((item) => item.id !== story.id).slice(0, 3);
  const mediaItems = storyMediaItems(story.media);
  const articleParagraphs = (story.body || fullBody || story.excerpt || "").split(/\n\s*\n/).map((paragraph) => paragraph.trim()).filter(Boolean);

  return (
    <main className="container main">
      <article className="story">
        <Link className="story__back" to={`/category/${slugify(story.category)}`}>← Back to {story.category}</Link>
        <span className="kicker story__kicker">{story.category}</span>
        <h1 className="story__title">{story.title}</h1>
        <span className="story__meta"><span>By {story.author ?? "GTN Newsroom"}</span><span aria-hidden="true">·</span><time dateTime={story.publishedAt}>{story.time}</time></span>
        {mediaItems.length > 0 ? <div className="story__media-gallery">{mediaItems.map((media, index) => <div className={`story__media story__embed${media.type === "tiktok" ? " story__embed--tiktok" : ""}${media.type === "audio" ? " story__embed--audio" : ""}`} key={`${media.url}-${index}`}><StoryMediaBlock media={media} story={story} /></div>)}</div> : <div className="story__media story__embed"><StoryImage seed={story.seed} ratio="16 / 9" /></div>}
        {story.excerpt && story.body && <p className="story__excerpt">{story.excerpt}</p>}
        {articleParagraphs.length > 0 && <div className="story__body">{articleParagraphs.map((paragraph, index) => <div key={`${index}-${paragraph.slice(0,20)}`}><p>{paragraph}</p>{index === 0 && related.length > 0 && <aside className="also-read" aria-label={`More ${story.category} stories`}><h2>Also read</h2><ul>{related.map((item) => <li key={item.id}><Link to={`/story/${item.id}`}>{item.title}</Link></li>)}</ul></aside>}</div>)}</div>}
      </article>
      {related.length > 0 && <Section id="related" title={`More ${story.category}`} link={`/category/${slugify(story.category)}`}><div className="grid grid--3">{related.map((item) => <StoryCard key={item.id} story={item} />)}</div></Section>}
    </main>
  );
}
