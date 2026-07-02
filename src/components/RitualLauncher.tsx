"use client";

import { useState } from "react";
import { rituals, type ChillRitual, type RitualTab } from "@/data/rituals";
import { startRitual } from "@/lib/ritualEvents";
import { tellCat } from "@/lib/catEvents";

export function RitualLauncher({
  activeTab,
  onActivateTab,
}: {
  activeTab: RitualTab;
  onActivateTab: (tab: RitualTab) => void;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = rituals.find((ritual) => ritual.id === activeId) ?? rituals[0];

  const launch = (ritual: ChillRitual) => {
    setActiveId(ritual.id);
    tellCat({ pool: ritual.catLinePool });
    startRitual(ritual);
    if (ritual.tab !== activeTab) onActivateTab(ritual.tab);
  };

  return (
    <section className="ritual-shell" aria-label="Chill ritüelleri">
      <div className="ritual-head">
        <div>
          <span className="ritual-kicker">Bugün ne lazım?</span>
          <h2>Chill Ritüelleri</h2>
        </div>
        <p>Tek tıkla sahne, müzik, sekme ve kedi modunu aynı hizaya getir.</p>
      </div>

      <div className="ritual-grid">
        {rituals.map((ritual) => (
          <button
            key={ritual.id}
            type="button"
            className={`ritual-card ${active.id === ritual.id ? "active" : ""}`}
            onClick={() => launch(ritual)}
          >
            <span className="ritual-time">{ritual.durationMin} dk</span>
            <strong>{ritual.title}</strong>
            <small>{ritual.subtitle}</small>
          </button>
        ))}
      </div>

      <div className="ritual-steps" aria-live="polite">
        <div>
          <span className="ritual-now">Seçili akış</span>
          <strong>{active.title}</strong>
        </div>
        <ol>
          {active.steps.map((step) => (
            <li key={`${active.id}-${step.kind}-${step.label}`}>
              <span>{step.label}</span>
              <small>{step.detail}</small>
            </li>
          ))}
        </ol>
      </div>

      <style jsx>{`
        .ritual-shell {
          display: grid;
          gap: 14px;
          border: 1px solid rgba(182, 227, 216, 0.16);
          background: linear-gradient(145deg, rgba(8, 18, 16, 0.72), rgba(8, 12, 18, 0.68));
          border-radius: 22px;
          padding: 18px;
          box-shadow: 0 18px 60px rgba(0, 0, 0, 0.24);
          backdrop-filter: blur(14px);
        }
        .ritual-head { display: flex; justify-content: space-between; gap: 18px; align-items: end; flex-wrap: wrap; }
        .ritual-kicker { color: #6df0c2; font-size: 0.62rem; letter-spacing: 0.22em; text-transform: uppercase; font-weight: 800; }
        h2 { margin: 4px 0 0; font-family: var(--font-display), serif; font-weight: 400; font-size: clamp(1.35rem, 2.5vw, 2rem); color: #f4fcf8; }
        p { margin: 0; max-width: 44ch; color: #91aaa3; line-height: 1.45; font-size: 0.86rem; }
        .ritual-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 10px; }
        .ritual-card {
          min-height: 96px;
          display: grid;
          align-content: start;
          gap: 7px;
          text-align: left;
          border: 1px solid rgba(182, 227, 216, 0.14);
          background: rgba(9, 18, 16, 0.58);
          color: #d5e4df;
          border-radius: 16px;
          padding: 13px;
          cursor: pointer;
          font-family: var(--font-sans), sans-serif;
          transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease;
        }
        .ritual-card:hover, .ritual-card.active { transform: translateY(-2px); border-color: rgba(109, 240, 194, 0.55); background: rgba(109, 240, 194, 0.1); }
        .ritual-time { width: fit-content; border: 1px solid rgba(109, 240, 194, 0.36); color: #6df0c2; border-radius: 999px; padding: 3px 8px; font-size: 0.6rem; font-weight: 800; letter-spacing: 0.08em; }
        .ritual-card strong { font-family: var(--font-display), serif; font-weight: 500; color: #f4fcf8; font-size: 1.04rem; line-height: 1.1; }
        .ritual-card small { color: #8ba69f; line-height: 1.32; }
        .ritual-steps { display: grid; grid-template-columns: 170px 1fr; gap: 14px; align-items: start; border-top: 1px solid rgba(182, 227, 216, 0.11); padding-top: 14px; }
        .ritual-now { display: block; color: #5d7b73; font-size: 0.6rem; letter-spacing: 0.2em; text-transform: uppercase; margin-bottom: 5px; }
        .ritual-steps strong { color: #f4fcf8; font-family: var(--font-display), serif; font-weight: 500; }
        ol { margin: 0; padding: 0; list-style: none; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
        li { border: 1px solid rgba(182, 227, 216, 0.12); background: rgba(6, 12, 11, 0.38); border-radius: 13px; padding: 10px 11px; display: grid; gap: 4px; }
        li span { color: #dff8ef; font-size: 0.8rem; font-weight: 700; }
        li small { color: #7f9992; line-height: 1.3; }
        @media (max-width: 900px) { .ritual-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } .ritual-steps, ol { grid-template-columns: 1fr; } }
      `}</style>
    </section>
  );
}
