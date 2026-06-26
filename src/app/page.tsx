"use client";

import { useState } from "react";
import { AudioPlayer } from "@/components/AudioPlayer";
import { BackgroundVideoWall } from "@/components/BackgroundVideoWall";
import { ChatBox } from "@/components/ChatBox";
import { PomodoroTimer } from "@/components/PomodoroTimer";
import { SnakeDonerGame } from "@/components/SnakeDonerGame";
import { SiteRoller } from "@/components/SiteRoller";
import { WeatherWidget } from "@/components/WeatherWidget";
import { QuoteCard } from "@/components/QuoteCard";
import { RiddleWidget } from "@/components/RiddleWidget";
import { CatCompanion } from "@/components/CatCompanion";
import { OkuDoom } from "@/components/OkuDoom";

type Tab = "pomodoro" | "roller" | "snake" | "bulmaca" | "oku";

const TAB_LABELS: Record<Tab, { label: string; icon: string }> = {
  pomodoro: { label: "Pomodoro", icon: "⏱" },
  roller:   { label: "Keşfet",   icon: "🔍" },
  oku:      { label: "Oku",      icon: "📖" },
  snake:    { label: "Yılan",    icon: "🐍" },
  bulmaca:  { label: "Bulmaca",  icon: "🧠" },
};

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("roller");

  return (
    <main className="page-shell">
      <BackgroundVideoWall />
      <AudioPlayer />
      <CatCompanion />

      <header className="hero">
        <div className="hero-left">
          <div className="hero-badge">✦ Dinlenme Köşesi</div>
          <h1>Müzik, odak <span className="hero-accent">&amp;</span> keşif.</h1>
          <p className="hero-sub">Rahatla, çalış, eğlen — hepsi burada.</p>
        </div>
        <WeatherWidget />
      </header>

      <QuoteCard />

      <nav className="tab-nav" aria-label="Sayfa sekmeleri">
        {(Object.keys(TAB_LABELS) as Tab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`tab-btn ${activeTab === tab ? "active" : ""}`}
          >
            <span className="tab-icon">{TAB_LABELS[tab].icon}</span>
            {TAB_LABELS[tab].label}
          </button>
        ))}
      </nav>

      <section className="panel">
        {activeTab === "pomodoro" && (
          <div className="pomodoro-grid">
            <div className="pomodoro-block">
              <PomodoroTimer />
            </div>
            <div className="tasks-block">
              <ChatBox mode="tasks" />
            </div>
            <div className="chat-block">
              <ChatBox mode="chat" />
            </div>
          </div>
        )}
        {activeTab === "roller"  && <SiteRoller />}
        {activeTab === "oku"     && <OkuDoom />}
        {activeTab === "snake"   && <SnakeDonerGame />}
        {activeTab === "bulmaca" && (
          <div className="bulmaca-page">
            <div className="bulmaca-hero">
              <h2>🧠 Günlük Bulmaca</h2>
              <p>Beynini çalıştır, cevabı düşün, sonra kontrol et.</p>
            </div>
            <div className="bulmaca-grid">
              {[...Array(4)].map((_, i) => (
                <RiddleWidget key={i} />
              ))}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
