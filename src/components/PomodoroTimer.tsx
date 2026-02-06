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

  return (
    <article className="soft-card">
      <span className={`pill ${phase === "break" ? "break" : ""}`}>
        {phase === "focus" ? "Odak Modu - 25 dk" : "Dinlenme Modu - 5 dk"}
      </span>
      <h2>Klasik Pomodoro</h2>
      <p>
        25 dakika odak ve 5 dakika dinlenme akışı çalışır. Mesaj yazma hakkı
        yalnızca dinlenme süresinde açıktır. Dinlenme bitince sohbet yazma alanı
        kilitlenir; yeniden yazmak için pomodoroyu tekrar başlatmalısın.
      </p>

      <p className="kpi">{formatTime(secondsLeft)}</p>

      <div
        style={{
          height: 8,
          borderRadius: 999,
          background: "rgba(190,225,218,0.18)",
          overflow: "hidden",
          marginBottom: 14,
        }}
      >
        <div
          style={{
            width: `${progress}%`,
            height: "100%",
            background:
              phase === "focus"
                ? "linear-gradient(90deg, #70f2c6, #ffd36d)"
                : "linear-gradient(90deg, #ffd36d, #ffa17a)",
            transition: "width 0.9s linear",
          }}
        />
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
