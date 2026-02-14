"use client";

import { useEffect, useMemo, useState, useRef } from "react";

const FOCUS_SECONDS = 25 * 60;
const BREAK_SECONDS = 5 * 60; // 5 minutes

export type PomodoroPhase = "focus" | "break";

type PomodoroTimerProps = {
  onPhaseChange?: (phase: PomodoroPhase) => void;
  onChatWriteChange?: (canWrite: boolean) => void;
};

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const remaining = (seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remaining}`;
}

function playNotificationSound() {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;

    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.5);

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);
  } catch (e) {
    console.error("Audio play failed", e);
  }
}

function sendNotification(title: string, body: string) {
  if (!("Notification" in window)) return;

  if (Notification.permission === "granted") {
    new Notification(title, { body, icon: "/favicon.ico" });
  }
}

export function PomodoroTimer({
  onPhaseChange,
  onChatWriteChange,
}: PomodoroTimerProps) {
  const [phase, setPhase] = useState<PomodoroPhase>("focus");
  const [secondsLeft, setSecondsLeft] = useState(FOCUS_SECONDS);
  const [isRunning, setIsRunning] = useState(false);
  const [hasStartedPomodoro, setHasStartedPomodoro] = useState(false);

  // Request notification permission on mount
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  const canWriteInChat = hasStartedPomodoro && phase === "break";

  useEffect(() => {
    onPhaseChange?.(phase);
  }, [phase, onPhaseChange]);

  useEffect(() => {
    onChatWriteChange?.(canWriteInChat);
  }, [canWriteInChat, onChatWriteChange]);

  useEffect(() => {
    if (!isRunning) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev > 1) {
          return prev - 1;
        }

        // Timer finished (reached 0)
        playNotificationSound();

        if (phase === "focus") {
          // Focus ended, start break
          sendNotification("Odaklanma bitti!", "5 dakika dinlenme zamanı.");
          setPhase("break");
          return BREAK_SECONDS;
        }

        // Break ended, reset to focus
        sendNotification("Dinlenme bitti!", "Tekrar odaklanma zamanı.");
        setPhase("focus");
        setIsRunning(false);
        setHasStartedPomodoro(false);
        return FOCUS_SECONDS;
      });
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [isRunning, phase]);

  const handleReset = () => {
    setIsRunning(false);
    setPhase("focus");
    setSecondsLeft(FOCUS_SECONDS);
    setHasStartedPomodoro(false);
  };

  const handleStartPause = () => {
    setIsRunning((prev) => {
      const next = !prev;
      if (next && !hasStartedPomodoro) {
        setHasStartedPomodoro(true);
      }
      return next;
    });
  };

  const progress = useMemo(() => {
    const total = phase === "focus" ? FOCUS_SECONDS : BREAK_SECONDS;
    return Math.max(0, Math.min(100, ((total - secondsLeft) / total) * 100));
  }, [phase, secondsLeft]);

  const circumference = 2 * Math.PI * 120;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <article className="soft-card pomodoro-card">
      <div className="pomodoro-circle-wrap">
        <svg className="pomodoro-ring" viewBox="0 0 260 260">
          <defs>
            <linearGradient id="gradient-focus" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#70f2c6" />
              <stop offset="100%" stopColor="#ffd36d" />
            </linearGradient>
            <linearGradient id="gradient-break" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ffd36d" />
              <stop offset="100%" stopColor="#ffa17a" />
            </linearGradient>
          </defs>
          <circle
            className="ring-bg"
            cx="130"
            cy="130"
            r="120"
          />
          <circle
            className={`ring-progress ${phase}`}
            cx="130"
            cy="130"
            r="120"
            style={{
              strokeDasharray: circumference,
              strokeDashoffset: strokeDashoffset,
            }}
          />
        </svg>
        <div className="pomodoro-center">
          <span className="pomodoro-time">{formatTime(secondsLeft)}</span>
          <span className={`pomodoro-phase ${phase}`}>
            {phase === "focus" ? "Odak" : "Dinlenme"}
          </span>
        </div>
      </div>

      <div className="player-controls">
        <button
          type="button"
          className="action-btn"
          onClick={handleStartPause}
        >
          {isRunning ? "Duraklat" : "Başlat"}
        </button>
        <button type="button" className="secondary-btn" onClick={handleReset}>
          Sıfırla
        </button>
      </div>
    </article>
  );
}
