import { Link } from "react-router-dom";
import { useNews } from "../store/NewsContext";

export default function BreakingTicker() {
  const { stories } = useNews();
  const items = stories.filter((story) => story.is_breaking).slice(0, 6);
  if (!items.length) return null;

  return (
    <div className="ticker" aria-label="Breaking news">
      <div className="container ticker__inner">
        <span className="ticker__badge">Breaking</span>
        <div className="ticker__viewport">
          <div className="ticker__track">
            {items.map((story, i) => (
              <Link
                className="ticker__item"
                to={`/story/${story.id}`}
                key={`${story.id}-${i}`}
              >
                <span className="ticker__dot" aria-hidden="true" />
                {story.title}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
