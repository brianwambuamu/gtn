import { useState } from "react";
import type { FormEvent } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../store/AuthContext";

type Props = {
  query: string;
  onQueryChange: (value: string) => void;
};

type NavItem = { label: string; to: string };

const navItems: NavItem[] = [
  { label: "For You", to: "/" },
  { label: "News", to: "/news" },
  { label: "Radio", to: "/tv" },
  { label: "TV", to: "/tv" },
  { label: "Podcasts", to: "/tv" },
  { label: "Live Events", to: "/tv" },
];

function SearchIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="14"
      height="14"
      aria-hidden="true"
      className={className}
    >
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        d="M10.5 17.5a7 7 0 1 0 0-14 7 7 0 0 0 0 14Zm10.8-2.7 -4.3-4.3"
      />
    </svg>
  );
}

function BurgerIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        d="M4 7h16M4 12h16M4 17h16"
      />
    </svg>
  );
}

export default function HeaderNav({ query, onQueryChange }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    const term = query.trim();
    if (term) navigate(`/news?q=${encodeURIComponent(term)}`);
  }

  const accountLabel = user ? `Hi, ${user.display_name}` : "Staff Sign In";
  const accountLinkClass =
    "hidden cursor-pointer rounded-full border border-white/85 px-4 py-1 text-xs font-semibold text-white transition hover:bg-white hover:text-[#f68220] sm:inline-block";

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `text-[13px] font-semibold tracking-[0.08em] uppercase transition hover:text-[#fff2e2] ${
      isActive
        ? "text-white underline decoration-2 underline-offset-8"
        : "text-white/90"
    }`;

  return (
    <header className="sticky top-0 z-[60] shadow-[0_2px_12px_rgba(0,0,0,0.2)]">
      <div className="bg-[linear-gradient(to_right,#245ca3,#f68220)]">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-4 px-5 py-2.5">
          <Link
            to="/"
            aria-label="GTN News home"
            className="flex items-center gap-2 rounded-lg bg-white px-2.5 py-1 shadow-sm"
          >
            <img src="/logo.png" alt="" className="h-7 w-auto" />
            <span className="text-[15px] leading-none font-extrabold tracking-tight text-[#0a0a0a] uppercase">
              GTN <span className="text-[#f68220]">News</span>
            </span>
          </Link>

          <nav aria-label="Primary" className="hidden lg:block">
            <ul className="flex items-center gap-7">
              {navItems.map((item) => (
                <li key={item.label}>
                  <NavLink
                    to={item.to}
                    end={item.to === "/"}
                    className={linkClass}
                  >
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex items-center gap-2.5">
            <form
              role="search"
              onSubmit={submitSearch}
              className="hidden items-center gap-2.5 rounded-full border border-white/85 px-4 py-1.5 sm:flex"
            >
              <SearchIcon className="text-white" />
              <label className="sr-only" htmlFor="hn-search">
                Search stories
              </label>
              <input
                id="hn-search"
                type="search"
                value={query}
                onChange={(e) => onQueryChange(e.target.value)}
                placeholder="SEARCH"
                className="w-24 bg-transparent text-xs font-medium tracking-wide text-white uppercase outline-none placeholder:text-white/90 md:w-32"
              />
            </form>

            <button
              type="button"
              onClick={() => setSearchOpen((open) => !open)}
              aria-expanded={searchOpen}
              aria-label="Toggle search"
              className="flex cursor-pointer items-center gap-2 rounded-full border border-white/85 px-3.5 py-1.5 text-white sm:hidden"
            >
              <SearchIcon />
              <span className="text-xs font-medium tracking-wide uppercase">
                Search
              </span>
            </button>

            <Link to="/admin" className={accountLinkClass}>
              {accountLabel}
            </Link>

            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-label="Toggle sections menu"
              className="cursor-pointer text-white transition hover:opacity-80 lg:hidden"
            >
              <BurgerIcon />
            </button>
          </div>
        </div>

        {searchOpen && (
          <div className="border-t border-white/20 px-5 pt-3 pb-4 sm:hidden">
            <form
              role="search"
              onSubmit={submitSearch}
              className="flex items-center gap-2.5 rounded-full border border-white/85 bg-white/10 px-4 py-1.5"
            >
              <SearchIcon className="text-white" />
              <label className="sr-only" htmlFor="hn-search-mobile">
                Search stories
              </label>
              <input
                id="hn-search-mobile"
                type="search"
                value={query}
                onChange={(e) => onQueryChange(e.target.value)}
                placeholder="SEARCH"
                className="w-full bg-transparent text-xs font-medium tracking-wide text-white uppercase outline-none placeholder:text-white/90"
              />
            </form>
          </div>
        )}

        {menuOpen && (
          <nav
            aria-label="Sections"
            className="border-t border-white/20 bg-[#f68220] px-5 py-4 lg:hidden"
          >
            <ul className="flex flex-wrap items-center gap-x-6 gap-y-2.5">
              {navItems.map((item) => (
                <li key={item.label}>
                  <NavLink
                    to={item.to}
                    end={item.to === "/"}
                    onClick={closeMenu}
                    className={linkClass}
                  >
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
            <div className="mt-3 border-t border-white/20 pt-3">
              <Link
                to="/admin"
                onClick={closeMenu}
                className="inline-block rounded-full bg-white px-4 py-1 text-xs font-semibold text-[#0a0a0a]"
              >
                {accountLabel}
              </Link>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
