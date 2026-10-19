import {
  channelUrl,
  embedUrl,
  thumbUrl,
  watchUrl,
} from "../data/videos";
import { useLatestVideos } from "../hooks/useLatestVideos";

export default function VideoListMini() {
  const { videos, loading } = useLatestVideos();
  const current = videos[0];
  const more = videos.slice(1, 4);

  return (
    <section className="vslice">
      <h2 className="section__title">Latest Videos</h2>
      {loading && !current ? <p className="empty">Loading latest GTN videos…</p> : !current ? <p className="empty">No recent videos are available right now.</p> : <><div className="vslice__player">
        <iframe
          src={embedUrl(current.id)}
          title={current.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          loading="lazy"
        />
      </div>
      <a
        className="vslice__current"
        href={watchUrl(current.id)}
        target="_blank"
        rel="noreferrer"
      >
        {current.title}
      </a>
      <ul className="vslice__list">
        {more.map((video) => (
          <li key={video.id}>
            <a
              className="vslice__item"
              href={watchUrl(video.id)}
              target="_blank"
              rel="noreferrer"
            >
              <img src={thumbUrl(video.id)} alt="" loading="lazy" />
              <span className="vslice__item-body">
                <span className="vslice__item-title">{video.title}</span>
                <span className="vslice__item-meta">
                  {video.views} views · {video.published}
                </span>
              </span>
            </a>
          </li>
        ))}
      </ul>
      <a
        className="vslice__all"
        href={channelUrl}
        target="_blank"
        rel="noreferrer"
      >
        Subscribe on YouTube
      </a>
      </>}
    </section>
  );
}
