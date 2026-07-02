"use client";

import type { FocusRoomSummary } from "@/lib/focusRoom";

export function FocusRoomPulse({ summary, signedIn }: { summary: FocusRoomSummary; signedIn: boolean }) {
  return (
    <section className="focus-room" aria-label="Focus room durumu">
      <div>
        <span>Focus Room</span>
        <strong>{signedIn ? "Oda canlı" : "Misafir mod"}</strong>
      </div>
      <div className="metrics">
        <b>{summary.activeCount}</b><small>aktif iş</small>
        <b>{summary.completedCount}</b><small>biten</small>
        <b>{summary.participantNames.length}</b><small>kişi</small>
      </div>
      {summary.ownActiveTask ? <p>Senin sıradaki iş: {summary.ownActiveTask.text}</p> : <p>Bir hedef yaz, oda seni tutar. Kaçış yok ama tatlı kaçış.</p>}
      <style jsx>{`
        .focus-room { border: 1px solid rgba(109,240,194,.18); background: linear-gradient(135deg, rgba(109,240,194,.08), rgba(157,140,255,.07)); border-radius: 16px; padding: 13px; display: grid; gap: 10px; margin: 10px 0 12px; }
        .focus-room > div:first-child { display: flex; justify-content: space-between; align-items: center; gap: 10px; }
        span { color: #6df0c2; font-size: .62rem; letter-spacing: .18em; text-transform: uppercase; font-weight: 900; }
        strong { color: #f4fcf8; font-family: var(--font-display), serif; font-weight: 500; }
        .metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; text-align: center; }
        b { color: #f4fcf8; font-size: 1.25rem; font-family: var(--font-display), serif; font-weight: 400; }
        small { color: #88a39c; font-size: .66rem; }
        p { margin: 0; color: #a9c1ba; font-size: .8rem; line-height: 1.4; }
      `}</style>
    </section>
  );
}
