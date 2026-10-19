import { Link } from "react-router-dom";
import { thumbUrl, watchUrl } from "../data/videos";
import { useLatestVideos } from "../hooks/useLatestVideos";

export default function VideoStrip() {
  const { videos, loading } = useLatestVideos();
  const items = videos.slice(0, 4);

  return (
    <section className="section vstrip" id="videos">
      <div className="section__head">
        <h2 className="section__title">Latest Videos</h2>
        <Link className="section__link" to="/tv">
          All on TV
          <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
            <path
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 5l7 7-7 7"
            />
          </svg>
        </Link>
      </div>
      {loading && !items.length ? <p className="empty">Loading latest GTN videos…</p> : !items.length ? <p className="empty">No recent videos are available right now.</p> : <div className="vstrip__grid">
        {items.map((video) => (
          <a
            className="vstrip__card"
            href={watchUrl(video.id)}
            target="_blank"
            rel="noreferrer"
            key={video.id}
          >
            <span className="vstrip__media">
              <img src={thumbUrl(video.id)} alt={video.title} loading="lazy" />
              <span className="vstrip__dur">{video.duration}</span>
            </span>
            <span className="vstrip__title">{video.title}</span>
            <span className="vstrip__meta">
              {video.views} views · {video.published}
            </span>
          </a>
        ))}
      </div>}
    </section>
  );
}
