"use client";

import { useEffect, useState } from "react";
import { Flame } from "lucide-react";
import {
  FOCUS_COMPLETE_EVENT,
  getFocusSummary,
  type FocusSummary,
} from "@/lib/focusStats";
import { PREFS_PULLED_EVENT } from "@/lib/prefsSync";

const EMPTY: FocusSummary = {
  today: 0,
  week: 0,
  total: 0,
  streak: 0,
  best: 0,
  heatmap: [],
};

export function FocusStats() {
  const [summary, setSummary] = useState<FocusSummary>(EMPTY);

  useEffect(() => {
    const refresh = () => setSummary(getFocusSummary());
    refresh();
    window.addEventListener(FOCUS_COMPLETE_EVENT, refresh);
    window.addEventListener(PREFS_PULLED_EVENT, refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener(FOCUS_COMPLETE_EVENT, refresh);
      window.removeEventListener(PREFS_PULLED_EVENT, refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  return (
    <article className="soft-card focus-stats">
      <div className="focus-stats-head">
        <h3>Odak Serisi</h3>
        <span className="focus-streak">
          <Flame size={15} aria-hidden="true" />
          <strong>{summary.streak}</strong> gün
        </span>
      </div>

      <div className="focus-stat-row">
        <div className="focus-stat">
          <span className="focus-stat-num">{summary.today}</span>
          <span className="focus-stat-label">bugün</span>
        </div>
        <div className="focus-stat">
          <span className="focus-stat-num">{summary.week}</span>
          <span className="focus-stat-label">bu hafta</span>
        </div>
        <div className="focus-stat">
          <span className="focus-stat-num">{summary.total}</span>
          <span className="focus-stat-label">toplam</span>
        </div>
        <div className="focus-stat">
          <span className="focus-stat-num">{summary.best}</span>
          <span className="focus-stat-label">en iyi seri</span>
        </div>
      </div>

      <div
        className="focus-heatmap"
        role="img"
        aria-label={`Son 49 günde toplam ${summary.total} odak seansı`}
      >
        {summary.heatmap.map((cell) => (
          <span
            key={cell.key}
            className={`focus-cell lvl-${cell.level}`}
            title={`${cell.key}: ${cell.count} odak`}
          />
        ))}
      </div>

      <p className="focus-hint">
        Her tamamlanan odak günü seriyi büyütür — kedi de kutlar. 🐾
      </p>
    </article>
  );
}
