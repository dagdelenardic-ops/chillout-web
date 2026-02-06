"use client";

import { useMemo, useState } from "react";
import { discoverySites, sourceText } from "@/data/discoverySites";
import { SiteSource } from "@/types/site";

type SourceFilter = SiteSource | "all";

const VIBE_LABELS = {
  rahatlatici: "Rahatlatıcı",
  sasirtici: "Şaşırtıcı",
  oyunlu: "Oyunlu",
  kesif: "Keşif",
} as const;

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

export function SiteRoller() {
  const [filter, setFilter] = useState<SourceFilter>("all");

  const filteredSites = useMemo(() => {
    if (filter === "all") {
      return discoverySites;
    }
    return discoverySites.filter((site) => site.source === filter);
  }, [filter]);

  const [selectedId, setSelectedId] = useState<string>(discoverySites[0]?.id ?? "");

  const selectedSite =
    filteredSites.find((site) => site.id === selectedId) ?? filteredSites[0];

  const rollSite = () => {
    if (filteredSites.length === 0) {
      return;
    }

    const random = pickRandom(filteredSites);
    setSelectedId(random.id);
  };

  const openCurrent = () => {
    if (!selectedSite) {
      return;
    }

    window.open(selectedSite.url, "_blank", "noopener,noreferrer");
  };

  return (
    <article className="soft-card">
      <h2>İlginç Sitelerde Yuvarlan</h2>
      <p>
        Ekşi listesinden ve global seçimlerden derlenen siteler. Rastgele seç,
        yeni bir sekmede aç ve yoluna devam et.
      </p>

      <div className="inline-controls" style={{ marginBottom: 12 }}>
        <label htmlFor="source-filter">Kaynak</label>
        <select
          id="source-filter"
          value={filter}
          onChange={(event) => {
            const nextFilter = event.target.value as SourceFilter;
            setFilter(nextFilter);
            const nextPool =
              nextFilter === "all"
                ? discoverySites
                : discoverySites.filter((site) => site.source === nextFilter);
            setSelectedId(nextPool[0]?.id ?? "");
          }}
        >
          <option value="all">{sourceText.all}</option>
          <option value="eksi">{sourceText.eksi}</option>
          <option value="global">{sourceText.global}</option>
        </select>

        <button type="button" className="action-btn" onClick={rollSite}>
          Rastgele Seç
        </button>
        <button
          type="button"
          className="link-btn"
          onClick={openCurrent}
          disabled={!selectedSite}
        >
          Seçili Siteyi Aç
        </button>
      </div>

      {selectedSite ? (
        <section className="roll-highlight" aria-live="polite">
          <h3>{selectedSite.name}</h3>
          <p>{selectedSite.description}</p>
          <p className="meta-line">
            Ruh hali: {VIBE_LABELS[selectedSite.vibe]} | Kaynak:{" "}
            {sourceText[selectedSite.source]}
          </p>
        </section>
      ) : null}

      <div className="roll-grid">
        {filteredSites.map((site) => (
          <article className="roll-card" key={site.id}>
            <span className="source">{sourceText[site.source]}</span>
            <strong>{site.name}</strong>
            <p className="meta-line">{site.description}</p>
            <a href={site.url} target="_blank" rel="noreferrer" className="ghost-btn">
              Siteye Git
            </a>
          </article>
        ))}
      </div>

      <p className="footer-note">
        Kaynak: Ekşi Sözlük &quot;az kişinin bildiği muhteşem web siteleri&quot;
        başlığı ve global internet keşif seçimleri.
      </p>
    </article>
  );
}
