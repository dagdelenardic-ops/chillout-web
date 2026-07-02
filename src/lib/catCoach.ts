import type { RitualTab } from "@/data/rituals";

export type CatCoachInput = {
  focusToday: number;
  likedDiscoveries: number;
  hour: number;
  activeTab?: RitualTab;
};

export type CatCoachSuggestion = {
  id: string;
  kind: "focus" | "calm" | "play" | "read" | "night";
  title: string;
  reason: string;
  ritualId: string;
  catLine: string;
};

const SUGGESTIONS: Record<CatCoachSuggestion["kind"], CatCoachSuggestion> = {
  focus: {
    id: "coach-focus",
    kind: "focus",
    title: "Bir domateslik odak",
    reason: "Bugün odak sayacı boşsa en değerli hamle küçük bir başlangıç.",
    ritualId: "deep-focus",
    catLine: "Bence bir domates basalım. Ben kapıda beklerim.",
  },
  calm: {
    id: "coach-calm",
    kind: "calm",
    title: "İki dakikalık nefes reseti",
    reason: "Sekme sekme geziyorsan nefesi merkeze alıp sistemi soğut.",
    ritualId: "reset-breath",
    catLine: "Biraz nefes. Sonra yine dünyayı yakarız.",
  },
  play: {
    id: "coach-play",
    kind: "play",
    title: "Yaratıcı kaçamak",
    reason: "Zaten çalışmışsın; merak tarafını beslemek daha iyi döner.",
    ritualId: "creative-wander",
    catLine: "Çok çalıştın. Şimdi tuhaf bir kapı açalım mı?",
  },
  read: {
    id: "coach-read",
    kind: "read",
    title: "Bir kısa okuma",
    reason: "Ekran yorgunluğunu kısa metinle yumuşat.",
    ritualId: "micro-break",
    catLine: "Bir kısa okuma iyi gider. Ben omzundan bakarım.",
  },
  night: {
    id: "coach-night",
    kind: "night",
    title: "Geceye yumuşak iniş",
    reason: "Saat geçse ritmi düşürmek kazançtır.",
    ritualId: "night-drift",
    catLine: "Gece modu iyi fikir. Pati freni çekiyorum.",
  },
};

export function pickCatCoachSuggestions(input: CatCoachInput): CatCoachSuggestion[] {
  const out: CatCoachSuggestion[] = [];
  const isNight = input.hour >= 22 || input.hour < 6;

  if (input.focusToday >= 2 && input.likedDiscoveries >= 3) out.push(SUGGESTIONS.play);
  if (isNight) out.push(SUGGESTIONS.night);
  if (input.focusToday <= 0) out.push(SUGGESTIONS.focus);
  if (input.activeTab === "kesfet" || input.likedDiscoveries === 0) out.push(SUGGESTIONS.calm);
  out.push(SUGGESTIONS.read);

  const seen = new Set<string>();
  return out.filter((suggestion) => {
    if (seen.has(suggestion.id)) return false;
    seen.add(suggestion.id);
    return true;
  }).slice(0, 3);
}
