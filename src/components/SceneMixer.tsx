"use client";

import { useEffect, useRef, useState } from "react";
import {
  AudioWaveform,
  ChevronDown,
  ChevronUp,
  CloudRain,
  Flame,
  SlidersHorizontal,
  Volume2,
  Waves,
  Wind,
} from "lucide-react";
import { getAmbientEngine, LAYERS, type LayerId } from "@/lib/ambient";
import { SCENES, getScene, type SceneId } from "@/lib/scenes";

const SCENE_STATE_KEY = "chillout_scene_state_v1";

type LayerState = { on: boolean; volume: number };

type StoredSceneState = {
  sceneId: SceneId | null;
  master: number;
  layers: Record<LayerId, LayerState>;
};

const LAYER_ICONS: Record<LayerId, typeof CloudRain> = {
  rain: CloudRain,
  waves: Waves,
  wind: Wind,
  fire: Flame,
  derin: AudioWaveform,
};

function defaultLayers(): Record<LayerId, LayerState> {
  return LAYERS.reduce((acc, meta) => {
    acc[meta.id] = { on: false, volume: 0.5 };
    return acc;
  }, {} as Record<LayerId, LayerState>);
}

function readStored(): StoredSceneState {
  const base: StoredSceneState = { sceneId: null, master: 0.6, layers: defaultLayers() };
  if (typeof window === "undefined") {
    return base;
  }
  try {
    const raw = window.localStorage.getItem(SCENE_STATE_KEY);
    if (!raw) {
      return base;
    }
    const parsed = JSON.parse(raw) as Partial<StoredSceneState>;
    const layers = defaultLayers();
    if (parsed.layers) {
      LAYERS.forEach((meta) => {
        const v = parsed.layers?.[meta.id];
        if (v && typeof v.volume === "number") {
          layers[meta.id] = { on: Boolean(v.on), volume: Math.max(0, Math.min(1, v.volume)) };
        }
      });
    }
    return {
      sceneId: parsed.sceneId ?? null,
      master: typeof parsed.master === "number" ? Math.max(0, Math.min(1, parsed.master)) : 0.6,
      layers,
    };
  } catch {
    return base;
  }
}

export function SceneMixer() {
  const engine = getAmbientEngine();
  const [open, setOpen] = useState(false);
  const [sceneId, setSceneId] = useState<SceneId | null>(null);
  const [master, setMaster] = useState(0.6);
  const [layers, setLayers] = useState<Record<LayerId, LayerState>>(defaultLayers);
  const [audioLive, setAudioLive] = useState(false);
  const hydrated = useRef(false);

  // İlk yüklemede kayıtlı durumu oku (ses motoru başlatmadan — perde görseli yine de gelir)
  useEffect(() => {
    const hydrateTimer = window.setTimeout(() => {
      const stored = readStored();
      setSceneId(stored.sceneId);
      setMaster(stored.master);
      setLayers(stored.layers);
      hydrated.current = true;
    }, 0);
    return () => window.clearTimeout(hydrateTimer);
  }, []);

  // Durumu kalıcı kıl
  useEffect(() => {
    if (!hydrated.current || typeof window === "undefined") {
      return;
    }
    const payload: StoredSceneState = { sceneId, master, layers };
    window.localStorage.setItem(SCENE_STATE_KEY, JSON.stringify(payload));
  }, [sceneId, master, layers]);

  const wake = async () => {
    await engine.ensureStarted();
    if (!audioLive) {
      // İlk gerçek başlatmada mevcut katman/seviye durumunu motora uygula
      engine.setMasterVolume(master);
      LAYERS.forEach((meta) => {
        const ls = layers[meta.id];
        engine.setLayer(meta.id, ls.on, ls.volume);
      });
      setAudioLive(true);
    }
  };

  const applyScene = async (scene: SceneId) => {
    await wake();
    if (sceneId === scene) {
      // Aynı sahneye tekrar tıkla → kapat
      setSceneId(null);
      setLayers((prev) => {
        const next = { ...prev };
        LAYERS.forEach((meta) => {
          next[meta.id] = { ...next[meta.id], on: false };
          engine.setLayer(meta.id, false);
        });
        return next;
      });
      return;
    }
    const def = getScene(scene);
    if (!def) {
      return;
    }
    setSceneId(scene);
    setLayers((prev) => {
      const next = { ...prev };
      LAYERS.forEach((meta) => {
        const lvl = def.layers[meta.id];
        const on = typeof lvl === "number";
        const volume = typeof lvl === "number" ? lvl : next[meta.id].volume;
        next[meta.id] = { on, volume };
        engine.setLayer(meta.id, on, volume);
      });
      return next;
    });
    engine.setMasterVolume(master);
  };

  const toggleLayer = async (id: LayerId) => {
    await wake();
    setLayers((prev) => {
      const on = !prev[id].on;
      engine.setLayer(id, on, prev[id].volume);
      return { ...prev, [id]: { ...prev[id], on } };
    });
  };

  const changeLayerVolume = async (id: LayerId, volume: number) => {
    await wake();
    engine.setLayerVolume(id, volume);
    setLayers((prev) => ({ ...prev, [id]: { ...prev[id], volume } }));
  };

  const changeMaster = async (v: number) => {
    await wake();
    engine.setMasterVolume(v);
    setMaster(v);
  };

  const activeScene = sceneId ? getScene(sceneId) : null;
  const anyOn = LAYERS.some((meta) => layers[meta.id].on);

  return (
    <>
      <div
        className="scene-veil"
        aria-hidden="true"
        style={{ background: activeScene?.veil, opacity: activeScene ? 1 : 0 }}
      />

      <aside className="scene-dock" aria-label="Ortam ve sahne mikseri">
        <button
          type="button"
          className={`scene-toggle ${anyOn ? "live" : ""}`}
          aria-expanded={open}
          onClick={() => setOpen((p) => !p)}
        >
          <SlidersHorizontal aria-hidden="true" />
          <span>{open ? "Sahneyi Kapat" : "Sahne & Ses"}</span>
          {open ? <ChevronDown aria-hidden="true" /> : <ChevronUp aria-hidden="true" />}
        </button>

        {open ? (
          <article className="scene-card">
            <div className="scene-presets">
              {SCENES.map((scene) => (
                <button
                  key={scene.id}
                  type="button"
                  className={`scene-chip ${sceneId === scene.id ? "active" : ""}`}
                  onClick={() => applyScene(scene.id)}
                  title={scene.label}
                >
                  <span className="scene-chip-emoji" aria-hidden="true">
                    {scene.emoji}
                  </span>
                  <span>{scene.label}</span>
                </button>
              ))}
            </div>

            <div className="scene-mixer">
              {LAYERS.map((meta) => {
                const Icon = LAYER_ICONS[meta.id];
                const ls = layers[meta.id];
                return (
                  <div key={meta.id} className={`scene-layer ${ls.on ? "on" : ""}`}>
                    <button
                      type="button"
                      className="scene-layer-toggle"
                      aria-pressed={ls.on}
                      onClick={() => toggleLayer(meta.id)}
                      title={`${meta.label} ${ls.on ? "kapat" : "aç"}`}
                    >
                      <Icon aria-hidden="true" size={16} />
                      <span>{meta.label}</span>
                    </button>
                    <input
                      className="scene-layer-slider"
                      type="range"
                      min={0}
                      max={1}
                      step={0.01}
                      value={ls.volume}
                      aria-label={`${meta.label} seviyesi`}
                      onChange={(e) => changeLayerVolume(meta.id, Number(e.target.value))}
                    />
                  </div>
                );
              })}
            </div>

            <label className="scene-master">
              <Volume2 aria-hidden="true" size={15} />
              <span className="sr-only">Genel ses</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={master}
                aria-label="Genel ortam sesi"
                onChange={(e) => changeMaster(Number(e.target.value))}
              />
            </label>

            {!audioLive ? (
              <p className="scene-hint">Bir sahne veya katman seç — ses başlasın.</p>
            ) : null}
          </article>
        ) : null}
      </aside>
    </>
  );
}
