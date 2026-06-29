"use client";

// 3D render kedi yoldaş — Blender'da render edilmiş zencefil tabby.
// Pozlar: koşu (sprite sheet, 36 kare @24fps) + ayakta dinlenme (idle) + mutlu (sevme tepkisi).
// Davranış: kedi gelir → durur/dinlenir (nefes alır) → tıklayınca sevilir (kalpler + balon) → yürür gider.
// Kaynak varlıklar: /public/cat/cat-run-sprite.png, cat-idle.png, cat-happy.png · Ayrıntı: USAGE.md

import { useCallback, useEffect, useRef, useState } from "react";

const COLS = 6;
const ROWS = 6;
const FPS = 24;
const W = 108; // görüntü genişliği (px)
const H = 54; // görüntü yüksekliği (px)
const SPEED = 140; // px/s — rahat tırıs
const MARGIN = W + 24;

const NAMES = ["Pamuk", "Tekir", "Boncuk", "Zeytin", "Duman", "Şanslı", "Badem", "Mırnav"];
const PURRS = ["mırr~", "mırnav 🐾", "🥰", "daha!", "keyifli~", "prr…", "😻", "mutluyum"];
const STORAGE = "chillout-cat3d";

type State = "run" | "idle" | "happy";
type Mode = "wait" | "enter" | "dwell" | "leave";
type Heart = { id: number; dx: number };

export function CatCompanion() {
  const [x, setX] = useState(-MARGIN);
  const [dir, setDir] = useState<"right" | "left">("right");
  const [state, setState] = useState<State>("run");
  const [visible, setVisible] = useState(false);
  const [hearts, setHearts] = useState<Heart[]>([]);
  const [bubble, setBubble] = useState<string | null>(null);

  const nameRef = useRef("Pamuk");
  const affRef = useRef(0);
  const heartSeq = useRef(0);

  // rAF kontrolcüsü (state ile senkron, ama her kareyi React'e basmadan)
  const ctrl = useRef({
    x: -MARGIN,
    dir: "right" as "right" | "left",
    state: "run" as State,
    mode: "wait" as Mode,
    targetX: 0,
    dwellUntil: 0,
    petUntil: 0,
    nextAt: 0,
  });
  const reduceRef = useRef(false);

  // load name + affection
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE);
      if (raw) {
        const p = JSON.parse(raw);
        nameRef.current = p.name || nameRef.current;
        affRef.current = p.aff || 0;
      } else {
        nameRef.current = NAMES[Math.floor(Math.random() * NAMES.length)];
        localStorage.setItem(STORAGE, JSON.stringify({ name: nameRef.current, aff: 0 }));
      }
    } catch {
      /* yoksay */
    }
  }, []);

  const pet = useCallback(() => {
    const c = ctrl.current;
    if (!visible) return;
    const now = performance.now();
    c.petUntil = now + 1700;
    affRef.current += 1;
    try {
      localStorage.setItem(STORAGE, JSON.stringify({ name: nameRef.current, aff: affRef.current }));
    } catch {
      /* yoksay */
    }
    // kalpler
    const n = 3;
    const batch: Heart[] = [];
    for (let i = 0; i < n; i++) {
      const id = ++heartSeq.current;
      batch.push({ id, dx: (i - (n - 1) / 2) * 16 + (Math.random() * 8 - 4) });
    }
    setHearts((h) => [...h, ...batch]);
    batch.forEach((b) =>
      window.setTimeout(() => setHearts((h) => h.filter((x) => x.id !== b.id)), 1300)
    );
    // balon
    const line =
      affRef.current % 5 === 0
        ? `${nameRef.current} 🐾`
        : PURRS[Math.floor(Math.random() * PURRS.length)];
    setBubble(line);
    window.setTimeout(() => setBubble((b) => (b === line ? null : b)), 1500);
  }, [visible]);

  const hello = useCallback(() => {
    const c = ctrl.current;
    if (!visible || c.petUntil > performance.now()) return;
    setBubble(`${nameRef.current} 🐾`);
    window.setTimeout(() => setBubble((b) => (b === `${nameRef.current} 🐾` ? null : b)), 1400);
  }, [visible]);

  useEffect(() => {
    reduceRef.current =
      typeof window !== "undefined" &&
      !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    let mounted = true;
    let raf = 0;
    let lastT = 0;
    const c = ctrl.current;
    c.mode = "wait";
    c.nextAt = 0; // ilk girişi hemen planla (aşağıda 1.2s gecikme)
    let started = false;

    const vw = () => window.innerWidth || 1280;
    const rnd = (a: number, b: number) => a + Math.random() * (b - a);

    // değişince-bas yardımcıları (idle sırasında re-render fırtınası olmasın)
    let lastX = NaN,
      lastDir = "",
      lastState = "",
      lastVis = false;
    const flush = () => {
      if (!Number.isFinite(lastX) || Math.abs(c.x - lastX) >= 0.5) {
        lastX = c.x;
        setX(c.x);
      }
      if (c.dir !== lastDir) {
        lastDir = c.dir;
        setDir(c.dir);
      }
      if (c.state !== lastState) {
        lastState = c.state;
        setState(c.state);
      }
      const vis = c.mode !== "wait";
      if (vis !== lastVis) {
        lastVis = vis;
        setVisible(vis);
      }
    };

    const loop = (t: number) => {
      if (!mounted) return;
      if (!lastT) lastT = t;
      const dt = Math.min(0.05, (t - lastT) / 1000);
      lastT = t;
      const sign = c.dir === "right" ? 1 : -1;

      if (c.petUntil > t) {
        c.state = "happy"; // sevilirken dur ve mutlu ol
      } else {
        if (c.state === "happy") {
          c.state = "idle";
          c.mode = "dwell";
          c.dwellUntil = t + rnd(2500, 4500);
        }
        switch (c.mode) {
          case "wait":
            if (t >= c.nextAt) {
              c.dir = Math.random() < 0.5 ? "right" : "left";
              c.x = c.dir === "right" ? -MARGIN : vw() + MARGIN;
              c.targetX =
                c.dir === "right" ? rnd(vw() * 0.22, vw() * 0.55) : rnd(vw() * 0.45, vw() * 0.78);
              c.state = "run";
              c.mode = "enter";
            }
            break;
          case "enter": {
            c.x += sign * SPEED * dt;
            const reached = c.dir === "right" ? c.x >= c.targetX : c.x <= c.targetX;
            if (reached) {
              c.x = c.targetX;
              c.state = "idle";
              c.mode = "dwell";
              c.dwellUntil = t + rnd(4000, 8000);
            }
            break;
          }
          case "dwell":
            c.state = "idle";
            if (t >= c.dwellUntil) {
              c.state = "run";
              c.mode = "leave";
            }
            break;
          case "leave": {
            c.x += sign * SPEED * dt;
            const off = c.dir === "right" ? c.x > vw() + MARGIN : c.x < -MARGIN;
            if (off) {
              c.mode = "wait";
              c.nextAt = t + rnd(5000, 11000);
            }
            break;
          }
        }
      }

      flush();
      raf = requestAnimationFrame(loop);
    };

    if (!reduceRef.current) {
      const startTimer = window.setTimeout(() => {
        // İlk geçişi garanti et: soldan, ortaya, görünür, uzun molalı
        c.dir = "right";
        c.x = -MARGIN;
        c.targetX = Math.round((window.innerWidth || 1280) * 0.42);
        c.state = "run";
        c.mode = "enter";
        c.dwellUntil = 0;
        c.nextAt = performance.now();
        started = true;
        raf = requestAnimationFrame(loop);
      }, 350);
      return () => {
        mounted = false;
        clearTimeout(startTimer);
        if (raf) cancelAnimationFrame(raf);
      };
    }

    // hareket azaltılmışsa: sadece bir kez gelip otursun, koşturmasın
    c.dir = "right";
    c.x = Math.round((vw() || 1280) * 0.42);
    c.state = "idle";
    c.mode = "dwell";
    c.dwellUntil = Infinity;
    flush();
    return () => {
      mounted = false;
      if (raf) cancelAnimationFrame(raf);
      void started;
    };
  }, []);

  const sheetW = W * COLS;
  const sheetH = H * ROWS;

  return (
    <div
      className="cat3d-companion"
      role="button"
      aria-label={`Kedi — sevmek için tıkla`}
      onPointerDown={pet}
      onPointerEnter={hello}
      style={{
        transform: `translateX(${Math.round(x)}px)`,
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? "auto" : "none",
      }}
    >
      <div className="cat3d-flip" style={{ transform: `scaleX(${dir === "left" ? -1 : 1})` }}>
        <div className={`cat3d-sprite is-${state}`} />
      </div>

      {bubble && <div className="cat3d-bubble">{bubble}</div>}
      {hearts.map((h) => (
        <span key={h.id} className="cat3d-heart" style={{ ["--dx" as string]: `${h.dx}px` }}>
          ❤
        </span>
      ))}

      <style jsx>{`
        .cat3d-companion {
          position: fixed;
          left: 0;
          bottom: 18px;
          width: ${W}px;
          height: ${H}px;
          z-index: 60;
          cursor: pointer;
          will-change: transform, opacity;
          transition: opacity 0.45s ease;
          filter: drop-shadow(0 0 10px rgba(255, 211, 115, 0.35))
            drop-shadow(0 4px 6px rgba(0, 0, 0, 0.55));
          -webkit-tap-highlight-color: transparent;
        }
        .cat3d-companion:hover {
          filter: drop-shadow(0 5px 11px rgba(255, 211, 115, 0.55));
        }
        .cat3d-flip {
          width: 100%;
          height: 100%;
        }
        .cat3d-sprite {
          width: 100%;
          height: 100%;
          background-repeat: no-repeat;
          background-position: 0 0;
        }
        .cat3d-sprite.is-run {
          background-image: url("/cat/cat-run-sprite.png");
          background-size: ${sheetW}px ${sheetH}px;
          animation: cat3d-col ${COLS / FPS}s steps(${COLS}) infinite,
            cat3d-row ${(COLS * ROWS) / FPS}s steps(${ROWS}) infinite;
        }
        .cat3d-sprite.is-idle {
          background-image: url("/cat/cat-idle.png");
          background-size: 100% 100%;
          transform-origin: bottom center;
          animation: cat3d-breathe 2.7s ease-in-out infinite alternate;
        }
        .cat3d-sprite.is-happy {
          background-image: url("/cat/cat-happy.png");
          background-size: 100% 100%;
          transform-origin: bottom center;
          animation: cat3d-wiggle 0.5s ease-in-out 3;
        }
        @keyframes cat3d-col {
          to {
            background-position-x: -${sheetW}px;
          }
        }
        @keyframes cat3d-row {
          to {
            background-position-y: -${sheetH}px;
          }
        }
        @keyframes cat3d-breathe {
          from {
            transform: translateY(0) scaleY(1);
          }
          to {
            transform: translateY(-1px) scaleY(1.035);
          }
        }
        @keyframes cat3d-wiggle {
          0%,
          100% {
            transform: rotate(0deg);
          }
          25% {
            transform: rotate(-4deg);
          }
          75% {
            transform: rotate(4deg);
          }
        }
        .cat3d-bubble {
          position: absolute;
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%);
          margin-bottom: 7px;
          background: rgba(12, 18, 29, 0.92);
          color: #f7d8b0;
          border: 1px solid rgba(255, 211, 115, 0.4);
          padding: 3px 9px;
          border-radius: 11px;
          font-size: 12px;
          line-height: 1.2;
          white-space: nowrap;
          pointer-events: none;
          animation: cat3d-pop 0.18s ease-out;
        }
        @keyframes cat3d-pop {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(4px) scale(0.9);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0) scale(1);
          }
        }
        .cat3d-heart {
          position: absolute;
          left: 50%;
          bottom: 62%;
          font-size: 14px;
          color: #ff7c9d;
          pointer-events: none;
          animation: cat3d-heart 1.3s ease-out forwards;
        }
        @keyframes cat3d-heart {
          0% {
            opacity: 0;
            transform: translate(calc(-50% + var(--dx, 0px)), 0) scale(0.5);
          }
          20% {
            opacity: 1;
          }
          100% {
            opacity: 0;
            transform: translate(calc(-50% + var(--dx, 0px)), -48px) scale(1.15);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .cat3d-sprite.is-run,
          .cat3d-sprite.is-idle,
          .cat3d-sprite.is-happy {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
