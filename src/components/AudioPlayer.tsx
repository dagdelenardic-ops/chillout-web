"use client";

// Tek deck: 🎵 Şarkı — play/pause, önceki/sonraki, ses, playlist.
// Sahne/ortam sesiyle (rüzgar, yağmur vb.) aynı anda çalması için SceneMixer
// (sol alt, "Sahne & Ses") ayrı ve bağımsız bir ses motoru kullanıyor.

import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
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
import { AudioTrack, audioTracks, trackDisplayTitle } from "@/data/audioTracks";
import { RITUAL_PICK_TRACK_EVENT } from "@/lib/ritualEvents";
import { pickTrackForMood, type MusicMood } from "@/lib/musicMood";

function clampVolume(value: number): number {
  if (Number.isNaN(value)) return 0.4;
  return Math.max(0, Math.min(1, value));
}

function pickRandomId(items: AudioTrack[], excludeId?: string, failed?: Set<string>): string | null {
  let pool = items;
  if (failed && failed.size) {
    const f = pool.filter((t) => !failed.has(t.id));
    if (f.length) pool = f;
  }
  if (excludeId && pool.length > 1) {
    const f = pool.filter((t) => t.id !== excludeId);
    if (f.length) pool = f;
  }
  if (!pool.length) return null;
  return pool[Math.floor(Math.random() * pool.length)]?.id ?? null;
}

type StoredDeck = { enabled: boolean; volume: number; trackId: string };

function readStored(key: string, fallbackVolume: number): StoredDeck {
  if (typeof window === "undefined") return { enabled: false, volume: fallbackVolume, trackId: "" };
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return { enabled: false, volume: fallbackVolume, trackId: "" };
    const p = JSON.parse(raw) as Partial<StoredDeck>;
    return {
      enabled: Boolean(p.enabled),
      volume: typeof p.volume === "number" ? clampVolume(p.volume) : fallbackVolume,
      trackId: typeof p.trackId === "string" ? p.trackId : "",
    };
  } catch {
    return { enabled: false, volume: fallbackVolume, trackId: "" };
  }
}

type Deck = {
  tracks: AudioTrack[];
  activeTrack: AudioTrack | undefined;
  enabled: boolean;
  volume: number;
  error: string | null;
  toggle: () => void;
  next: () => void;
  prev: () => void;
  setVolume: (v: number) => void;
  jumpTo: (id: string) => void;
  pickMood: (mood: MusicMood, seed?: string) => void;
  onEnded: () => void;
  onError: () => void;
};

function useDeck(
  allTracks: AudioTrack[],
  storageKey: string,
  autostart: boolean,
  fallbackVolume: number,
  audioRef: RefObject<HTMLAudioElement | null>
): Deck {
  const tracks = allTracks;

  const failedRef = useRef<Set<string>>(new Set());
  const [initial] = useState(() => readStored(storageKey, fallbackVolume));

  const [enabled, setEnabled] = useState(() => (autostart ? true : initial.enabled));
  const [volume, setVolume] = useState(() => initial.volume);
  const [trackId, setTrackId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [awaiting, setAwaiting] = useState(false);

  const activeTrack = useMemo(
    () => tracks.find((t) => t.id === trackId) ?? tracks[0],
    [tracks, trackId]
  );

  // Parça listesi hazır olduğunda / değiştiğinde geçerli parçayı garanti et
  useEffect(() => {
    if (!tracks.length) return;
    const syncTimer = window.setTimeout(() => {
      setTrackId((cur) => {
        if (cur && tracks.some((t) => t.id === cur)) return cur;
        const stored = initial.trackId;
        if (stored && tracks.some((t) => t.id === stored)) return stored;
        return pickRandomId(tracks) ?? tracks[0]?.id ?? "";
      });
    }, 0);
    return () => window.clearTimeout(syncTimer);
  }, [tracks, initial.trackId]);

  // Kalıcılık
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(storageKey, JSON.stringify({ enabled, volume, trackId: activeTrack?.id ?? trackId }));
  }, [enabled, volume, trackId, activeTrack, storageKey]);

  // Kaynak + çalma
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !activeTrack) return;
    audio.loop = false;
    if (audio.src.split("/").pop() !== activeTrack.file.split("/").pop()) {
      audio.src = activeTrack.file;
      audio.load();
    }
    if (!enabled) { audio.pause(); return; }
    audio.play()
      .then(() => { setError(null); setAwaiting(false); })
      .catch((reason) => {
        const code = typeof (reason as { name?: unknown })?.name === "string" ? (reason as { name: string }).name : "";
        if (code === "NotAllowedError") { setAwaiting(true); return; }
        if (code === "AbortError") return;
        failedRef.current.add(activeTrack.id);
        const nid = pickRandomId(tracks, activeTrack.id, failedRef.current);
        if (nid) { setTrackId(nid); } else { setEnabled(false); setError("Parça açılamadı."); }
      });
  }, [activeTrack, audioRef, enabled, tracks]);

  // Tarayıcı otomatik sesi engellediyse: ilk kullanıcı hareketinde başlat
  useEffect(() => {
    if (!awaiting || !enabled) return;
    const resume = async () => {
      const audio = audioRef.current;
      if (!audio) return;
      try { await audio.play(); setAwaiting(false); setError(null); } catch { /* bekle */ }
    };
    const h = () => { void resume(); };
    window.addEventListener("pointerdown", h, { once: true });
    window.addEventListener("keydown", h, { once: true });
    return () => { window.removeEventListener("pointerdown", h); window.removeEventListener("keydown", h); };
  }, [audioRef, awaiting, enabled]);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.volume = volume;
  }, [audioRef, volume]);

  const goByOffset = useCallback((offset: number) => {
    if (tracks.length < 2) return;
    const idx = Math.max(0, tracks.findIndex((t) => t.id === activeTrack?.id));
    const nextIdx = (idx + offset + tracks.length) % tracks.length;
    const nt = tracks[nextIdx];
    if (nt) { setTrackId(nt.id); setEnabled(true); }
  }, [tracks, activeTrack]);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !activeTrack) return;
    if (enabled) { audio.pause(); setEnabled(false); return; }
    setError(null);
    audio.play().then(() => setEnabled(true)).catch(() => { setEnabled(true); setAwaiting(true); });
  }, [activeTrack, audioRef, enabled]);

  const onEnded = useCallback(() => {
    const cur = activeTrack?.id;
    const nid = pickRandomId(tracks, cur, failedRef.current) ?? cur ?? null;
    if (!nid) { setEnabled(false); return; }
    if (nid === cur) {
      const audio = audioRef.current;
      if (audio && enabled) { audio.currentTime = 0; void audio.play().catch(() => setAwaiting(true)); }
      return;
    }
    setTrackId(nid);
  }, [activeTrack, audioRef, enabled, tracks]);

  const onError = useCallback(() => {
    if (activeTrack?.id) failedRef.current.add(activeTrack.id);
    const nid = pickRandomId(tracks, activeTrack?.id, failedRef.current);
    if (nid) { setTrackId(nid); setEnabled(true); } else { setEnabled(false); setError("Ses dosyaları açılamadı."); }
  }, [tracks, activeTrack]);

  const jumpTo = useCallback((id: string) => {
    setTrackId(id);
    setEnabled(true);
  }, []);

  const pickMood = useCallback((mood: MusicMood, seed = "ritual") => {
    const picked = pickTrackForMood(tracks.map((track) => track.file), mood, seed);
    if (!picked) return;
    const track = tracks.find((item) => item.file === picked || item.id === picked);
    if (!track) return;
    setTrackId(track.id);
    setEnabled(true);
  }, [tracks]);

  return {
    tracks, activeTrack, enabled, volume, error,
    toggle,
    next: () => goByOffset(1),
    prev: () => goByOffset(-1),
    setVolume: (v: number) => setVolume(clampVolume(v)),
    jumpTo,
    pickMood,
    onEnded, onError,
  };
}

function DeckControls({ deck, title, emoji }: { deck: Deck; title: string; emoji: string }) {
  const [playlistOpen, setPlaylistOpen] = useState(false);
  const [volumeOpen, setVolumeOpen] = useState(false);
  const nowPlaying = deck.activeTrack ? trackDisplayTitle(deck.activeTrack.file) : "—";

  return (
    <div className={`deck ${deck.enabled ? "playing" : ""}`}>
      <div className="deck-head">
        <span className="deck-title">{emoji} {title}</span>
        <span className="deck-now" title={nowPlaying}>{nowPlaying}</span>
        {deck.enabled && <span className="deck-live" aria-label="çalıyor">●</span>}
      </div>

      <div className="audio-controls-row" role="group" aria-label={`${title} kontrolleri`}>
        <button type="button" className="audio-icon-btn" aria-label="Önceki" onClick={deck.prev}><SkipBack aria-hidden="true" /></button>
        <button type="button" className="audio-icon-btn audio-icon-main" aria-label={deck.enabled ? "Durdur" : "Çal"} onClick={deck.toggle}>
          {deck.enabled ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
        </button>
        <button type="button" className="audio-icon-btn" aria-label="Sonraki" onClick={deck.next}><SkipForward aria-hidden="true" /></button>

        <div className="audio-volume-wrap">
          <button type="button" className={`audio-icon-btn${volumeOpen ? " active" : ""}`} aria-label="Ses" aria-expanded={volumeOpen} onClick={() => setVolumeOpen((p) => !p)}>
            <Volume2 aria-hidden="true" />
          </button>
          {volumeOpen && (
            <div className="audio-volume-popup">
              <input
                className="audio-intensity-slider" type="range" min={0} max={1} step={0.01}
                value={deck.volume} aria-label={`${title} ses seviyesi`}
                onChange={(e) => deck.setVolume(Number(e.target.value))}
                onMouseUp={() => setVolumeOpen(false)} onTouchEnd={() => setVolumeOpen(false)}
              />
            </div>
          )}
        </div>

        <button type="button" className={`audio-icon-btn${playlistOpen ? " active" : ""}`} aria-label={playlistOpen ? "Listeyi kapat" : "Listeyi aç"} aria-expanded={playlistOpen} onClick={() => setPlaylistOpen((p) => !p)}>
          <ListMusic aria-hidden="true" />
        </button>
      </div>

      {deck.error && <p className="error-text">{deck.error}</p>}

      {playlistOpen && (
        <div className="audio-playlist">
          <div className="audio-playlist-header">
            <span>{title} — {deck.tracks.length} parça</span>
            <button type="button" className="audio-playlist-close" aria-label="Kapat" onClick={() => setPlaylistOpen(false)}><X size={14} /></button>
          </div>
          <div className="audio-playlist-body">
            {deck.tracks.map((t) => (
              <button
                key={t.id} type="button"
                className={`audio-playlist-item${t.id === deck.activeTrack?.id ? " active" : ""}`}
                onClick={() => deck.jumpTo(t.id)} title={trackDisplayTitle(t.file)}
              >
                {t.id === deck.activeTrack?.id && <span className="audio-playlist-eq" aria-hidden="true">{deck.enabled ? "▶" : "⏸"}</span>}
                <span className="audio-playlist-name">{trackDisplayTitle(t.file)}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function AudioPlayer() {
  const dockRef = useRef<HTMLElement>(null);
  const songAudioRef = useRef<HTMLAudioElement | null>(null);
  const [tracks, setTracks] = useState<AudioTrack[]>(audioTracks);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  const song = useDeck(tracks, "chillout_song_state_v1", true, 0.42, songAudioRef);
  const pickSongMood = song.pickMood;

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/music", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { tracks?: string[] };
        const paths = Array.isArray(data.tracks) ? data.tracks : [];
        if (!paths.length || !mounted) return;
        setTracks(paths.map((p) => ({ id: p, title: trackDisplayTitle(p), file: p })));
      } catch { /* fallback listesi kalır */ }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const onPick = (event: Event) => {
      const detail = (event as CustomEvent<{ mood?: MusicMood; seed?: string }>).detail;
      if (!detail?.mood) return;
      pickSongMood(detail.mood, detail.seed);
    };
    window.addEventListener(RITUAL_PICK_TRACK_EVENT, onPick);
    return () => window.removeEventListener(RITUAL_PICK_TRACK_EVENT, onPick);
  }, [pickSongMood]);

  const summary = isPanelOpen ? (song.enabled ? "Şarkı" : "Duraklatıldı") : "Müzik";

  return (
    <aside className="audio-dock" ref={dockRef} aria-label="Müzik oynatıcı">
      <button
        type="button"
        className={`audio-panel-toggle${song.enabled ? " live" : ""}`}
        aria-expanded={isPanelOpen}
        onClick={() => setIsPanelOpen((p) => !p)}
      >
        <Music2 aria-hidden="true" />
        <span className="audio-toggle-label">{summary}</span>
        {isPanelOpen ? <ChevronDown aria-hidden="true" /> : <ChevronUp aria-hidden="true" />}
      </button>

      {isPanelOpen && (
        <article className="audio-dock-card">
          <DeckControls deck={song} title="Şarkı" emoji="🎵" />
        </article>
      )}

      <audio ref={songAudioRef} preload="none" onEnded={song.onEnded} onError={song.onError} />

      <style jsx>{`
        .deck { display: grid; gap: 8px; }
        .deck-head { display: flex; align-items: center; gap: 8px; }
        .deck-title { font-weight: 700; font-size: 0.82rem; color: #f2fbf7; white-space: nowrap; }
        .deck-now {
          flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
          font-size: 0.76rem; color: #9fc4ba; text-align: right;
        }
        .deck-live { color: #7ee0b8; font-size: 0.6rem; animation: deck-pulse 1.6s ease-in-out infinite; }
        @keyframes deck-pulse { 0%,100% { opacity: 0.4; } 50% { opacity: 1; } }
      `}</style>
    </aside>
  );
}
