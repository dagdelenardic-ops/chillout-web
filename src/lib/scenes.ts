import type { LayerId } from "./ambient";

export type SceneId = "rain" | "beach" | "fire" | "forest" | "library";

export type Scene = {
  id: SceneId;
  label: string;
  emoji: string;
  // Sahne seçilince açılacak katmanlar ve seviyeleri
  layers: Partial<Record<LayerId, number>>;
  // Ekrana yayılan renk perdesi (mood) — CSS gradient
  veil: string;
};

export const SCENES: Scene[] = [
  {
    id: "rain",
    label: "Yağmurlu Gece",
    emoji: "🌧️",
    layers: { rain: 0.6, wind: 0.28, derin: 0.2 },
    veil:
      "radial-gradient(120% 90% at 50% 0%, rgba(40,72,116,0.42), transparent 60%), linear-gradient(180deg, rgba(12,22,40,0.5), rgba(8,14,26,0.62))",
  },
  {
    id: "beach",
    label: "Sahil",
    emoji: "🌊",
    layers: { waves: 0.62, wind: 0.3 },
    veil:
      "radial-gradient(120% 90% at 50% 100%, rgba(255,196,120,0.3), transparent 55%), linear-gradient(180deg, rgba(28,90,120,0.32), rgba(14,52,74,0.42))",
  },
  {
    id: "fire",
    label: "Şömine",
    emoji: "🔥",
    layers: { fire: 0.6, derin: 0.22 },
    veil:
      "radial-gradient(110% 80% at 50% 100%, rgba(255,138,70,0.34), transparent 58%), linear-gradient(180deg, rgba(46,22,14,0.42), rgba(28,12,8,0.55))",
  },
  {
    id: "forest",
    label: "Orman",
    emoji: "🌲",
    layers: { wind: 0.5, rain: 0.18, derin: 0.16 },
    veil:
      "radial-gradient(120% 90% at 50% 10%, rgba(60,128,86,0.34), transparent 60%), linear-gradient(180deg, rgba(14,34,24,0.42), rgba(8,22,16,0.5))",
  },
  {
    id: "library",
    label: "Kütüphane",
    emoji: "📚",
    layers: { derin: 0.42, rain: 0.12 },
    veil:
      "radial-gradient(120% 90% at 50% 0%, rgba(120,96,64,0.28), transparent 60%), linear-gradient(180deg, rgba(34,28,20,0.4), rgba(22,18,14,0.5))",
  },
];

export function getScene(id: SceneId): Scene | undefined {
  return SCENES.find((s) => s.id === id);
}
