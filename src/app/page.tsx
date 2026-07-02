"use client";

/* eslint-disable @next/next/no-img-element -- Keşfet kartları harici favicon URL'leri gösteriyor. */

import { CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import { AudioPlayer } from "@/components/AudioPlayer";
import { SceneMixer } from "@/components/SceneMixer";
import { CatCompanion } from "@/components/CatCompanion";
import { BackgroundVideoWall } from "@/components/BackgroundVideoWall";
import { SnakeDonerGame } from "@/components/SnakeDonerGame";
import { OkuDoom } from "@/components/OkuDoom";
import { ChatBox } from "@/components/ChatBox";
import { FocusStats } from "@/components/FocusStats";
import { PomodoroTimer } from "@/components/PomodoroTimer";
import { WeeklyVisitorCount } from "@/components/WeeklyVisitorCount";
import { RitualLauncher } from "@/components/RitualLauncher";
import { DiscoveryPassportPanel } from "@/components/DiscoveryPassportPanel";
import { CatCoachPanel } from "@/components/CatCoachPanel";
import { discoverySites } from "@/data/discoverySites";
import { turkishRiddles } from "@/data/turkishRiddles";
import { tellCat } from "@/lib/catEvents";
import { readDiscoveryPassport, recordDiscoveryVisit, setDiscoveryVote, writeDiscoveryPassport } from "@/lib/discoveryPassport";

/* ===================================================================
   Anasayfa — reaktif "dinlenme · odak · keşif" paneli.
   Claude Design (Anasayfa.dc.html) tasarımının React portu.
   =================================================================== */

type TabKey = "kesfet" | "pomodoro" | "sohbet" | "nefes" | "oku" | "yilan" | "bulmaca";
type ThemeKey = "teal" | "magma" | "neon";
type ThemeSel = "auto" | ThemeKey;

const FD = "var(--font-display), serif"; // Fraunces
const FS = "var(--font-sans), sans-serif"; // Sora
const LINE = "rgba(182,227,216,0.2)";

const TABS: { key: TabKey; label: string }[] = [
  { key: "kesfet", label: "Keşfet" },
  { key: "pomodoro", label: "Pomodoro" },
  { key: "sohbet", label: "Sohbet" },
  { key: "nefes", label: "Nefes" },
  { key: "oku", label: "Oku" },
  { key: "yilan", label: "Yılan" },
  { key: "bulmaca", label: "Bulmaca" },
];

type Theme = {
  label: string;
  bg1: string;
  bg2: string;
  blobs: [string, string, string];
  accent2: string;
  accents: Record<TabKey, string>;
};

const THEMES: Record<ThemeKey, Theme> = {
  teal: {
    label: "Teal",
    bg1: "#0c1a18",
    bg2: "#070f0e",
    blobs: ["#6df0c2", "#ffd373", "#9d8cff"],
    accent2: "#ffd373",
    accents: { kesfet: "#6df0c2", pomodoro: "#ffd373", sohbet: "#8ee6ff", nefes: "#9fe9d4", oku: "#ffa97f", yilan: "#9d8cff", bulmaca: "#ffd373" },
  },
  magma: {
    label: "Magma",
    bg1: "#1e0f12",
    bg2: "#0c0707",
    blobs: ["#ff7a59", "#ffb347", "#ff5d8f"],
    accent2: "#ffcf6b",
    accents: { kesfet: "#ff8a5c", pomodoro: "#ffb347", sohbet: "#7bdff2", nefes: "#ff9472", oku: "#ff6f91", yilan: "#c77dff", bulmaca: "#ffcf6b" },
  },
  neon: {
    label: "Neon",
    bg1: "#140a1e",
    bg2: "#08060d",
    blobs: ["#ff4d9d", "#7b5cff", "#3df0ff"],
    accent2: "#ffd24d",
    accents: { kesfet: "#ff4d9d", pomodoro: "#ffd24d", sohbet: "#3df0ff", nefes: "#3df0ff", oku: "#ff7a59", yilan: "#7b5cff", bulmaca: "#ff4d9d" },
  },
};

const VIBES: { key: string; label: string; color: string }[] = [
  { key: "rahatlatici", label: "Rahatlatıcı", color: "#6df0c2" },
  { key: "sasirtici", label: "Şaşırtıcı", color: "#ffd373" },
  { key: "oyunlu", label: "Oyunlu", color: "#9d8cff" },
  { key: "kesif", label: "Keşif", color: "#ffa97f" },
];
const VIBE_LABELS: Record<string, string> = {
  rahatlatici: "Rahatlatıcı",
  sasirtici: "Şaşırtıcı",
  oyunlu: "Oyunlu",
  kesif: "Keşif",
};

function themeForHour(h: number): ThemeKey {
  if (h >= 6 && h < 17) return "teal"; // gündüz
  if (h >= 17 && h < 22) return "magma"; // akşam · gün batımı
  return "neon"; // gece
}
function wInfo(code: number): { label: string; icon: string } {
  if (code === 0) return { label: "Açık", icon: "☀️" };
  if (code <= 3) return { label: "Parçalı Bulutlu", icon: "⛅" };
  if (code <= 48) return { label: "Sisli", icon: "🌫️" };
  if (code <= 67) return { label: "Yağmurlu", icon: "🌧️" };
  if (code <= 77) return { label: "Karlı", icon: "❄️" };
  if (code <= 82) return { label: "Sağanak", icon: "🌦️" };
  return { label: "Fırtınalı", icon: "⛈️" };
}
function rand(n: number, not?: number) {
  if (n <= 1) return 0;
  let i = not ?? -1;
  while (i === (not ?? -1)) i = Math.floor(Math.random() * n);
  return i;
}
function domainOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
function faviconOf(url: string) {
  return `https://www.google.com/s2/favicons?domain=${domainOf(url)}&sz=64`;
}

export default function Home() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const themeRef = useRef<HTMLDivElement | null>(null);
  const lastPassportSiteRef = useRef<string | null>(null);

  const [theme, setTheme] = useState<ThemeSel>("auto");
  const [activeTab, setActiveTab] = useState<TabKey>("kesfet");
  const [hoverTab, setHoverTab] = useState<TabKey | null>(null);
  const [now, setNow] = useState<Date | null>(null);
  const [weather, setWeather] = useState<{ temp: number; code: number } | null>(null);

  const [siteIdx, setSiteIdx] = useState(0);
  const [siteVotes, setSiteVotes] = useState<Record<string, number>>({});
  const [discoveryReady, setDiscoveryReady] = useState(false);

  const [riddleIdx, setRiddleIdx] = useState(0);
  const [riddleShown, setRiddleShown] = useState(false);
  const [solvedCount, setSolvedCount] = useState(0);

  const [yilanStarted, setYilanStarted] = useState(false);
  const [okuStarted, setOkuStarted] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const [nefesAvangard, setNefesAvangard] = useState(false);

  // mount: rastgele başlangıçlar + saat + hava durumu
  useEffect(() => {
    const hydrateTimer = window.setTimeout(() => {
      setNow(new Date());
      setSiteIdx(Math.floor(Math.random() * discoverySites.length));
      setRiddleIdx(Math.floor(Math.random() * turkishRiddles.length));
      setDiscoveryReady(true);
    }, 0);
    fetch(
      "https://api.open-meteo.com/v1/forecast?latitude=41.0082&longitude=28.9784&current=temperature_2m,weathercode&timezone=Europe/Istanbul"
    )
      .then((r) => r.json())
      .then((d) => setWeather({ temp: Math.round(d.current.temperature_2m), code: d.current.weathercode }))
      .catch(() => {});
    return () => window.clearTimeout(hydrateTimer);
  }, []);

  // saniyelik tik — saat
  useEffect(() => {
    const id = window.setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  // imleç → CSS değişkenleri (spotlight + parallax)
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const w = window.innerWidth || 1;
      const h = window.innerHeight || 1;
      const mx = (e.clientX / w - 0.5) * 2;
      const my = (e.clientY / h - 0.5) * 2;
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        const el = rootRef.current;
        if (!el) return;
        el.style.setProperty("--mx", mx.toFixed(3));
        el.style.setProperty("--my", my.toFixed(3));
        el.style.setProperty("--px", `${e.clientX}px`);
        el.style.setProperty("--py", `${e.clientY}px`);
      });
    };
    window.addEventListener("pointermove", onMove);
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // tema çipi açıkken: dışarı tıkla / Esc ile kapat
  useEffect(() => {
    if (!themeOpen) return;
    const onDown = (e: PointerEvent) => {
      if (themeRef.current && !themeRef.current.contains(e.target as Node)) setThemeOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setThemeOpen(false);
    };
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [themeOpen]);

  useEffect(() => {
    let scroller: HTMLElement | null = null;
    let pointerId = -1;
    let startX = 0;
    let startScrollLeft = 0;
    let moved = false;
    let suppressClick = false;

    const finishDrag = () => {
      if (!scroller) return;
      scroller.classList.remove("is-dragging");
      if (moved) {
        suppressClick = true;
        window.setTimeout(() => {
          suppressClick = false;
        }, 0);
      }
      scroller = null;
      pointerId = -1;
      moved = false;
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      const target = event.target as Element | null;
      const nextScroller = target?.closest<HTMLElement>(".ana-drag-scroll");
      if (!nextScroller) return;
      scroller = nextScroller;
      pointerId = event.pointerId;
      startX = event.clientX;
      startScrollLeft = nextScroller.scrollLeft;
      moved = false;
      nextScroller.classList.add("is-dragging");
      nextScroller.setPointerCapture?.(event.pointerId);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!scroller || event.pointerId !== pointerId) return;
      const dx = event.clientX - startX;
      if (Math.abs(dx) > 4) {
        moved = true;
        scroller.scrollLeft = startScrollLeft - dx;
        event.preventDefault();
      }
    };

    const onClick = (event: MouseEvent) => {
      if (!suppressClick) return;
      const target = event.target as Element | null;
      if (!target?.closest(".ana-drag-scroll")) return;
      event.preventDefault();
      event.stopPropagation();
      suppressClick = false;
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("pointermove", onPointerMove, { passive: false });
    document.addEventListener("pointerup", finishDrag);
    document.addEventListener("pointercancel", finishDrag);
    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerup", finishDrag);
      document.removeEventListener("pointercancel", finishDrag);
      document.removeEventListener("click", onClick, true);
    };
  }, []);

  // efektif tema + aksan
  const effKey: ThemeKey = theme === "auto" ? themeForHour((now ?? new Date()).getHours()) : theme;
  const th = THEMES[effKey];
  const accent = th.accents[activeTab];
  const accent2 = th.accent2;
  const autoActive = theme === "auto";

  // tema değişkenlerini köke uygula
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    el.style.setProperty("--bg1", th.bg1);
    el.style.setProperty("--bg2", th.bg2);
    el.style.setProperty("--blob1", th.blobs[0]);
    el.style.setProperty("--blob2", th.blobs[1]);
    el.style.setProperty("--blob3", th.blobs[2]);
    el.style.setProperty("--spot", `${accent}26`);
  }, [th, accent]);

  // --- türev değerler ---
  const clock = now ? now.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }) : "--:--";
  const w = weather ? wInfo(weather.code) : { label: "Parçalı Bulutlu", icon: "⛅" };
  const wTemp = `${weather ? weather.temp : 18}°C`;

  const site = discoverySites[siteIdx];
  const myVote = siteVotes[site.id] || 0;
  useEffect(() => {
    if (!discoveryReady || !site || lastPassportSiteRef.current === site.id) return;
    lastPassportSiteRef.current = site.id;
    writeDiscoveryPassport(recordDiscoveryVisit(readDiscoveryPassport(), { siteId: site.id, vibe: site.vibe }));
  }, [discoveryReady, site]);
  const siteEntries = useMemo(
    () => discoverySites.map((s, idx) => ({ s, idx })),
    []
  );
  const moreSites = useMemo(
    () =>
      Array.from({ length: Math.min(36, discoverySites.length - 1) }, (_, k) => {
        const idx = (siteIdx + 1 + k) % discoverySites.length;
        return { s: discoverySites[idx], idx };
      }).filter((o) => o.idx !== siteIdx),
    [siteIdx]
  );
  const quickPicks = useMemo(
    () =>
      VIBES.map((v, vibeIndex) => {
        const entries = siteEntries.filter(({ s }) => s.vibe === v.key);
        if (!entries.length) return null;
        return entries[(siteIdx + vibeIndex * 7) % entries.length];
      }).filter((entry): entry is { s: typeof discoverySites[number]; idx: number } =>
        Boolean(entry)
      ),
    [siteEntries, siteIdx]
  );
  const vibeRows = useMemo(
    () =>
      VIBES.map((v, vibeIndex) => {
        const entries = siteEntries.filter(({ s }) => s.vibe === v.key);
        const start = entries.length ? (siteIdx + vibeIndex * 5) % entries.length : 0;
        const items = Array.from(
          { length: Math.min(14, entries.length) },
          (_, k) => entries[(start + k) % entries.length]
        );
        return { ...v, items };
      }).filter((row) => row.items.length > 0),
    [siteEntries, siteIdx]
  );
  const selectSite = (idx: number) => {
    setSiteIdx(idx);
    tellCat({
      pool: [
        "Bu köşeyi sevdim, biraz kurcalayalım.",
        "Yeni sekme kokusu aldım.",
        "Bunu açarsan ben de kenardan izlerim.",
        "Güzel seçim. Merak patilerim çalıştı.",
      ],
    });
  };
  const rollSite = () => {
    setSiteIdx((i) => rand(discoverySites.length, i));
    tellCat({
      pool: [
        "Rastgelelik candır.",
        "Başka kapı açıldı.",
        "Bunu ben seçmiş gibi davranalım.",
        "Yeni keşif düştü, gözüm üstünde.",
      ],
    });
  };
  const vote = (val: 1 | -1) => {
    const nextVote = myVote === val ? 0 : val;
    setSiteVotes((s) => ({ ...s, [site.id]: nextVote }));
    writeDiscoveryPassport(setDiscoveryVote(readDiscoveryPassport(), site.id, site.vibe, nextVote));
    tellCat(
      val === 1
        ? { pool: ["Beğeni geldi, kuyruğum onayladı.", "Bunu favorilere yazalım mı?", "İyi seçim, burası ışıldıyor."] }
        : { pool: ["Atladık gitti.", "Tamam, bu sana göre değilmiş.", "Kötü değil ama daha iyisini buluruz."] }
    );
  };
  const activateTab = (tab: TabKey) => {
    setActiveTab(tab);
    const label = TABS.find((t) => t.key === tab)?.label ?? tab;
    tellCat({
      pool: [
        `${label} tarafına geçtik.`,
        `Ben ${label} nöbetindeyim.`,
        `${label} açıldı, pati kontrolü tamam.`,
      ],
    });
  };

  const riddle = turkishRiddles[riddleIdx];
  const revealRiddle = () => {
    if (riddleShown) return;
    setRiddleShown(true);
    setSolvedCount((c) => c + 1);
    tellCat({
      pool: [
        "Cevap ortaya çıktı, şimdi akıllı görünme vakti.",
        "Ben biliyordum ama spoiler vermedim.",
        "Güzel hamle, beyin çalıştı.",
      ],
    });
  };
  const nextRiddle = () => {
    setRiddleIdx((i) => rand(turkishRiddles.length, i));
    setRiddleShown(false);
    tellCat({
      pool: [
        "Yeni bilmece geldi.",
        "Bunu çözersen saygım artar.",
        "Kafam yandı ama sen yaparsın.",
      ],
    });
  };

  // ---- ortak stil parçaları ----
  const rootStyle = {
    "--mx": 0,
    "--my": 0,
    "--px": "50%",
    "--py": "30%",
    "--bg1": th.bg1,
    "--bg2": th.bg2,
    "--blob1": th.blobs[0],
    "--blob2": th.blobs[1],
    "--blob3": th.blobs[2],
    "--spot": `${accent}26`,
    position: "relative",
    minHeight: "100vh",
    width: "100%",
    overflow: "hidden",
    isolation: "isolate",
    fontFamily: FS,
    color: "#f2fbf7",
    background: "transparent",
    transition: "background .6s ease",
  } as CSSProperties;

  const asideCard: CSSProperties = {
    borderRadius: 20,
    border: "1px solid rgba(182,227,216,0.18)",
    background: "rgba(11,20,18,0.7)",
    padding: 22,
  };
  const ghostBtn: CSSProperties = {
    padding: "13px 20px",
    borderRadius: 13,
    border: `1px solid ${LINE}`,
    background: "rgba(9,18,16,0.7)",
    color: "#d5e4df",
    fontWeight: 600,
    fontSize: "0.9rem",
    cursor: "pointer",
    fontFamily: FS,
  };
  const primaryBtn: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "13px 22px",
    borderRadius: 13,
    border: "none",
    fontWeight: 700,
    fontSize: "0.92rem",
    color: "#04221d",
    background: `linear-gradient(90deg, ${accent}, ${accent2})`,
    cursor: "pointer",
    fontFamily: FS,
  };
  const tagPill: CSSProperties = {
    padding: "5px 12px",
    borderRadius: 999,
    fontSize: "0.68rem",
    fontWeight: 700,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    color: accent,
    border: `1px solid ${accent}66`,
  };

  return (
    <div ref={rootRef} className="ana-root" style={rootStyle}>
      {/* arkada loop olan manzaralar */}
      <BackgroundVideoWall />
      {/* okunabilirlik + tema havası için koyu tint (videonun üstünde, içeriğin altında) */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          zIndex: -1,
          pointerEvents: "none",
          background: "radial-gradient(circle at 50% 0%, rgba(10,22,20,0.20), rgba(6,12,11,0.58) 72%)",
        }}
      />

      {/* fonksiyonel dock'lar */}
      <AudioPlayer />
      <SceneMixer />
      <CatCompanion activeTab={activeTab} />

      {/* imleç ışığı */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 1,
          pointerEvents: "none",
          mixBlendMode: "screen",
          background: "radial-gradient(560px circle at var(--px) var(--py), var(--spot), transparent 72%)",
          transition: "background .4s ease",
        }}
      />

      {/* reaktif aurora */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          filter: "blur(64px)",
          opacity: 0.62,
          transform: "translate(calc(var(--mx)*-36px), calc(var(--my)*-30px))",
          transition: "transform .2s ease",
        }}
      >
        <div style={{ position: "absolute", left: "6%", top: "8%", width: 340, height: 340, borderRadius: "50%", background: "radial-gradient(circle,var(--blob1),transparent 70%)", opacity: 0.42, animation: "ana-drift 26s ease-in-out infinite", transition: "background .6s ease" }} />
        <div style={{ position: "absolute", right: "8%", top: "18%", width: 320, height: 320, borderRadius: "50%", background: "radial-gradient(circle,var(--blob2),transparent 70%)", opacity: 0.32, animation: "ana-drift 32s ease-in-out infinite reverse", transition: "background .6s ease" }} />
        <div style={{ position: "absolute", left: "30%", bottom: "4%", width: 380, height: 380, borderRadius: "50%", background: "radial-gradient(circle,var(--blob3),transparent 70%)", opacity: 0.34, animation: "ana-drift 38s ease-in-out infinite", transition: "background .6s ease" }} />
      </div>
      <div aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none", mixBlendMode: "overlay", background: "repeating-linear-gradient(0deg, rgba(255,255,255,.05) 0 1px, transparent 1px 3px)", animation: "ana-flicker 8s steps(2) infinite" }} />

      <main className="ana-main" style={{ position: "relative", zIndex: 2, maxWidth: 1180, margin: "0 auto", padding: "30px 28px 120px", display: "grid", gap: 26 }}>
        {/* üst bar */}
        <header style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: accent, boxShadow: `0 0 16px ${accent}`, animation: "ana-dot 3.4s ease-in-out infinite", transition: "background .5s ease" }} />
              <span style={{ fontWeight: 800, letterSpacing: "0.34em", fontSize: "1.02rem" }}>CHILLOUT</span>
            </div>
            <div style={{ marginTop: 7, fontSize: "0.64rem", letterSpacing: "0.26em", textTransform: "uppercase", color: "#5d7b73" }}>dinlenme · odak · keşif</div>
          </div>

          {/* hava + saat + son hafta kişi sayısı */}
          <div className="hero-status-stack">
            <WeeklyVisitorCount />
            <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "12px 18px", borderRadius: 16, border: "1px solid rgba(182,227,216,0.2)", background: "rgba(9,18,16,0.5)", backdropFilter: "blur(10px)" }}>
              <div style={{ fontFamily: FD, fontSize: "1.5rem", lineHeight: 1, color: "#f2fbf7", fontVariantNumeric: "tabular-nums" }}>{clock}</div>
              <div style={{ width: 1, height: 30, background: "rgba(182,227,216,0.18)" }} />
              <div style={{ display: "grid", gap: 3 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: "1.1rem" }}>{w.icon}</span>
                  <span style={{ fontFamily: FD, fontSize: "1.15rem", color: "#f2fbf7" }}>{wTemp}</span>
                </div>
                <div style={{ fontSize: "0.66rem", color: "#88a39c", letterSpacing: "0.02em" }}>İstanbul · {w.label}</div>
              </div>
            </div>
          </div>
        </header>

        {/* hero */}
        <section style={{ display: "grid", gap: 16, padding: "14px 0 4px" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 9, width: "fit-content", padding: "7px 13px", borderRadius: 999, border: "1px solid rgba(182,227,216,0.24)", background: "rgba(9,18,16,0.5)", backdropFilter: "blur(10px)", fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.04em", color: "#d5e4df" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12c3 0 4-4 7-4s3 4 6 4 4-2 5-2" /><path d="M3 17c3 0 4-3 7-3s3 3 6 3 4-1.5 5-1.5" /></svg>
            Dinlenme Köşesi
          </div>
          <h1 style={{ margin: 0, fontFamily: FD, fontWeight: 400, fontSize: "clamp(2.6rem,6vw,5.4rem)", lineHeight: 0.98, letterSpacing: "-0.03em", color: "#f4fcf8", textShadow: "0 4px 36px rgba(0,0,0,0.4)", transform: "translate(calc(var(--mx)*6px), calc(var(--my)*4px))" }}>
            Müzik, odak <span style={{ fontStyle: "italic", color: accent, transition: "color .5s ease" }}>&amp;</span> keşif.
          </h1>
          <p style={{ margin: 0, maxWidth: "54ch", color: "#bcd2cb", lineHeight: 1.55, fontSize: "1.02rem" }}>Rahatla, çalış, eğlen — hepsi tek yerde. Bir köşe seç, ritmini bul.</p>
        </section>

        {/* sekme navigasyonu + tema */}
        <div className="ana-nav-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <nav id="cat-tab-nav" style={{ display: "flex", flexWrap: "wrap", gap: 4, padding: 6, borderRadius: 16, border: "1px solid rgba(182,227,216,0.14)", background: "rgba(8,16,15,0.5)", backdropFilter: "blur(10px)", width: "fit-content", maxWidth: "100%" }}>
            {TABS.map((t, i) => {
              const isActive = t.key === activeTab;
              const isHover = hoverTab === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => activateTab(t.key)}
                  onMouseEnter={() => setHoverTab(t.key)}
                  onMouseLeave={() => setHoverTab((h) => (h === t.key ? null : h))}
                  style={{
                    position: "relative",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "10px 16px 13px",
                    border: "none",
                    borderRadius: 11,
                    cursor: "pointer",
                    fontFamily: FS,
                    fontWeight: 600,
                    fontSize: "0.9rem",
                    whiteSpace: "nowrap",
                    transition: "color .2s ease, background .2s ease",
                    color: isActive ? "#f4fcf8" : isHover ? "#cfe4dd" : "#7e9a92",
                    background: isActive ? "rgba(182,227,216,0.07)" : "transparent",
                  }}
                >
                  <span style={{ fontFamily: FD, fontSize: "0.82rem", opacity: 0.55 }}>{(i + 1).toString().padStart(2, "0")}</span>
                  <span>{t.label}</span>
                  <span style={{ position: "absolute", left: 16, right: 16, bottom: 6, height: 2, borderRadius: 2, background: th.accents[t.key], transition: "opacity .25s ease, transform .25s ease", transformOrigin: "left", opacity: isActive ? 1 : isHover ? 0.5 : 0, transform: `scaleX(${isActive ? 1 : 0.4})` }} />
                </button>
              );
            })}
          </nav>

          {/* tema — sinmiş çip: durağanken aktif temayı gösterir, tıkla ile açılır */}
          <div
            ref={themeRef}
            className="ana-theme-wrap"
            style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "flex-end" }}
          >
            <button
              type="button"
              onClick={() => setThemeOpen((o) => !o)}
              aria-label="Tema"
              aria-haspopup="true"
              aria-expanded={themeOpen}
              title={autoActive ? `Tema · Oto (${th.label})` : `Tema · ${th.label}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                flex: "none",
                padding: autoActive ? "5px 11px 5px 9px" : "5px 9px",
                borderRadius: 999,
                cursor: "pointer",
                fontFamily: FS,
                fontWeight: 700,
                fontSize: "0.6rem",
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                transition: "all .18s ease",
                border: `1px solid ${themeOpen ? `${accent}88` : LINE}`,
                background: themeOpen ? `${accent}1f` : "rgba(8,16,15,0.5)",
                color: themeOpen ? "#f4fcf8" : "#7e9a92",
              }}
            >
              <span
                aria-hidden
                style={{
                  width: 13,
                  height: 13,
                  borderRadius: "50%",
                  flex: "none",
                  background: `conic-gradient(${th.blobs[0]} 0 33%, ${th.blobs[1]} 33% 66%, ${th.blobs[2]} 66%)`,
                  boxShadow: autoActive ? `0 0 8px ${accent}` : "none",
                  animation: autoActive ? "ana-dot 2.6s ease-in-out infinite" : "none",
                  transition: "box-shadow .3s ease",
                }}
              />
              {autoActive ? "Oto" : null}
              <svg
                aria-hidden
                width="8"
                height="8"
                viewBox="0 0 24 24"
                fill="none"
                stroke={themeOpen ? accent : "#5d7b73"}
                strokeWidth="3.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ flex: "none", transform: themeOpen ? "rotate(180deg)" : "none", transition: "transform .18s ease, stroke .18s ease" }}
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>

            <div
              role="menu"
              style={{
                position: "absolute",
                top: "calc(100% + 8px)",
                right: 0,
                zIndex: 20,
                display: "flex",
                alignItems: "center",
                gap: 11,
                padding: "10px 14px",
                borderRadius: 14,
                border: `1px solid ${LINE}`,
                background: "linear-gradient(160deg, rgba(13,24,21,0.96), rgba(8,15,14,0.98))",
                backdropFilter: "blur(10px)",
                boxShadow: "0 18px 40px rgba(0,0,0,0.45)",
                opacity: themeOpen ? 1 : 0,
                visibility: themeOpen ? "visible" : "hidden",
                transform: themeOpen ? "translateY(0)" : "translateY(-6px)",
                pointerEvents: themeOpen ? "auto" : "none",
                transition: "opacity .2s ease, transform .22s cubic-bezier(0.22,1,0.36,1), visibility .2s",
              }}
            >
              <span style={{ fontSize: "0.62rem", letterSpacing: "0.22em", textTransform: "uppercase", color: "#5d7b73", whiteSpace: "nowrap" }}>tema</span>
              <button
                type="button"
                onClick={() => setTheme("auto")}
                title="Otomatik — gün içinde kendi değişir"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 12px",
                  borderRadius: 999,
                  cursor: "pointer",
                  fontFamily: FS,
                  fontWeight: 700,
                  fontSize: "0.66rem",
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  whiteSpace: "nowrap",
                  transition: "all .18s ease",
                  border: `1px solid ${autoActive ? `${accent}88` : LINE}`,
                  background: autoActive ? `${accent}1f` : "rgba(8,16,15,0.5)",
                  color: autoActive ? "#f4fcf8" : "#7e9a92",
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: accent, boxShadow: `0 0 8px ${accent}`, animation: "ana-dot 2.6s ease-in-out infinite" }} />
                Oto
              </button>
              <div style={{ display: "flex", gap: 8 }}>
                {(Object.keys(THEMES) as ThemeKey[]).map((k) => {
                  const tt = THEMES[k];
                  const manualOn = theme === k;
                  const liveOn = autoActive && effKey === k;
                  const ring = manualOn ? "#f4fcf8" : liveOn ? tt.accents.kesfet : LINE;
                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setTheme(k)}
                      aria-label={tt.label}
                      title={tt.label}
                      style={{
                        width: 48,
                        height: 26,
                        borderRadius: 999,
                        cursor: "pointer",
                        padding: 0,
                        background: `linear-gradient(90deg,${tt.blobs[0]} 0 33%,${tt.blobs[1]} 33% 66%,${tt.blobs[2]} 66%)`,
                        border: `2px solid ${ring}`,
                        boxShadow: liveOn ? `0 0 10px ${tt.accents.kesfet}88` : "none",
                        transform: `scale(${manualOn || liveOn ? 1.08 : 1})`,
                        transition: "transform .18s ease, border-color .18s ease, box-shadow .3s ease",
                      }}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <RitualLauncher activeTab={activeTab} onActivateTab={activateTab} />
        <CatCoachPanel activeTab={activeTab} onActivateTab={activateTab} />

        {/* ===== PANELLER ===== */}
        <section
          key={activeTab}
          className="ana-panel-anim"
          style={{ minHeight: 430, transform: "perspective(1400px) rotateX(calc(var(--my,0)*-1.8deg)) rotateY(calc(var(--mx,0)*2.4deg))", transformStyle: "preserve-3d", transition: "transform .15s ease" }}
        >
          {/* KEŞFET */}
          {activeTab === "kesfet" && (
            <div style={{ display: "grid", gap: 18 }}>
              <div className="ana-two-col" style={{ display: "grid", gridTemplateColumns: "minmax(0,1.3fr) 280px", gap: 22 }}>
                <article style={{ position: "relative", borderRadius: 24, border: `1px solid ${accent}3d`, background: "linear-gradient(160deg, rgba(13,24,21,0.86), rgba(8,15,14,0.92))", padding: 34, overflow: "hidden", display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 26, minHeight: 380 }}>
                  <div aria-hidden style={{ position: "absolute", right: -60, top: -60, width: 260, height: 260, borderRadius: "50%", background: `radial-gradient(circle,${accent}33,transparent 70%)`, filter: "blur(20px)" }} />
                  <div style={{ position: "relative" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
                      <span style={tagPill}>{VIBE_LABELS[site.vibe] || site.vibe}</span>
                      <span style={{ fontSize: "0.68rem", letterSpacing: "0.16em", textTransform: "uppercase", color: "#5d7b73" }}>kaynak · {site.source === "eksi" ? "ekşi" : "global"}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
                      <img
                        src={faviconOf(site.url)}
                        alt=""
                        width={42}
                        height={42}
                        style={{ flex: "none", borderRadius: 11, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(182,227,216,0.18)", padding: 6 }}
                        onError={(e) => { e.currentTarget.style.display = "none"; }}
                      />
                      <h2 style={{ margin: 0, fontFamily: FD, fontWeight: 400, fontSize: "clamp(2rem,3.6vw,3rem)", lineHeight: 1.02, letterSpacing: "-0.02em", color: "#f4fcf8" }}>{site.name}</h2>
                    </div>
                    <p style={{ margin: 0, maxWidth: "46ch", color: "#c2d6cf", lineHeight: 1.55, fontSize: "1.02rem" }}>{site.description}</p>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginTop: 16, fontSize: "0.82rem", color: "#88a39c" }}>
                      <a href={site.url} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: accent }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M2 12h20" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>
                        {domainOf(site.url)}
                      </a>
                      <span style={{ opacity: 0.45 }}>•</span>
                      <span>keşif {(siteIdx + 1).toString().padStart(2, "0")} / {discoverySites.length}</span>
                      {myVote !== 0 && (
                        <>
                          <span style={{ opacity: 0.45 }}>•</span>
                          <span style={{ color: myVote === 1 ? "#6df0c2" : "#ff9898" }}>{myVote === 1 ? "beğendin" : "atladın"}</span>
                        </>
                      )}
                    </div>
                    <div className="discover-quick-grid" style={{ marginTop: 22 }}>
                      {quickPicks.map(({ s, idx }) => {
                        const vc = VIBES.find((v) => v.key === s.vibe)?.color || accent;
                        return (
                          <button
                            key={`quick-${s.id}`}
                            type="button"
                            onClick={() => selectSite(idx)}
                            style={{ border: `1px solid ${vc}33`, background: "rgba(7,16,15,0.58)", color: "#d5e4df", borderRadius: 14, padding: "12px 13px", display: "grid", gap: 7, textAlign: "left", cursor: "pointer", fontFamily: FS, minWidth: 0 }}
                          >
                            <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                              <img src={faviconOf(s.url)} alt="" width={17} height={17} style={{ flex: "none", borderRadius: 5 }} onError={(e) => { e.currentTarget.style.display = "none"; }} />
                              <span style={{ fontSize: "0.6rem", letterSpacing: "0.12em", textTransform: "uppercase", color: vc, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{VIBE_LABELS[s.vibe]}</span>
                            </span>
                            <strong style={{ fontFamily: FD, fontWeight: 400, color: "#f2fbf7", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</strong>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <a
                      href={site.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => tellCat({ pool: ["Dış dünyaya açılıyoruz.", "Sekme kapısı aralandı.", "Ben buradayım, sen gez."] })}
                      style={{ ...primaryBtn, padding: "13px 22px" }}
                    >
                      Siteyi aç
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17 17 7" /><path d="M7 7h10v10" /></svg>
                    </a>
                    <button type="button" onClick={rollSite} style={ghostBtn}>Başka bir tane →</button>
                    <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
                      <button type="button" onClick={() => vote(-1)} aria-label="Beğenme" style={voteBtnStyle(myVote === -1, "dislike")}>
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 14V2" /><path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z" /></svg>
                      </button>
                      <button type="button" onClick={() => vote(1)} aria-label="Beğen" style={voteBtnStyle(myVote === 1, "like")}>
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 10v12" /><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" /></svg>
                      </button>
                    </div>
                  </div>
                </article>
                <aside className="ana-aside-hide" style={{ display: "grid", gap: 16, alignContent: "start" }}>
                  <div style={{ ...asideCard, textAlign: "center" }}>
                    <div style={{ fontFamily: FD, fontSize: "2.4rem", lineHeight: 1, color: accent }}>{(siteIdx + 1).toString().padStart(2, "0")}</div>
                    <div style={{ fontSize: "0.66rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "#88a39c", marginTop: 8 }}>{discoverySites.length} site</div>
                  </div>
                  <div style={{ ...asideCard, padding: 20, display: "grid", gap: 10 }}>
                    <div style={{ fontSize: "0.66rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "#88a39c" }}>vibe filtresi</div>
                    {VIBES.map((v) => (
                      <div key={v.key} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "0.86rem", color: "#c2d6cf" }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: v.color }} />
                        {v.label}
                      </div>
                    ))}
                  </div>
                  <DiscoveryPassportPanel currentSite={site} />
                </aside>
              </div>

              {/* yatay scroll — diğer köşeler */}
              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "0.66rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "#88a39c" }}>diğer köşeler</span>
                  <span style={{ fontSize: "0.62rem", letterSpacing: "0.08em", color: "#5d7b73" }}>← kaydır →</span>
                </div>
                <div className="ana-hscroll ana-drag-scroll" style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 8, scrollSnapType: "x proximity" }}>
                  {moreSites.map(({ s, idx }) => {
                    const vc = VIBES.find((v) => v.key === s.vibe)?.color || accent;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => selectSite(idx)}
                        title={`${s.name} — seç`}
                        style={{ flex: "0 0 220px", scrollSnapAlign: "start", textAlign: "left", cursor: "pointer", display: "grid", gap: 8, padding: 16, borderRadius: 16, border: `1px solid ${vc}33`, background: "rgba(11,20,18,0.72)", color: "#c2d6cf", fontFamily: FS, transition: "border-color .18s ease, transform .18s ease, background .18s ease" }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <img src={faviconOf(s.url)} alt="" width={18} height={18} style={{ flex: "none", borderRadius: 5 }} onError={(e) => { e.currentTarget.style.display = "none"; }} />
                          <span style={{ width: 7, height: 7, borderRadius: "50%", background: vc, flex: "none" }} />
                          <span style={{ fontSize: "0.6rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "#88a39c" }}>{VIBE_LABELS[s.vibe]}</span>
                        </div>
                        <div style={{ fontFamily: FD, fontSize: "1.08rem", color: "#f2fbf7", lineHeight: 1.15 }}>{s.name}</div>
                        <div style={{ fontSize: "0.8rem", color: "#88a39c", lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{s.description}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="discover-vibe-sections">
                {vibeRows.map((row) => (
                  <section key={row.key} className="discover-vibe-row">
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: "0.66rem", letterSpacing: "0.18em", textTransform: "uppercase", color: row.color }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: row.color }} />
                        {row.label}
                      </span>
                      <span style={{ fontSize: "0.62rem", color: "#5d7b73" }}>{row.items.length} öneri</span>
                    </div>
                    <div className="ana-hscroll ana-drag-scroll compact" style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 6, scrollSnapType: "x proximity" }}>
                      {row.items.map(({ s, idx }) => (
                        <button
                          key={`${row.key}-${s.id}`}
                          type="button"
                          onClick={() => selectSite(idx)}
                          title={`${s.name} — seç`}
                          style={{ flex: "0 0 190px", scrollSnapAlign: "start", textAlign: "left", cursor: "pointer", display: "grid", gap: 7, padding: 13, borderRadius: 14, border: `1px solid ${row.color}2f`, background: "rgba(9,18,16,0.64)", color: "#c2d6cf", fontFamily: FS }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                            <img src={faviconOf(s.url)} alt="" width={17} height={17} style={{ flex: "none", borderRadius: 5 }} onError={(e) => { e.currentTarget.style.display = "none"; }} />
                            <span style={{ fontFamily: FD, fontSize: "1rem", color: "#f2fbf7", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</span>
                          </div>
                          <span style={{ fontSize: "0.75rem", color: "#88a39c", lineHeight: 1.35, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{s.description}</span>
                        </button>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </div>
          )}

          {/* POMODORO */}
          {activeTab === "pomodoro" && (
            <div
              className="pomodoro-grid ana-pomodoro-grid"
              style={{
                gridTemplateColumns: "minmax(0, 1fr) minmax(320px, 0.86fr)",
                gridTemplateAreas: '"pomodoro tasks"',
              }}
            >
              <div className="pomodoro-block">
                <PomodoroTimer />
                <FocusStats />
              </div>
              <div className="tasks-block">
                <ChatBox mode="tasks" />
              </div>
            </div>
          )}

          {/* SOHBET */}
          {activeTab === "sohbet" && (
            <div className="ana-chat-screen">
              <ChatBox mode="all" />
            </div>
          )}

          {/* NEFES */}
          {activeTab === "nefes" && <BreathStudio accent={accent} accent2={accent2} onOpenAvangard={() => { setNefesAvangard(true); tellCat({ pool: ["Avangard nefes modu açıldı.", "Işıklar değişti, sakinleşiyoruz.", "Nefes stüdyosu: ben de yavaşladım."] }); }} />}

          {/* OKU */}
          {activeTab === "oku" && (
            okuStarted ? (
              <OkuDoom />
            ) : (
              <div className="ana-two-col" style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 280px", gap: 22 }}>
                <article style={{ position: "relative", borderRadius: 24, overflow: "hidden", minHeight: 380, border: "1px solid rgba(255,169,127,0.3)", background: "linear-gradient(150deg, #2a1a16, #1a1311)", display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: 34 }}>
                  <div aria-hidden style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 75% 20%, rgba(255,169,127,0.28), transparent 55%), radial-gradient(circle at 20% 80%, rgba(157,140,255,0.2), transparent 50%)" }} />
                  <div aria-hidden style={{ position: "absolute", right: 30, top: 30, fontFamily: FD, fontStyle: "italic", fontSize: "8rem", lineHeight: 1, color: "#ffa97f", opacity: 0.16 }}>Oku</div>
                  <div style={{ position: "relative" }}>
                    <span style={{ fontSize: "0.68rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "#ffba99" }}>günün okuması</span>
                    <h2 style={{ margin: "10px 0 12px", fontFamily: FD, fontWeight: 400, fontSize: "clamp(2rem,3.6vw,3rem)", lineHeight: 1.04, color: "#fdf3ee" }}>Bir fincan çay molası</h2>
                    <p style={{ margin: "0 0 24px", maxWidth: "48ch", color: "#e6d2c8", lineHeight: 1.6 }}>Kısa, sıcak metinlerle zihnini dinlendir. Her gün yeni bir parça, tam bir mola boyu.</p>
                    <button type="button" onClick={() => { setOkuStarted(true); tellCat({ pool: ["Okuma modu açıldı, sessiz patiler.", "Ben omzundan okuyacağım.", "Hikaye zamanı geldi."] }); }} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "13px 24px", borderRadius: 13, border: "none", fontWeight: 700, fontSize: "0.92rem", color: "#2a1109", background: "linear-gradient(90deg,#ffd373,#ffa97f)", cursor: "pointer", fontFamily: FS }}>Okumaya başla →</button>
                  </div>
                </article>
                <aside className="ana-aside-hide" style={{ display: "grid", gap: 12, alignContent: "start" }}>
                  <div style={{ fontSize: "0.66rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "#88a39c", padding: "0 4px" }}>sırada</div>
                  {[
                    { title: "Sessizliğin sesi", meta: "3 dk · deneme" },
                    { title: "Şehrin sabahı", meta: "5 dk · öykü" },
                    { title: "Pencere kenarı", meta: "2 dk · şiir" },
                  ].map((r) => (
                    <div key={r.title} style={{ borderRadius: 16, border: "1px solid rgba(182,227,216,0.16)", background: "rgba(11,20,18,0.7)", padding: "16px 18px" }}>
                      <div style={{ fontFamily: FD, fontSize: "1.05rem", color: "#f2fbf7", marginBottom: 4 }}>{r.title}</div>
                      <div style={{ fontSize: "0.78rem", color: "#88a39c" }}>{r.meta}</div>
                    </div>
                  ))}
                </aside>
              </div>
            )
          )}

          {/* YILAN */}
          {activeTab === "yilan" && (
            yilanStarted ? (
              <SnakeDonerGame />
            ) : (
              <div className="ana-two-col" style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 280px", gap: 22 }}>
                <article style={{ position: "relative", borderRadius: 24, border: "1px solid rgba(157,140,255,0.32)", background: "linear-gradient(160deg, rgba(18,16,30,0.9), rgba(10,12,20,0.94))", padding: 30, display: "flex", flexDirection: "column", alignItems: "center", gap: 22, minHeight: 380, justifyContent: "center" }}>
                  <div style={{ position: "relative", width: 300, height: 200, borderRadius: 14, background: "linear-gradient(rgba(157,140,255,0.08),rgba(157,140,255,0.08)), repeating-linear-gradient(0deg, rgba(182,227,216,0.06) 0 1px, transparent 1px 25px), repeating-linear-gradient(90deg, rgba(182,227,216,0.06) 0 1px, transparent 1px 25px)", border: "1px solid rgba(157,140,255,0.25)", overflow: "hidden" }}>
                    <span style={{ position: "absolute", left: 50, top: 75, width: 23, height: 23, borderRadius: 6, background: "#9d8cff" }} />
                    <span style={{ position: "absolute", left: 75, top: 75, width: 23, height: 23, borderRadius: 6, background: "#b3a6ff" }} />
                    <span style={{ position: "absolute", left: 100, top: 75, width: 23, height: 23, borderRadius: 6, background: "#c9c0ff" }} />
                    <span style={{ position: "absolute", left: 100, top: 100, width: 23, height: 23, borderRadius: 6, background: "#d9d2ff" }} />
                    <span style={{ position: "absolute", left: 215, top: 25, width: 22, height: 22, borderRadius: "50%", background: "#ffa97f", boxShadow: "0 0 14px #ffa97f" }} />
                  </div>
                  <button type="button" onClick={() => { setYilanStarted(true); tellCat({ pool: ["Yılan-Döner başlıyor, kuyruğa dikkat.", "Ben skor hakemiyim.", "Döner avı başladı."] }); }} style={{ border: "none", borderRadius: 13, padding: "14px 30px", cursor: "pointer", fontWeight: 700, fontSize: "0.95rem", color: "#15102a", background: "linear-gradient(90deg,#9d8cff,#6df0c2)", fontFamily: FS }}>Yılan-Döner&apos;i başlat →</button>
                </article>
                <aside className="ana-aside-hide" style={{ display: "grid", gap: 16, alignContent: "start" }}>
                  <div style={{ ...asideCard, textAlign: "center" }}>
                    <div style={{ fontFamily: FD, fontSize: "2.6rem", lineHeight: 1, color: "#9d8cff" }}>240</div>
                    <div style={{ fontSize: "0.66rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "#88a39c", marginTop: 8 }}>en yüksek skor</div>
                  </div>
                  <div style={{ ...asideCard, padding: 20 }}>
                    <p style={{ margin: 0, fontSize: "0.86rem", color: "#c2d6cf", lineHeight: 1.55 }}>Ok tuşları ile yönlendir, dönerleri topla, kuyruğa çarpma. Klasik yılan, Türk usulü.</p>
                  </div>
                </aside>
              </div>
            )
          )}

          {/* BULMACA */}
          {activeTab === "bulmaca" && (
            <div className="ana-two-col" style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 280px", gap: 22 }}>
              <article style={{ position: "relative", borderRadius: 24, border: `1px solid ${accent}3d`, background: "linear-gradient(160deg, rgba(24,21,11,0.86), rgba(15,14,8,0.92))", padding: 36, minHeight: 380, display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 26 }}>
                <div>
                  <div style={{ fontSize: "0.68rem", letterSpacing: "0.2em", textTransform: "uppercase", color: accent, marginBottom: 18 }}>günlük bulmaca · {(riddleIdx + 1).toString().padStart(2, "0")}</div>
                  <h2 style={{ margin: 0, fontFamily: FD, fontWeight: 400, fontSize: "clamp(1.6rem,3vw,2.4rem)", lineHeight: 1.3, color: "#f6f0e4", maxWidth: "30ch" }}>{riddle.riddle}</h2>
                </div>
                <div>
                  {riddleShown && (
                    <div style={{ marginBottom: 18, padding: "16px 20px", borderRadius: 14, border: `1px solid ${accent}55`, background: `${accent}14`, display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ fontSize: "0.68rem", letterSpacing: "0.16em", textTransform: "uppercase", color: "#88a39c" }}>cevap</span>
                      <span style={{ fontFamily: FD, fontSize: "1.4rem", color: accent }}>{riddle.answer}</span>
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <button type="button" onClick={revealRiddle} style={{ padding: "13px 24px", borderRadius: 13, border: "none", cursor: "pointer", fontWeight: 700, fontSize: "0.92rem", color: "#221b09", background: `linear-gradient(90deg,${accent},#ffa97f)`, fontFamily: FS }}>{riddleShown ? "Cevap açık" : "Cevabı göster"}</button>
                    <button type="button" onClick={nextRiddle} style={{ ...ghostBtn, padding: "13px 22px" }}>Sonraki →</button>
                  </div>
                </div>
              </article>
              <aside className="ana-aside-hide" style={{ ...asideCard, alignSelf: "start" }}>
                <div style={{ fontFamily: FD, fontSize: "2.6rem", lineHeight: 1, color: accent }}>{solvedCount}</div>
                <div style={{ fontSize: "0.66rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "#88a39c", margin: "8px 0 16px" }}>açtığın cevap</div>
                <p style={{ margin: 0, fontSize: "0.86rem", color: "#c2d6cf", lineHeight: 1.55 }}>Önce düşün, sonra cevabı aç. Acele etme — keyfi düşünmekte.</p>
              </aside>
            </div>
          )}
        </section>
      </main>
      {nefesAvangard && <AvangardStudio onClose={() => setNefesAvangard(false)} />}
    </div>
  );
}

function voteBtnStyle(active: boolean, kind: "like" | "dislike"): CSSProperties {
  const base: CSSProperties = {
    width: 46,
    height: 46,
    borderRadius: 13,
    display: "grid",
    placeItems: "center",
    cursor: "pointer",
    transition: "all .18s ease",
  };
  if (active && kind === "like") return { ...base, border: "1px solid #6df0c2", background: "rgba(109,240,194,0.16)", color: "#6df0c2" };
  if (active && kind === "dislike") return { ...base, border: "1px solid #ff9898", background: "rgba(255,152,152,0.14)", color: "#ff9898" };
  return { ...base, border: "1px solid rgba(182,227,216,0.2)", background: "rgba(9,18,16,0.6)", color: "#88a39c" };
}

/* ===================================================================
   Nefes stüdyosu — halkayı izle, ritmi yakala
   =================================================================== */
type BreathPhase = { kind: "in" | "hold" | "out"; secs: number; label: string };
const BREATH_PATTERNS: { key: string; label: string; phases: BreathPhase[] }[] = [
  { key: "box", label: "Kutu 4·4·4·4", phases: [
    { kind: "in", secs: 4, label: "Nefes al" },
    { kind: "hold", secs: 4, label: "Tut" },
    { kind: "out", secs: 4, label: "Ver" },
    { kind: "hold", secs: 4, label: "Tut" },
  ] },
  { key: "478", label: "4·7·8", phases: [
    { kind: "in", secs: 4, label: "Nefes al" },
    { kind: "hold", secs: 7, label: "Tut" },
    { kind: "out", secs: 8, label: "Ver" },
  ] },
  { key: "calm", label: "Sakin 4·6", phases: [
    { kind: "in", secs: 4, label: "Nefes al" },
    { kind: "out", secs: 6, label: "Ver" },
  ] },
  { key: "energy", label: "Enerji 6·2", phases: [
    { kind: "in", secs: 6, label: "Nefes al" },
    { kind: "out", secs: 2, label: "Ver" },
  ] },
];

function BreathStudio({ accent, accent2, onOpenAvangard }: { accent: string; accent2: string; onOpenAvangard: () => void }) {
  const FD = "var(--font-display), serif";
  const FS = "var(--font-sans), sans-serif";
  const [patternKey, setPatternKey] = useState("box");
  const [running, setRunning] = useState(false);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [count, setCount] = useState(0);
  const pattern = BREATH_PATTERNS.find((p) => p.key === patternKey) || BREATH_PATTERNS[0];
  const phase = pattern.phases[phaseIdx];

  useEffect(() => {
    if (!running) return;
    let pi = 0;
    let remaining = pattern.phases[0].secs;
    const resetTimer = window.setTimeout(() => {
      setPhaseIdx(0);
      setCount(remaining);
    }, 0);
    const id = window.setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        pi = (pi + 1) % pattern.phases.length;
        remaining = pattern.phases[pi].secs;
        setPhaseIdx(pi);
      }
      setCount(remaining);
    }, 1000);
    return () => {
      window.clearTimeout(resetTimer);
      window.clearInterval(id);
    };
  }, [running, pattern]);

  // halka ölçeği: nefes al → 1, ver → 0.62, tut → mevcut
  const scale = !running ? undefined : phase.kind === "in" ? 1 : phase.kind === "out" ? 0.62 : phaseIdx > 0 && pattern.phases[phaseIdx - 1].kind === "in" ? 1 : 0.62;
  const ringStyle: CSSProperties = running
    ? { position: "absolute", width: 170, height: 170, borderRadius: "50%", background: `radial-gradient(circle at 38% 30%, ${accent}, ${accent}33 60%, transparent)`, boxShadow: `0 0 60px ${accent}55`, transform: `scale(${scale})`, transition: `transform ${phase.secs}s ease-in-out` }
    : { position: "absolute", width: 170, height: 170, borderRadius: "50%", background: `radial-gradient(circle at 38% 30%, ${accent}, ${accent}33 60%, transparent)`, animation: "ana-breathe 8s ease-in-out infinite", boxShadow: `0 0 60px ${accent}55` };

  return (
    <div style={{ position: "relative", borderRadius: 24, border: `1px solid ${accent}3d`, background: "linear-gradient(150deg, rgba(11,24,21,0.86), rgba(8,15,14,0.92))", padding: 40, overflow: "hidden", display: "flex", alignItems: "center", gap: 40, flexWrap: "wrap", minHeight: 380 }}>
      <div style={{ position: "relative", width: 240, height: 240, flex: "none", display: "grid", placeItems: "center", margin: "0 auto" }}>
        <div style={ringStyle} />
        <div style={{ position: "absolute", width: 200, height: 200, borderRadius: "50%", border: `1px solid ${accent}55`, animation: "ana-spin 50s linear infinite" }} />
        <span style={{ position: "relative", zIndex: 2, fontSize: running ? "0.9rem" : "0.74rem", letterSpacing: "0.3em", textTransform: "uppercase", fontWeight: 700, color: "#04221d", textAlign: "center" }}>
          {running ? phase.label : "nefes al"}
          {running && <span style={{ display: "block", fontFamily: FD, fontSize: "1.6rem", letterSpacing: 0, marginTop: 4 }}>{count}</span>}
        </span>
      </div>
      <div style={{ flex: 1, minWidth: 260 }}>
        <div style={{ fontSize: "0.66rem", letterSpacing: "0.24em", textTransform: "uppercase", color: "#88a39c", marginBottom: 12 }}>yeni · reaktif</div>
        <h2 style={{ margin: "0 0 14px", fontFamily: FD, fontWeight: 400, fontSize: "clamp(2rem,3.6vw,3.2rem)", lineHeight: 1.02, letterSpacing: "-0.02em", color: "#f4fcf8" }}>Nefes stüdyosu</h2>
        <p style={{ margin: "0 0 20px", maxWidth: "46ch", color: "#c2d6cf", lineHeight: 1.6, fontSize: "1.02rem" }}>Halkayı izle, ritmi yakala. Kutu nefesi, 4·7·8, sakin ve enerji ritimleriyle birkaç dakikada toparlan.</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 22 }}>
          {BREATH_PATTERNS.map((p) => {
            const on = p.key === patternKey;
            return (
              <button
                key={p.key}
                type="button"
                onClick={() => setPatternKey(p.key)}
                style={{
                  padding: "8px 14px",
                  borderRadius: 999,
                  cursor: "pointer",
                  fontFamily: FS,
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  border: `1px solid ${on ? `${accent}88` : "rgba(182,227,216,0.2)"}`,
                  background: on ? `${accent}1f` : "rgba(9,18,16,0.6)",
                  color: on ? "#f4fcf8" : "#88a39c",
                  transition: "all .18s ease",
                }}
              >
                {p.label}
              </button>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button type="button" onClick={() => setRunning((r) => !r)} style={{ display: "inline-flex", alignItems: "center", gap: 9, padding: "13px 22px", borderRadius: 13, border: "none", fontWeight: 700, fontSize: "0.9rem", color: "#04221d", background: `linear-gradient(90deg,${accent},${accent2})`, cursor: "pointer", fontFamily: FS }}>
            {running ? "Durdur" : "Başla"}
          </button>
          <button type="button" onClick={onOpenAvangard} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "13px 20px", borderRadius: 13, border: `1px solid ${accent}55`, background: `${accent}14`, fontWeight: 700, fontSize: "0.9rem", color: accent, cursor: "pointer", fontFamily: FS }}>
            Avangard
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ===================================================================
   Avangard Nefes Stüdyosu — tam ekran morfing-orb deneyimi
   (Nefes Avangard.dc.html tasarımının React portu)
   =================================================================== */
type AvPhase = "in" | "hold" | "out" | "rest";
const AV_PATTERNS: Record<string, { name: string; sub: string; phases: [AvPhase, number][] }> = {
  box:    { name: "Kutu Nefesi", sub: "4·4·4·4", phases: [["in",4],["hold",4],["out",4],["rest",4]] },
  relax:  { name: "Rahatla",     sub: "4·7·8",   phases: [["in",4],["hold",7],["out",8]] },
  calm:   { name: "Sakin",       sub: "5·5",     phases: [["in",5],["out",5]] },
  energy: { name: "Enerji",      sub: "6·2·6",   phases: [["in",6],["hold",2],["out",6]] },
};
const AV_PHASE_INFO: Record<AvPhase, { label: string; color: string; scale: number }> = {
  in:   { label: "Nefes Al", color: "#6df0c2", scale: 1.0 },
  hold: { label: "Tut",      color: "#ffd373", scale: 1.0 },
  out:  { label: "Ver",      color: "#ffa97f", scale: 0.42 },
  rest: { label: "Bekle",    color: "#a8beb8", scale: 0.42 },
};
const AV_TARGETS = [2, 5, 10, 15];
const AV_TICKS = 48;

function AvangardStudio({ onClose }: { onClose: () => void }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const acRef3 = useRef<AudioContext | null>(null);
  const timerRef = useRef<number | null>(null);

  const [patternKey, setPatternKey] = useState<string>("box");
  const [running, setRunning] = useState(false);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [phaseLeftMs, setPhaseLeftMs] = useState(4000);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [cycleCount, setCycleCount] = useState(0);
  const [targetMin, setTargetMin] = useState(5);
  const [soundOn, setSoundOn] = useState(true);
  const [completed, setCompleted] = useState(false);

  const pattern = AV_PATTERNS[patternKey] ?? AV_PATTERNS.box;
  const [currentKind, currentSec] = pattern.phases[phaseIdx] ?? ["in", 4];
  const phaseInfo = AV_PHASE_INFO[currentKind];
  const ringColor = phaseInfo.color;
  const countdown = Math.max(0, Math.ceil(phaseLeftMs / 1000));

  const chimeAv = (kind: AvPhase) => {
    if (!soundOn) return;
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      acRef3.current = acRef3.current || new Ctx();
      const ctx = acRef3.current;
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination); o.type = "sine";
      const t = ctx.currentTime;
      o.frequency.setValueAtTime(kind === "in" ? 528 : kind === "out" ? 396 : 440, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.11, t + 0.04);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
      o.start(t); o.stop(t + 0.95);
    } catch { /* sessizce geç */ }
  };

  const stopTimer = () => {
    if (timerRef.current !== null) { window.clearInterval(timerRef.current); timerRef.current = null; }
  };

  useEffect(() => {
    if (!running) return;
    const pat = AV_PATTERNS[patternKey] ?? AV_PATTERNS.box;
    let pi = phaseIdx;
    let left = phaseLeftMs;
    let elapsed = elapsedSec;
    let cycles = cycleCount;
    let last = Date.now();
    const id = window.setInterval(() => {
      const now = Date.now();
      const dt = now - last; last = now;
      left -= dt; elapsed += dt / 1000;
      let advanced = false;
      while (left <= 0) {
        pi = (pi + 1) % pat.phases.length;
        if (pi === 0) cycles++;
        left += pat.phases[pi][1] * 1000;
        advanced = true;
      }
      if (advanced) chimeAv(pat.phases[pi][0]);
      const limit = targetMin * 60;
      if (elapsed >= limit) {
        elapsed = limit; left = 0;
        window.clearInterval(id); timerRef.current = null;
        setRunning(false); setCompleted(true);
      }
      setPhaseIdx(pi); setPhaseLeftMs(left); setElapsedSec(elapsed); setCycleCount(cycles);
    }, 100);
    timerRef.current = id;
    return () => { window.clearInterval(id); timerRef.current = null; };
  }, [running]); // eslint-disable-line react-hooks/exhaustive-deps

  // ESC to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { stopTimer(); onClose(); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Cursor parallax
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    let raf: number | null = null;
    const onMove = (e: PointerEvent) => {
      const mx = (e.clientX / window.innerWidth - 0.5) * 2;
      const my = (e.clientY / window.innerHeight - 0.5) * 2;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = null;
        el.style.setProperty("--avmx", mx.toFixed(3));
        el.style.setProperty("--avmy", my.toFixed(3));
      });
    };
    window.addEventListener("pointermove", onMove);
    return () => { window.removeEventListener("pointermove", onMove); if (raf) cancelAnimationFrame(raf); };
  }, []);

  const handleToggle = () => {
    if (running) { stopTimer(); setRunning(false); }
    else {
      if (completed) {
        const firstSec = (AV_PATTERNS[patternKey] ?? AV_PATTERNS.box).phases[0][1];
        setPhaseIdx(0); setPhaseLeftMs(firstSec * 1000); setElapsedSec(0); setCycleCount(0); setCompleted(false);
      }
      setRunning(true);
    }
  };

  const handleReset = () => {
    stopTimer(); setRunning(false);
    const firstSec = (AV_PATTERNS[patternKey] ?? AV_PATTERNS.box).phases[0][1];
    setPhaseIdx(0); setPhaseLeftMs(firstSec * 1000); setElapsedSec(0); setCycleCount(0); setCompleted(false);
  };

  const handlePatternSelect = (key: string) => {
    stopTimer(); setRunning(false);
    const p = AV_PATTERNS[key] ?? AV_PATTERNS.box;
    setPatternKey(key); setPhaseIdx(0); setPhaseLeftMs(p.phases[0][1] * 1000);
    setElapsedSec(0); setCycleCount(0); setCompleted(false);
  };

  const fmtTime = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, "0");
    const s = Math.floor(sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const orbScale = running ? phaseInfo.scale : 1;
  const orbTransition = `transform ${running ? currentSec : 0.6}s cubic-bezier(.37,0,.63,1), background 0.6s ease, box-shadow 0.6s ease`;
  const glowColor = running ? `${ringColor}44` : "#6df0c244";

  // tick ring
  const ticks = Array.from({ length: AV_TICKS }, (_, i) => {
    const angle = (i / AV_TICKS) * 2 * Math.PI;
    const r = 46;
    const cx = 50 + r * Math.sin(angle);
    const cy = 50 - r * Math.cos(angle);
    const isMajor = i % 12 === 0;
    return (
      <span key={i} style={{
        position: "absolute", left: `${cx}%`, top: `${cy}%`,
        width: isMajor ? 3 : 2, height: isMajor ? 10 : 5,
        background: ringColor, opacity: isMajor ? 0.7 : 0.22,
        borderRadius: 999, transform: `translate(-50%,-50%) rotate(${(i / AV_TICKS) * 360}deg)`,
        transition: "background 0.6s ease",
      }} />
    );
  });

  const FD2 = "var(--font-display), serif";
  const FS2 = "var(--font-sans), sans-serif";

  return (
    <div
      ref={rootRef}
      className="av-overlay"
      style={{ "--avmx": "0", "--avmy": "0" } as CSSProperties}
    >
      {/* background */}
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 50% 60%, #0a1614, #060d0c 70%)" }} />

      {/* breath-reactive ambient */}
      <div aria-hidden style={{
        position: "absolute", inset: "-10%", pointerEvents: "none",
        background: `radial-gradient(circle at 50% 52%, ${glowColor}, transparent 60%)`,
        opacity: 0.9, transition: "background 0.6s ease",
        transform: "translate(calc(var(--avmx)*-26px), calc(var(--avmy)*-22px))",
      }} />

      {/* scanlines */}
      <div aria-hidden style={{
        position: "absolute", inset: 0, pointerEvents: "none", mixBlendMode: "overlay", opacity: 0.5,
        background: "repeating-linear-gradient(0deg, rgba(255,255,255,.05) 0 1px, transparent 1px 3px)",
        animation: "av-flicker 7s steps(2) infinite",
      }} />

      {/* backdrop phase word */}
      <div aria-hidden style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", pointerEvents: "none", overflow: "hidden" }}>
        <span style={{
          fontFamily: FD2, fontStyle: "italic", fontWeight: 300, fontSize: "22vw", lineHeight: 0.8,
          letterSpacing: "-0.03em", color: ringColor, opacity: 0.06, whiteSpace: "nowrap",
          transform: "translate(calc(var(--avmx)*18px), calc(var(--avmy)*14px))",
          transition: "color 0.6s ease",
        }}>{phaseInfo.label}</span>
      </div>

      {/* center orb stage */}
      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", pointerEvents: "none" }}>
        <div style={{
          position: "relative",
          width: "min(74vmin,580px)", height: "min(74vmin,580px)",
          display: "grid", placeItems: "center",
          transform: "translate(calc(var(--avmx)*16px), calc(var(--avmy)*16px))",
        }}>
          {/* morphing orb */}
          <div style={{
            position: "absolute", width: "78%", height: "78%",
            transform: `scale(${orbScale})`, transition: orbTransition,
          }}>
            <div style={{
              position: "absolute", inset: 0,
              background: `radial-gradient(circle at 38% 30%, ${ringColor}, ${ringColor}55 50%, transparent 80%)`,
              animation: "av-morph 18s ease-in-out infinite", filter: "blur(2px)",
              boxShadow: `inset 0 10px 60px rgba(255,255,255,.18), 0 0 80px ${ringColor}44`,
              transition: "background 0.6s ease, box-shadow 0.6s ease",
            }} />
            <div style={{
              position: "absolute", inset: "8%",
              border: `1px solid ${ringColor}`, opacity: 0.5,
              animation: "av-morph2 22s ease-in-out infinite",
              transition: "border-color 0.6s ease",
            }} />
            <div style={{
              position: "absolute", inset: "-6%",
              border: `1px solid ${ringColor}`, opacity: 0.22,
              animation: "av-morph 26s ease-in-out infinite reverse",
              transition: "border-color 0.6s ease",
            }} />
          </div>

          {/* tick ring */}
          <div style={{ position: "absolute", width: "100%", height: "100%", animation: "av-spin-cw 80s linear infinite" }}>
            {ticks}
          </div>

          {/* center readout */}
          <div style={{
            position: "relative", zIndex: 3, textAlign: "center", fontFamily: FS2,
            transform: running ? "translateY(0)" : "translateY(0)",
          }}>
            <div style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.42em", textTransform: "uppercase", color: ringColor, transition: "color 0.6s ease" }}>
              {running ? phaseInfo.label : "hazır"}
            </div>
            <div style={{ fontFamily: FD2, fontWeight: 300, fontSize: "clamp(4rem,14vmin,10rem)", lineHeight: 0.9, color: "#f7fdfa", textShadow: "0 4px 40px rgba(0,0,0,.5)" }}>
              {running ? countdown : "·"}
            </div>
            <div style={{ fontSize: "0.66rem", fontWeight: 600, letterSpacing: "0.34em", textTransform: "uppercase", color: "#5d7b73" }}>
              {pattern.name}
            </div>
          </div>
        </div>
      </div>

      {/* chrome overlay */}
      <div style={{ position: "relative", zIndex: 10, minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "30px 36px", pointerEvents: "none" }}>

        {/* top bar */}
        <header style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20 }}>
          <div style={{ pointerEvents: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: ringColor, boxShadow: `0 0 12px ${ringColor}`, transition: "background 0.6s ease" }} />
              <span style={{ fontWeight: 800, letterSpacing: "0.32em", fontSize: "0.88rem", fontFamily: FS2 }}>NEFES</span>
            </div>
            <div style={{ marginTop: 5, fontSize: "0.62rem", letterSpacing: "0.26em", textTransform: "uppercase", color: "#5d7b73" }}>nefes stüdyosu · avangard</div>
          </div>
          <div style={{ display: "flex", gap: 28, pointerEvents: "auto", alignItems: "flex-start" }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: FD2, fontSize: "1.6rem", lineHeight: 1, color: "#f2fbf7" }}>{cycleCount.toString().padStart(2, "0")}</div>
              <div style={{ fontSize: "0.58rem", letterSpacing: "0.28em", textTransform: "uppercase", color: "#5d7b73", marginTop: 4 }}>tur</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: FD2, fontSize: "1.6rem", lineHeight: 1, color: "#f2fbf7" }}>{fmtTime(elapsedSec)}</div>
              <div style={{ fontSize: "0.58rem", letterSpacing: "0.28em", textTransform: "uppercase", color: "#5d7b73", marginTop: 4 }}>/ {targetMin} dk</div>
            </div>
            <button type="button" onClick={() => { stopTimer(); onClose(); }} aria-label="Kapat" style={{
              pointerEvents: "auto", width: 38, height: 38, borderRadius: "50%",
              border: "1px solid rgba(182,227,216,0.22)", background: "rgba(8,18,16,0.7)",
              color: "#88a39c", cursor: "pointer", display: "grid", placeItems: "center",
            }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
            </button>
          </div>
        </header>

        {/* middle: pattern selector */}
        <div style={{ display: "flex", alignItems: "center" }}>
          <nav style={{ display: "grid", gap: 3, pointerEvents: "auto" }}>
            {Object.entries(AV_PATTERNS).map(([key, pat], i) => {
              const isActive = key === patternKey;
              return (
                <button key={key} type="button" onClick={() => handlePatternSelect(key)} style={{
                  display: "flex", alignItems: "center", gap: 14, padding: "8px 14px", borderRadius: 10,
                  border: `1px solid ${isActive ? `${ringColor}55` : "rgba(182,227,216,0.12)"}`,
                  background: isActive ? `${ringColor}14` : "rgba(8,16,15,0.5)",
                  color: isActive ? "#f2fbf7" : "#5d7b73", cursor: "pointer", transition: "all .2s ease", fontFamily: FS2,
                }}>
                  <span style={{ fontFamily: FD2, fontSize: "0.92rem", width: "2.2ch", opacity: 0.55 }}>0{i + 1}</span>
                  <span style={{ display: "grid", gap: 1, textAlign: "left" }}>
                    <span style={{ fontWeight: 700, fontSize: "0.92rem", letterSpacing: "0.01em" }}>{pat.name}</span>
                    <span style={{ fontSize: "0.62rem", letterSpacing: "0.2em", opacity: 0.6 }}>{pat.sub}</span>
                  </span>
                  {isActive && <span style={{ marginLeft: "auto", width: 3, height: 26, borderRadius: 999, background: ringColor, transition: "background 0.6s ease" }} />}
                </button>
              );
            })}
          </nav>
        </div>

        {/* bottom bar */}
        <footer style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
          {/* transport */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, pointerEvents: "auto" }}>
            <button type="button" onClick={handleToggle} aria-label="Başla / Duraklat" style={{
              width: 70, height: 70, borderRadius: "50%", border: "none", cursor: "pointer",
              display: "grid", placeItems: "center", color: "#04221d",
              background: `linear-gradient(135deg, ${ringColor}, ${ringColor}bb)`,
              boxShadow: `0 14px 36px ${ringColor}44`, transition: "background 0.6s ease, box-shadow 0.6s ease",
            }}>
              {running ? (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
              ) : (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M5 3l14 9-14 9z" /></svg>
              )}
            </button>
            <button type="button" onClick={handleReset} style={{
              height: 40, padding: "0 16px", borderRadius: 999, pointerEvents: "auto",
              border: "1px solid rgba(182,227,216,.22)", background: "rgba(8,18,16,.7)",
              color: "#bcd2cb", cursor: "pointer", fontWeight: 600, fontSize: "0.76rem",
              letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: FS2,
            }}>Sıfırla</button>
            <button type="button" onClick={() => setSoundOn(s => !s)} aria-label="Ses" style={{
              height: 40, width: 40, borderRadius: 999,
              border: `1px solid ${soundOn ? `${ringColor}55` : "rgba(182,227,216,.22)"}`,
              background: soundOn ? `${ringColor}14` : "rgba(8,18,16,.7)",
              color: soundOn ? ringColor : "#5d7b73", cursor: "pointer", display: "grid", placeItems: "center",
              transition: "all .2s ease",
            }}>
              {soundOn ? (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /></svg>
              ) : (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" /></svg>
              )}
            </button>
          </div>

          {/* session target */}
          <div style={{ display: "grid", gap: 8, justifyItems: "end", pointerEvents: "auto" }}>
            <div style={{ fontSize: "0.58rem", letterSpacing: "0.3em", textTransform: "uppercase", color: "#5d7b73", fontFamily: FS2 }}>seans hedefi</div>
            <div style={{ display: "flex", gap: 6 }}>
              {AV_TARGETS.map((t) => (
                <button key={t} type="button" onClick={() => setTargetMin(t)} style={{
                  height: 30, padding: "0 12px", borderRadius: 999, fontSize: "0.76rem", fontWeight: 600,
                  border: `1px solid ${t === targetMin ? `${ringColor}66` : "rgba(182,227,216,.18)"}`,
                  background: t === targetMin ? `${ringColor}18` : "rgba(8,18,16,.6)",
                  color: t === targetMin ? ringColor : "#5d7b73", cursor: "pointer",
                  transition: "all .2s ease", fontFamily: FS2,
                }}>{t} dk</button>
              ))}
            </div>
            <div style={{ width: 200, height: 2, background: "rgba(182,227,216,.14)", overflow: "hidden", borderRadius: 999 }}>
              <div style={{
                height: "100%", borderRadius: 999,
                width: `${Math.min(100, (elapsedSec / (targetMin * 60)) * 100)}%`,
                background: ringColor, transition: "width .3s linear, background 0.6s ease",
              }} />
            </div>
          </div>
        </footer>
      </div>

      {/* completion toast */}
      {completed && (
        <div style={{
          position: "fixed", left: "50%", bottom: 30, zIndex: 50,
          transform: "translateX(-50%)",
          display: "flex", alignItems: "center", gap: 12,
          padding: "12px 22px", borderRadius: 999,
          border: `1px solid ${ringColor}66`, background: "rgba(6,16,14,.94)",
          backdropFilter: "blur(12px)", boxShadow: "0 20px 50px rgba(0,0,0,.5)",
          animation: "av-rise .45s ease", fontFamily: FS2,
        }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: ringColor, boxShadow: `0 0 10px ${ringColor}` }} />
          <span style={{ fontSize: "0.84rem", fontWeight: 600, letterSpacing: "0.02em", color: "#eafaf4" }}>
            Seans tamam — {cycleCount} tur · {fmtTime(elapsedSec)}. Aferin.
          </span>
        </div>
      )}
    </div>
  );
}
