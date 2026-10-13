import { Link, useParams } from "react-router-dom";
import AdSlot from "../components/AdSlot";
import CategoryTabs from "../components/CategoryTabs";
import StoryCard from "../components/StoryCard";
import StoryImage from "../components/StoryImage";
import { slugToLabel, slugify } from "../data/categories";
import { channelUrl } from "../data/videos";
import { useNews } from "../store/NewsContext";
import { useCategories } from "../store/CategoriesContext";

export default function CategoryPage() {
  const { slug = "" } = useParams();
  const { categoryStories } = useNews();
  const { categories } = useCategories();

  const items = categoryStories(slug);
  const label = categories.find((category) => slugify(category) === slug) || slugToLabel(slug);
  const [first, ...rest] = items;

  return (
    <main className="container main" id="top">
      <CategoryTabs />
      <div className="cat-head">
        <h1>{label}</h1>
        <span>
          {items.length} {items.length === 1 ? "story" : "stories"}
        </span>
      </div>

      {items.length === 0 ? (
        <p className="empty">
          No stories in {label} yet.{" "}
          <Link to="/admin">Add the first one from the admin page</Link> or{" "}
          <Link to="/news">browse all news</Link>.
        </p>
      ) : (
        <div className="feedwrap">
          <div className="feedwrap__main">
            <article className="pin">
              <Link
                className="pin__media"
                to={`/story/${first.id}`}
                tabIndex={-1}
                aria-hidden="true"
              >
                <StoryImage seed={first.seed} ratio="16 / 9" />
              </Link>
              <div className="pin__body">
                <span className="kicker">{first.category}</span>
                <h1 className="pin__title">
                  <Link to={`/story/${first.id}`}>{first.title}</Link>
                </h1>
                <span className="pin__byline">
                  By {first.author ?? "GTN Newsroom"}
                </span>
              </div>
            </article>

            {rest.length > 0 && (
              <div className="feedrow">
                {rest.map((story) => (
                  <StoryCard key={story.id} story={story} />
                ))}
              </div>
            )}
          </div>

          <aside className="feedwrap__side">
            <div className="livebox">
              <span className="livebox__dot" aria-hidden="true" />
              <div>
                <h3>GTN Live TV</h3>
                <p>Rolling coverage and special reports from the network.</p>
                <a href={channelUrl} target="_blank" rel="noreferrer">
                  Watch on YouTube
                </a>
              </div>
            </div>
            <AdSlot className="ad--side" />
          </aside>
        </div>
      )}
    </main>
  );
}
