"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
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
import { TAB_ICONS, IconWave } from "@/components/icons";

type Tab = "pomodoro" | "roller" | "snake" | "bulmaca" | "oku";

const TAB_ORDER: Tab[] = ["pomodoro", "roller", "oku", "snake", "bulmaca"];
const TAB_LABELS: Record<Tab, string> = {
  pomodoro: "Pomodoro",
  roller: "Keşfet",
  oku: "Oku",
  snake: "Yılan",
  bulmaca: "Bulmaca",
};

/* Animasyonlu aurora arka plan — bol SVG, yumuşak gradient bloblar */
function AuroraBackground() {
  return (
    <div className="aurora-bg" aria-hidden="true">
      <svg viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice">
        <defs>
          <radialGradient id="au-mint" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#6df0c2" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#6df0c2" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="au-sun" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffd373" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#ffd373" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="au-coral" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ff9d8a" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#ff9d8a" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="au-violet" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#9d8cff" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#9d8cff" stopOpacity="0" />
          </radialGradient>
          <filter id="au-blur" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="60" />
          </filter>
        </defs>
        <g filter="url(#au-blur)">
          <circle className="au-blob au-b1" cx="240" cy="200" r="220" fill="url(#au-mint)" />
          <circle className="au-blob au-b2" cx="960" cy="180" r="240" fill="url(#au-sun)" />
          <circle className="au-blob au-b3" cx="320" cy="640" r="220" fill="url(#au-violet)" />
          <circle className="au-blob au-b4" cx="900" cy="620" r="200" fill="url(#au-coral)" />
        </g>
      </svg>
    </div>
  );
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("roller");
  const navRef = useRef<HTMLDivElement | null>(null);
  const btnRefs = useRef<Partial<Record<Tab, HTMLButtonElement | null>>>({});
  const [indicator, setIndicator] = useState<{ left: number; width: number; ready: boolean }>({
    left: 0,
    width: 0,
    ready: false,
  });

  const placeIndicator = () => {
    const btn = btnRefs.current[activeTab];
    if (btn) {
      setIndicator({ left: btn.offsetLeft, width: btn.offsetWidth, ready: true });
    }
  };

  useLayoutEffect(placeIndicator, [activeTab]);

  useEffect(() => {
    const onResize = () => placeIndicator();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  return (
    <main className="page-shell">
      <AuroraBackground />
      <BackgroundVideoWall />
      <AudioPlayer />
      <CatCompanion />

      <header className="hero">
        <div className="hero-left">
          <div className="hero-badge">
            <IconWave size={14} className="hero-badge-icon" />
            <span>Dinlenme Köşesi</span>
            <span className="hero-badge-dot" />
          </div>
          <h1>
            Müzik, odak <span className="hero-accent">&amp;</span> keşif.
          </h1>
          <p className="hero-sub">Rahatla, çalış, eğlen — hepsi tek yerde.</p>
        </div>
        <WeatherWidget />
      </header>

      <QuoteCard />

      <nav
        className="tab-nav"
        ref={navRef}
        aria-label="Sayfa sekmeleri"
        role="tablist"
      >
        <span
          className={`tab-indicator ${indicator.ready ? "ready" : ""}`}
          style={{ transform: `translateX(${indicator.left}px)`, width: indicator.width }}
          aria-hidden="true"
        />
        {TAB_ORDER.map((tab) => {
          const Icon = TAB_ICONS[tab];
          const active = activeTab === tab;
          return (
            <button
              key={tab}
              ref={(el) => {
                btnRefs.current[tab] = el;
              }}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setActiveTab(tab)}
              className={`tab-btn ${active ? "active" : ""}`}
            >
              <Icon size={17} className="tab-icon" strokeWidth={active ? 2 : 1.7} />
              <span>{TAB_LABELS[tab]}</span>
            </button>
          );
        })}
      </nav>

      <section className="panel" key={activeTab}>
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
        {activeTab === "roller" && <SiteRoller />}
        {activeTab === "oku" && <OkuDoom />}
        {activeTab === "snake" && <SnakeDonerGame />}
        {activeTab === "bulmaca" && (
          <div className="bulmaca-page">
            <div className="bulmaca-hero">
              <h2>Günlük Bulmaca</h2>
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
