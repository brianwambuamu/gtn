/* oxlint-disable react/only-export-components */
import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { backend, backendConfigured } from "../lib/backend";
import { useAuth } from "./AuthContext";
export type AdMedia = { type: "image" | "video"; url: string };
export type Ad = { id: string; headline: string; url?: string; media?: AdMedia; target?: string };
export type NewAdInput = { headline: string; url?: string; media?: AdMedia; target?: string };
type AdsContextValue = { ads: Ad[]; addAd: (input: NewAdInput) => Promise<Ad>; deleteAd: (id: string) => Promise<void> };
const AdsContext = createContext<AdsContextValue | null>(null);
export function AdsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth(); const [ads, setAds] = useState<Ad[]>([]);
  useEffect(() => { if (!backendConfigured) return; let active = true; backend.rows<Ad>("ads", "select=*&active=eq.true&order=created_at.desc").then((rows) => { if (active) setAds(rows); }).catch((error) => console.error("Unable to load ads from Supabase", error)); return () => { active = false; }; }, [user]);
  async function addAd(input: NewAdInput) { const draft = { id: crypto.randomUUID(), headline: input.headline.trim(), url: input.url || undefined, media: input.media, target: input.target || undefined }; const rows = await backend.insert<Ad>("ads", { ...draft, active: true }); const saved = rows[0] || draft; setAds((prev) => [saved, ...prev]); return saved; }
  async function deleteAd(id: string) { await backend.remove("ads", `id=eq.${encodeURIComponent(id)}`); setAds((prev) => prev.filter((ad) => ad.id !== id)); }
  return <AdsContext.Provider value={{ ads, addAd, deleteAd }}>{children}</AdsContext.Provider>;
}
export function useAds() { const context = useContext(AdsContext); if (!context) throw new Error("useAds must be used within an AdsProvider"); return context; }
