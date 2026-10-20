import { Link, useSearchParams } from "react-router-dom";
import type { ReactNode } from "react";
import type { Story } from "../data/news";
import AdSlot from "../components/AdSlot";
import CategoryTabs from "../components/CategoryTabs";
import StoryCard from "../components/StoryCard";
import StoryMedia from "../components/StoryMedia";
import TrendingNow from "../components/TrendingNow";
import VideoListMini from "../components/VideoListMini";
import { useNews } from "../store/NewsContext";

function feedRows(items: Story[]): Story[][] {
  const rows: Story[][] = [];
  items.forEach((story, index) => {
    if (index % 3 === 0) rows.push([]);
    rows[rows.length - 1].push(story);
  });
  return rows;
}

function matches(story: Story, term: string): boolean {
  return (
    story.title.toLowerCase().includes(term) ||
    story.category.toLowerCase().includes(term) ||
    (story.excerpt ?? "").toLowerCase().includes(term) ||
    (story.author ?? "").toLowerCase().includes(term)
  );
}

export default function NewsPage() {
  const { newsStories } = useNews();
  const [params, setParams] = useSearchParams();

  const term = (params.get("q") ?? "").trim().toLowerCase();
  const searching = term.length > 0;

  const lead = searching ? undefined : newsStories[0];
  const feed = newsStories.filter(
    (story) => story.id !== lead?.id && matches(story, term),
  );

  const feedContent: ReactNode[] = [];
  feedRows(feed).forEach((row, index) => {
    feedContent.push(
      <div className="feedrow" key={`feed-${row[0].id}`}>
        {row.map((story) => (
          <StoryCard key={story.id} story={story} />
        ))}
      </div>,
    );
    if (index === 2 || index === 5) {
      feedContent.push(<AdSlot key={`feed-ad-${index}`} />);
    }
  });

  return (
    <main className="container main news-page" id="top">
      <CategoryTabs />
      <div className="cat-head">
        <h1>{searching ? "Search Results" : "News"}</h1>
        <span>
          {searching
            ? `Showing matches for “${params.get("q")}”`
            : "Latest stories and analysis"}
        </span>
      </div>

      {searching && (
        <div className="searchbar">
          <p>
            {feed.length} result{feed.length === 1 ? "" : "s"} for “
            {params.get("q")}”
          </p>
          <button
            type="button"
            onClick={() => setParams({}, { replace: true })}
          >
            Clear search
          </button>
        </div>
      )}

      {searching && feed.length === 0 ? (
        <p className="empty">
          Nothing matched your search. Try a different word, or browse the{" "}
          <Link to="/news">latest stories</Link>.
        </p>
      ) : (
        <>
          {!searching && newsStories.length === 0 && <p className="empty">No published news yet. New stories will appear here after they are added to the newsroom database.</p>}
          {lead && (
            <article className="pin">
              <Link
                className="pin__media"
                to={`/story/${lead.id}`}
                tabIndex={-1}
                aria-hidden="true"
              >
                <StoryMedia story={lead} ratio="16 / 9" />
              </Link>
              <div className="pin__body">
                <span className="kicker">{lead.category}</span>
                <h1 className="pin__title">
                  <Link to={`/story/${lead.id}`}>{lead.title}</Link>
                </h1>
                <span className="pin__byline">
                  By {lead.author ?? "GTN Newsroom"}
                </span>
              </div>
            </article>
          )}

          <div className="feedwrap" id="latest">
            <div className="feedwrap__main">{feedContent}</div>

            <aside className="feedwrap__side">
              <TrendingNow />
              <VideoListMini />
              <AdSlot className="ad--side" />
            </aside>
          </div>
        </>
      )}
    </main>
  );
}
