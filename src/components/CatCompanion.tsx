"use client";

// 3D render kedi yoldaş — Blender'da render edilmiş zencefil tabby.
// Pozlar: run (sprite), idle, happy, crouch, jump, sleep + mimik pozları.
// Davranışlar: normal dolaşma · sevilme · zıplama (random) · tab uyuması.
// Kaynak: /public/cat/cat-{run-sprite,idle,happy,crouch,jump,sleep,look-*,ear-flick,blink}.png

import { useCallback, useEffect, useRef, useState } from "react";

const COLS = 6;
const ROWS = 6;
const FPS = 24;
const W = 108;
const H = 54;
const SPEED = 140;
const MARGIN = W + 24;
const JUMP_PEAK = 90;   // px — zıplama yüksekliği
const JUMP_DUR  = 1100; // ms — toplam zıplama süresi
const RISE_SPD  = 110;  // px/s — tab'a çıkış hızı
const FALL_SPD  = 160;  // px/s — tab'dan iniş hızı
const TAB_NAV_ID = "cat-tab-nav";

const NAMES = ["Pamuk", "Tekir", "Boncuk", "Zeytin", "Duman", "Şanslı", "Badem", "Mırnav"];
const PURRS = ["mırr~", "mırnav 🐾", "🥰", "daha!", "keyifli~", "prr…", "😻", "mutluyum"];
const ZZZES = ["💤 zzz", "zzz~", "zzzz 😴", "hmm... zzz", "💤"];
const STORAGE = "chillout-cat3d";

const TAB_COMMENTS: Record<string, string[]> = {
  kesfet: [
    "İlginç site bu! 👀",
    "Nereye gidiyoruz?",
    "Keşfedelim! 🐾",
    "Ben de merak ediyorum~",
    "Bu siteyi biliyorum~",
    "Birlikte gezelim 🌍",
  ],
  pomodoro: [
    "25 dakika... ben uyurum o zaman",
    "Konsantre ol! 🍅",
    "Zaman uçuyor mırnav~",
    "Odak modu açık!",
    "Ben izliyorum~",
    "Yorulursan sevilmek ister misin?",
  ],
  nefes: [
    "Derin nefes... *mırr*",
    "Seninle nefes alıyorum~",
    "Huzur huzur~ 💨",
    "Yavaş yavaş... zzz",
    "Ben de sakinleştim",
    "Yoga kedisi burada 🧘",
  ],
  yilan: [
    "Döner mi yedim ben de?! 🌯",
    "Dikkat et kuyruğa!",
    "Yılan dostlarım~",
    "Hızlı gidiyorsun!",
    "Ben de oynamak istiyorum",
    "Çarpma çarpma! 🐾",
  ],
  oku: [
    "Güzel hikaye miymiş?",
    "Ben de okuyorum~ 📖",
    "Sessizce dinliyorum~",
    "Bir çay molası 🍵",
    "Bugün ne okuyoruz?",
    "Kelimeler güzeldir~",
  ],
  bulmaca: [
    "Hmm... bilmiyorum 🤔",
    "Düşün düşün!",
    "Ben biliyorum ama söylemiyorum~",
    "Zekice bir soru!",
    "Kafam karıştı 😵",
    "İpucu ister misin? mırnav~",
  ],
};

type State = "run" | "idle" | "happy" | "crouch" | "jump" | "sleep";
type Mode  = "wait" | "enter" | "dwell" | "stroll" | "tabrise" | "tabhold" | "tabfall";
type Heart = { id: number; dx: number };
type Mimic = "look-up" | "look-down" | "look-back" | "look-front" | "ear-flick" | "blink";

const MIMICS: Mimic[] = ["look-up", "look-down", "look-back", "look-front", "ear-flick", "blink"];

export function CatCompanion({ activeTab }: { activeTab?: string }) {
  const [x,       setX]       = useState(-MARGIN);
  const [yOff,    setYOff]    = useState(0);
  const [dir,     setDir]     = useState<"right" | "left">("right");
  const [state,   setState]   = useState<State>("run");
  const [mode,    setMode]    = useState<Mode>("wait");
  const [visible, setVisible] = useState(false);
  const [hearts,  setHearts]  = useState<Heart[]>([]);
  const [bubble,  setBubble]  = useState<string | null>(null);
  const [mimic,   setMimic]   = useState<Mimic | null>(null);

  const nameRef  = useRef("Pamuk");
  const affRef   = useRef(0);
  const heartSeq = useRef(0);

  const ctrl = useRef({
    x: -MARGIN,
    dir: "right" as "right" | "left",
    state: "run" as State,
    mode: "wait" as Mode,
    targetX: 0,
    dwellUntil: 0,
    petUntil: 0,
    nextAt: 0,
    // dikey hareket
    yOff: 0,
    // zıplama
    jumpActive: false,
    jumpStart: 0,
    // tab uyusu
    tabTargetX: 0,
    tabTargetYOff: 0,
    tabHoldUntil: 0,
  });
  const reduceRef = useRef(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE);
      if (raw) {
        const p = JSON.parse(raw);
        nameRef.current = p.name || nameRef.current;
        affRef.current  = p.aff  || 0;
      } else {
        nameRef.current = NAMES[Math.floor(Math.random() * NAMES.length)];
        localStorage.setItem(STORAGE, JSON.stringify({ name: nameRef.current, aff: 0 }));
      }
    } catch { /* yoksay */ }
  }, []);

  const wakeFromTabSleep = useCallback(() => {
    const c = ctrl.current;
    if (c.mode !== "tabhold") return;
    c.mode = "tabfall";
    setBubble(null);
  }, []);

  const pet = useCallback(() => {
    const c = ctrl.current;
    if (!visible) return;
    // Tab uyusundayken tıklama → uyan
    if (c.mode === "tabhold" || c.mode === "tabrise") { wakeFromTabSleep(); return; }
    const now = performance.now();
    c.petUntil = now + 1700;
    affRef.current += 1;
    try { localStorage.setItem(STORAGE, JSON.stringify({ name: nameRef.current, aff: affRef.current })); } catch { /**/ }
    const n = 3;
    const batch: Heart[] = [];
    for (let i = 0; i < n; i++) {
      const id = ++heartSeq.current;
      batch.push({ id, dx: (i - (n - 1) / 2) * 16 + (Math.random() * 8 - 4) });
    }
    setHearts((h) => [...h, ...batch]);
    batch.forEach((b) => window.setTimeout(() => setHearts((h) => h.filter((hh) => hh.id !== b.id)), 1300));
    const line = affRef.current % 5 === 0 ? `${nameRef.current} 🐾` : PURRS[Math.floor(Math.random() * PURRS.length)];
    setBubble(line);
    window.setTimeout(() => setBubble((b) => (b === line ? null : b)), 1500);
  }, [visible, wakeFromTabSleep]);

  const hello = useCallback(() => {
    const c = ctrl.current;
    if (!visible || c.petUntil > performance.now()) return;
    if (c.mode === "tabhold") return;
    setBubble(`${nameRef.current} 🐾`);
    window.setTimeout(() => setBubble((b) => (b === `${nameRef.current} 🐾` ? null : b)), 1400);
  }, [visible]);

  // ── Ana rAF döngüsü ──────────────────────────────────────────────────
  useEffect(() => {
    reduceRef.current =
      typeof window !== "undefined" &&
      !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    let mounted  = true;
    let raf      = 0;
    let lastT    = 0;
    const c = ctrl.current;
    c.mode    = "wait";
    c.nextAt  = 0;
    let started = false;

    const vw  = () => window.innerWidth  || 1280;
    const rnd = (a: number, b: number) => a + Math.random() * (b - a);

    let lastX   = NaN, lastYOff = NaN;
    let lastDir = "", lastState = "", lastMode = "", lastVis = false;

    const flush = () => {
      const dx = !Number.isFinite(lastX) || Math.abs(c.x     - lastX)   >= 0.5;
      const dy = !Number.isFinite(lastYOff) || Math.abs(c.yOff - lastYOff) >= 0.5;
      if (dx || dy) { lastX = c.x; lastYOff = c.yOff; setX(c.x); setYOff(c.yOff); }
      if (c.dir   !== lastDir)   { lastDir   = c.dir;   setDir(c.dir); }
      if (c.state !== lastState) { lastState = c.state; setState(c.state); }
      if (c.mode  !== lastMode)  { lastMode  = c.mode;  setMode(c.mode); }
      const vis = c.mode !== "wait";
      if (vis !== lastVis) { lastVis = vis; setVisible(vis); }
    };

    // Tab nav konumunu bul (px, ekranın altından)
    const getTabYOff = (): { tabX: number; tabYOff: number } | null => {
      const nav = typeof document !== "undefined" ? document.getElementById(TAB_NAV_ID) : null;
      if (!nav) return null;
      const rect = nav.getBoundingClientRect();
      const vh   = window.innerHeight || 900;
      // Kedinin sekmenin üstüne konması: sekme alti = rect.bottom; yOff = vh - rect.top - H
      const tabYOff = Math.max(H + 8, vh - rect.top + 4);
      const tabX    = Math.round(rect.left + rect.width * 0.35);
      return { tabX, tabYOff };
    };

    const loop = (t: number) => {
      if (!mounted) return;
      if (!lastT) lastT = t;
      const dt = Math.min(0.05, (t - lastT) / 1000);
      lastT = t;

      // ── SEVİLME ──
      if (c.petUntil > t) {
        c.state = "happy";
      } else {
        if (c.state === "happy") {
          c.state     = "idle";
          c.mode      = "dwell";
          c.dwellUntil = t + rnd(2500, 4500);
          c.jumpActive = false;
        }

        switch (c.mode) {

          // ── GİRİŞ ──
          case "wait":
          case "enter": {
            c.mode = "enter";
            const sign = c.dir === "right" ? 1 : -1;
            c.x += sign * SPEED * dt;
            const reached = c.dir === "right" ? c.x >= c.targetX : c.x <= c.targetX;
            if (reached) {
              c.x = c.targetX; c.state = "idle"; c.mode = "dwell";
              c.dwellUntil = t + rnd(6000, 12000);
            }
            break;
          }

          // ── BEKLEME (dwell) ──
          case "dwell": {
            // Zıplama aktifse yönet
            if (c.jumpActive) {
              const elapsed = t - c.jumpStart;
              const p = Math.min(1, elapsed / JUMP_DUR);
              if (p < 0.18) {
                c.state = "crouch"; c.yOff = 0;
              } else if (p < 0.82) {
                const tp = (p - 0.18) / 0.64;
                c.yOff = JUMP_PEAK * 4 * tp * (1 - tp);
                c.state = "jump";
              } else {
                c.state = "crouch"; c.yOff = Math.max(0, c.yOff - 160 * dt);
              }
              if (p >= 1) { c.jumpActive = false; c.state = "idle"; c.yOff = 0; }
            } else {
              c.state = "idle";
              if (t >= c.dwellUntil) {
                const roll = Math.random();

                // 15%: zıpla
                if (roll < 0.15 && c.yOff === 0) {
                  c.jumpActive = true;
                  c.jumpStart  = t;
                  c.dwellUntil = t + JUMP_DUR + 600; // zıplama bitince biraz daha bekle
                  break;
                }

                // 10%: tab'a çık (eğer tab nav varsa)
                if (roll < 0.25 && c.yOff === 0) {
                  const info = getTabYOff();
                  if (info) {
                    c.tabTargetX    = info.tabX;
                    c.tabTargetYOff = info.tabYOff;
                    c.mode = "tabrise";
                    break;
                  }
                }

                // Normal stroll
                let nx = rnd(vw() * 0.12, vw() * 0.82);
                if (Math.abs(nx - c.x) < vw() * 0.2) {
                  nx = c.x < vw() * 0.5 ? rnd(vw() * 0.55, vw() * 0.82) : rnd(vw() * 0.12, vw() * 0.45);
                }
                c.targetX = Math.max(MARGIN, Math.min(vw() - MARGIN, nx));
                c.dir     = c.targetX >= c.x ? "right" : "left";
                c.state   = "run";
                c.mode    = "stroll";
              }
            }
            break;
          }

          // ── DOLAŞMA ──
          case "stroll": {
            const s = c.dir === "right" ? 1 : -1;
            c.x += s * SPEED * dt;
            const reached = c.dir === "right" ? c.x >= c.targetX : c.x <= c.targetX;
            if (reached) {
              c.x = c.targetX; c.state = "idle"; c.mode = "dwell";
              c.dwellUntil = t + rnd(6000, 12000);
            }
            break;
          }

          // ── TAB'A ÇIKMA ──
          case "tabrise": {
            // Yatay: tab'ın X'ine yürü
            const dx = c.tabTargetX - c.x;
            if (Math.abs(dx) > 3) {
              c.x += Math.sign(dx) * SPEED * dt;
              c.dir   = dx > 0 ? "right" : "left";
              c.state = "run";
            } else {
              c.x     = c.tabTargetX;
              c.state = "crouch";
            }
            // Dikey: yavaşça yüksel
            if (c.yOff < c.tabTargetYOff - 1) {
              c.yOff = Math.min(c.tabTargetYOff, c.yOff + RISE_SPD * dt);
            } else {
              c.yOff = c.tabTargetYOff;
              // Hedefe ulaştıysak ve doğru X'teysek uyu
              if (Math.abs(c.x - c.tabTargetX) <= 4) {
                c.state        = "sleep";
                c.mode         = "tabhold";
                c.tabHoldUntil = t + rnd(12000, 22000);
              }
            }
            break;
          }

          // ── TAB'DA UYKU ──
          case "tabhold":
            c.state = "sleep";
            if (t >= c.tabHoldUntil) { c.mode = "tabfall"; }
            break;

          // ── AŞAĞI İNME ──
          case "tabfall": {
            c.state = "crouch";
            if (c.yOff > 1) {
              c.yOff = Math.max(0, c.yOff - FALL_SPD * dt);
            } else {
              c.yOff = 0; c.state = "idle"; c.mode = "dwell";
              c.dwellUntil = t + rnd(4000, 8000);
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
        c.dir = "right"; c.x = -MARGIN;
        c.targetX = Math.round((window.innerWidth || 1280) * 0.42);
        c.state = "run"; c.mode = "enter";
        c.dwellUntil = 0; c.nextAt = performance.now();
        started = true;
        raf = requestAnimationFrame(loop);
      }, 350);
      return () => { mounted = false; clearTimeout(startTimer); if (raf) cancelAnimationFrame(raf); };
    }

    // hareket azaltılmışsa: sadece bir kez gelip otursun
    c.dir = "right"; c.x = Math.round((vw() || 1280) * 0.42);
    c.state = "idle"; c.mode = "dwell"; c.dwellUntil = Infinity;
    flush();
    return () => { mounted = false; if (raf) cancelAnimationFrame(raf); void started; };
  }, []);

  // ── Mimik döngüsü (sadece idle'da) ──────────────────────────────────
  useEffect(() => {
    if (!visible || state !== "idle" || reduceRef.current) { setMimic(null); return; }
    let alive = true;
    let showT: number | undefined, hideT: number | undefined;
    const schedule = () => {
      if (!alive) return;
      const delay = 1600 + Math.random() * 2900;
      showT = window.setTimeout(() => {
        if (!alive) return;
        const pick = MIMICS[Math.floor(Math.random() * MIMICS.length)];
        setMimic(pick);
        const dur = pick === "blink" ? 160 : 700 + Math.random() * 900;
        hideT = window.setTimeout(() => { if (!alive) return; setMimic(null); schedule(); }, dur);
      }, delay);
    };
    schedule();
    return () => { alive = false; if (showT) clearTimeout(showT); if (hideT) clearTimeout(hideT); setMimic(null); };
  }, [visible, state]);

  // ── Tab uyusu zzz balonu ─────────────────────────────────────────────
  useEffect(() => {
    if (mode !== "tabhold") { return; }
    let alive = true;
    const showZzz = () => {
      if (!alive) return;
      const line = ZZZES[Math.floor(Math.random() * ZZZES.length)];
      setBubble(line);
      window.setTimeout(() => { if (alive) setBubble((b) => (b === line ? null : b)); }, 2200);
      // bir sonraki zzz
      const next = window.setTimeout(showZzz, 4000 + Math.random() * 4000);
      return next;
    };
    const first = window.setTimeout(showZzz, 1500);
    return () => { alive = false; clearTimeout(first); setBubble(null); };
  }, [mode]);

  // ── Konu yorumu ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!visible || state !== "idle" || !activeTab) return;
    if (Math.random() > 0.7) return;
    let alive = true;
    const delay = 4000 + Math.random() * 7000;
    const t = window.setTimeout(() => {
      if (!alive || ctrl.current.petUntil > performance.now()) return;
      const pool = TAB_COMMENTS[activeTab];
      if (!pool?.length) return;
      const line = pool[Math.floor(Math.random() * pool.length)];
      setBubble(line);
      window.setTimeout(() => { if (alive) setBubble((b) => (b === line ? null : b)); }, 2800);
    }, delay);
    return () => { alive = false; clearTimeout(t); };
  }, [visible, state, activeTab]);

  const sheetW = W * COLS;
  const sheetH = H * ROWS;

  return (
    <div
      className="cat3d-companion"
      role="button"
      aria-label="Kedi — sevmek için tıkla"
      onPointerDown={pet}
      onPointerEnter={hello}
      style={{
        transform: `translateX(${Math.round(x)}px) translateY(${-Math.round(yOff)}px)`,
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? "auto" : "none",
      }}
    >
      <div className="cat3d-flip" style={{ transform: `scaleX(${dir === "left" ? -1 : 1})` }}>
        <div className={`cat3d-sprite is-${state}`} />
        {state === "idle" && (
          <div
            className="cat3d-mimic"
            style={{
              backgroundImage: mimic ? `url("/cat/cat-${mimic}.png")` : "none",
              opacity: mimic ? 1 : 0,
            }}
          />
        )}
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
        /* ── koşma ── */
        .cat3d-sprite.is-run {
          background-image: url("/cat/cat-run-sprite.png");
          background-size: ${sheetW}px ${sheetH}px;
          animation: cat3d-col ${COLS / FPS}s steps(${COLS}) infinite,
            cat3d-row ${(COLS * ROWS) / FPS}s steps(${ROWS}) infinite;
        }
        /* ── bekleme ── */
        .cat3d-sprite.is-idle {
          background-image: url("/cat/cat-idle.png");
          background-size: 100% 100%;
          transform-origin: bottom center;
          animation: cat3d-breathe 2.7s ease-in-out infinite alternate;
        }
        /* ── çömelme (pre/post jump) ── */
        .cat3d-sprite.is-crouch {
          background-image: url("/cat/cat-crouch.png");
          background-size: 100% 100%;
          transform-origin: bottom center;
          animation: cat3d-compress 0.18s ease-out forwards;
        }
        /* ── havada (zıplama) ── */
        .cat3d-sprite.is-jump {
          background-image: url("/cat/cat-jump.png");
          background-size: 100% 100%;
          transform-origin: bottom center;
          animation: cat3d-stretch 0.22s ease-out forwards;
        }
        /* ── uyku (tab üstünde) ── */
        .cat3d-sprite.is-sleep {
          background-image: url("/cat/cat-sleep.png");
          background-size: 100% 100%;
          transform-origin: bottom center;
          animation: cat3d-sleepdrift 5s ease-in-out infinite alternate;
        }
        /* ── mutlu ── */
        .cat3d-sprite.is-happy {
          background-image: url("/cat/cat-happy.png");
          background-size: 100% 100%;
          transform-origin: bottom center;
          animation: cat3d-wiggle 0.5s ease-in-out 3;
        }
        .cat3d-mimic {
          position: absolute;
          inset: 0;
          background-repeat: no-repeat;
          background-size: 100% 100%;
          background-position: 0 0;
          transform-origin: bottom center;
          transition: opacity 0.22s ease-in-out;
          animation: cat3d-breathe 2.7s ease-in-out infinite alternate;
          pointer-events: none;
        }
        @keyframes cat3d-col {
          to { background-position-x: -${sheetW}px; }
        }
        @keyframes cat3d-row {
          to { background-position-y: -${sheetH}px; }
        }
        @keyframes cat3d-breathe {
          from { transform: translateY(0) scaleY(1); }
          to   { transform: translateY(-1px) scaleY(1.035); }
        }
        @keyframes cat3d-sleepdrift {
          from { transform: translateY(0) scaleY(1) scaleX(1); }
          to   { transform: translateY(-1px) scaleY(1.025) scaleX(1.01); }
        }
        @keyframes cat3d-compress {
          from { transform: scaleY(1); }
          to   { transform: scaleY(0.88) translateY(3px); }
        }
        @keyframes cat3d-stretch {
          from { transform: scaleX(1) scaleY(1); }
          to   { transform: scaleX(1.06) scaleY(0.96); }
        }
        @keyframes cat3d-wiggle {
          0%, 100% { transform: rotate(0deg); }
          25%       { transform: rotate(-4deg); }
          75%       { transform: rotate(4deg); }
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
          from { opacity: 0; transform: translateX(-50%) translateY(4px) scale(0.9); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0)   scale(1); }
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
          0%   { opacity: 0; transform: translate(calc(-50% + var(--dx, 0px)), 0) scale(0.5); }
          20%  { opacity: 1; }
          100% { opacity: 0; transform: translate(calc(-50% + var(--dx, 0px)), -48px) scale(1.15); }
        }
        @media (prefers-reduced-motion: reduce) {
          .cat3d-sprite.is-run,
          .cat3d-sprite.is-idle,
          .cat3d-sprite.is-happy,
          .cat3d-sprite.is-crouch,
          .cat3d-sprite.is-jump,
          .cat3d-sprite.is-sleep,
          .cat3d-mimic {
            animation: none;
          }
          .cat3d-mimic { display: none; }
        }
      `}</style>
    </div>
  );
}
