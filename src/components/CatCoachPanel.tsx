"use client";

import { useEffect, useState } from "react";
import { getRitualById, type RitualTab } from "@/data/rituals";
import { pickCatCoachSuggestions, type CatCoachSuggestion } from "@/lib/catCoach";
import { getFocusSummary, FOCUS_COMPLETE_EVENT } from "@/lib/focusStats";
import { readDiscoveryPassport, summarizePassport } from "@/lib/discoveryPassport";
import { tellCat } from "@/lib/catEvents";
import { startRitual } from "@/lib/ritualEvents";

export function CatCoachPanel({ activeTab, onActivateTab }: { activeTab: RitualTab; onActivateTab: (tab: RitualTab) => void }) {
  const [suggestions, setSuggestions] = useState<CatCoachSuggestion[]>([]);

  useEffect(() => {
    const refresh = () => {
      const focus = getFocusSummary();
      const passport = summarizePassport(readDiscoveryPassport());
      setSuggestions(pickCatCoachSuggestions({
        focusToday: focus.today,
        likedDiscoveries: passport.liked,
        hour: new Date().getHours(),
        activeTab,
      }));
    };
    refresh();
    window.addEventListener(FOCUS_COMPLETE_EVENT, refresh);
    window.addEventListener("chillout:discovery-passport", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener(FOCUS_COMPLETE_EVENT, refresh);
      window.removeEventListener("chillout:discovery-passport", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [activeTab]);

  const run = (suggestion: CatCoachSuggestion) => {
    const ritual = getRitualById(suggestion.ritualId);
    tellCat(suggestion.catLine);
    if (!ritual) return;
    startRitual(ritual);
    onActivateTab(ritual.tab);
  };

  if (!suggestions.length) return null;

  return (
    <aside className="coach" aria-label="Kedi koç önerileri">
      <div className="coach-title">🐾 Kedi koç</div>
      <div className="coach-list">
        {suggestions.map((suggestion) => (
          <button key={suggestion.id} type="button" onClick={() => run(suggestion)}>
            <strong>{suggestion.title}</strong>
            <span>{suggestion.reason}</span>
          </button>
        ))}
      </div>
      <style jsx>{`
        .coach { border: 1px solid rgba(182,227,216,.14); background: rgba(6,12,11,.46); border-radius: 18px; padding: 14px; display: grid; gap: 10px; }
        .coach-title { color: #ffd373; font-weight: 900; font-size: .72rem; letter-spacing: .18em; text-transform: uppercase; }
        .coach-list { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
        button { text-align: left; border: 1px solid rgba(255,211,115,.2); background: rgba(255,211,115,.07); color: #e7ddd0; border-radius: 13px; padding: 11px; cursor: pointer; display: grid; gap: 5px; font-family: var(--font-sans), sans-serif; }
        button:hover { border-color: rgba(255,211,115,.5); background: rgba(255,211,115,.12); }
        strong { color: #fff4d1; font-family: var(--font-display), serif; font-weight: 500; }
        span { color: #a99f8a; font-size: .74rem; line-height: 1.35; }
        @media (max-width: 760px) { .coach-list { grid-template-columns: 1fr; } }
      `}</style>
    </aside>
  );
}
