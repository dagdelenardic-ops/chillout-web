import type { SceneId } from "@/lib/scenes";
import type { MusicMood } from "@/lib/musicMood";

export type RitualTab = "kesfet" | "pomodoro" | "sohbet" | "nefes" | "oku" | "yilan" | "bulmaca";

export type RitualStepKind = "scene" | "music" | "breath" | "focus" | "read" | "discover" | "play";

export type RitualStep = {
  kind: RitualStepKind;
  label: string;
  detail: string;
  minutes?: number;
};

export type ChillRitual = {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  durationMin: number;
  tab: RitualTab;
  sceneId: SceneId | null;
  musicMood: MusicMood;
  breathPatternKey?: "box" | "478" | "calm" | "energy";
  pomodoroFocusMin?: number;
  discoveryVibe?: "rahatlatici" | "sasirtici" | "oyunlu" | "kesif";
  catLinePool: string[];
  steps: RitualStep[];
};

export const rituals: ChillRitual[] = [
  {
    id: "deep-focus",
    title: "Derin Odak",
    subtitle: "Kütüphane + sakin track + domates",
    description: "Tek hedefe gömülmek için kütüphane ambiyansı, düşük yoğunluklu müzik ve 25 dakikalık odak akışı.",
    durationMin: 25,
    tab: "pomodoro",
    sceneId: "library",
    musicMood: "focus",
    pomodoroFocusMin: 25,
    catLinePool: [
      "Derin odak açıldı. Ben kapıda nöbetteyim.",
      "Kütüphane modu: pati sesi bile yok.",
      "Bir domateslik sessizlik. Hadi işi parçalayalım.",
    ],
    steps: [
      { kind: "scene", label: "Kütüphane", detail: "Derin + hafif yağmur katmanları" },
      { kind: "music", label: "Odak müziği", detail: "Ambient, gitar veya düşük tempolu parça" },
      { kind: "focus", label: "25 dk odak", detail: "Pomodoro sekmesine geç", minutes: 25 },
    ],
  },
  {
    id: "reset-breath",
    title: "Kafa Boşalt",
    subtitle: "4·7·8 nefes + sahil + kısa okuma",
    description: "Zihin fazla sekme açtıysa önce nefes, sonra yumuşak bir okuma molası.",
    durationMin: 8,
    tab: "nefes",
    sceneId: "beach",
    musicMood: "water",
    breathPatternKey: "478",
    catLinePool: [
      "Kafa boşaltma başladı. Sekmeleri içerden kapatıyoruz.",
      "Nefesleri sayıyorum, sen sadece halkayı izle.",
      "Dalga geldi, düşünce gitti.",
    ],
    steps: [
      { kind: "scene", label: "Sahil", detail: "Dalga + hafif rüzgâr" },
      { kind: "breath", label: "4·7·8", detail: "Nefes sekmesinde rahatlama paterni", minutes: 2 },
      { kind: "read", label: "Kısa okuma", detail: "Oku sekmesinden bir kart" },
    ],
  },
  {
    id: "night-drift",
    title: "Geceye Süzül",
    subtitle: "Yağmurlu gece + 8D/uzay + yavaşlama",
    description: "Gece ekranını kıs, yağmuru aç, ritmi düşür. Uyku öncesi dijital iniş pisti.",
    durationMin: 12,
    tab: "nefes",
    sceneId: "rain",
    musicMood: "sleep",
    breathPatternKey: "calm",
    discoveryVibe: "rahatlatici",
    catLinePool: [
      "Gece modu. Miyav sesi bile lo-fi.",
      "Yağmuru açtım, dünya biraz uzaklaştı.",
      "Yavaşlıyoruz. Panik yok, sadece gece.",
    ],
    steps: [
      { kind: "scene", label: "Yağmurlu Gece", detail: "Yağmur + derin katman" },
      { kind: "music", label: "Uykuya yakın track", detail: "8D, uzay, teta veya sakin yağmur" },
      { kind: "breath", label: "Sakin 4·6", detail: "Nefes verişi uzat", minutes: 5 },
    ],
  },
  {
    id: "creative-wander",
    title: "Yaratıcı Mola",
    subtitle: "Orman + şaşırtıcı keşif + kedi yorumu",
    description: "Fikir kuruduysa üretmeye çalışma; merak motorunu yak. Bir tuhaf site, bir kısa okuma, bir geri dönüş.",
    durationMin: 10,
    tab: "kesfet",
    sceneId: "forest",
    musicMood: "ambient",
    discoveryVibe: "sasirtici",
    catLinePool: [
      "Yaratıcı mola: beynin arka bahçesine giriyoruz.",
      "Bir tuhaf kapı açalım. Belki fikir oradadır.",
      "Merak patilerim hazır.",
    ],
    steps: [
      { kind: "scene", label: "Orman", detail: "Rüzgâr + derin" },
      { kind: "discover", label: "Şaşırtıcı keşif", detail: "Keşfet sekmesinde tuhaf bir köşe" },
      { kind: "read", label: "Bir kısa metin", detail: "Oku kartı ile kapanış" },
    ],
  },
  {
    id: "micro-break",
    title: "Mini Mola",
    subtitle: "2 dk nefes + 1 bilmece + geri dön",
    description: "Toplantı arası, kod build beklerken veya kafan ısınınca kısa reset.",
    durationMin: 3,
    tab: "bulmaca",
    sceneId: "fire",
    musicMood: "acoustic",
    breathPatternKey: "box",
    discoveryVibe: "rahatlatici",
    catLinePool: [
      "Mini mola. Kaçak değil, bakım arası.",
      "Üç dakika dünyayı yıkmaz. Hatta seni toplar.",
      "Kısa mola geldi, pati onaylı.",
    ],
    steps: [
      { kind: "breath", label: "2 dk nefes", detail: "Kutu nefesiyle ritim" },
      { kind: "discover", label: "Bir sakin köşe", detail: "Rahatlatıcı keşif" },
      { kind: "play", label: "Bir bilmece", detail: "Cevabı açıp dön" },
    ],
  },
];

export function getRitualById(id: string): ChillRitual | undefined {
  return rituals.find((ritual) => ritual.id === id);
}
