import { Link } from "react-router-dom";

export default function PodcastsPage() {
  return <main className="podcasts-page">
    <div className="podcasts-page__content">
      <span className="podcasts-page__eyebrow">GTN AUDIO</span>
      <div className="podcasts-page__icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3m-4 0h8"/></svg></div>
      <h1>Podcasts are coming soon</h1>
      <p>We’re preparing thoughtful conversations and stories from across the GTN community. Check back soon for the first episodes.</p>
      <Link to="/" className="podcasts-page__home">Back to For You <span aria-hidden="true">→</span></Link>
    </div>
  </main>;
}
