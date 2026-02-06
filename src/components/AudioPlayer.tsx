"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Music2,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Volume2,
} from "lucide-react";
import { AudioTrack, audioTracks } from "@/data/audioTracks";

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
  const [tracks, setTracks] = useState<AudioTrack[]>(audioTracks);
  const [enabled, setEnabled] = useState(() => readStoredAudioState().enabled);
  const [volume, setVolume] = useState(() => readStoredAudioState().volume);
  const [trackId, setTrackId] = useState(() => readStoredAudioState().trackId);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isVolumeOpen, setIsVolumeOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeTrack = useMemo(
    () => tracks.find((track) => track.id === trackId) ?? tracks[0],
    [trackId, tracks]
  );
  const activeTrackIndex = useMemo(
    () => Math.max(0, tracks.findIndex((track) => track.id === activeTrack?.id)),
    [activeTrack, tracks]
  );

  useEffect(() => {
    let isMounted = true;

    const loadTracks = async () => {
      try {
        const response = await fetch("/api/music", { cache: "no-store" });
        if (!response.ok) {
          return;
        }
        const data = (await response.json()) as { tracks?: string[] };
        const paths = Array.isArray(data.tracks) ? data.tracks : [];
        if (paths.length === 0 || !isMounted) {
          return;
        }

        const nextTracks: AudioTrack[] = paths.map((filePath) => ({
          id: filePath,
          title: filePath,
          file: filePath,
        }));

        setTracks(nextTracks);
        setTrackId((prev) =>
          nextTracks.some((track) => track.id === prev)
            ? prev
            : (nextTracks[0]?.id ?? "")
        );
      } catch {
        // Keep fallback list when endpoint is unavailable.
      }
    };

    loadTracks();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const payload: StoredAudioState = {
      enabled,
      volume,
      trackId: activeTrack?.id ?? trackId,
    };
    window.localStorage.setItem(AUDIO_STATE_KEY, JSON.stringify(payload));
  }, [activeTrack, enabled, trackId, volume]);

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

  const goToTrackByOffset = (offset: number) => {
    if (tracks.length < 2) {
      return;
    }
    const nextIndex =
      (activeTrackIndex + offset + tracks.length) % tracks.length;
    const nextTrack = tracks[nextIndex];
    if (nextTrack) {
      setTrackId(nextTrack.id);
    }
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
      <button
        type="button"
        className="audio-panel-toggle"
        aria-expanded={isPanelOpen}
        onClick={() => setIsPanelOpen((prev) => !prev)}
      >
        <Music2 aria-hidden="true" />
        <span>{isPanelOpen ? "Paneli Kapat" : "Müzik Paneli Aç"}</span>
        {isPanelOpen ? <ChevronDown aria-hidden="true" /> : <ChevronUp aria-hidden="true" />}
      </button>

      {isPanelOpen ? (
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
              className={`audio-icon-btn ${isVolumeOpen ? "active" : ""}`}
              aria-expanded={isVolumeOpen}
              aria-label={isVolumeOpen ? "Ses çubuğunu kapat" : "Ses çubuğunu aç"}
              title={isVolumeOpen ? "Ses çubuğunu kapat" : "Ses çubuğunu aç"}
              onClick={() => setIsVolumeOpen((prev) => !prev)}
            >
              <Volume2 aria-hidden="true" />
            </button>

            {isVolumeOpen ? (
              <label className="audio-intensity" htmlFor="audio-volume-slider">
                <span className="sr-only">Müzik şiddeti</span>
                <input
                  id="audio-volume-slider"
                  className="audio-intensity-slider"
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={volume}
                  onChange={(event) => setVolume(clampVolume(Number(event.target.value)))}
                />
              </label>
            ) : null}
          </div>

          {error ? <p className="error-text">{error}</p> : null}
        </article>
      ) : null}

      <audio
        ref={audioRef}
        preload="none"
        onError={() => setError("Müzik dosyası bulunamadı. İsimleri kontrol et.")}
      />
    </aside>
  );
}
