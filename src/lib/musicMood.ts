export type MusicMood = "focus" | "rainy" | "space" | "sleep" | "energy" | "acoustic" | "ambient" | "water" | "fire";

export const MUSIC_MOOD_LABELS: Record<MusicMood, string> = {
  focus: "Odak",
  rainy: "Yağmur",
  space: "Uzay",
  sleep: "Uyku",
  energy: "Enerji",
  acoustic: "Akustik",
  ambient: "Ambiyans",
  water: "Su",
  fire: "Ateş",
};

function normalize(value: string): string {
  return decodeURIComponent(value)
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c");
}

function hasAny(haystack: string, needles: string[]): boolean {
  return needles.some((needle) => haystack.includes(needle));
}

export function inferTrackMoods(filePath: string): MusicMood[] {
  const name = normalize(filePath.split("/").pop() ?? filePath);
  const moods = new Set<MusicMood>();

  if (hasAny(name, ["yagmur", "rain", "firtina", "storm"])) moods.add("rainy");
  if (hasAny(name, ["somine", "fire", "ates", "ember"])) moods.add("fire");
  if (hasAny(name, ["okyanus", "ocean", "dalga", "wave", "kiyi", "sahil", "ada", "beach"])) moods.add("water");
  if (hasAny(name, ["uzay", "space", "yorunge", "orbit", "earth", "dunya", "kristal", "cosmic"])) moods.add("space");
  if (hasAny(name, ["guitar", "gitar", "acoustic", "akustik", "neoclassical", "neo"])) moods.add("acoustic");
  if (hasAny(name, ["funk", "neon", "hiz", "groove", "bass", "hustle"])) moods.add("energy");
  if (hasAny(name, ["meditasyon", "meditation", "teta", "theta", "binaural", "sakin", "sessiz", "kar", "lofi"])) moods.add("sleep");
  if (hasAny(name, ["ambient", "ambiyans", "derin", "deep", "ethereal", "drift", "suruklenme", "minimax"])) moods.add("ambient");

  if (moods.has("ambient") || moods.has("acoustic") || moods.has("rainy") || moods.has("sleep")) moods.add("focus");
  if (moods.size === 0) moods.add("ambient");
  return Array.from(moods);
}

function stableHash(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function pickTrackForMood(paths: string[], mood: MusicMood, seed = "chillout"): string | null {
  if (!paths.length) return null;
  const scored = paths.map((path, index) => {
    const moods = inferTrackMoods(path);
    const score = (moods.includes(mood) ? 100 : 0) + (mood === "focus" && moods.includes("ambient") ? 20 : 0);
    const tie = stableHash(`${seed}:${path}:${index}`);
    return { path, score, tie };
  });
  scored.sort((a, b) => b.score - a.score || a.tie - b.tie || a.path.localeCompare(b.path));
  return scored[0]?.path ?? null;
}
