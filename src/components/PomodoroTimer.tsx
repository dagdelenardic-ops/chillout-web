"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bell, BellOff, Settings2, SkipForward, Volume2, VolumeX } from "lucide-react";
import { recordFocusSession } from "@/lib/focusStats";

export type PomodoroPhase = "focus" | "short" | "long";

type PomodoroTimerProps = {
  onPhaseChange?: (phase: PomodoroPhase) => void;
  onChatWriteChange?: (canWrite: boolean) => void;
};

type PomodoroSettings = {
  focusMin: number;
  shortMin: number;
  longMin: number;
  longEvery: number; // kaç odak turundan sonra uzun mola
  autoStart: boolean; // bir faz bitince sonrakini otomatik başlat
  sound: boolean;
};

const SETTINGS_KEY = "pomodoro-settings-v2";
const STATS_KEY = "pomodoro-stats-v2";

const DEFAULT_SETTINGS: PomodoroSettings = {
  focusMin: 25,
  shortMin: 5,
  longMin: 15,
  longEvery: 4,
  autoStart: false,
  sound: true,
};

const PHASE_LABEL: Record<PomodoroPhase, string> = {
  focus: "Odak",
  short: "Kısa Mola",
  long: "Uzun Mola",
};

function clampInt(value: number, lo: number, hi: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(lo, Math.min(hi, Math.round(value)));
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function loadSettings(): PomodoroSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<PomodoroSettings>;
    return {
      focusMin: clampInt(parsed.focusMin ?? 25, 1, 120, 25),
      shortMin: clampInt(parsed.shortMin ?? 5, 1, 60, 5),
      longMin: clampInt(parsed.longMin ?? 15, 1, 60, 15),
      longEvery: clampInt(parsed.longEvery ?? 4, 2, 8, 4),
      autoStart: Boolean(parsed.autoStart),
      sound: parsed.sound === undefined ? true : Boolean(parsed.sound),
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function loadTodayCount(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = window.localStorage.getItem(STATS_KEY);
    if (!raw) return 0;
    const parsed = JSON.parse(raw) as { date?: string; count?: number };
    if (parsed.date === todayKey() && typeof parsed.count === "number") {
      return parsed.count;
    }
    return 0;
  } catch {
    return 0;
  }
}

function playChime(times: number) {
  try {
    const Ctx =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const base = ctx.currentTime;
    for (let i = 0; i < times; i += 1) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      const t0 = base + i * 0.28;
      osc.frequency.setValueAtTime(880, t0);
      osc.frequency.exponentialRampToValueAtTime(523, t0 + 0.22);
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(0.32, t0 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.26);
      osc.start(t0);
      osc.stop(t0 + 0.28);
    }
  } catch {
    /* sessiz başarısızlık */
  }
}

function notify(title: string, body: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission === "granted") {
    try {
      new Notification(title, { body, icon: "/favicon.ico", tag: "chillout-pomodoro" });
    } catch {
      /* ignore */
    }
  }
}

export function PomodoroTimer({ onPhaseChange, onChatWriteChange }: PomodoroTimerProps) {
  const [settings, setSettings] = useState<PomodoroSettings>(DEFAULT_SETTINGS);
  const [phase, setPhase] = useState<PomodoroPhase>("focus");
  const [secondsLeft, setSecondsLeft] = useState(DEFAULT_SETTINGS.focusMin * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [cycleCount, setCycleCount] = useState(0); // mevcut sette tamamlanan odak sayısı
  const [todayCount, setTodayCount] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [notifPerm, setNotifPerm] = useState<NotificationPermission | "unsupported">("default");

  const settingsRef = useRef(settings);
  const phaseRef = useRef(phase);
  const cycleRef = useRef(cycleCount);
  useEffect(() => { settingsRef.current = settings; }, [settings]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { cycleRef.current = cycleCount; }, [cycleCount]);

  const durationFor = useCallback((p: PomodoroPhase, s: PomodoroSettings): number => {
    if (p === "focus") return s.focusMin * 60;
    if (p === "short") return s.shortMin * 60;
    return s.longMin * 60;
  }, []);

  // === Mount: ayarları, günlük sayacı ve bildirim durumunu yükle ===
  useEffect(() => {
    const hydrateTimer = window.setTimeout(() => {
      const s = loadSettings();
      setSettings(s);
      setSecondsLeft(s.focusMin * 60);
      setTodayCount(loadTodayCount());
      if (!("Notification" in window)) {
        setNotifPerm("unsupported");
      } else {
        setNotifPerm(Notification.permission);
      }
    }, 0);
    return () => window.clearTimeout(hydrateTimer);
  }, []);

  // === Ayarları kaydet ===
  useEffect(() => {
    try {
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      /* ignore */
    }
  }, [settings]);

  // === Faz / sohbet kancaları (opsiyonel) ===
  useEffect(() => { onPhaseChange?.(phase); }, [phase, onPhaseChange]);
  const canWriteInChat = hasStarted && phase !== "focus";
  useEffect(() => { onChatWriteChange?.(canWriteInChat); }, [canWriteInChat, onChatWriteChange]);

  // === Saniye sayacı ===
  useEffect(() => {
    if (!isRunning) return;
    const id = window.setInterval(() => {
      setSecondsLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [isRunning]);

  const persistToday = useCallback((count: number) => {
    try {
      window.localStorage.setItem(
        STATS_KEY,
        JSON.stringify({ date: todayKey(), count })
      );
    } catch {
      /* ignore */
    }
  }, []);

  // === Faz bitişi ===
  useEffect(() => {
    if (!isRunning || secondsLeft > 0) return;

    const finishTimer = window.setTimeout(() => {
      const s = settingsRef.current;
      const current = phaseRef.current;
      if (s.sound) playChime(current === "focus" ? 3 : 2);

      let next: PomodoroPhase;
      if (current === "focus") {
        setTodayCount((c) => {
          const nv = c + 1;
          persistToday(nv);
          return nv;
        });
        // Odak serisi log'una yaz + kediye ve panele "focus-complete" olayını yayınla
        recordFocusSession();
        const nextCycle = cycleRef.current + 1;
        if (nextCycle >= s.longEvery) {
          setCycleCount(0);
          next = "long";
          notify("Odak tamamlandı 🍅", `Hak ettin — ${s.longMin} dk uzun mola.`);
        } else {
          setCycleCount(nextCycle);
          next = "short";
          notify("Odak tamamlandı 🍅", `${s.shortMin} dk kısa mola ver.`);
        }
      } else {
        next = "focus";
        notify("Mola bitti ☕", "Hadi tekrar odaklanalım.");
      }

      setPhase(next);
      setSecondsLeft(durationFor(next, s));
      if (!s.autoStart) {
        setIsRunning(false);
      }
    }, 0);

    return () => window.clearTimeout(finishTimer);
  }, [secondsLeft, isRunning, durationFor, persistToday]);

  // === Kullanıcı durmuşken süre, ayar değişiminde güncellensin ===
  useEffect(() => {
    if (isRunning || hasStarted) return;
    const syncTimer = window.setTimeout(() => {
      setSecondsLeft(durationFor(phase, settings));
    }, 0);
    return () => window.clearTimeout(syncTimer);
  }, [settings, phase, isRunning, hasStarted, durationFor]);

  const handleStartPause = () => {
    setIsRunning((prev) => {
      const next = !prev;
      if (next) setHasStarted(true);
      return next;
    });
  };

  const handleReset = () => {
    setIsRunning(false);
    setPhase("focus");
    setCycleCount(0);
    setHasStarted(false);
    setSecondsLeft(settings.focusMin * 60);
  };

  const handleSkip = () => {
    const s = settings;
    let next: PomodoroPhase;
    if (phase === "focus") {
      const nextCycle = cycleCount + 1;
      if (nextCycle >= s.longEvery) {
        setCycleCount(0);
        next = "long";
      } else {
        setCycleCount(nextCycle);
        next = "short";
      }
    } else {
      next = "focus";
    }
    setPhase(next);
    setSecondsLeft(durationFor(next, s));
    if (!s.autoStart) setIsRunning(false);
  };

  const requestNotif = async () => {
    if (!("Notification" in window)) return;
    try {
      const perm = await Notification.requestPermission();
      setNotifPerm(perm);
      if (perm === "granted") {
        notify("Bildirimler açık 🔔", "Faz değişimlerinde haber vereceğim.");
      }
    } catch {
      /* ignore */
    }
  };

  const updateSetting = <K extends keyof PomodoroSettings>(
    key: K,
    value: PomodoroSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const total = durationFor(phase, settings);
  const progress = useMemo(() => {
    if (total <= 0) return 0;
    return Math.max(0, Math.min(100, ((total - secondsLeft) / total) * 100));
  }, [total, secondsLeft]);

  const circumference = 2 * Math.PI * 120;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const cycleDots = Array.from({ length: settings.longEvery }, (_, i) => i < cycleCount);

  return (
    <article className="soft-card pomodoro-card">
      <div className="pomodoro-head">
        <span className={`pomodoro-tag ${phase}`}>{PHASE_LABEL[phase]}</span>
        <button
          type="button"
          className={`pomodoro-icon-btn ${showSettings ? "active" : ""}`}
          onClick={() => setShowSettings((v) => !v)}
          aria-label="Ayarlar"
          title="Ayarlar"
        >
          <Settings2 size={16} />
        </button>
      </div>

      <div className="pomodoro-circle-wrap">
        <svg className="pomodoro-ring" viewBox="0 0 260 260">
          <circle className="ring-bg" cx="130" cy="130" r="120" />
          <circle
            className={`ring-progress ${phase}`}
            cx="130"
            cy="130"
            r="120"
            style={{ strokeDasharray: circumference, strokeDashoffset }}
          />
        </svg>
        <div className="pomodoro-center">
          <span className="pomodoro-time">{formatTime(secondsLeft)}</span>
          <span className={`pomodoro-phase ${phase}`}>{PHASE_LABEL[phase]}</span>
          <div className="pomodoro-cycle-dots" aria-hidden="true">
            {cycleDots.map((filled, i) => (
              <span key={i} className={`cycle-dot ${filled ? "filled" : ""}`} />
            ))}
          </div>
        </div>
      </div>

      <p className="pomodoro-today">
        Bugün tamamlanan: <strong>{todayCount}</strong> 🍅
      </p>

      <div className="player-controls">
        <button type="button" className="action-btn" onClick={handleStartPause}>
          {isRunning ? "Duraklat" : hasStarted ? "Devam" : "Başlat"}
        </button>
        <button type="button" className="secondary-btn" onClick={handleSkip} title="Fazı atla">
          <SkipForward size={14} /> Atla
        </button>
        <button type="button" className="secondary-btn" onClick={handleReset}>
          Sıfırla
        </button>
      </div>

      {showSettings && (
        <div className="pomodoro-settings">
          <div className="pomodoro-setting-grid">
            <label>
              Odak (dk)
              <input
                type="number"
                min={1}
                max={120}
                value={settings.focusMin}
                onChange={(e) => updateSetting("focusMin", clampInt(Number(e.target.value), 1, 120, 25))}
              />
            </label>
            <label>
              Kısa mola (dk)
              <input
                type="number"
                min={1}
                max={60}
                value={settings.shortMin}
                onChange={(e) => updateSetting("shortMin", clampInt(Number(e.target.value), 1, 60, 5))}
              />
            </label>
            <label>
              Uzun mola (dk)
              <input
                type="number"
                min={1}
                max={60}
                value={settings.longMin}
                onChange={(e) => updateSetting("longMin", clampInt(Number(e.target.value), 1, 60, 15))}
              />
            </label>
            <label>
              Uzun mola arası (tur)
              <input
                type="number"
                min={2}
                max={8}
                value={settings.longEvery}
                onChange={(e) => updateSetting("longEvery", clampInt(Number(e.target.value), 2, 8, 4))}
              />
            </label>
          </div>

          <div className="pomodoro-toggles">
            <button
              type="button"
              className={`pomodoro-toggle ${settings.autoStart ? "on" : ""}`}
              onClick={() => updateSetting("autoStart", !settings.autoStart)}
            >
              Otomatik geç: {settings.autoStart ? "Açık" : "Kapalı"}
            </button>
            <button
              type="button"
              className={`pomodoro-toggle ${settings.sound ? "on" : ""}`}
              onClick={() => updateSetting("sound", !settings.sound)}
            >
              {settings.sound ? <Volume2 size={13} /> : <VolumeX size={13} />}
              Ses: {settings.sound ? "Açık" : "Kapalı"}
            </button>
            <button
              type="button"
              className={`pomodoro-toggle ${notifPerm === "granted" ? "on" : ""}`}
              onClick={requestNotif}
              disabled={notifPerm === "granted" || notifPerm === "unsupported"}
              title={
                notifPerm === "unsupported"
                  ? "Tarayıcı bildirimi desteklemiyor"
                  : "Masaüstü bildirimi"
              }
            >
              {notifPerm === "granted" ? <Bell size={13} /> : <BellOff size={13} />}
              Bildirim:{" "}
              {notifPerm === "granted"
                ? "Açık"
                : notifPerm === "denied"
                  ? "Engelli"
                  : notifPerm === "unsupported"
                    ? "Yok"
                    : "Aç"}
            </button>
          </div>
        </div>
      )}
    </article>
  );
}
