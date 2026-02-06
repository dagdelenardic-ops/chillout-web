"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { audioTracks } from "@/data/audioTracks";

const AUDIO_STATE_KEY = "chillout_audio_state_v1";

type StoredAudioState = {
  enabled: boolean;
  volume: number;
  trackId: string;
};

const DEFAULT_AUDIO_STATE: StoredAudioState = {
  enabled: false,
  volume: 0.4,
  trackId: audioTracks[0]?.id ?? "",
};

function clampVolume(value: number): number {
  if (Number.isNaN(value)) {
    return 0.4;
  }
  return Math.max(0, Math.min(1, value));
}

function readStoredAudioState(): StoredAudioState {
  if (typeof window === "undefined") {
    return DEFAULT_AUDIO_STATE;
  }

  const raw = window.localStorage.getItem(AUDIO_STATE_KEY);
  if (!raw) {
    return DEFAULT_AUDIO_STATE;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<StoredAudioState>;
    const trackId =
      typeof parsed.trackId === "string" &&
      audioTracks.some((track) => track.id === parsed.trackId)
        ? parsed.trackId
        : DEFAULT_AUDIO_STATE.trackId;

    return {
      enabled:
        typeof parsed.enabled === "boolean"
          ? parsed.enabled
          : DEFAULT_AUDIO_STATE.enabled,
      volume:
        typeof parsed.volume === "number"
          ? clampVolume(parsed.volume)
          : DEFAULT_AUDIO_STATE.volume,
      trackId,
    };
  } catch {
    window.localStorage.removeItem(AUDIO_STATE_KEY);
    return DEFAULT_AUDIO_STATE;
  }
}

export function AudioPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [enabled, setEnabled] = useState(() => readStoredAudioState().enabled);
  const [volume, setVolume] = useState(() => readStoredAudioState().volume);
  const [trackId, setTrackId] = useState(() => readStoredAudioState().trackId);
  const [error, setError] = useState<string | null>(null);

  const activeTrack = useMemo(
    () => audioTracks.find((track) => track.id === trackId) ?? audioTracks[0],
    [trackId]
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const payload: StoredAudioState = {
      enabled,
      volume,
      trackId,
    };
    window.localStorage.setItem(AUDIO_STATE_KEY, JSON.stringify(payload));
  }, [enabled, trackId, volume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !activeTrack) {
      return;
    }

    audio.loop = true;
    audio.src = activeTrack.file;
    audio.load();

    if (enabled) {
      audio
        .play()
        .then(() => setError(null))
        .catch(() => {
          setEnabled(false);
          setError("Müzik başlatılamadı. Dosya adını ve formatını kontrol et.");
        });
    }
  }, [activeTrack, enabled]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }
    audio.volume = volume;
  }, [volume]);

  const handleToggle = async () => {
    const audio = audioRef.current;
    if (!audio || !activeTrack) {
      return;
    }

    if (enabled) {
      audio.pause();
      setEnabled(false);
      return;
    }

    try {
      setError(null);
      await audio.play();
      setEnabled(true);
    } catch {
      setError("Tarayıcı müziği blokladı. Butona tekrar tıklayarak izin ver.");
    }
  };

  return (
    <aside className="audio-dock" aria-label="Müzik oynatıcı">
      <article className="soft-card audio-dock-card">
        <h2>Loop Müzik</h2>
        <p className="audio-summary">Sekme değişse de çalmaya devam eder.</p>

        <div className="inline-controls audio-inline-controls">
          <label htmlFor="track-select">Parça</label>
          <select
            id="track-select"
            value={activeTrack?.id}
            onChange={(event) => setTrackId(event.target.value)}
          >
            {audioTracks.map((track) => (
              <option key={track.id} value={track.id}>
                {track.title}
              </option>
            ))}
          </select>
        </div>

        <div
          className="player-controls audio-player-controls"
          style={{ marginTop: 12 }}
        >
          <button type="button" className="action-btn" onClick={handleToggle}>
            {enabled ? "Müziği Kapat" : "Müziği Aç"}
          </button>

          <label htmlFor="volume-range">Ses</label>
          <input
            id="volume-range"
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(event) => setVolume(Number(event.target.value))}
          />
          <span className="meta-line audio-volume-text">
            {Math.round(volume * 100)}%
          </span>
        </div>

        <p className="meta-line" style={{ marginTop: 12 }}>
          Aktif dosya: <code>{activeTrack?.file ?? "dosya yok"}</code>
        </p>

        {error ? <p className="error-text">{error}</p> : null}

        <audio
          ref={audioRef}
          preload="none"
          onError={() => setError("Müzik dosyası bulunamadı. İsimleri kontrol et.")}
        />
      </article>
    </aside>
  );
}
