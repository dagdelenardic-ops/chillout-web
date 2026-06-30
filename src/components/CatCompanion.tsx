"use client";

// 3D render kedi yoldaş — Blender'da render edilmiş zencefil tabby.
// Pozlar: run (sprite), idle, happy, crouch, jump, sleep, groom, stretch + mimik pozları.
// Davranışlar: dolaşma · sevilme · yerinde zıplama · yalanma · gerinme · yerde şekerleme ·
//              zoomies (ani fırlama) · sekmeye sıçrayıp ayak sarkıtarak uyuma · site/içerik yorumu.
// Kaynak: /public/cat/cat-{run-sprite,idle,happy,crouch,jump,sleep,look-*,ear-flick,blink}.png

import { useCallback, useEffect, useRef, useState } from "react";

const COLS = 6;
const ROWS = 6;
const FPS = 24;
const W = 108;
const H = 54;
const SPEED = 140;
const ZOOM_SPEED = SPEED * 2.4; // px/s — zoomies (ani fırlama) hızı
const MARGIN = W + 24;
const JUMP_PEAK = 90;   // px — yerinde zıplama yüksekliği
const JUMP_DUR  = 1100; // ms — yerinde zıplama süresi
const LEAP_DUR  = 700;  // ms — sekmeye sıçrama yayı süresi
const FALL_SPD  = 160;  // px/s — tab'dan iniş hızı
const TAB_NAV_ID = "cat-tab-nav";

const NAMES = ["Pamuk", "Tekir", "Boncuk", "Zeytin", "Duman", "Şanslı", "Badem", "Mırnav"];
const PURRS = ["mırr~", "mırnav 🐾", "🥰", "daha!", "keyifli~", "prr…", "😻", "mutluyum"];
const ZZZES = ["💤 zzz", "zzz~", "zzzz 😴", "hmm... zzz", "💤"];
// Sekmede uyurken görülen rüya balonları
const DREAMS = ["💭 balık…", "💭 fare kovalıyorum~", "rüyamda mırr…", "💭 yün yumağı", "💭 güneşli pencere", "💭 sıcak kucak"];
const STORAGE = "chillout-cat3d";

// Sitenin geneli / havası hakkında yorumlar (her sekmede geçerli)
const SITE_COMMENTS = [
  "Burası çok huzurlu~ 🌿",
  "Arkadaki manzara ne güzel…",
  "Bu müzik içimi açıyor 🎵",
  "Chillout'ta yaşamak isterdim~",
  "Sen çalış, ben kollarım 🐾",
  "Burası benim evim oldu 🏡",
  "Dalga sesi gibi… 🌊",
  "İyi ki buradayım~",
  "Bu saatte renkler çok güzel",
  "Mırnav… burayı sevdim",
  "Biraz mola ver, beni sev 😽",
  "Sakin ol, acelemiz yok~",
];

const TAB_COMMENTS: Record<string, string[]> = {
  kesfet: [
    "Yeni bir köşe bulalım mı? 👀",
    "Bu siteyi merak ettim~",
    "Keşfetmek en sevdiğim şey 🐾",
    "Tıkla bakalım nereye gidiyor",
    "İnternet kocaman bir bahçe 🌍",
    "Beğen, ben de bakayım~",
  ],
  pomodoro: [
    "25 dakika… ben kestiririm o zaman 😴",
    "Konsantre ol, başaracaksın! 🍅",
    "Zaman uçuyor mırnav~",
    "Odak modu açık, sus pus 🤫",
    "Mola gelince beni sev",
    "Çalış çalış, gururlanıyorum 🐾",
  ],
  nefes: [
    "Derin nefes… *mırr*",
    "Seninle nefes alıyorum~",
    "İçeri… dışarı… huzur 💨",
    "Yavaş yavaş, omuzlar düşsün",
    "Ben de sakinleştim 🧘",
    "Nefesini say, ben sayarım pati",
  ],
  yilan: [
    "Döner mi var?! 🌯",
    "Dikkat kuyruğa, çarpma!",
    "Yılan dostlarım hızlı~",
    "Bir tık daha, rekor kır!",
    "Ben de oynamak istiyorum 🐾",
    "Aaa az kalmıştı!",
  ],
  oku: [
    "Güzel bir hikâye mi bu? 📖",
    "Omzundan okuyorum~",
    "Sessizce dinliyorum…",
    "Bir çay molası iyi gider 🍵",
    "Bugün ne okuyoruz?",
    "Kelimeler insanı götürür~",
  ],
  bulmaca: [
    "Hmm… cevabı biliyorum ama 🤔",
    "Düşün, sende bu kafa var!",
    "Zekice bir soru bu~",
    "İpucu ister misin? mırnav",
    "Kafam karıştı 😵 ama sen yaparsın",
    "Buldun mu? Buldun değil mi! 🎉",
  ],
};

type State = "run" | "idle" | "happy" | "crouch" | "jump" | "sleep" | "sleeptab" | "groom" | "stretch";
type Mode =
  | "wait" | "enter" | "dwell" | "stroll"
  | "groom" | "stretch" | "loaf" | "zoomies"
  | "tabrise" | "tabhold" | "tabfall";
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

  // yorum döngüsünün güncel pozu/sekmeyi okuması için
  const viewRef     = useRef<{ state: State; mode: Mode }>({ state: "run", mode: "wait" });
  const activeTabRef = useRef<string | undefined>(activeTab);

  const ctrl = useRef({
    x: -MARGIN,
    dir: "right" as "right" | "left",
    state: "run" as State,
    mode: "wait" as Mode,
    targetX: 0,
    dwellUntil: 0,
    petUntil: 0,
    actionUntil: 0,     // groom/stretch/loaf bitiş zamanı
    zoomLeft: 0,        // kalan zoomies turu
    // dikey hareket
    yOff: 0,
    // yerinde zıplama
    jumpActive: false,
    jumpStart: 0,
    // sekmeye sıçrama
    tabPhase: "walk" as "walk" | "crouch" | "leap",
    tabTakeoffX: 0,
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
    // Sekme uykusundayken / sıçrarken tıklama → uyan/in
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

    // Rastgele bir sekme butonunu hedef al: üstüne konacağı X ve yükseklik
    const getTabTarget = (): { tabX: number; tabYOff: number } | null => {
      const nav = typeof document !== "undefined" ? document.getElementById(TAB_NAV_ID) : null;
      if (!nav) return null;
      const vh = window.innerHeight || 900;
      const btns = nav.querySelectorAll("button");
      const rect = btns.length
        ? btns[Math.floor(Math.random() * btns.length)].getBoundingClientRect()
        : nav.getBoundingClientRect();
      if (rect.top < 0 || rect.top > vh) return null; // ekran dışındaysa vazgeç
      // gövdesi sekmenin üstüne otursun; sarkan ön bacak sekmenin ön kenarından aşağı sarksın
      const tabYOff = Math.max(H + 8, vh - rect.top - 34);
      let tabX = Math.round(rect.left + rect.width / 2 - W / 2);
      tabX = Math.max(4, Math.min(vw() - W - 4, tabX));
      return { tabX, tabYOff };
    };

    const pickStrollX = () => {
      let nx = rnd(vw() * 0.12, vw() * 0.82);
      if (Math.abs(nx - c.x) < vw() * 0.2) {
        nx = c.x < vw() * 0.5 ? rnd(vw() * 0.55, vw() * 0.82) : rnd(vw() * 0.12, vw() * 0.45);
      }
      return Math.max(MARGIN, Math.min(vw() - MARGIN, nx));
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
          c.state      = "idle";
          c.mode       = "dwell";
          c.dwellUntil = t + rnd(2500, 4500);
          c.jumpActive = false;
          c.yOff       = 0;
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
              c.dwellUntil = t + rnd(5000, 9000);
            }
            break;
          }

          // ── BEKLEME (dwell) — sonraki davranışı seçer ──
          case "dwell": {
            if (c.jumpActive) {
              // yerinde zıplama yayı
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
              break;
            }

            c.state = "idle";
            if (t < c.dwellUntil) break;

            const roll = Math.random();

            // yerinde zıpla (%13)
            if (roll < 0.13 && c.yOff === 0) {
              c.jumpActive = true; c.jumpStart = t;
              c.dwellUntil = t + JUMP_DUR + 500;
              break;
            }

            // sekmeye sıçra + ayak sarkıtarak uyu (%14) — nav görünürse
            if (roll < 0.27 && c.yOff === 0) {
              const info = getTabTarget();
              if (info) {
                c.tabTargetX    = info.tabX;
                c.tabTargetYOff = info.tabYOff;
                c.dir           = info.tabX >= c.x ? "right" : "left";
                c.tabTakeoffX   = info.tabX - (c.dir === "right" ? 64 : -64);
                c.tabPhase      = "walk";
                c.mode          = "tabrise";
                break;
              }
              // nav yoksa diğer davranışlara düş
            }

            // yalan (groom) (%14)
            if (roll < 0.41) {
              c.mode = "groom"; c.state = "groom"; c.actionUntil = t + rnd(2600, 4400);
              break;
            }

            // gerin (stretch) (%12)
            if (roll < 0.53) {
              c.mode = "stretch"; c.state = "stretch"; c.actionUntil = t + 1400;
              break;
            }

            // yerde şekerleme (loaf) (%13)
            if (roll < 0.66) {
              c.mode = "loaf"; c.state = "sleep"; c.actionUntil = t + rnd(5000, 9000);
              break;
            }

            // zoomies — ani gidip gelme (%14)
            if (roll < 0.80) {
              c.zoomLeft = 2 + Math.floor(Math.random() * 2);
              c.targetX  = pickStrollX();
              c.dir      = c.targetX >= c.x ? "right" : "left";
              c.state    = "run"; c.mode = "zoomies";
              break;
            }

            // varsayılan: normal dolaşma
            c.targetX = pickStrollX();
            c.dir     = c.targetX >= c.x ? "right" : "left";
            c.state   = "run"; c.mode = "stroll";
            break;
          }

          // ── DOLAŞMA ──
          case "stroll": {
            const s = c.dir === "right" ? 1 : -1;
            c.x += s * SPEED * dt;
            const reached = c.dir === "right" ? c.x >= c.targetX : c.x <= c.targetX;
            if (reached) {
              c.x = c.targetX; c.state = "idle"; c.mode = "dwell";
              c.dwellUntil = t + rnd(5000, 10000);
            }
            break;
          }

          // ── ZOOMIES (ani fırlama) ──
          case "zoomies": {
            const s = c.dir === "right" ? 1 : -1;
            c.x += s * ZOOM_SPEED * dt;
            const reached = c.dir === "right" ? c.x >= c.targetX : c.x <= c.targetX;
            if (reached) {
              c.x = c.targetX; c.zoomLeft -= 1;
              if (c.zoomLeft <= 0) {
                c.state = "idle"; c.mode = "dwell"; c.dwellUntil = t + rnd(2500, 5000);
              } else {
                c.targetX = pickStrollX();
                c.dir     = c.targetX >= c.x ? "right" : "left";
              }
            }
            break;
          }

          // ── YALAN (groom) ──
          case "groom": {
            c.state = "groom";
            if (t >= c.actionUntil) { c.state = "idle"; c.mode = "dwell"; c.dwellUntil = t + rnd(3000, 6000); }
            break;
          }

          // ── GERİN (stretch) ──
          case "stretch": {
            c.state = "stretch";
            if (t >= c.actionUntil) { c.state = "idle"; c.mode = "dwell"; c.dwellUntil = t + rnd(3000, 6000); }
            break;
          }

          // ── YERDE ŞEKERLEME (loaf) ──
          case "loaf": {
            c.state = "sleep";
            if (t >= c.actionUntil) { c.state = "idle"; c.mode = "dwell"; c.dwellUntil = t + rnd(2500, 5000); }
            break;
          }

          // ── SEKMEYE SIÇRAMA: yürü → çömel → yay çiz → kon ──
          case "tabrise": {
            if (c.tabPhase === "walk") {
              const dx = c.tabTakeoffX - c.x;
              if (Math.abs(dx) > 4) {
                c.x += Math.sign(dx) * SPEED * dt;
                c.dir   = dx > 0 ? "right" : "left";
                c.state = "run";
              } else {
                c.x        = c.tabTakeoffX;
                c.dir      = c.tabTargetX >= c.x ? "right" : "left";
                c.tabPhase = "crouch";
                c.jumpStart = t;
                c.state    = "crouch";
              }
              break;
            }
            if (c.tabPhase === "crouch") {
              c.state = "crouch";
              if (t - c.jumpStart >= 200) { c.tabPhase = "leap"; c.jumpStart = t; }
              break;
            }
            // leap — parabolik yay
            const p = Math.min(1, (t - c.jumpStart) / LEAP_DUR);
            const ease = 1 - Math.pow(1 - p, 2);
            c.x = c.tabTakeoffX + (c.tabTargetX - c.tabTakeoffX) * ease;
            const arc = c.tabTargetYOff * 0.55 + 34;
            c.yOff = c.tabTargetYOff * p + arc * 4 * p * (1 - p);
            c.state = p < 0.78 ? "jump" : "crouch";
            if (p >= 1) {
              c.x = c.tabTargetX; c.yOff = c.tabTargetYOff;
              c.state = "sleeptab"; c.mode = "tabhold"; c.tabHoldUntil = t + rnd(13000, 24000);
            }
            break;
          }

          // ── TAB'DA UYKU (ayak sarkık) ──
          case "tabhold":
            c.state = "sleeptab";
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
        c.dwellUntil = 0;
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

  // güncel poz/sekmeyi ref'e yansıt (yorum döngüsü okusun)
  useEffect(() => { viewRef.current = { state, mode }; }, [state, mode]);
  useEffect(() => { activeTabRef.current = activeTab; }, [activeTab]);

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

  // ── Tab uykusu: zzz + rüya balonları ─────────────────────────────────
  useEffect(() => {
    if (mode !== "tabhold") { return; }
    let alive = true;
    const showZzz = () => {
      if (!alive) return;
      const dream = Math.random() < 0.45;
      const pool = dream ? DREAMS : ZZZES;
      const line = pool[Math.floor(Math.random() * pool.length)];
      setBubble(line);
      window.setTimeout(() => { if (alive) setBubble((b) => (b === line ? null : b)); }, dream ? 2600 : 2200);
      window.setTimeout(showZzz, 3600 + Math.random() * 3800);
    };
    const first = window.setTimeout(showZzz, 1400);
    return () => { alive = false; clearTimeout(first); setBubble(null); };
  }, [mode]);

  // ── Site & içerik yorumu (dolanırken, sakin pozlarda) ────────────────
  useEffect(() => {
    if (!visible || reduceRef.current) return;
    let alive = true;
    let timer: number;
    const tick = () => {
      if (!alive) return;
      const { state: st, mode: md } = viewRef.current;
      const c = ctrl.current;
      const calm = (st === "idle" || st === "groom") && md !== "tabhold" && md !== "tabrise";
      if (calm && c.petUntil < performance.now() && Math.random() < 0.66) {
        const tab = activeTabRef.current;
        const pool = [...SITE_COMMENTS, ...((tab && TAB_COMMENTS[tab]) || [])];
        const line = pool[Math.floor(Math.random() * pool.length)];
        setBubble(line);
        window.setTimeout(() => { if (alive) setBubble((b) => (b === line ? null : b)); }, 3000);
      }
      timer = window.setTimeout(tick, 5500 + Math.random() * 6500);
    };
    timer = window.setTimeout(tick, 3500 + Math.random() * 4000);
    return () => { alive = false; clearTimeout(timer); };
  }, [visible]);

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
          position: relative;
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
        /* ── yalanma (groom) — Blender pozu ── */
        .cat3d-sprite.is-groom {
          background-image: url("/cat/cat-groom.png");
          background-size: 100% 100%;
          transform-origin: bottom center;
          animation: cat3d-groom 0.9s ease-in-out infinite;
        }
        /* ── gerinme (stretch) — Blender pozu ── */
        .cat3d-sprite.is-stretch {
          background-image: url("/cat/cat-stretch.png");
          background-size: 100% 100%;
          transform-origin: bottom center;
          animation: cat3d-bigstretch 1.4s ease-in-out;
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
        /* ── yerde şekerleme / loaf uykusu ── */
        .cat3d-sprite.is-sleep {
          background-image: url("/cat/cat-sleep.png");
          background-size: 100% 100%;
          transform-origin: bottom center;
          animation: cat3d-sleepdrift 5s ease-in-out infinite alternate;
        }
        /* ── tab'da ayak sarkıtarak uyku — Blender pozu, uyurken kuyruk yavaşça iner ── */
        .cat3d-sprite.is-sleeptab {
          background-image: url("/cat/cat-sleep-tab-strip.png");
          background-repeat: no-repeat;
          background-size: ${W * 7}px ${H}px;
          background-position-x: 0;
          transform-origin: bottom center;
          animation: cat3d-tailfall 6s steps(6) 1 forwards,
            cat3d-sleepdrift 5s ease-in-out infinite alternate;
        }
        @keyframes cat3d-tailfall {
          from { background-position-x: 0; }
          to   { background-position-x: -${W * 6}px; }
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
        @keyframes cat3d-groom {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          30%      { transform: translateY(1px) rotate(-2.5deg); }
          60%      { transform: translateY(0) rotate(2.5deg); }
        }
        @keyframes cat3d-bigstretch {
          0%   { transform: scaleX(1) scaleY(1); }
          40%  { transform: scaleX(1.05) scaleY(0.97) translateX(2px); }
          70%  { transform: scaleX(1.05) scaleY(0.97) translateX(2px); }
          100% { transform: scaleX(1) scaleY(1); }
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
          .cat3d-sprite.is-sleeptab,
          .cat3d-sprite.is-groom,
          .cat3d-sprite.is-stretch,
          .cat3d-mimic {
            animation: none;
          }
          .cat3d-mimic { display: none; }
        }
      `}</style>
    </div>
  );
}
