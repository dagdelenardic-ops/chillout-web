"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { audioTracks } from "@/data/audioTracks";

export function AudioPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [volume, setVolume] = useState(0.4);
  const [trackId, setTrackId] = useState(audioTracks[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);

  const activeTrack = useMemo(
    () => audioTracks.find((track) => track.id === trackId) ?? audioTracks[0],
    [trackId]
  );

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
    <article className="soft-card">
      <h2>Loop Müzik</h2>
      <p>
        Müzikler döngüde çalar. Dosyaları <code>/public/music</code> klasörüne
        koyup aşağıdaki isimlerle eşleştir.
      </p>

      <div className="inline-controls">
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

      <div className="player-controls" style={{ marginTop: 12 }}>
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
  );
}
