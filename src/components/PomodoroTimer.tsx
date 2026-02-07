"use client";

import { useEffect, useMemo, useState } from "react";

const FOCUS_SECONDS = 25 * 60;
const BREAK_SECONDS = 5 * 60;

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

export function PomodoroTimer({
  onPhaseChange,
  onChatWriteChange,
}: PomodoroTimerProps) {
  const [phase, setPhase] = useState<PomodoroPhase>("focus");
  const [secondsLeft, setSecondsLeft] = useState(FOCUS_SECONDS);
  const [isRunning, setIsRunning] = useState(false);
  const [hasStartedPomodoro, setHasStartedPomodoro] = useState(false);

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

        if (phase === "focus") {
          setPhase("break");
          return BREAK_SECONDS;
        }

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
