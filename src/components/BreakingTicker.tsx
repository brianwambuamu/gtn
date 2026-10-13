import { Link } from "react-router-dom";
import type { Story } from "../data/news";
import { useNews } from "../store/NewsContext";

function linkFor(headline: string, stories: Story[]): string {
  const words = headline
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length >= 4);

  let best: Story | undefined;
  let bestScore = 0;

  for (const story of stories) {
    const title = story.title.toLowerCase();
    const score = words.reduce(
      (total, word) => total + (title.includes(word) ? 1 : 0),
      0,
    );
    if (score > bestScore) {
      bestScore = score;
      best = story;
    }
  }

  return best && bestScore > 0 ? `/story/${best.id}` : "/news";
}

export default function BreakingTicker() {
  const { stories } = useNews();
  const items = stories.slice(0, 6);
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
                to={linkFor(story.title, stories)}
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
