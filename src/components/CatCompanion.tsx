"use client";

// 3D render kedi yoldaş — Blender'da render edilmiş zencefil tabby.
// Pozlar: run · idle · happy · crouch · jump · sleep · groom · stretch · fall (kanat açma) · angry (öfke) · eat + mimikler.
// Davranışlar: dolaşma · sevilme · yerinde zıplama · sekmeye SIÇRAYIP kanat açarak süzülerek inme ·
//              yalanma · gerinme · yerde şekerleme · zoomies · yeme (mama kabı) · öfke tepkisi · site/içerik yorumu.
// Sanal bebek: açlık · enerji · eğlence · temizlik · sevgi ihtiyaçları zamanla azalır; bakım paneliyle karşılanır.
// Tuş dostu: kedi TAMAMEN pointer-events:none — hiçbir tuşu bloklamaz; sevme window dinleyicisiyle,
//            yalnızca altında etkileşimli öğe yoksa tetiklenir.
// Kaynak: /public/cat/cat-{run-sprite,idle,happy-strip,crouch,jump,sleep,fall,fall-strip,angry,look-*,ear-flick,blink}.png

import { useCallback, useEffect, useRef, useState } from "react";
import { CAT_REACTION_EVENT, type CatReactionDetail } from "@/lib/catEvents";
import { FOCUS_COMPLETE_EVENT, type FocusSummary } from "@/lib/focusStats";

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
const LEAP_DUR  = 620;  // ms — sekmeye sıçrama yayı süresi
const GLIDE_SPD = 96;   // px/s — kanat açık süzülerek iniş hızı (yavaş)
const TAB_NAV_ID = "cat-tab-nav";

const NAMES = ["Pamuk", "Tekir", "Boncuk", "Zeytin", "Duman", "Şanslı", "Badem", "Mırnav"];
const PURRS = ["mırr~", "mırnav 🐾", "🥰", "daha!", "keyifli~", "prr…", "😻", "mutluyum"];
const ZZZES = ["💤 zzz", "zzz~", "zzzz 😴", "hmm... zzz", "💤"];
const STORAGE = "chillout-cat3d-v2";

// ── Öfke tepki replikleri (çok kızınca) ──
const ANGRY_LINES = ["Hışş! 😾", "Rahat bırak beni!", "Miyaav!! 😾", "Dokunma şu an!", "Tıss… çekil!", "Sinirliyim, uzak dur 🙀", "Grr… mrrnyaa!"];
const CALMING_LINES = ["Oh… sakinleşiyorum.", "Tamam, geçti… mırr.", "Affettim seni 😽", "Yine dostuz~"];

// ── İhtiyaç durumu replikleri ──
const NEED_LINES: Record<NeedKey, string[]> = {
  hunger:  ["Acıktım… 🍽️", "Karnım guruldadı~", "Bir şeyler yesem?", "Mama? 🐟"],
  energy:  ["Uykum geldi… 😴", "Biraz kestirsem~", "Yorgunum, mırr…", "Göz kapaklarım ağır."],
  fun:     ["Sıkıldım! Oyna benimle 🧶", "Zıplayasım var~", "Bir oyun oynasak?", "Enerjim taştı!"],
  hygiene: ["Kendimi yıkamam lazım 🛁", "Tüylerim dağınık~", "Bir yalanma iyi gider.", "Fırça ister miyim? evet."],
  affection:["Beni sevsene 😽", "Biraz sevgi? 🐾", "Yalnız hissediyorum…", "Kucak ister misin?"],
};

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
  "Ekranın ritmi yumuşadı.",
  "Bugün burada güzel bir enerji var.",
  "Sen gezerken ben köşeleri kokluyorum.",
  "Biraz daha kalalım mı?",
  "Bu sayfa sıcak bir pencere gibi.",
  "Ben buranın küçük güvenlik görevlisiyim.",
  "Sesler ve ışıklar dengede.",
  "Şu an her şey olması gerektiği kadar yavaş.",
];

const TAB_COMMENTS: Record<string, string[]> = {
  kesfet: ["Yeni bir köşe bulalım mı? 👀", "Keşfetmek en sevdiğim şey 🐾", "İnternet kocaman bir bahçe 🌍", "Yeni bir site kokusu aldım.", "Rastgelelik bazen en iyi rehber."],
  sohbet: ["Odaya yeni sesler doluyor.", "Mesajları sessizce takip ediyorum.", "Tek oda, çok mırnav.", "Nickler geldi, oda canlandı."],
  pomodoro: ["25 dakika… ben kestiririm o zaman 😴", "Konsantre ol, başaracaksın! 🍅", "Odak modu açık, sus pus 🤫", "Bir domates daha yakın."],
  nefes: ["Derin nefes… *mırr*", "Seninle nefes alıyorum~", "İçeri… dışarı… huzur 💨", "Omuzlar aşağı, kuyruk sakin."],
  yilan: ["Döner mi var?! 🌯", "Dikkat kuyruğa, çarpma!", "Bir tık daha, rekor kır!", "Hız iyi, panik yok."],
  oku: ["Güzel bir hikâye mi bu? 📖", "Omzundan okuyorum~", "Bir çay molası iyi gider 🍵", "Sayfayı çevir, ben dinliyorum."],
  bulmaca: ["Hmm… cevabı biliyorum ama 🤔", "Zekice bir soru bu~", "İpucu ister misin? mırnav", "Mantık patileri devrede."],
};

type State = "run" | "idle" | "happy" | "crouch" | "jump" | "sleep" | "groom" | "stretch" | "fall" | "angry" | "eat";
type Mode =
  | "wait" | "enter" | "dwell" | "stroll"
  | "groom" | "stretch" | "loaf" | "zoomies"
  | "tabrise" | "tabtouch" | "tabfall"
  | "gofood" | "eat" | "angry";
type Heart = { id: number; dx: number; kind: "love" | "anger" };
type Mimic = "look-up" | "look-down" | "look-back" | "look-front" | "ear-flick" | "blink";

type NeedKey = "hunger" | "energy" | "fun" | "hygiene" | "affection";
type Needs = Record<NeedKey, number>;
type Mood = "happy" | "content" | "needy" | "angry";

const NEED_META: { key: NeedKey; label: string; icon: string; color: string }[] = [
  { key: "hunger",    label: "Açlık",   icon: "🍽️", color: "#ffb454" },
  { key: "energy",    label: "Enerji",  icon: "⚡",  color: "#7ad0ff" },
  { key: "fun",       label: "Eğlence", icon: "🧶", color: "#ff8fb4" },
  { key: "hygiene",   label: "Temizlik",icon: "🛁", color: "#8fe6c8" },
  { key: "affection", label: "Sevgi",   icon: "💗", color: "#ff6f91" },
];

// Dakikada azalma hızı (0..100 ölçek). Sevgi ve eğlence daha hızlı düşer.
const DECAY_PER_MIN: Needs = { hunger: 1.05, energy: 0.8, fun: 1.35, hygiene: 0.85, affection: 1.2 };

const MIMICS: Mimic[] = ["look-up", "look-down", "look-back", "look-front", "ear-flick", "blink"];

function clamp100(v: number) { return Math.max(0, Math.min(100, v)); }
function avgNeeds(n: Needs) { return (n.hunger + n.energy + n.fun + n.hygiene + n.affection) / 5; }

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
  const [bowlX,   setBowlX]   = useState<number | null>(null);

  // Bakım paneli için düzenli snapshot
  const [snap, setSnap] = useState<{ needs: Needs; anger: number; mood: Mood; name: string }>({
    needs: { hunger: 80, energy: 80, fun: 80, hygiene: 80, affection: 80 },
    anger: 0, mood: "content", name: "Pamuk",
  });
  const [careOpen, setCareOpen] = useState(false);

  const nameRef  = useRef("Pamuk");
  const affRef   = useRef(0);
  const heartSeq = useRef(0);
  const reactionTimerRef = useRef<number | null>(null);
  const visibleRef = useRef(false);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const petStamps = useRef<number[]>([]);   // hızlı-tıklama tespiti
  const scrollStamp = useRef(0);

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
    actionUntil: 0,
    zoomLeft: 0,
    yOff: 0,
    jumpActive: false,
    jumpStart: 0,
    // sekmeye sıçrama
    tabTakeoffX: 0,
    tabTargetX: 0,
    tabTargetYOff: 0,
    tabPhase: "walk" as "walk" | "crouch" | "leap",
    tabTouchUntil: 0,
    fallDrift: 0,
    // yeme
    foodX: 0,
    // sanal bebek
    needs: { hunger: 80, energy: 80, fun: 80, hygiene: 80, affection: 80 } as Needs,
    anger: 0,
    angryUntil: 0,        // öfke tepkisinin bitiş zamanı
    mood: "content" as Mood,
    request: null as null | "food" | "play" | "brush" | "sleep",
    lastCareTick: 0,
  });
  const reduceRef = useRef(false);

  const persist = useCallback(() => {
    try {
      const c = ctrl.current;
      localStorage.setItem(STORAGE, JSON.stringify({
        name: nameRef.current, aff: affRef.current,
        needs: c.needs, anger: c.anger, t: Date.now(),
      }));
    } catch { /* yoksay */ }
  }, []);

  const showReaction = useCallback((line: string, duration = 3000) => {
    if (!line.trim()) return;
    if (reactionTimerRef.current) window.clearTimeout(reactionTimerRef.current);
    setBubble(line);
    reactionTimerRef.current = window.setTimeout(() => {
      setBubble((current) => (current === line ? null : current));
      reactionTimerRef.current = null;
    }, duration);
  }, []);

  const spawnHearts = useCallback((kind: "love" | "anger") => {
    const n = 3;
    const batch: Heart[] = [];
    for (let i = 0; i < n; i++) {
      const id = ++heartSeq.current;
      batch.push({ id, dx: (i - (n - 1) / 2) * 16 + (Math.random() * 8 - 4), kind });
    }
    setHearts((h) => [...h, ...batch]);
    batch.forEach((b) => window.setTimeout(() => setHearts((h) => h.filter((hh) => hh.id !== b.id)), 1300));
  }, []);

  // ── İlk yükleme: kayıt + geçen süre kadar ihtiyaç azalması ──
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE);
      if (raw) {
        const p = JSON.parse(raw);
        nameRef.current = p.name || NAMES[Math.floor(Math.random() * NAMES.length)];
        affRef.current  = p.aff  || 0;
        const c = ctrl.current;
        if (p.needs) {
          (Object.keys(c.needs) as NeedKey[]).forEach((k) => {
            if (typeof p.needs[k] === "number") c.needs[k] = clamp100(p.needs[k]);
          });
        }
        c.anger = typeof p.anger === "number" ? clamp100(p.anger) : 0;
        const elapsedMin = p.t ? Math.min(720, (Date.now() - p.t) / 60000) : 0;
        (Object.keys(c.needs) as NeedKey[]).forEach((k) => {
          c.needs[k] = clamp100(c.needs[k] - DECAY_PER_MIN[k] * elapsedMin);
        });
        c.anger = clamp100(c.anger - elapsedMin * 2);
      } else {
        nameRef.current = NAMES[Math.floor(Math.random() * NAMES.length)];
      }
    } catch { /* yoksay */ }
    setSnap((s) => ({ ...s, needs: { ...ctrl.current.needs }, anger: ctrl.current.anger, name: nameRef.current }));
    persist();
  }, [persist]);

  // ── Sevme (window dinleyici — kedi pointer-events:none, tuşları bloklamaz) ──
  const pet = useCallback(() => {
    const c = ctrl.current;
    if (!visibleRef.current) return;
    const now = performance.now();

    // hızlı-tıklama takibi
    petStamps.current = petStamps.current.filter((t) => now - t < 2600);
    petStamps.current.push(now);
    const rapid = petStamps.current.length;

    // Zaten öfkeliyse: dokunmak öfkeyi artırır
    if (c.mood === "angry" || c.angryUntil > now) {
      c.anger = clamp100(c.anger + 10);
      c.angryUntil = now + 2600;
      showReaction(ANGRY_LINES[Math.floor(Math.random() * ANGRY_LINES.length)], 1600);
      spawnHearts("anger");
      return;
    }

    // Çok hızlı/agresif sevme → sinirlendirir
    if (rapid >= 5) {
      c.anger = clamp100(c.anger + 16);
      if (c.anger >= 70) { c.angryUntil = now + 3200; }
      showReaction(rapid >= 7 ? "Yeter artık! 😾" : "Ay! Yavaş ol~", 1500);
      spawnHearts("anger");
    } else {
      c.petUntil = now + 1700;
      affRef.current += 1;
      c.needs.affection = clamp100(c.needs.affection + 22);
      c.anger = clamp100(c.anger - 6);
      spawnHearts("love");
      const line = affRef.current % 5 === 0 ? `${nameRef.current} 🐾` : PURRS[Math.floor(Math.random() * PURRS.length)];
      setBubble(line);
      window.setTimeout(() => setBubble((b) => (b === line ? null : b)), 1500);
    }
    setSnap((s) => ({ ...s, needs: { ...c.needs }, anger: c.anger }));
    persist();
  }, [showReaction, spawnHearts, persist]);

  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (!visibleRef.current) return;
      const el = boxRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const pad = 6;
      if (e.clientX < r.left - pad || e.clientX > r.right + pad ||
          e.clientY < r.top - pad || e.clientY > r.bottom + pad) return;
      // Kedi kutusundayız — altında etkileşimli öğe varsa DOKUNMA (tıklamayı geçir)
      const under = document.elementFromPoint(e.clientX, e.clientY) as Element | null;
      if (under && under.closest(
        'button, a, input, select, textarea, label, [role="button"], [role="tab"], ' +
        '.audio-dock, .scene-dock, .catcare-dock, #cat-tab-nav'
      )) return;
      pet();
    };
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, [pet]);

  // ── Bakım eylemleri ──
  const requestCare = useCallback((kind: "food" | "play" | "brush" | "sleep") => {
    const c = ctrl.current;
    c.request = kind;
    // öfkeliyken bakım da yumuşatır
    if (c.mood === "angry") { c.anger = clamp100(c.anger - 8); }
    if (kind === "food" && bowlX === null) {
      const vw = window.innerWidth || 1280;
      const fx = Math.round(Math.max(MARGIN, Math.min(vw - MARGIN, vw * (0.2 + Math.random() * 0.6))));
      c.foodX = fx;
      setBowlX(fx);
    }
  }, [bowlX]);

  // ── Sanal bebek döngüsü (1sn): ihtiyaç azalması + öfke + mood + snapshot ──
  useEffect(() => {
    const iv = window.setInterval(() => {
      const c = ctrl.current;
      const now = performance.now();
      // ihtiyaç azalması (1sn = 1/60 dk)
      (Object.keys(c.needs) as NeedKey[]).forEach((k) => {
        c.needs[k] = clamp100(c.needs[k] - DECAY_PER_MIN[k] / 60);
      });
      // uyurken/yerken/yalanırken ilgili ihtiyaç yenilenir
      if (c.state === "sleep") c.needs.energy = clamp100(c.needs.energy + 2.4);
      if (c.state === "groom") c.needs.hygiene = clamp100(c.needs.hygiene + 2.0);
      if (c.mode === "zoomies" || c.mode === "tabrise" || c.mode === "tabfall" || c.jumpActive)
        c.needs.fun = clamp100(c.needs.fun + 1.6);

      // ihmal → öfke tırmanışı; bakım → sakinleşme
      const low = avgNeeds(c.needs);
      if (low < 22) c.anger = clamp100(c.anger + 1.4);
      else c.anger = clamp100(c.anger - 1.1);

      // mood
      let mood: Mood;
      if (c.anger >= 70 || c.angryUntil > now) mood = "angry";
      else if (low < 28 || Object.values(c.needs).some((v) => v < 12)) mood = "needy";
      else if (low > 72 && c.anger < 20) mood = "happy";
      else mood = "content";
      c.mood = mood;

      setSnap({ needs: { ...c.needs }, anger: c.anger, mood, name: nameRef.current });
      persist();
    }, 1000);
    return () => window.clearInterval(iv);
  }, [persist]);

  // ── Scroll: yatarken/dinlenirken rahatsız etme, yerinde sabit tut ──
  useEffect(() => {
    const onScroll = () => { scrollStamp.current = performance.now(); };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // ── Ana rAF döngüsü ──
  useEffect(() => {
    reduceRef.current =
      typeof window !== "undefined" &&
      !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    let mounted  = true;
    let raf      = 0;
    let lastT    = 0;
    const c = ctrl.current;
    c.mode = "wait";
    let started = false;

    const vw  = () => window.innerWidth  || 1280;
    const rnd = (a: number, b: number) => a + Math.random() * (b - a);

    let lastX = NaN, lastYOff = NaN;
    let lastDir = "", lastState = "", lastMode = "", lastVis = false;

    const flush = () => {
      const dx = !Number.isFinite(lastX)    || Math.abs(c.x    - lastX)    >= 0.5;
      const dy = !Number.isFinite(lastYOff) || Math.abs(c.yOff - lastYOff) >= 0.5;
      if (dx || dy) { lastX = c.x; lastYOff = c.yOff; setX(c.x); setYOff(c.yOff); }
      if (c.dir   !== lastDir)   { lastDir   = c.dir;   setDir(c.dir); }
      if (c.state !== lastState) { lastState = c.state; setState(c.state); }
      if (c.mode  !== lastMode)  { lastMode  = c.mode;  setMode(c.mode); }
      const vis = c.mode !== "wait";
      if (vis !== lastVis) { lastVis = vis; setVisible(vis); visibleRef.current = vis; }
    };

    // Rastgele bir sekme butonunu hedef al — kedi ORAYA SIÇRAYIP KONMAZ, dokunup düşer.
    const getTabTarget = (): { tabX: number; tabYOff: number } | null => {
      const nav = typeof document !== "undefined" ? document.getElementById(TAB_NAV_ID) : null;
      if (!nav) return null;
      const vh = window.innerHeight || 900;
      const btns = nav.querySelectorAll("button");
      const rect = btns.length
        ? btns[Math.floor(Math.random() * btns.length)].getBoundingClientRect()
        : nav.getBoundingClientRect();
      if (rect.top < 40 || rect.top > vh - 60) return null; // ekran dışı/çok yakınsa vazgeç
      // paticikleri nav'ın ÜST kenarına değsin (butonun yüzünü kapatmaz)
      const tabYOff = Math.max(H + 30, vh - rect.top - 8);
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

    const startAngry = (t: number) => {
      c.mode = "angry"; c.state = "angry"; c.jumpActive = false; c.yOff = 0;
      c.angryUntil = Math.max(c.angryUntil, t + rnd(2600, 4200));
      const line = ANGRY_LINES[Math.floor(Math.random() * ANGRY_LINES.length)];
      setBubble(line);
      window.setTimeout(() => setBubble((b) => (b === line ? null : b)), 2000);
    };

    const goDwell = (min: number, max: number) => {
      c.state = "idle"; c.mode = "dwell"; c.dwellUntil = performance.now() + rnd(min, max);
    };

    const loop = (t: number) => {
      if (!mounted) return;
      if (!lastT) lastT = t;
      const dt = Math.min(0.05, (t - lastT) / 1000);
      lastT = t;

      const recentlyScrolled = t - scrollStamp.current < 650;

      // ── ÖFKE TEPKİSİ (her şeyin önünde) ──
      if ((c.anger >= 70 || c.angryUntil > t) && c.mode !== "angry" &&
          c.mode !== "tabrise" && c.mode !== "tabfall") {
        startAngry(t);
      }

      // ── SEVİLME ──
      if (c.petUntil > t && c.mode !== "angry") {
        c.state = "happy";
      } else {
        if (c.state === "happy") { c.yOff = 0; goDwell(2500, 4500); }

        switch (c.mode) {
          case "wait":
          case "enter": {
            c.mode = "enter";
            const sign = c.dir === "right" ? 1 : -1;
            c.x += sign * SPEED * dt;
            const reached = c.dir === "right" ? c.x >= c.targetX : c.x <= c.targetX;
            if (reached) { c.x = c.targetX; goDwell(5000, 9000); }
            break;
          }

          // ── ÖFKE ──
          case "angry": {
            c.state = "angry";
            if (t >= c.angryUntil && c.anger < 55) {
              c.angryUntil = 0;
              const line = CALMING_LINES[Math.floor(Math.random() * CALMING_LINES.length)];
              setBubble(line);
              window.setTimeout(() => setBubble((b) => (b === line ? null : b)), 1800);
              goDwell(2200, 3800);
            }
            break;
          }

          // ── BEKLEME: sonraki davranışı seç (ihtiyaç ağırlıklı) ──
          case "dwell": {
            if (c.jumpActive) {
              const elapsed = t - c.jumpStart;
              const p = Math.min(1, elapsed / JUMP_DUR);
              if (p < 0.18) { c.state = "crouch"; c.yOff = 0; }
              else if (p < 0.82) { const tp = (p - 0.18) / 0.64; c.yOff = JUMP_PEAK * 4 * tp * (1 - tp); c.state = "jump"; }
              else { c.state = "crouch"; c.yOff = Math.max(0, c.yOff - 160 * dt); }
              if (p >= 1) { c.jumpActive = false; c.state = "idle"; c.yOff = 0; }
              break;
            }

            c.state = "idle";

            // Kullanıcı istekleri (bakım paneli) — hemen ele al
            if (c.request) {
              const req = c.request; c.request = null;
              if (req === "food") {
                c.targetX = c.foodX; c.dir = c.foodX >= c.x ? "right" : "left";
                c.state = "run"; c.mode = "gofood"; break;
              }
              if (req === "play") {
                if (Math.random() < 0.5 && getTabTarget()) {
                  const info = getTabTarget()!;
                  c.tabTargetX = info.tabX; c.tabTargetYOff = info.tabYOff;
                  c.dir = info.tabX >= c.x ? "right" : "left";
                  c.tabTakeoffX = Math.max(4, Math.min(vw() - W - 4, info.tabX - (c.dir === "right" ? 60 : -60)));
                  c.tabPhase = "walk"; c.mode = "tabrise"; break;
                }
                c.zoomLeft = 2 + Math.floor(Math.random() * 2); c.targetX = pickStrollX();
                c.dir = c.targetX >= c.x ? "right" : "left"; c.state = "run"; c.mode = "zoomies"; break;
              }
              if (req === "brush") { c.mode = "groom"; c.state = "groom"; c.actionUntil = t + rnd(2600, 4200); break; }
              if (req === "sleep") { c.mode = "loaf"; c.state = "sleep"; c.actionUntil = t + rnd(6000, 11000); break; }
            }

            // Scroll sırasında dinleniyorsa: yerinde sabit kal, yeni davranışa geçme
            if (recentlyScrolled) { c.dwellUntil = Math.max(c.dwellUntil, t + 500); break; }
            if (t < c.dwellUntil) break;

            const n = c.needs;
            // İhtiyaç güdümlü seçim
            if (n.energy < 26) { c.mode = "loaf"; c.state = "sleep"; c.actionUntil = t + rnd(7000, 12000); break; }
            if (n.hygiene < 26) { c.mode = "groom"; c.state = "groom"; c.actionUntil = t + rnd(2800, 4400); break; }
            if (n.hunger < 22) {
              if (bowlX === null) {
                const line = NEED_LINES.hunger[Math.floor(Math.random() * NEED_LINES.hunger.length)];
                setBubble(line); window.setTimeout(() => setBubble((b) => (b === line ? null : b)), 2600);
              }
              c.dwellUntil = t + rnd(3000, 5000);
            }

            const roll = Math.random();
            const playful = n.fun < 45; // canı sıkıldıysa daha çok oyun

            if (roll < (playful ? 0.20 : 0.12) && c.yOff === 0) {
              c.jumpActive = true; c.jumpStart = t; c.dwellUntil = t + JUMP_DUR + 500; break;
            }
            if (roll < (playful ? 0.42 : 0.26) && c.yOff === 0) {
              const info = getTabTarget();
              if (info) {
                c.tabTargetX = info.tabX; c.tabTargetYOff = info.tabYOff;
                c.dir = info.tabX >= c.x ? "right" : "left";
                c.tabTakeoffX = Math.max(4, Math.min(vw() - W - 4, info.tabX - (c.dir === "right" ? 60 : -60)));
                c.tabPhase = "walk"; c.mode = "tabrise"; break;
              }
            }
            if (roll < 0.55) { c.mode = "groom"; c.state = "groom"; c.actionUntil = t + rnd(2600, 4400); break; }
            if (roll < 0.66) { c.mode = "stretch"; c.state = "stretch"; c.actionUntil = t + 1400; break; }
            if (roll < 0.78) { c.mode = "loaf"; c.state = "sleep"; c.actionUntil = t + rnd(5000, 9000); break; }
            if (roll < (playful ? 0.90 : 0.86)) {
              c.zoomLeft = 2 + Math.floor(Math.random() * 2); c.targetX = pickStrollX();
              c.dir = c.targetX >= c.x ? "right" : "left"; c.state = "run"; c.mode = "zoomies"; break;
            }
            c.targetX = pickStrollX(); c.dir = c.targetX >= c.x ? "right" : "left";
            c.state = "run"; c.mode = "stroll";
            break;
          }

          case "stroll": {
            const s = c.dir === "right" ? 1 : -1;
            c.x += s * SPEED * dt;
            const reached = c.dir === "right" ? c.x >= c.targetX : c.x <= c.targetX;
            if (reached) { c.x = c.targetX; goDwell(5000, 10000); }
            break;
          }

          case "zoomies": {
            const s = c.dir === "right" ? 1 : -1;
            c.x += s * ZOOM_SPEED * dt;
            const reached = c.dir === "right" ? c.x >= c.targetX : c.x <= c.targetX;
            if (reached) {
              c.x = c.targetX; c.zoomLeft -= 1;
              if (c.zoomLeft <= 0) goDwell(2500, 5000);
              else { c.targetX = pickStrollX(); c.dir = c.targetX >= c.x ? "right" : "left"; }
            }
            break;
          }

          case "groom": {
            c.state = "groom";
            if (t >= c.actionUntil) { c.needs.hygiene = clamp100(c.needs.hygiene + 30); goDwell(3000, 6000); }
            break;
          }
          case "stretch": {
            c.state = "stretch";
            if (t >= c.actionUntil) goDwell(3000, 6000);
            break;
          }
          case "loaf": {
            c.state = "sleep";
            // scroll dinleniyorsa uyandırma → süreyi uzat (yerinde sabit)
            if (recentlyScrolled) c.actionUntil = Math.max(c.actionUntil, t + 800);
            if (t >= c.actionUntil) { c.needs.energy = clamp100(c.needs.energy + 26); goDwell(2500, 5000); }
            break;
          }

          // ── MAMAYA GİT → YE ──
          case "gofood": {
            const s = c.foodX >= c.x ? 1 : -1;
            c.dir = s > 0 ? "right" : "left"; c.state = "run";
            c.x += s * SPEED * dt;
            if (Math.abs(c.x - c.foodX) < 6) { c.x = c.foodX; c.mode = "eat"; c.state = "eat"; c.actionUntil = t + 2800; }
            break;
          }
          case "eat": {
            c.state = "eat";
            if (t >= c.actionUntil) {
              c.needs.hunger = clamp100(c.needs.hunger + 55);
              c.needs.affection = clamp100(c.needs.affection + 6);
              setBowlX(null);
              const line = "Nefis! 😋 mırr~";
              setBubble(line); window.setTimeout(() => setBubble((b) => (b === line ? null : b)), 1800);
              goDwell(2500, 4500);
            }
            break;
          }

          // ── SEKMEYE SIÇRAMA: yürü → çömel → yay (dokun) ──
          case "tabrise": {
            if (c.tabPhase === "walk") {
              const dx = c.tabTakeoffX - c.x;
              if (Math.abs(dx) > 4) { c.x += Math.sign(dx) * SPEED * dt; c.dir = dx > 0 ? "right" : "left"; c.state = "run"; }
              else { c.x = c.tabTakeoffX; c.dir = c.tabTargetX >= c.x ? "right" : "left"; c.tabPhase = "crouch"; c.jumpStart = t; c.state = "crouch"; }
              break;
            }
            if (c.tabPhase === "crouch") {
              c.state = "crouch";
              if (t - c.jumpStart >= 200) { c.tabPhase = "leap"; c.jumpStart = t; }
              break;
            }
            // leap — parabolik yay, tepede sekmeye dokun
            const p = Math.min(1, (t - c.jumpStart) / LEAP_DUR);
            const ease = 1 - Math.pow(1 - p, 2);
            c.x = c.tabTakeoffX + (c.tabTargetX - c.tabTakeoffX) * ease;
            const arc = c.tabTargetYOff * 0.5 + 30;
            c.yOff = c.tabTargetYOff * p + arc * 4 * p * (1 - p);
            c.state = p < 0.8 ? "jump" : "crouch";
            if (p >= 1) {
              c.x = c.tabTargetX; c.yOff = c.tabTargetYOff;
              c.mode = "tabtouch"; c.state = "crouch"; c.tabTouchUntil = t + 260;
              c.needs.fun = clamp100(c.needs.fun + 20);
            }
            break;
          }

          // ── SEKMEYE DOKUNUŞ (kısa boing) → sonra kanat açıp düş ──
          case "tabtouch": {
            c.state = "crouch";
            // ufak sıçrama hissi
            c.yOff = c.tabTargetYOff + Math.sin((t - (c.tabTouchUntil - 260)) / 260 * Math.PI) * 8;
            if (t >= c.tabTouchUntil) {
              c.mode = "tabfall"; c.state = "fall";
              c.fallDrift = (Math.random() * 2 - 1) * 26; // hafif yatay süzülme
            }
            break;
          }

          // ── KANAT AÇIK SÜZÜLEREK İNME ──
          case "tabfall": {
            c.state = "fall";
            if (c.yOff > 1) {
              c.yOff = Math.max(0, c.yOff - GLIDE_SPD * dt);
              c.x += c.fallDrift * dt; // nazik yalpalama
              c.x = Math.max(4, Math.min(vw() - W - 4, c.x));
            } else {
              c.yOff = 0; c.state = "crouch"; c.mode = "dwell"; c.dwellUntil = t + 260;
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
        c.state = "run"; c.mode = "enter"; c.dwellUntil = 0; started = true;
        raf = requestAnimationFrame(loop);
      }, 350);
      return () => { mounted = false; clearTimeout(startTimer); if (raf) cancelAnimationFrame(raf); };
    }

    c.dir = "right"; c.x = Math.round((vw() || 1280) * 0.42);
    c.state = "idle"; c.mode = "dwell"; c.dwellUntil = Infinity;
    flush();
    return () => { mounted = false; if (raf) cancelAnimationFrame(raf); void started; };
  }, [bowlX]);

  useEffect(() => { viewRef.current = { state, mode }; }, [state, mode]);
  useEffect(() => { activeTabRef.current = activeTab; }, [activeTab]);

  useEffect(() => () => { if (reactionTimerRef.current) window.clearTimeout(reactionTimerRef.current); }, []);

  // ── Dış olaylar (reaksiyon + odak tamamlanma) ──
  useEffect(() => {
    const pick = (items: string[]) => items[Math.floor(Math.random() * items.length)];
    const onCatReaction = (event: Event) => {
      const detail = (event as CustomEvent<CatReactionDetail>).detail;
      const pool = [
        ...(detail?.line ? [detail.line] : []),
        ...(Array.isArray(detail?.pool) ? detail.pool : []),
      ].filter((line) => line.trim().length > 0);
      if (!pool.length) return;
      if (ctrl.current.mood === "angry") return; // öfkeliyken sakin yorum yapmaz
      showReaction(pick(pool));
    };
    const onFocusComplete = (event: Event) => {
      const detail = (event as CustomEvent<FocusSummary>).detail;
      const today = detail?.today ?? 0;
      const week = detail?.week ?? 0;
      showReaction(pick([
        `Odak tamamlandı! Bugün ${today} tur oldu.`,
        `Bir domates daha bitti. Bu hafta ${week} tur.`,
        "Harika iş. Şimdi mola hakkın var.",
      ]), 3600);
    };
    window.addEventListener(CAT_REACTION_EVENT, onCatReaction);
    window.addEventListener(FOCUS_COMPLETE_EVENT, onFocusComplete);
    return () => {
      window.removeEventListener(CAT_REACTION_EVENT, onCatReaction);
      window.removeEventListener(FOCUS_COMPLETE_EVENT, onFocusComplete);
    };
  }, [showReaction]);

  // ── Mimik döngüsü (sadece idle) ──
  useEffect(() => {
    if (!visible || state !== "idle" || reduceRef.current) {
      const reset = window.setTimeout(() => setMimic(null), 0);
      return () => window.clearTimeout(reset);
    }
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

  // ── Site / içerik / ihtiyaç yorumu ──
  useEffect(() => {
    if (!visible || reduceRef.current) return;
    let alive = true;
    let timer: number;
    const tick = () => {
      if (!alive) return;
      const { state: st, mode: md } = viewRef.current;
      const c = ctrl.current;
      const calm = (st === "idle" || st === "groom" || st === "sleep") && md !== "angry";
      if (calm && c.petUntil < performance.now() && c.mood !== "angry") {
        // İhtiyaç düşükse önce onu dillendir
        const lowNeed = (Object.keys(c.needs) as NeedKey[])
          .filter((k) => c.needs[k] < 32)
          .sort((a, b) => c.needs[a] - c.needs[b])[0];
        let line: string;
        if (lowNeed && Math.random() < 0.6) {
          line = NEED_LINES[lowNeed][Math.floor(Math.random() * NEED_LINES[lowNeed].length)];
        } else if (st === "sleep") {
          line = ZZZES[Math.floor(Math.random() * ZZZES.length)];
        } else if (Math.random() < 0.66) {
          const tab = activeTabRef.current;
          const pool = [...SITE_COMMENTS, ...((tab && TAB_COMMENTS[tab]) || [])];
          line = pool[Math.floor(Math.random() * pool.length)];
        } else { line = ""; }
        if (line) { setBubble(line); window.setTimeout(() => { if (alive) setBubble((b) => (b === line ? null : b)); }, 3000); }
      }
      timer = window.setTimeout(tick, 5200 + Math.random() * 6200);
    };
    timer = window.setTimeout(tick, 3200 + Math.random() * 4000);
    return () => { alive = false; clearTimeout(timer); };
  }, [visible]);

  const sheetW = W * COLS;
  const sheetH = H * ROWS;
  const moodEmoji = snap.mood === "angry" ? "😾" : snap.mood === "needy" ? "🥺" : snap.mood === "happy" ? "😻" : "😺";

  return (
    <>
      {/* Mama kabı */}
      {bowlX !== null && (
        <div className="cat3d-bowl" style={{ transform: `translateX(${bowlX + W / 2 - 13}px)` }} aria-hidden>🐟</div>
      )}

      <div
        ref={boxRef}
        className="cat3d-companion"
        aria-hidden="true"
        style={{
          transform: `translateX(${Math.round(x)}px) translateY(${-Math.round(yOff)}px)`,
          opacity: visible ? 1 : 0,
        }}
      >
        <div className="cat3d-flip" style={{ transform: `scaleX(${dir === "left" ? -1 : 1})` }}>
          <div className={`cat3d-sprite is-${state}`} />
          {state === "idle" && (
            <div className="cat3d-mimic" style={{ backgroundImage: mimic ? `url("/cat/cat-${mimic}.png")` : "none", opacity: mimic ? 1 : 0 }} />
          )}
        </div>

        {bubble && <div className="cat3d-bubble">{bubble}</div>}
        {hearts.map((h) => (
          <span key={h.id} className={`cat3d-heart ${h.kind}`} style={{ ["--dx" as string]: `${h.dx}px` }}>
            {h.kind === "anger" ? "💢" : "❤"}
          </span>
        ))}
      </div>

      {/* ── Bakım paneli (sanal bebek) ── */}
      <aside className={`catcare-dock ${careOpen ? "open" : ""}`} aria-label="Kedi bakımı">
        <button type="button" className="catcare-toggle" onClick={() => setCareOpen((o) => !o)} aria-expanded={careOpen}>
          <span className="catcare-face">{moodEmoji}</span>
          <span className="catcare-name">{snap.name}</span>
          {snap.anger >= 45 && <span className="catcare-warn" title="Sinirleniyor">💢</span>}
        </button>
        {careOpen && (
          <div className="catcare-card">
            <div className="catcare-head">
              <span>{snap.name}</span>
              <span className="catcare-mood">
                {snap.mood === "angry" ? "kızgın 😾" : snap.mood === "needy" ? "ihtiyacı var 🥺" : snap.mood === "happy" ? "mutlu 😻" : "keyifli 😺"}
              </span>
            </div>
            <div className="catcare-needs">
              {NEED_META.map((m) => {
                const v = Math.round(snap.needs[m.key]);
                return (
                  <div key={m.key} className="catcare-need">
                    <span className="catcare-need-lbl">{m.icon} {m.label}</span>
                    <span className="catcare-bar"><i style={{ width: `${v}%`, background: m.color }} /></span>
                    <span className="catcare-val">{v}</span>
                  </div>
                );
              })}
              <div className="catcare-need catcare-anger">
                <span className="catcare-need-lbl">💢 Öfke</span>
                <span className="catcare-bar"><i style={{ width: `${Math.round(snap.anger)}%`, background: "#ff5252" }} /></span>
                <span className="catcare-val">{Math.round(snap.anger)}</span>
              </div>
            </div>
            <div className="catcare-actions">
              <button type="button" onClick={() => requestCare("food")}>🍽️ Besle</button>
              <button type="button" onClick={() => requestCare("play")}>🧶 Oyna</button>
              <button type="button" onClick={() => requestCare("brush")}>🛁 Fırçala</button>
              <button type="button" onClick={() => requestCare("sleep")}>😴 Uyut</button>
            </div>
            <p className="catcare-hint">Kediyi sevmek için boş bir yerdeyken üstüne tıkla. Çok sıkarsan sinirlenir!</p>
          </div>
        )}
      </aside>

      <style jsx>{`
        .cat3d-companion {
          position: fixed; left: 0; bottom: 18px;
          width: ${W}px; height: ${H}px; z-index: 60;
          pointer-events: none; /* hiçbir tuşu bloklamaz — sevme window ile */
          will-change: transform, opacity;
          transition: opacity 0.45s ease;
          filter: drop-shadow(0 0 10px rgba(255, 211, 115, 0.35)) drop-shadow(0 4px 6px rgba(0, 0, 0, 0.55));
        }
        .cat3d-flip { width: 100%; height: 100%; position: relative; }
        .cat3d-sprite { width: 100%; height: 100%; background-repeat: no-repeat; background-position: 0 0; }

        .cat3d-sprite.is-run {
          background-image: url("/cat/cat-run-sprite.png");
          background-size: ${sheetW}px ${sheetH}px;
          animation: cat3d-col ${COLS / FPS}s steps(${COLS}) infinite, cat3d-row ${(COLS * ROWS) / FPS}s steps(${ROWS}) infinite;
        }
        .cat3d-sprite.is-idle { background-image: url("/cat/cat-idle.png"); background-size: 100% 100%; transform-origin: bottom center; animation: cat3d-breathe 2.7s ease-in-out infinite alternate; }
        .cat3d-sprite.is-groom { background-image: url("/cat/cat-groom.png"); background-size: 100% 100%; transform-origin: bottom center; animation: cat3d-groom 0.9s ease-in-out infinite; }
        .cat3d-sprite.is-stretch { background-image: url("/cat/cat-stretch.png"); background-size: 100% 100%; transform-origin: bottom center; animation: cat3d-bigstretch 1.4s ease-in-out; }
        .cat3d-sprite.is-crouch { background-image: url("/cat/cat-crouch.png"); background-size: 100% 100%; transform-origin: bottom center; animation: cat3d-compress 0.18s ease-out forwards; }
        .cat3d-sprite.is-jump { background-image: url("/cat/cat-jump.png"); background-size: 100% 100%; transform-origin: bottom center; animation: cat3d-stretch 0.22s ease-out forwards; }
        .cat3d-sprite.is-sleep { background-image: url("/cat/cat-sleep.png"); background-size: 100% 100%; transform-origin: bottom center; animation: cat3d-sleepdrift 5s ease-in-out infinite alternate; }
        .cat3d-sprite.is-eat { background-image: url("/cat/cat-look-down.png"); background-size: 100% 100%; transform-origin: bottom center; animation: cat3d-eat 0.7s ease-in-out infinite; }

        /* ── KANAT AÇIK DÜŞÜŞ — Blender unfurl strip (3 kare), süzülür ── */
        .cat3d-sprite.is-fall {
          background-image: url("/cat/cat-fall-strip.png");
          background-repeat: no-repeat;
          background-size: ${W * 3}px ${H}px;
          background-position-x: 0;
          transform-origin: center;
          animation: cat3d-unfurl 0.36s steps(2) 1 forwards, cat3d-glide 1.1s ease-in-out infinite alternate;
        }
        @keyframes cat3d-unfurl { from { background-position-x: 0; } to { background-position-x: -${W * 2}px; } }
        @keyframes cat3d-glide { from { transform: rotate(-4deg) translateY(0); } to { transform: rotate(3deg) translateY(-2px); } }

        /* ── ÖFKE — Blender arched hiss pozu, titrer ── */
        .cat3d-sprite.is-angry {
          background-image: url("/cat/cat-angry.png"); background-size: 100% 100%;
          transform-origin: bottom center; animation: cat3d-angry 0.14s ease-in-out infinite;
        }
        @keyframes cat3d-angry {
          0%,100% { transform: translateX(0) rotate(0deg); }
          25% { transform: translateX(-2px) rotate(-1.5deg); }
          75% { transform: translateX(2px) rotate(1.5deg); }
        }

        /* ── SEVİLME — Blender 8 kare döngü (baş yukarı nazlanma + kuyruk sallanışı) ── */
        .cat3d-sprite.is-happy {
          background-image: url("/cat/cat-happy-strip.png");
          background-repeat: no-repeat;
          background-size: ${W * 8}px ${H}px;
          background-position-x: 0;
          transform-origin: bottom center;
          animation: cat3d-happyloop 0.8s steps(8) infinite, cat3d-happybounce 0.8s ease-in-out infinite;
        }
        @keyframes cat3d-happyloop { from { background-position-x: 0; } to { background-position-x: -${W * 8}px; } }
        @keyframes cat3d-happybounce { 0%,100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-2px) rotate(2deg); } }
        .cat3d-mimic { position: absolute; inset: 0; background-repeat: no-repeat; background-size: 100% 100%; background-position: 0 0; transform-origin: bottom center; transition: opacity 0.22s ease-in-out; animation: cat3d-breathe 2.7s ease-in-out infinite alternate; pointer-events: none; }

        @keyframes cat3d-col { to { background-position-x: -${sheetW}px; } }
        @keyframes cat3d-row { to { background-position-y: -${sheetH}px; } }
        @keyframes cat3d-breathe { from { transform: translateY(0) scaleY(1); } to { transform: translateY(-1px) scaleY(1.035); } }
        @keyframes cat3d-groom { 0%,100% { transform: translateY(0) rotate(0deg); } 30% { transform: translateY(1px) rotate(-2.5deg); } 60% { transform: translateY(0) rotate(2.5deg); } }
        @keyframes cat3d-bigstretch { 0% { transform: scaleX(1) scaleY(1); } 40% { transform: scaleX(1.05) scaleY(0.97) translateX(2px); } 70% { transform: scaleX(1.05) scaleY(0.97) translateX(2px); } 100% { transform: scaleX(1) scaleY(1); } }
        @keyframes cat3d-sleepdrift { from { transform: translateY(0) scaleY(1) scaleX(1); } to { transform: translateY(-1px) scaleY(1.025) scaleX(1.01); } }
        @keyframes cat3d-eat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(3px) scaleY(0.98); } }
        @keyframes cat3d-compress { from { transform: scaleY(1); } to { transform: scaleY(0.88) translateY(3px); } }
        @keyframes cat3d-stretch { from { transform: scaleX(1) scaleY(1); } to { transform: scaleX(1.06) scaleY(0.96); } }
        @keyframes cat3d-wiggle { 0%,100% { transform: rotate(0deg); } 25% { transform: rotate(-4deg); } 75% { transform: rotate(4deg); } }

        .cat3d-bubble {
          position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%); margin-bottom: 7px;
          background: rgba(12, 18, 29, 0.92); color: #f7d8b0; border: 1px solid rgba(255, 211, 115, 0.4);
          padding: 3px 9px; border-radius: 11px; font-size: 12px; line-height: 1.2; white-space: nowrap;
          pointer-events: none; animation: cat3d-pop 0.18s ease-out;
        }
        @keyframes cat3d-pop { from { opacity: 0; transform: translateX(-50%) translateY(4px) scale(0.9); } to { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); } }
        .cat3d-heart { position: absolute; left: 50%; bottom: 62%; font-size: 14px; color: #ff7c9d; pointer-events: none; animation: cat3d-heart 1.3s ease-out forwards; }
        .cat3d-heart.anger { color: #ff5252; font-size: 15px; }
        @keyframes cat3d-heart { 0% { opacity: 0; transform: translate(calc(-50% + var(--dx, 0px)), 0) scale(0.5); } 20% { opacity: 1; } 100% { opacity: 0; transform: translate(calc(-50% + var(--dx, 0px)), -48px) scale(1.15); } }

        .cat3d-bowl {
          position: fixed; left: 0; bottom: 12px; z-index: 59; font-size: 22px; pointer-events: none;
          filter: drop-shadow(0 2px 3px rgba(0,0,0,0.5)); animation: cat3d-bowlpop 0.3s ease-out;
        }
        @keyframes cat3d-bowlpop { from { opacity: 0; } to { opacity: 1; } }

        @media (prefers-reduced-motion: reduce) {
          .cat3d-sprite, .cat3d-mimic { animation: none !important; }
          .cat3d-mimic { display: none; }
        }
      `}</style>

      <style jsx>{`
        .catcare-dock {
          position: fixed; left: 50%; transform: translateX(-50%);
          bottom: max(12px, env(safe-area-inset-bottom)); z-index: 62;
          display: grid; justify-items: center; gap: 8px; pointer-events: auto;
        }
        .catcare-toggle {
          display: inline-flex; align-items: center; gap: 8px; cursor: pointer;
          padding: 8px 14px; border-radius: 999px; border: 1px solid rgba(255, 211, 115, 0.3);
          background: rgba(12, 20, 18, 0.72); backdrop-filter: blur(10px); color: #f2fbf7;
          font-family: var(--font-sans, inherit); font-weight: 600; font-size: 0.86rem;
          box-shadow: 0 6px 18px rgba(0,0,0,0.35);
        }
        .catcare-toggle:hover { border-color: rgba(255, 211, 115, 0.55); }
        .catcare-face { font-size: 1.15rem; line-height: 1; }
        .catcare-warn { animation: care-pulse 0.9s ease-in-out infinite; }
        @keyframes care-pulse { 0%,100% { opacity: 0.5; } 50% { opacity: 1; } }
        .catcare-card {
          width: min(320px, calc(100vw - 24px)); padding: 14px;
          border-radius: 16px; border: 1px solid rgba(182, 227, 216, 0.2);
          background: rgba(9, 18, 16, 0.92); backdrop-filter: blur(14px);
          box-shadow: 0 14px 40px rgba(0,0,0,0.5); color: #e7f3ef;
          display: grid; gap: 10px;
        }
        .catcare-head { display: flex; align-items: baseline; justify-content: space-between; font-family: var(--font-display, inherit); }
        .catcare-head > span:first-child { font-size: 1.1rem; color: #f4fcf8; }
        .catcare-mood { font-size: 0.74rem; color: #9fc4ba; }
        .catcare-needs { display: grid; gap: 6px; }
        .catcare-need { display: grid; grid-template-columns: 78px 1fr 26px; align-items: center; gap: 8px; font-size: 0.74rem; color: #cfe4dd; }
        .catcare-need-lbl { white-space: nowrap; }
        .catcare-bar { height: 7px; border-radius: 5px; background: rgba(255,255,255,0.09); overflow: hidden; }
        .catcare-bar > i { display: block; height: 100%; border-radius: 5px; transition: width 0.5s ease; }
        .catcare-val { text-align: right; font-variant-numeric: tabular-nums; color: #9fc4ba; }
        .catcare-anger .catcare-need-lbl { color: #ff9c9c; }
        .catcare-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 7px; margin-top: 2px; }
        .catcare-actions > button {
          padding: 9px 10px; border-radius: 11px; border: 1px solid rgba(182, 227, 216, 0.18);
          background: rgba(182, 227, 216, 0.06); color: #eaf5f1; cursor: pointer;
          font-family: var(--font-sans, inherit); font-weight: 600; font-size: 0.82rem; transition: background 0.18s ease, border-color 0.18s ease;
        }
        .catcare-actions > button:hover { background: rgba(182, 227, 216, 0.14); border-color: rgba(182, 227, 216, 0.4); }
        .catcare-hint { margin: 2px 0 0; font-size: 0.68rem; line-height: 1.4; color: #7f9c94; }

        @media (max-width: 640px) {
          .catcare-dock { bottom: max(64px, env(safe-area-inset-bottom)); }
        }
      `}</style>
    </>
  );
}
