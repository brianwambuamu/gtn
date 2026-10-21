import { Link } from "react-router-dom";
import type { Story } from "../data/news";
import AdSlot from "../components/AdSlot";
import Section from "../components/Section";
import StoryCard from "../components/StoryCard";
import StoryMedia from "../components/StoryMedia";
import TrendingNow from "../components/TrendingNow";
import VideoStrip from "../components/VideoStrip";
import { channelUrl } from "../data/videos";
import { slugify } from "../data/categories";
import { useNews } from "../store/NewsContext";
import { useCategories } from "../store/CategoriesContext";
import { useAds } from "../store/AdsContext";

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
  const { ads } = useAds();
  const hasHomeAds = ads.some((ad) => !ad.target || ad.target === "home");
  const [lead, ...rest] = stories;
  const top = rest.slice(0, 3);
  const feed = rest.slice(3);

  return <>
    <main className={`container main for-you-page${hasHomeAds ? "" : " for-you-page--no-ads"}`} id="top">
      <AdSlot className="ad--top" />
      {lead ? <div className="hero-cd">
        <div className="hero-cd__main">
          <article className="pin">
            <Link className="pin__media" to={`/story/${lead.id}`} tabIndex={-1} aria-hidden="true"><StoryMedia story={lead} ratio="16 / 10" /></Link>
            <div className="pin__body"><div className="pin__heading"><span className="pin__flag">Top story</span><span className="kicker">{lead.category}</span></div><h1 className="pin__title"><Link to={`/story/${lead.id}`}>{lead.title}</Link></h1><span className="pin__meta"><span>By {lead.author || "GTN Newsroom"}</span><time dateTime={lead.publishedAt}>{lead.time}</time></span></div>
          </article>
          {top.length > 0 && <div className="toprow">{top.map((story) => <StoryCard key={story.id} story={story} corner="Top Stories" />)}</div>}
        </div>
        <aside className="hero-cd__side"><AdSlot className="ad--side" /><TrendingNow id="trending" /></aside>
      </div> : <section className="for-you-empty" aria-labelledby="for-you-empty-title">
        <span className="for-you-empty__eyebrow">GTN NEWSROOM</span>
        <h1 id="for-you-empty-title">News, as it happens</h1>
        <p>Newly published stories will appear here.</p>
      </section>}

      <VideoStrip />
      {feed.length > 0 && <section className="for-you-feed" id="latest">
        <div className="section__head for-you-feed__head">
          <h2 className="section__title">Latest Stories</h2>
          <Link className="section__link" to="/news">All news <span aria-hidden="true">→</span></Link>
        </div>
        <div className="feedwrap">
          <div className="feedwrap__main">{feedRows(feed).map((row, index) => <div key={`feed-${row[0].id}`}><div className="feedrow">{row.map((story) => <StoryCard key={story.id} story={story} />)}</div>{(index === 1 || index === 3) && <AdSlot />}</div>)}</div>
          <aside className="feedwrap__side"><div className="livebox"><span className="livebox__dot" aria-hidden="true" /><div><h3>GTN Live TV</h3><p>Watch GTN’s live coverage and bulletins.</p><a href={channelUrl} target="_blank" rel="noreferrer">Watch on YouTube</a></div></div><AdSlot className="ad--side" /></aside>
        </div>
      </section>}
      {stories.length > 0 && <div className="more-wrap"><Link className="morebtn" to="/news">More News</Link></div>}
    </main>
    {categories.map((category) => {
      const items = stories.filter((story) => story.category === category).slice(0, 3);
      if (!items.length) return null;
      return <div className="band band--home" key={category}><div className="container"><Section id={slugify(category)} title={category} link={`/category/${slugify(category)}`}><div className="grid grid--3">{items.map((story) => <StoryCard key={story.id} story={story} />)}</div></Section></div></div>;
    })}
  </>;
}
