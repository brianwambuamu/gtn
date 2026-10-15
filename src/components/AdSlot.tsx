import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useVideoUrl } from "../lib/videoStorage";
import { useAds } from "../store/AdsContext";
import type { Ad } from "../store/AdsContext";

type Props = {
  label?: string;
  className?: string;
};

function currentSection(pathname: string): string | undefined {
  if (pathname === "/") return "home";
  if (pathname === "/news") return "news";
  if (pathname.startsWith("/category/")) {
    return decodeURIComponent(pathname.split("/")[2] ?? "");
  }
  return undefined;
}

function adDestination(value?: string): string | undefined {
  if (!value?.trim()) return undefined;
  try {
    const parsed = new URL(value.trim());
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.href : undefined;
  } catch {
    try { return new URL(`https://${value.trim()}`).href; } catch { return undefined; }
  }
}

function AdCreative({ ad, label }: { ad: Ad; label: string }) {
  const media = ad.media;
  const destination = adDestination(ad.url);

  if (media?.type === "image") {
    const img = (
      <img
        className="ad__media"
        src={media.url}
        alt={ad.headline}
        loading="lazy"
      />
    );
    return (
      <a
        className="ad__link"
        href={destination}
        target={destination ? "_blank" : undefined}
        rel={destination ? "noopener noreferrer" : undefined}
        onClick={(e) => {
          if (!destination) e.preventDefault();
        }}
        title={ad.headline}
      >
        {img}
        <span className="ad__label">{label}</span>
      </a>
    );
  }

  if (media?.type === "video") {
    return <AdVideo ad={ad} label={label} />;
  }

  return (
    <a
      className="ad__creative ad__creative--text"
      href={destination}
      target={destination ? "_blank" : undefined}
      rel={destination ? "noopener noreferrer" : undefined}
      onClick={(e) => {
        if (!destination) e.preventDefault();
      }}
    >
      <span className="ad__headline">{ad.headline}</span>
      <span className="ad__cta">{destination ? "Learn more →" : "Sponsored"}</span>
      <span className="ad__label">{label}</span>
    </a>
  );
}

function AdVideo({ ad, label }: { ad: Ad; label: string }) {
  const src = useVideoUrl(ad.media?.type === "video" ? ad.media.url : "");
  const destination = adDestination(ad.url);

  return (
    <a
      className="ad__link"
      href={destination}
      target={destination ? "_blank" : undefined}
      rel={destination ? "noopener noreferrer" : undefined}
      onClick={(e) => {
        if (!destination) e.preventDefault();
      }}
      title={ad.headline}
    >
      {src ? (
        <video
          className="ad__media"
          src={src}
          muted
          loop
          playsInline
          preload="metadata"
        />
      ) : (
        <span className="ad__creative ad__creative--text">
          <span className="ad__headline">{ad.headline}</span>
        </span>
      )}
      <span className="ad__label">{label}</span>
    </a>
  );
}

export default function AdSlot({
  label = "Advertisement",
  className = "",
}: Props) {
  const { ads } = useAds();
  const location = useLocation();
  const section = currentSection(location.pathname);

  const pool = ads.filter((ad) => !ad.target || (section ? ad.target === section : false));
  const rotationKey = pool.map((ad) => ad.id).join("|");
  const [index, setIndex] = useState(0);
  useEffect(() => {
    setIndex(0);
    if (pool.length < 2) return;
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % pool.length), 5 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, [rotationKey, pool.length]);
  const ad = pool.length > 0 ? pool[index % pool.length] : undefined;
  const visibleLabel = pool.length > 1 ? `${label} · ${index + 1} of ${pool.length}` : label;

  if (!ad) return null;

  return (
    <div className={`ad ${className} ad--creative`} role="note">
      <AdCreative ad={ad} label={visibleLabel} />
    </div>
  );
}
