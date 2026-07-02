"use client";

import { useEffect, useMemo, useState } from "react";
import type { DiscoverySite } from "@/types/site";
import { readDiscoveryPassport, summarizePassport, toggleDiscoveryFavorite, writeDiscoveryPassport, type DiscoveryPassportSummary } from "@/lib/discoveryPassport";
import { tellCat } from "@/lib/catEvents";

export function DiscoveryPassportPanel({ currentSite }: { currentSite: DiscoverySite }) {
  const [summary, setSummary] = useState<DiscoveryPassportSummary>(() => summarizePassport(readDiscoveryPassport()));

  const refresh = () => setSummary(summarizePassport(readDiscoveryPassport()));

  useEffect(() => {
    const onPassport = () => refresh();
    window.addEventListener("chillout:discovery-passport", onPassport);
    window.addEventListener("storage", onPassport);
    return () => {
      window.removeEventListener("chillout:discovery-passport", onPassport);
      window.removeEventListener("storage", onPassport);
    };
  }, []);

  const isFavorite = summary.favoriteIds.includes(currentSite.id);
  const vibeLabel = useMemo(() => summary.topVibe ?? "henüz yok", [summary.topVibe]);

  const toggleFavorite = () => {
    const next = toggleDiscoveryFavorite(readDiscoveryPassport(), currentSite.id);
    writeDiscoveryPassport(next);
    tellCat(isFavorite ? "Favoriden çıkardık, sorun yok." : "Bunu pasaporta yıldızladım. Güzel köşe.");
  };

  return (
    <article className="passport" aria-label="Keşif pasaportu">
      <div className="passport-head">
        <span>Keşif Pasaportu</span>
        <button type="button" onClick={toggleFavorite}>{isFavorite ? "★ Favori" : "☆ Favorile"}</button>
      </div>
      <div className="passport-grid">
        <strong>{summary.totalVisited}</strong><span>gezilen</span>
        <strong>{summary.liked}</strong><span>beğeni</span>
        <strong>{summary.skipped}</strong><span>pas</span>
      </div>
      <p>En baskın vibe: <b>{vibeLabel}</b></p>
      <p className="passport-current">Şu an: {currentSite.name}</p>
      <style jsx>{`
        .passport { border: 1px solid rgba(182,227,216,.16); background: rgba(9,18,16,.64); border-radius: 18px; padding: 16px; display: grid; gap: 12px; }
        .passport-head { display: flex; justify-content: space-between; align-items: center; gap: 10px; }
        .passport-head span { color: #88a39c; font-size: .62rem; letter-spacing: .2em; text-transform: uppercase; font-weight: 800; }
        button { border: 1px solid rgba(109,240,194,.38); background: rgba(109,240,194,.1); color: #6df0c2; border-radius: 999px; padding: 6px 10px; cursor: pointer; font-weight: 800; font-size: .72rem; }
        .passport-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; text-align: center; }
        .passport-grid strong { color: #f4fcf8; font-family: var(--font-display), serif; font-size: 1.7rem; font-weight: 400; display: block; }
        .passport-grid span { color: #6f8b83; font-size: .68rem; margin-top: -5px; }
        p { margin: 0; color: #9fb6af; line-height: 1.42; font-size: .82rem; }
        b { color: #f4fcf8; font-weight: 800; }
        .passport-current { color: #6df0c2; }
      `}</style>
    </article>
  );
}
