"use client";

import { useState } from "react";
import { AudioPlayer } from "@/components/AudioPlayer";
import { BackgroundVideoWall } from "@/components/BackgroundVideoWall";
import { ChatBox } from "@/components/ChatBox";
import { PomodoroTimer } from "@/components/PomodoroTimer";
import { SnakeDonerGame } from "@/components/SnakeDonerGame";
import { SiteRoller } from "@/components/SiteRoller";

type Tab = "pomodoro" | "roller" | "snake";

const TAB_LABELS: Record<Tab, string> = {
  pomodoro: "Pomodoro",
  roller: "Keşfet",
  snake: "Yılan",
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
        ) : null}

        {activeTab === "roller" ? <SiteRoller /> : null}
        {activeTab === "snake" ? <SnakeDonerGame /> : null}
      </section>
    </main>
  );
}
