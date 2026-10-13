import { Link } from "react-router-dom";
import type { Story } from "../data/news";
import AdSlot from "../components/AdSlot";
import Section from "../components/Section";
import StoryCard from "../components/StoryCard";
import StoryImage from "../components/StoryImage";
import TrendingNow from "../components/TrendingNow";
import VideoStrip from "../components/VideoStrip";
import { channelUrl } from "../data/videos";
import { slugify } from "../data/categories";
import { useNews } from "../store/NewsContext";
import { useCategories } from "../store/CategoriesContext";

function feedRows(items: Story[]): Story[][] {
  const rows: Story[][] = [];
  items.forEach((story, index) => {
    if (index % 3 === 0) rows.push([]);
    rows[rows.length - 1].push(story);
  });
  return rows;
}

export default function ForYouPage() {
  const { stories } = useNews();
  const { categories } = useCategories();
  const [lead, ...rest] = stories;
  const top = rest.slice(0, 3);
  const feed = rest.slice(3);

  return <>
    <main className="container main" id="top">
      <AdSlot className="ad--top" />
      {lead ? <div className="hero-cd">
        <div className="hero-cd__main">
          <article className="pin">
            <Link className="pin__media" to={`/story/${lead.id}`} tabIndex={-1} aria-hidden="true"><StoryImage seed={lead.seed} ratio="16 / 9" /></Link>
            <div className="pin__body"><span className="kicker">{lead.category}</span><h1 className="pin__title"><Link to={`/story/${lead.id}`}>{lead.title}</Link></h1><span className="pin__byline">By {lead.author || "GTN Newsroom"}</span></div>
          </article>
          {top.length > 0 && <div className="toprow">{top.map((story) => <StoryCard key={story.id} story={story} corner="Top Stories" />)}</div>}
        </div>
        <aside className="hero-cd__side"><AdSlot className="ad--side" /><TrendingNow id="trending" /></aside>
      </div> : <p className="empty">No published news yet. Published stories will appear here.</p>}

      <VideoStrip />
      {feed.length > 0 && <div className="feedwrap" id="latest">
        <div className="feedwrap__main">{feedRows(feed).map((row, index) => <div key={`feed-${row[0].id}`}><div className="feedrow">{row.map((story) => <StoryCard key={story.id} story={story} />)}</div>{(index === 1 || index === 3) && <AdSlot />}</div>)}</div>
        <aside className="feedwrap__side"><div className="livebox"><span className="livebox__dot" aria-hidden="true" /><div><h3>GTN Live TV</h3><p>Watch GTN’s live coverage and bulletins.</p><a href={channelUrl} target="_blank" rel="noreferrer">Watch on YouTube</a></div></div><AdSlot className="ad--side" /></aside>
      </div>}
      {stories.length > 0 && <div className="more-wrap"><Link className="morebtn" to="/news">More News</Link></div>}
    </main>
    {categories.map((category) => {
      const items = stories.filter((story) => story.category === category).slice(0, 3);
      if (!items.length) return null;
      return <div className="band" key={category}><div className="container"><Section id={slugify(category)} title={category} link={`/category/${slugify(category)}`}><div className="grid grid--3">{items.map((story) => <StoryCard key={story.id} story={story} />)}</div></Section></div></div>;
    })}
  </>;
}
