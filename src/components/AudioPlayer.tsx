"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Volume1,
  Volume2,
  VolumeX,
} from "lucide-react";
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
      <article className="audio-dock-card">
        <div className="audio-controls-only" role="group" aria-label="Müzik kontrolleri">
          <button
            type="button"
            className="audio-icon-btn"
            aria-label="Önceki parça"
            title="Önceki parça"
            onClick={() => goToTrackByOffset(-1)}
          >
            <SkipBack aria-hidden="true" />
          </button>

          <button
            type="button"
            className="audio-icon-btn audio-icon-main"
            aria-label={enabled ? "Durdur" : "Çal"}
            title={enabled ? "Durdur" : "Çal"}
            onClick={handleToggle}
          >
            {enabled ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
          </button>

          <button
            type="button"
            className="audio-icon-btn"
            aria-label="Sonraki parça"
            title="Sonraki parça"
            onClick={() => goToTrackByOffset(1)}
          >
            <SkipForward aria-hidden="true" />
          </button>

          <button
            type="button"
            className="audio-icon-btn"
            aria-label="Sesi azalt"
            title="Sesi azalt"
            onClick={() => adjustVolume(-0.12)}
          >
            <Volume1 aria-hidden="true" />
          </button>

          <button
            type="button"
            className="audio-icon-btn"
            aria-label={volume === 0 ? "Sesi aç" : "Sesi kapat"}
            title={volume === 0 ? "Sesi aç" : "Sesi kapat"}
            onClick={handleMuteToggle}
          >
            {volume === 0 ? (
              <VolumeX aria-hidden="true" />
            ) : (
              <Volume1 aria-hidden="true" />
            )}
          </button>

          <button
            type="button"
            className="audio-icon-btn"
            aria-label="Sesi artır"
            title="Sesi artır"
            onClick={() => adjustVolume(0.12)}
          >
            <Volume2 aria-hidden="true" />
          </button>
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
