import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { backend, backendConfigured } from "../lib/backend";

type LiveEvent = {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  channelTitle: string;
  startedAt?: string;
};
type LiveEventsResponse = { events?: LiveEvent[]; configured?: boolean };

function formatStart(value?: string) {
  if (!value) return "LIVE NOW";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "LIVE NOW";
  return `LIVE SINCE ${new Intl.DateTimeFormat("en-KE", { hour: "numeric", minute: "2-digit", timeZone: "Africa/Nairobi" }).format(date)}`;
}

export default function LiveEventsPage() {
  const { videoId } = useParams();
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [configured, setConfigured] = useState(true);

  const refresh = useCallback(async () => {
    if (!backendConfigured) {
      setConfigured(false);
      setLoading(false);
      return;
    }
    try {
      const result = await backend.invoke<LiveEventsResponse>("youtube-live-events", {});
      setEvents(result.events || []);
      setConfigured(result.configured !== false);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load live events.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 60_000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const activeEvent = events.find((event) => event.id === videoId);

  return <main className="live-events-page">
    <div className="live-events-page__container">
      <div className="live-events-page__breadcrumb"><Link to="/">Home</Link><span aria-hidden="true">›</span><span>GTN Live</span></div>
      <header className="live-events-page__heading"><div><span className="live-events-page__eyebrow">GTN LIVE</span><h1>{activeEvent ? "Watch Live" : "Live Events"}</h1></div>{!activeEvent && !loading && events.length > 0 && <span className="live-events-page__count">{events.length} live {events.length === 1 ? "event" : "events"}</span>}</header>

      {activeEvent ? <section className="live-events-player" aria-label="Live event player">
        <div className="live-events-player__frame"><iframe src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(activeEvent.id)}?autoplay=1&rel=0`} title={activeEvent.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen /></div>
        <div className="live-events-player__details"><span className="live-events-live-badge"><i /> LIVE NOW</span><p>{activeEvent.channelTitle}</p><h2>{activeEvent.title}</h2>{activeEvent.description && <p className="live-events-player__description">{activeEvent.description}</p>}</div>
        <Link className="live-events-back" to="/live-events">← All live events</Link>
      </section> : loading ? <div className="live-events-state" role="status"><span className="live-events-state__spinner" /><p>Checking GTN’s YouTube channel for live events…</p></div>
        : !configured ? <div className="live-events-state live-events-state--error"><h2>Live events are not connected yet</h2><p>Connect GTN’s YouTube Data API in Supabase to show current streams here.</p></div>
          : error ? <div className="live-events-state live-events-state--error"><h2>Live events could not load</h2><p>{error}</p><button type="button" onClick={() => { setLoading(true); void refresh(); }}>Try again</button></div>
            : events.length === 0 ? <div className="live-events-state live-events-state--empty"><span className="live-events-state__icon" aria-hidden="true">▶</span><h2>No live events right now</h2><p>When GTN goes live, the stream will appear here.</p></div>
              : <div className="live-events-grid">{events.map((event) => <article className="live-event-card" key={event.id}>
                <Link className="live-event-card__image" to={`/live-events/${encodeURIComponent(event.id)}`} aria-label={`Watch live: ${event.title}`}><img src={event.thumbnail} alt="" loading="lazy" /><span className="live-events-live-badge"><i /> LIVE</span><span className="live-event-card__play" aria-hidden="true"><svg viewBox="0 0 24 24" width="25" height="25"><path fill="currentColor" d="M8 5.2v13.6L19 12 8 5.2Z" /></svg></span></Link>
                <div className="live-event-card__content"><span className="live-event-card__time">{formatStart(event.startedAt)}</span><h2>{event.title}</h2><p>{event.channelTitle}</p><Link className="live-event-card__watch" to={`/live-events/${encodeURIComponent(event.id)}`}>WATCH LIVE <span aria-hidden="true">→</span></Link></div>
              </article>)}</div>}
    </div>
  </main>;
}
