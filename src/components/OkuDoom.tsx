"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Heart, X as XIcon, ArrowUp, Bookmark, Filter, RotateCcw } from "lucide-react";
import { okuStories, okuCategories, type OkuStory } from "@/data/okuDoomStories";
import okuHeroImageIds from "@/data/okuHeroImages.json";

const STORAGE_KEY = "chillout-oku-saved";

// Imagen ile üretilmiş hero görseli olan hikâye id'leri (manifest).
// Boşsa tüm kartlar mevcut prosedürel arka plana düşer.
const HERO_IMAGE_SET = new Set(okuHeroImageIds as string[]);

// Tone -> base color (HSL) — same logic as OkuDOOM hero-visual
function toneBase(hue: number, tone: string) {
  const map: Record<string, [number, number]> = {
    cold:    [40, 8], cosmic: [60, 6], red: [45, 6], sepia: [25, 10],
    warm:    [30, 10], ocean: [55, 8], ember: [50, 7], forest: [40, 6],
    violet:  [40, 6], ice: [35, 10], amber: [55, 8], dusk: [30, 8],
  };
  const [s, l] = map[tone] || [60, 6];
  return `hsl(${hue}, ${s}%, ${l}%)`;
}

// Hero with layered grain + vignette (no AI image needed)
function StoryHero({ story, blur = 0 }: { story: OkuStory; blur?: number }) {
  const { hue, tone } = story.hero;
  const id = useMemo(() => `grain-${Math.random().toString(36).slice(2, 7)}`, []);
  const hasPhoto = HERO_IMAGE_SET.has(story.id);
  return (
    <div
      className="oku-hero"
      style={{
        background: toneBase(hue, tone),
        filter: blur ? `blur(${blur}px)` : "none",
      }}
    >
      {hasPhoto && (
        // eslint-disable-next-line @next/next/no-img-element -- dekoratif full-bleed hero; next/image gereksiz
        <img
          className="oku-hero-photo"
          src={`/images/oku/${story.id}.jpg`}
          alt=""
          loading="lazy"
          decoding="async"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      )}
      <div
        className="oku-hero-tint"
        style={{
          background: `radial-gradient(ellipse 90% 70% at 30% 25%, hsla(${hue}, 60%, 30%, 0.32) 0%, transparent 60%)`,
        }}
      />
      <div className="oku-hero-vignette" />
      <svg className="oku-hero-grain" preserveAspectRatio="none">
        <filter id={id}>
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
          <feColorMatrix values="0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 1.2 0" />
        </filter>
        <rect width="100%" height="100%" filter={`url(#${id})`} />
      </svg>
      <div className="oku-hero-scanlines" />
      <div className="oku-hero-darken" />
    </div>
  );
}

// One swipeable card
interface CardProps {
  story: OkuStory;
  drag: { dx: number; dy: number } | null;
  expanded: boolean;
  flying: { kind: "save" | "skip"; dx: number; dy: number } | null;
  onPointerDown: (e: React.PointerEvent | React.TouchEvent) => void;
  onPointerMove: (e: React.PointerEvent | React.TouchEvent) => void;
  onPointerUp: () => void;
  onTap: () => void;
}
function StoryCard({ story, drag, expanded, flying, onPointerDown, onPointerMove, onPointerUp, onTap }: CardProps) {
  let transform = "";
  let opacity = 1;
  if (flying) {
    const dir = flying.kind === "save" ? 1 : -1;
    transform = `translate(${dir * 600}px, ${flying.dy * 0.4}px) rotate(${dir * 22}deg)`;
    opacity = 0;
  } else if (drag) {
    const rot = drag.dx / 18;
    transform = `translate(${drag.dx}px, ${drag.dy}px) rotate(${rot}deg)`;
  }

  return (
    <div
      className={`oku-card ${flying ? "flying" : ""} ${expanded ? "expanded" : ""}`}
      style={{ transform, opacity, transition: flying ? "transform 0.4s ease-out, opacity 0.4s ease-out" : drag ? "none" : "transform 0.2s ease-out" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onClick={onTap}
    >
      <StoryHero story={story} />

      {/* Hint chips (visible during drag) */}
      {drag && drag.dx > 30 && (
        <div className="oku-chip save">
          <Heart size={20} /> KAYDET
        </div>
      )}
      {drag && drag.dx < -30 && (
        <div className="oku-chip skip">
          <XIcon size={20} /> ATLA
        </div>
      )}

      {/* Card content */}
      <div className="oku-card-content">
        <div className="oku-meta">
          <span className="oku-cat">{story.category}</span>
          <span className="oku-time">{story.readTime}</span>
        </div>
        <h3 className="oku-title">{story.title}</h3>
        <p className="oku-hook">{story.hook}</p>
        <button className="oku-readmore" onClick={(e) => { e.stopPropagation(); onTap(); }}>
          <ArrowUp size={14} /> Okumak için kaydır veya tıkla
        </button>
      </div>
    </div>
  );
}

// Main feed
export function OkuDoom() {
  const [filter, setFilter] = useState<string | null>(null);
  const [showSaved, setShowSaved] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [reading, setReading] = useState<OkuStory | null>(null);
  const [idx, setIdx] = useState(0);
  const [drag, setDrag] = useState<{ dx: number; dy: number; sx: number; sy: number } | null>(null);
  const [flying, setFlying] = useState<{ kind: "save" | "skip"; dx: number; dy: number } | null>(null);
  const [flash, setFlash] = useState<"save" | "skip" | null>(null);
  const draggingPointerRef = useRef<number | null>(null);

  // Load saved
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setSavedIds(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);

  const saveSaved = useCallback((ids: string[]) => {
    setSavedIds(ids);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(ids)); } catch { /* ignore */ }
  }, []);

  const stories = useMemo(() => {
    if (filter) return okuStories.filter((s) => s.category === filter);
    return okuStories;
  }, [filter]);

  const current = stories[idx % stories.length];

  // Reset idx if filter changes
  useEffect(() => { setIdx(0); }, [filter]);

  const advance = useCallback(() => {
    setIdx((i) => (i + 1) % stories.length);
  }, [stories.length]);

  const doAction = useCallback((kind: "save" | "skip") => {
    setFlash(kind);
    setTimeout(() => setFlash(null), 400);
    if (kind === "save" && current) {
      if (!savedIds.includes(current.id)) {
        saveSaved([current.id, ...savedIds]);
      }
    }
    setTimeout(() => {
      setFlying(null);
      advance();
    }, 380);
  }, [current, savedIds, saveSaved, advance]);

  // Keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (reading) return;
      if (e.key === "ArrowLeft") { setFlying({ kind: "skip", dx: -300, dy: 0 }); doAction("skip"); }
      else if (e.key === "ArrowRight") { setFlying({ kind: "save", dx: 300, dy: 0 }); doAction("save"); }
      else if (e.key === "ArrowUp") { if (current) setReading(current); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [doAction, current, reading]);

  const onPointerDown = (e: React.PointerEvent | React.TouchEvent) => {
    if (flying) return;
    const pt = "touches" in e ? e.touches[0] : e;
    setDrag({ dx: 0, dy: 0, sx: pt.clientX, sy: pt.clientY });
    if ("pointerId" in e) draggingPointerRef.current = e.pointerId;
  };
  const onPointerMove = (e: React.PointerEvent | React.TouchEvent) => {
    if (!drag || flying) return;
    const pt = "touches" in e ? e.touches[0] : e;
    setDrag({ ...drag, dx: pt.clientX - drag.sx, dy: pt.clientY - drag.sy });
  };
  const onPointerUp = () => {
    if (!drag || flying) return;
    const { dx, dy } = drag;
    const xT = 80, yT = 70;
    if (dy < -yT && Math.abs(dy) > Math.abs(dx)) {
      if (current) setReading(current);
      setDrag(null);
      return;
    }
    if (dx > xT) {
      setFlying({ kind: "save", dx, dy });
      setDrag(null);
      doAction("save");
      return;
    }
    if (dx < -xT) {
      setFlying({ kind: "skip", dx, dy });
      setDrag(null);
      doAction("skip");
      return;
    }
    setDrag(null);
  };

  const removeSaved = (id: string) => saveSaved(savedIds.filter((x) => x !== id));
  const savedStories = savedIds.map((id) => okuStories.find((s) => s.id === id)).filter(Boolean) as OkuStory[];

  // Reading screen overlay
  if (reading) {
    return (
      <div className="oku-shell">
        <div className="oku-reader">
          <div className="oku-reader-hero">
            <StoryHero story={reading} blur={1.2} />
            <button className="oku-back" onClick={() => setReading(null)}>
              <XIcon size={16} /> Kapat
            </button>
            <div className="oku-reader-meta">
              <span className="oku-cat">{reading.category}</span>
              <span className="oku-time">{reading.readTime}</span>
            </div>
            <h2 className="oku-reader-title">{reading.title}</h2>
          </div>
          <div className="oku-reader-body">
            <p className="oku-reader-hook">{reading.hook}</p>
            {reading.body.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
            <div className="oku-reader-footer">
              <button
                className={`oku-action-btn ${savedIds.includes(reading.id) ? "saved" : ""}`}
                onClick={() => {
                  if (savedIds.includes(reading.id)) removeSaved(reading.id);
                  else saveSaved([reading.id, ...savedIds]);
                }}
              >
                <Bookmark size={14} />
                {savedIds.includes(reading.id) ? "Kayıtlı" : "Kaydet"}
              </button>
              <button className="oku-action-btn" onClick={() => setReading(null)}>
                Kapat
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Saved panel
  if (showSaved) {
    return (
      <div className="oku-shell">
        <div className="oku-saved-shell">
          <div className="oku-saved-head">
            <h2><Bookmark size={18} /> Kaydedilenler ({savedStories.length})</h2>
            <button className="oku-action-btn" onClick={() => setShowSaved(false)}>
              <XIcon size={14} /> Kapat
            </button>
          </div>
          {savedStories.length === 0 ? (
            <p className="oku-empty">
              Henüz kaydettiğin yok. Sağa kaydır 💾
            </p>
          ) : (
            <div className="oku-saved-list">
              {savedStories.map((s) => (
                <button
                  key={s.id}
                  className="oku-saved-item"
                  onClick={() => setReading(s)}
                >
                  <div className="oku-saved-thumb" style={{ background: toneBase(s.hero.hue, s.hero.tone) }} />
                  <div className="oku-saved-meta">
                    <span className="oku-cat">{s.category}</span>
                    <strong>{s.title}</strong>
                    <span className="oku-time">{s.readTime}</span>
                  </div>
                  <button
                    className="oku-saved-rm"
                    onClick={(e) => { e.stopPropagation(); removeSaved(s.id); }}
                    title="Kaldır"
                  >
                    <XIcon size={13} />
                  </button>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Main feed
  if (!current) {
    return (
      <div className="oku-shell">
        <div className="oku-empty-state">
          <p>Bu kategoride hikaye yok.</p>
          <button className="oku-action-btn" onClick={() => setFilter(null)}>Tüm kategoriler</button>
        </div>
      </div>
    );
  }

  return (
    <div className="oku-shell">
      <div className="oku-toolbar">
        <div className="oku-tabs">
          <button
            className={`oku-tab ${!filter ? "active" : ""}`}
            onClick={() => { setFilter(null); setShowFilters(false); }}
          >
            Tümü ({okuStories.length})
          </button>
          <button
            className="oku-tab oku-tab-filter"
            onClick={() => setShowFilters(v => !v)}
          >
            <Filter size={13} /> {filter || "Kategori"}
          </button>
          <button
            className="oku-tab"
            onClick={() => setShowSaved(true)}
          >
            <Bookmark size={13} /> ({savedIds.length})
          </button>
          <button
            className="oku-tab oku-tab-icon"
            onClick={() => setIdx(0)}
            title="Baştan"
          >
            <RotateCcw size={13} />
          </button>
        </div>
        {showFilters && (
          <div className="oku-filter-popup">
            {okuCategories.map((c) => (
              <button
                key={c}
                className={`oku-filter-btn ${filter === c ? "active" : ""}`}
                onClick={() => { setFilter(c); setShowFilters(false); }}
              >
                {c}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="oku-card-stack">
        {/* Next card preview behind */}
        {stories[(idx + 1) % stories.length] && (
          <div className="oku-card-back">
            <StoryHero story={stories[(idx + 1) % stories.length]} blur={1.5} />
          </div>
        )}
        <StoryCard
          key={current.id}
          story={current}
          drag={drag}
          flying={flying}
          expanded={false}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onTap={() => setReading(current)}
        />

        {/* Flash overlay */}
        {flash && (
          <div className={`oku-flash oku-flash-${flash}`}>
            {flash === "save" ? <Heart size={50} /> : <XIcon size={50} />}
          </div>
        )}
      </div>

      <div className="oku-actions">
        <button
          className="oku-action-btn skip"
          onClick={() => { setFlying({ kind: "skip", dx: -300, dy: 0 }); doAction("skip"); }}
        >
          <XIcon size={18} /> Atla
        </button>
        <button
          className="oku-action-btn read"
          onClick={() => current && setReading(current)}
        >
          <ArrowUp size={16} /> Oku
        </button>
        <button
          className="oku-action-btn save"
          onClick={() => { setFlying({ kind: "save", dx: 300, dy: 0 }); doAction("save"); }}
        >
          <Heart size={18} /> Kaydet
        </button>
      </div>
      <p className="oku-hint">
        Sağa kaydır = kaydet · Sola = atla · Yukarı = oku · ← → ↑ tuşları da çalışır
      </p>
    </div>
  );
}
