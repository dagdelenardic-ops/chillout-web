"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  ListMusic,
  Music2,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Volume2,
  X,
} from "lucide-react";
import { AudioTrack, TrackCat, audioTracks, trackCat, trackDisplayTitle } from "@/data/audioTracks";

function useClickOutside(ref: React.RefObject<HTMLElement | null>, onClickOutside: () => void) {
  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClickOutside();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [ref, onClickOutside]);
}

const AUDIO_STATE_KEY = "chillout_audio_state_v1";

type StoredAudioState = {
  enabled: boolean;
  volume: number;
  trackId: string;
};

const DEFAULT_AUDIO_STATE: StoredAudioState = {
  enabled: true,
  volume: 0.4,
  trackId: audioTracks[0]?.id ?? "",
};

function pickRandomTrackId(
  items: AudioTrack[],
  options?: { excludeId?: string; failedIds?: Set<string> }
): string | null {
  const failedIds = options?.failedIds;
  const excludeId = options?.excludeId;
  let pool = items;

  if (failedIds && failedIds.size > 0) {
    const filtered = pool.filter((track) => !failedIds.has(track.id));
    if (filtered.length > 0) pool = filtered;
  }

  if (excludeId && pool.length > 1) {
    const filtered = pool.filter((track) => track.id !== excludeId);
    if (filtered.length > 0) pool = filtered;
  }

  if (pool.length === 0) return null;

  const randomIndex = Math.floor(Math.random() * pool.length);
  return pool[randomIndex]?.id ?? null;
}

function clampVolume(value: number): number {
  if (Number.isNaN(value)) return 0.4;
  return Math.max(0, Math.min(1, value));
}

function readStoredAudioState(): StoredAudioState {
  if (typeof window === "undefined") return DEFAULT_AUDIO_STATE;

  const raw = window.localStorage.getItem(AUDIO_STATE_KEY);
  if (!raw) return DEFAULT_AUDIO_STATE;

  try {
    const parsed = JSON.parse(raw) as Partial<StoredAudioState>;
    const trackId =
      typeof parsed.trackId === "string" &&
      audioTracks.some((track) => track.id === parsed.trackId)
        ? parsed.trackId
        : DEFAULT_AUDIO_STATE.trackId;

    return {
      enabled: true,
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

const CAT_LABELS: Record<TrackCat, string> = {
  "müzik": "🎵 Müzik",
  "ambiyans": "🌊 Ambiyans",
  "8d": "🎧 8D",
};

const CAT_ORDER: TrackCat[] = ["müzik", "ambiyans", "8d"];

export function AudioPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const volumeRef = useRef<HTMLDivElement>(null);
  const dockRef = useRef<HTMLElement>(null);
  const failedTrackIdsRef = useRef<Set<string>>(new Set());
  const [tracks, setTracks] = useState<AudioTrack[]>(audioTracks);
  const [enabled, setEnabled] = useState(() => readStoredAudioState().enabled);
  const [volume, setVolume] = useState(() => readStoredAudioState().volume);
  const [trackId, setTrackId] = useState(() => pickRandomTrackId(audioTracks) ?? "");
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isPlaylistOpen, setIsPlaylistOpen] = useState(false);
  const [isVolumeOpen, setIsVolumeOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [awaitingUserGesture, setAwaitingUserGesture] = useState(false);

  useClickOutside(volumeRef, () => setIsVolumeOpen(false));
  useClickOutside(dockRef, () => {
    setIsPlaylistOpen(false);
    setIsVolumeOpen(false);
  });

  const activeTrack = useMemo(
    () => tracks.find((track) => track.id === trackId) ?? tracks[0],
    [trackId, tracks]
  );
  const activeTrackIndex = useMemo(
    () => Math.max(0, tracks.findIndex((track) => track.id === activeTrack?.id)),
    [activeTrack, tracks]
  );

  /* Tracks grouped by category, for playlist rendering */
  const groupedTracks = useMemo(() => {
    const map: Record<TrackCat, AudioTrack[]> = { "müzik": [], "ambiyans": [], "8d": [] };
    for (const t of tracks) {
      const cat = trackCat(t.file);
      map[cat].push(t);
    }
    return map;
  }, [tracks]);

  useEffect(() => {
    let isMounted = true;

    const loadTracks = async () => {
      try {
        const response = await fetch("/api/music", { cache: "no-store" });
        if (!response.ok) return;
        const data = (await response.json()) as { tracks?: string[] };
        const paths = Array.isArray(data.tracks) ? data.tracks : [];
        if (paths.length === 0 || !isMounted) return;

        const nextTracks: AudioTrack[] = paths.map((filePath) => ({
          id: filePath,
          title: trackDisplayTitle(filePath),
          file: filePath,
        }));

        failedTrackIdsRef.current.clear();
        setTracks(nextTracks);
        setTrackId(
          pickRandomTrackId(nextTracks, { failedIds: failedTrackIdsRef.current }) ??
          (nextTracks[0]?.id ?? "")
        );
      } catch {
        // Keep fallback list when endpoint is unavailable.
      }
    };

    loadTracks();
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const payload: StoredAudioState = {
      enabled,
      volume,
      trackId: activeTrack?.id ?? trackId,
    };
    window.localStorage.setItem(AUDIO_STATE_KEY, JSON.stringify(payload));
  }, [activeTrack, enabled, trackId, volume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !activeTrack) return;

    audio.loop = false;
    audio.src = activeTrack.file;
    audio.load();

    if (enabled) {
      audio
        .play()
        .then(() => {
          setError(null);
          setAwaitingUserGesture(false);
        })
        .catch((reason) => {
          const code =
            typeof (reason as { name?: unknown } | undefined)?.name === "string"
              ? ((reason as { name: string }).name)
              : "";

          if (code === "NotAllowedError") {
            setAwaitingUserGesture(true);
            setError("Tarayıcı otomatik sesi engelledi. Ekrana bir kez dokununca müzik başlayacak.");
            return;
          }

          if (code === "AbortError") return;

          const currentTrackId = activeTrack.id;
          failedTrackIdsRef.current.add(currentTrackId);

          const nextTrackId =
            pickRandomTrackId(tracks, {
              excludeId: currentTrackId,
              failedIds: failedTrackIdsRef.current,
            }) ??
            pickRandomTrackId(tracks, { failedIds: failedTrackIdsRef.current });

          if (!nextTrackId) {
            setEnabled(false);
            setError("Müzik dosyaları açılamadı.");
            return;
          }

          setError("Bir parça açılamadı, sonraki parçaya geçildi.");
          setTrackId(nextTrackId);
          setEnabled(true);
        });
    }
  }, [activeTrack, enabled, tracks]);

  useEffect(() => {
    if (!awaitingUserGesture || !enabled) return;

    const tryResume = async () => {
      const audio = audioRef.current;
      if (!audio) return;
      try {
        await audio.play();
        setAwaitingUserGesture(false);
        setError(null);
      } catch {
        // Keep waiting until a valid user gesture succeeds.
      }
    };

    const handler = () => { void tryResume(); };
    window.addEventListener("pointerdown", handler, { once: true });
    window.addEventListener("keydown", handler, { once: true });

    return () => {
      window.removeEventListener("pointerdown", handler);
      window.removeEventListener("keydown", handler);
    };
  }, [awaitingUserGesture, enabled]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = volume;
  }, [volume]);

  const goToTrackByOffset = (offset: number) => {
    if (tracks.length < 2) return;
    const nextIndex = (activeTrackIndex + offset + tracks.length) % tracks.length;
    const nextTrack = tracks[nextIndex];
    if (nextTrack) setTrackId(nextTrack.id);
  };

  const pickNextPlayableTrackId = (excludeTrackId?: string): string | null =>
    pickRandomTrackId(tracks, {
      excludeId: excludeTrackId,
      failedIds: failedTrackIdsRef.current,
    });

  const handleTrackEnded = () => {
    const currentTrackId = activeTrack?.id;
    if (!currentTrackId) return;

    const nextTrackId =
      pickNextPlayableTrackId(currentTrackId) ?? pickNextPlayableTrackId();

    if (!nextTrackId) {
      setError("Çalınabilir parça kalmadı.");
      setEnabled(false);
      return;
    }

    if (nextTrackId === currentTrackId) {
      const audio = audioRef.current;
      if (!audio || !enabled) return;
      audio.currentTime = 0;
      audio.play()
        .then(() => setError(null))
        .catch(() => {
          setAwaitingUserGesture(true);
          setError("Tarayıcı otomatik sesi engelledi.");
        });
      return;
    }

    setTrackId(nextTrackId);
  };

  const handleTrackError = () => {
    const currentTrackId = activeTrack?.id;
    if (currentTrackId) failedTrackIdsRef.current.add(currentTrackId);

    const nextTrackId =
      pickNextPlayableTrackId(currentTrackId) ?? pickNextPlayableTrackId();

    if (!nextTrackId) {
      setError("Müzik dosyaları açılamadı.");
      setEnabled(false);
      return;
    }

    setError("Bir parça açılamadı, sonraki parçaya geçildi.");
    setTrackId(nextTrackId);
    setEnabled(true);
  };

  const handleToggle = async () => {
    const audio = audioRef.current;
    if (!audio || !activeTrack) return;

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

  const jumpToTrack = (id: string) => {
    setTrackId(id);
    setEnabled(true);
  };

  const nowPlayingTitle = activeTrack
    ? trackDisplayTitle(activeTrack.file)
    : "—";

  return (
    <aside className="audio-dock" ref={dockRef} aria-label="Müzik oynatıcı">
      {/* Toggle button */}
      <button
        type="button"
        className="audio-panel-toggle"
        aria-expanded={isPanelOpen}
        onClick={() => {
          setIsPanelOpen((prev) => !prev);
          if (isPanelOpen) setIsPlaylistOpen(false);
        }}
      >
        <Music2 aria-hidden="true" />
        <span className="audio-toggle-label">
          {isPanelOpen ? nowPlayingTitle : "Müzik"}
        </span>
        {isPanelOpen ? <ChevronDown aria-hidden="true" /> : <ChevronUp aria-hidden="true" />}
      </button>

      {isPanelOpen && (
        <article className="audio-dock-card">
          {/* Now Playing */}
          <div className="audio-now-playing">
            <span className="audio-now-playing-label">Şu An</span>
            <span className="audio-now-playing-title">{nowPlayingTitle}</span>
          </div>

          {/* Controls row */}
          <div className="audio-controls-row" role="group" aria-label="Müzik kontrolleri">
            <button
              type="button"
              className="audio-icon-btn"
              aria-label="Önceki parça"
              onClick={() => goToTrackByOffset(-1)}
            >
              <SkipBack aria-hidden="true" />
            </button>

            <button
              type="button"
              className="audio-icon-btn audio-icon-main"
              aria-label={enabled ? "Durdur" : "Çal"}
              onClick={handleToggle}
            >
              {enabled ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
            </button>

            <button
              type="button"
              className="audio-icon-btn"
              aria-label="Sonraki parça"
              onClick={() => goToTrackByOffset(1)}
            >
              <SkipForward aria-hidden="true" />
            </button>

            {/* Volume */}
            <div ref={volumeRef} className="audio-volume-wrap">
              <button
                type="button"
                className={`audio-icon-btn${isVolumeOpen ? " active" : ""}`}
                aria-expanded={isVolumeOpen}
                aria-label="Ses"
                onClick={() => setIsVolumeOpen((prev) => !prev)}
              >
                <Volume2 aria-hidden="true" />
              </button>
              {isVolumeOpen && (
                <div className="audio-volume-popup">
                  <label className="audio-intensity" htmlFor="audio-volume-slider">
                    <span className="sr-only">Ses seviyesi</span>
                    <input
                      id="audio-volume-slider"
                      className="audio-intensity-slider"
                      type="range"
                      min={0}
                      max={1}
                      step={0.01}
                      value={volume}
                      onChange={(e) => setVolume(clampVolume(Number(e.target.value)))}
                      onMouseUp={() => setIsVolumeOpen(false)}
                      onTouchEnd={() => setIsVolumeOpen(false)}
                    />
                  </label>
                </div>
              )}
            </div>

            {/* Playlist toggle */}
            <button
              type="button"
              className={`audio-icon-btn${isPlaylistOpen ? " active" : ""}`}
              aria-expanded={isPlaylistOpen}
              aria-label={isPlaylistOpen ? "Playlist'i kapat" : "Playlist'i aç"}
              onClick={() => setIsPlaylistOpen((prev) => !prev)}
            >
              <ListMusic aria-hidden="true" />
            </button>
          </div>

          {error && <p className="error-text">{error}</p>}

          {/* Collapsible Playlist */}
          {isPlaylistOpen && (
            <div className="audio-playlist">
              <div className="audio-playlist-header">
                <span>Playlist — {tracks.length} parça</span>
                <button
                  type="button"
                  className="audio-playlist-close"
                  aria-label="Playlist'i kapat"
                  onClick={() => setIsPlaylistOpen(false)}
                >
                  <X size={14} />
                </button>
              </div>
              <div className="audio-playlist-body">
                {CAT_ORDER.map((cat) => {
                  const group = groupedTracks[cat];
                  if (!group || group.length === 0) return null;
                  return (
                    <div key={cat} className="audio-playlist-section">
                      <div className="audio-playlist-cat">{CAT_LABELS[cat]}</div>
                      {group.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          className={`audio-playlist-item${t.id === activeTrack?.id ? " active" : ""}`}
                          onClick={() => jumpToTrack(t.id)}
                          title={trackDisplayTitle(t.file)}
                        >
                          {t.id === activeTrack?.id && (
                            <span className="audio-playlist-eq" aria-hidden="true">
                              {enabled ? "▶" : "⏸"}
                            </span>
                          )}
                          <span className="audio-playlist-name">{trackDisplayTitle(t.file)}</span>
                        </button>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </article>
      )}

      <audio
        ref={audioRef}
        preload="none"
        onEnded={handleTrackEnded}
        onError={handleTrackError}
      />
    </aside>
  );
}
