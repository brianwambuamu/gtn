import { useState } from "react";
import type { FormEvent } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../store/AuthContext";
import PushNotifications from "./PushNotifications";

type Props = {
  query: string;
  onQueryChange: (value: string) => void;
};

type NavItem = { label: string; to: string };

const navItems: NavItem[] = [
  { label: "For You", to: "/" },
  { label: "News", to: "/news" },
  { label: "TV", to: "/tv" },
  { label: "Podcasts", to: "/podcasts" },
  { label: "GTN Live", to: "/live-events" },
];

function SearchIcon() {
  return <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" d="M10.5 17.5a7 7 0 1 0 0-14 7 7 0 0 0 0 14Zm10.8-2.7 -4.3-4.3" /></svg>;
}

export default function HeaderNav({ query, onQueryChange }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const accountLabel = user ? `Hi, ${user.display_name}` : "Sign In";

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    const term = query.trim();
    if (term) {
      navigate(`/news?q=${encodeURIComponent(term)}`);
      setSearchOpen(false);
    }
  }

  return <header className="site-header">
    <div className="site-header__surface">
      <div className="site-header__inner">
        <div className="site-header__brand" role="group" aria-label="GTN News brand">
          <Link to="/" aria-label="GTN home" className="site-header__brand-mark"><img src="/logo.png" alt="GTN" /></Link>
          <Link to="/" className="site-header__brand-name">NEWS</Link>
        </div>

        <nav aria-label="Primary" className="site-header__nav">
          <ul>{navItems.map((item) => <li key={item.label}>
            <NavLink to={item.to} end={item.to === "/"} className={({ isActive }) => `site-header__link${isActive && (item.to !== "/tv" || item.label === "TV") ? " is-active" : ""}`}>
              {item.label === "GTN Live" && <span className="site-header__live-dot" aria-hidden="true" />}
              {item.label}
            </NavLink>
          </li>)}</ul>
        </nav>

        <div className="site-header__actions">
          <PushNotifications />
          <form role="search" onSubmit={submitSearch} className="site-header__search">
            <button type="button" onClick={() => setSearchOpen((open) => !open)} aria-expanded={searchOpen} aria-label={searchOpen ? "Close search" : "Open search"} className="site-header__search-toggle"><SearchIcon /></button>
            <label className="sr-only" htmlFor="site-header-search">Search stories</label>
            <input id="site-header-search" type="search" value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Search" className={searchOpen ? "is-open" : ""} />
          </form>
          <Link to="/admin" className="site-header__account">{accountLabel}</Link>
        </div>
      </div>
    </div>
  </header>;
}
