"use client";

import { useState } from "react";
import { AudioPlayer } from "@/components/AudioPlayer";
import { BackgroundVideoWall } from "@/components/BackgroundVideoWall";
import { ChatBox } from "@/components/ChatBox";
import { PomodoroTimer, PomodoroPhase } from "@/components/PomodoroTimer";
import { SiteRoller } from "@/components/SiteRoller";
import { discoverySites } from "@/data/discoverySites";

type Tab = "chill" | "pomodoro" | "roller";

const TAB_LABELS: Record<Tab, string> = {
  chill: "Chill Alanı",
  pomodoro: "Pomodoro + Dinlen",
  roller: "İlginç Sitelerde Yuvarlan",
};

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("chill");
  const [phase, setPhase] = useState<PomodoroPhase>("focus");

  const featured = discoverySites.slice(0, 4);

  return (
    <main className="page-shell">
      <BackgroundVideoWall />
      <AudioPlayer />

      <header className="hero">
        <p className="hero-chip">Chillout Hub</p>
        <h1>Canı sıkılanlar için rahatlatıcı dijital mola alanı</h1>
        <p className="hero-sub">
          Arka planda döngülü müzik, klasik 25/5 pomodoro, dinlenme modunda
          Google login ile tek odalı sohbet ve rastgele ilginç siteler.
        </p>
        <div className="hero-actions">
          <button
            type="button"
            className="action-btn"
            onClick={() => setActiveTab("pomodoro")}
          >
            Dinlen Sohbetine Git
          </button>
          <button
            type="button"
            className="secondary-btn"
            onClick={() => setActiveTab("roller")}
          >
            Rastgele Site Keşfet
          </button>
        </div>
      </header>

      <nav className="tab-nav" aria-label="Sayfa sekmeleri">
        {(Object.keys(TAB_LABELS) as Tab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`tab-btn ${activeTab === tab ? "active" : ""}`}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </nav>

      <section className="panel">
        {activeTab === "chill" ? (
          <div className="chill-grid">
            <article className="soft-card">
              <h2>Müzik Kontrolü Her Yerde Aktif</h2>
              <p>
                Alttaki sabit oynatıcı tüm sekmelerde açık kalır. Parça değiştir,
                sesi ayarla ve sayfalar arasında gezerken müzik kesilmeden devam etsin.
              </p>
            </article>
            <article className="soft-card">
              <h2>Bugünün Kafa Dağıtma Önerileri</h2>
              <p>
                Bunlar doğrudan gezinebileceğin sitelerden seçilen minik
                sürprizler.
              </p>
              <div className="list-grid">
                {featured.map((site) => (
                  <a
                    className="suggestion-link"
                    key={site.id}
                    href={site.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <strong>{site.name}</strong>
                    <span>{site.description}</span>
                  </a>
                ))}
              </div>
            </article>
          </div>
        ) : null}

        {activeTab === "pomodoro" ? (
          <>
            <article className="chat-banner">
              Sohbet tek odada aktif. Odak veya dinlenme modunda yazabilirsin.
            </article>
            <div className="pomodoro-grid">
              <PomodoroTimer onPhaseChange={setPhase} />
              <ChatBox isBreakPhase={phase === "break"} />
            </div>
          </>
        ) : null}

        {activeTab === "roller" ? <SiteRoller /> : null}
      </section>
    </main>
  );
}
