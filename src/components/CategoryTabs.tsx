import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { NavLink } from "react-router-dom";
import { slugify } from "../data/categories";
import { useCategories } from "../store/CategoriesContext";

type Metrics = {
  thumbLeft: number;
  thumbWidth: number;
  scrollable: boolean;
  atStart: boolean;
  atEnd: boolean;
};

type DragState = {
  startX: number;
  startScroll: number;
  trackWidth: number;
  scrollWidth: number;
};

const settledMetrics: Metrics = {
  thumbLeft: 0,
  thumbWidth: 100,
  scrollable: false,
  atStart: true,
  atEnd: true,
};

function Chevron({ dir }: { dir: "left" | "right" }) {
  const d = dir === "left" ? "M15 5 8 12l7 7" : "m9 5 7 7-7 7";
  return (
    <svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        d={d}
      />
    </svg>
  );
}

export default function CategoryTabs() {
  const { categories } = useCategories();
  const viewportRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const [metrics, setMetrics] = useState<Metrics>(settledMetrics);

  const sync = useCallback(() => {
    const el = viewportRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const overflow = scrollWidth - clientWidth;
    if (overflow <= 1) {
      setMetrics(settledMetrics);
      return;
    }
    setMetrics({
      thumbLeft: (scrollLeft / scrollWidth) * 100,
      thumbWidth: (clientWidth / scrollWidth) * 100,
      scrollable: true,
      atStart: scrollLeft <= 1,
      atEnd: scrollLeft >= overflow - 1,
    });
  }, []);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const observer = new ResizeObserver(sync);
    observer.observe(el);
    if (el.firstElementChild) observer.observe(el.firstElementChild);
    return () => observer.disconnect();
  }, [sync]);

  function scrollPage(direction: 1 | -1) {
    const el = viewportRef.current;
    if (!el) return;
    el.scrollBy({
      left: direction * Math.max(180, el.clientWidth * 0.6),
      behavior: "smooth",
    });
  }

  function jumpTrack(event: ReactPointerEvent<HTMLDivElement>) {
    const el = viewportRef.current;
    if (!el || event.target !== event.currentTarget) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientX - rect.left) / rect.width;
    el.scrollTo({
      left: ratio * el.scrollWidth - el.clientWidth / 2,
      behavior: "smooth",
    });
  }

  function startThumbDrag(event: ReactPointerEvent<HTMLDivElement>) {
    const el = viewportRef.current;
    const track = event.currentTarget.parentElement;
    if (!el || !track) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      startX: event.clientX,
      startScroll: el.scrollLeft,
      trackWidth: track.clientWidth,
      scrollWidth: el.scrollWidth,
    };
    el.style.scrollBehavior = "auto";
  }

  function moveThumbDrag(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    const el = viewportRef.current;
    if (!drag || !el) return;
    const delta = event.clientX - drag.startX;
    if (drag.scrollWidth - el.clientWidth <= 0) return;
    el.scrollLeft =
      drag.startScroll + (delta / drag.trackWidth) * drag.scrollWidth;
  }

  function endThumbDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (!dragRef.current) return;
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    const el = viewportRef.current;
    if (el) el.style.scrollBehavior = "";
  }

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `subnav__link${isActive ? " subnav__link--active" : ""}`;

  return (
    <nav className="subnav" aria-label="Categories">
      <div
        className="subnav__viewport"
        ref={viewportRef}
        onScroll={sync}
        tabIndex={0}
      >
        <div className="subnav__list">
          <NavLink to="/news" end className={linkClass}>
            News
          </NavLink>
          {categories.map((cat) =>
            cat === "News" ? null : (
              <NavLink
                key={cat}
                to={`/category/${slugify(cat)}`}
                className={linkClass}
              >
                {cat}
              </NavLink>
            ),
          )}
        </div>
      </div>

      <div className="subnav__scrollbar">
        <button
          type="button"
          className="subnav__arrow"
          onClick={() => scrollPage(-1)}
          disabled={!metrics.scrollable || metrics.atStart}
          aria-label="Scroll categories left"
        >
          <Chevron dir="left" />
        </button>
        <div className="subnav__track" onPointerDown={jumpTrack}>
          <div
            className="subnav__thumb"
            style={{
              left: `${metrics.thumbLeft}%`,
              width: `${metrics.thumbWidth}%`,
            }}
            onPointerDown={startThumbDrag}
            onPointerMove={moveThumbDrag}
            onPointerUp={endThumbDrag}
            onPointerCancel={endThumbDrag}
          />
        </div>
        <button
          type="button"
          className="subnav__arrow"
          onClick={() => scrollPage(1)}
          disabled={!metrics.scrollable || metrics.atEnd}
          aria-label="Scroll categories right"
        >
          <Chevron dir="right" />
        </button>
      </div>
    </nav>
  );
}
