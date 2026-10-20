import type { Story } from "../data/news";
import { Link } from "react-router-dom";
import StoryMedia from "./StoryMedia";

type Props = {
  story: Story;
  size?: "md" | "sm";
  corner?: string;
};

export default function StoryCard({ story, size = "md", corner }: Props) {
  return (
    <article className={`card card--${size}`}>
      <Link
        className="card__media"
        to={`/story/${story.id}`}
        tabIndex={-1}
        aria-hidden="true"
      >
        <StoryMedia story={story} />
        {corner && <span className="card__corner">{corner}</span>}
      </Link>
      <div className="card__body">
        <span className="kicker">{story.category}</span>
        <h3 className="card__title">
          <Link to={`/story/${story.id}`}>{story.title}</Link>
        </h3>
        <div className="card__meta">
          <span className="card__byline">By {story.author ?? "GTN Newsroom"}</span>
          <time dateTime={story.publishedAt}>{story.time}</time>
        </div>
      </div>
    </article>
  );
}
