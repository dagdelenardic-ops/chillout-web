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
  const lastNonZeroVolumeRef = useRef(DEFAULT_AUDIO_STATE.volume);
  const [enabled, setEnabled] = useState(() => readStoredAudioState().enabled);
  const [volume, setVolume] = useState(() => readStoredAudioState().volume);
  const [trackId, setTrackId] = useState(() => readStoredAudioState().trackId);
  const [error, setError] = useState<string | null>(null);

  const activeTrack = useMemo(
    () => audioTracks.find((track) => track.id === trackId) ?? audioTracks[0],
    [trackId]
  );
  const activeTrackIndex = useMemo(
    () => Math.max(0, audioTracks.findIndex((track) => track.id === activeTrack?.id)),
    [activeTrack]
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

  useEffect(() => {
    if (volume > 0) {
      lastNonZeroVolumeRef.current = volume;
    }
  }, [volume]);

  const goToTrackByOffset = (offset: number) => {
    if (audioTracks.length < 2) {
      return;
    }
    const nextIndex =
      (activeTrackIndex + offset + audioTracks.length) % audioTracks.length;
    const nextTrack = audioTracks[nextIndex];
    if (nextTrack) {
      setTrackId(nextTrack.id);
    }
  };

  const adjustVolume = (step: number) => {
    setVolume((prev) => clampVolume(prev + step));
  };

  const handleMuteToggle = () => {
    if (volume === 0) {
      setVolume(clampVolume(lastNonZeroVolumeRef.current || DEFAULT_AUDIO_STATE.volume));
      return;
    }
    setVolume(0);
  };

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
        <div className="audio-shell">
          <div className="audio-header">
            <h2>Loop Müzik</h2>
            <p className="audio-summary">Sayfada gezerken müzik kesilmez.</p>
            <p className="meta-line audio-track-indicator">
              Parça {activeTrackIndex + 1} / {audioTracks.length}
            </p>
          </div>

          <div className="audio-nav" role="group" aria-label="Müzik navigasyonu">
            <button
              type="button"
              className="audio-nav-btn"
              onClick={() => goToTrackByOffset(-1)}
            >
              Geri
            </button>

            <button
              type="button"
              className="audio-nav-btn audio-nav-main"
              onClick={handleToggle}
            >
              {enabled ? "Durdur" : "Çal"}
            </button>

            <button
              type="button"
              className="audio-nav-btn"
              onClick={() => goToTrackByOffset(1)}
            >
              İleri
            </button>

            <button
              type="button"
              className="audio-nav-btn"
              onClick={() => adjustVolume(-0.12)}
            >
              Ses -
            </button>

            <button type="button" className="audio-nav-btn" onClick={handleMuteToggle}>
              {volume === 0 ? "Sesi Aç" : "Sessiz"}
            </button>

            <button
              type="button"
              className="audio-nav-btn"
              onClick={() => adjustVolume(0.12)}
            >
              Ses +
            </button>
          </div>

          <div className="audio-level-bar" aria-hidden="true">
            <span style={{ width: `${Math.round(volume * 100)}%` }} />
          </div>
        </div>

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
