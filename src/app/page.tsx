"use client";

import { useState } from "react";
import { AudioPlayer } from "@/components/AudioPlayer";
import { BackgroundVideoWall } from "@/components/BackgroundVideoWall";
import { ChatBox } from "@/components/ChatBox";
import { PomodoroTimer } from "@/components/PomodoroTimer";
import { SiteRoller } from "@/components/SiteRoller";

type Tab = "pomodoro" | "roller";

const TAB_LABELS: Record<Tab, string> = {
  pomodoro: "Pomodoro",
  roller: "Keşfet",
};

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("roller");

  return (
    <main className="page-shell">
      <BackgroundVideoWall />
      <AudioPlayer />

      <header className="hero">
        <h1>Dinlenme köşesi</h1>
        <p className="hero-sub">Müzik dinle, odaklan, keşfet.</p>
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
        {activeTab === "pomodoro" ? (
          <div className="pomodoro-grid">
            <PomodoroTimer />
            <ChatBox />
          </div>
        ) : null}

        {activeTab === "roller" ? <SiteRoller /> : null}
      </section>
    </main>
  );
}
