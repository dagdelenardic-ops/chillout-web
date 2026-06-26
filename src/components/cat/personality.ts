// Kedi karakter & ifade havuzu

export type Personality = "tembel" | "yaramaz" | "meraklı" | "sevecen";

export interface PersonalityConfig {
  id: Personality;
  label: string;
  emoji: string;
  speedMult: number;       // hareket hızı çarpanı
  sleepiness: number;      // 0-1, uyumaya meyil
  curiosity: number;       // 0-1, imleci takip etme meyli
  playfulness: number;     // 0-1, lazer/oyun meyli
  petTolerance: number;    // 1-5, kaç sevgide kızar (yüksek = uysal)
  idleActionRate: number;  // ms cinsinden idle aksiyon aralığı
  bubbleRate: number;      // ms cinsinden konuşma sıklığı
}

export const PERSONALITIES: Record<Personality, PersonalityConfig> = {
  tembel: {
    id: "tembel",
    label: "Tembel",
    emoji: "😴",
    speedMult: 0.78,
    sleepiness: 0.6,
    curiosity: 0.2,
    playfulness: 0.3,
    petTolerance: 5,
    idleActionRate: 5500,
    bubbleRate: 18000,
  },
  yaramaz: {
    id: "yaramaz",
    label: "Yaramaz",
    emoji: "😼",
    speedMult: 1.25,
    sleepiness: 0.15,
    curiosity: 0.7,
    playfulness: 0.9,
    petTolerance: 2,
    idleActionRate: 2400,
    bubbleRate: 9000,
  },
  meraklı: {
    id: "meraklı",
    label: "Meraklı",
    emoji: "🤔",
    speedMult: 1.0,
    sleepiness: 0.2,
    curiosity: 0.95,
    playfulness: 0.55,
    petTolerance: 3,
    idleActionRate: 3200,
    bubbleRate: 11000,
  },
  sevecen: {
    id: "sevecen",
    label: "Sevecen",
    emoji: "😻",
    speedMult: 0.95,
    sleepiness: 0.3,
    curiosity: 0.5,
    playfulness: 0.5,
    petTolerance: 6,
    idleActionRate: 4000,
    bubbleRate: 12000,
  },
};

export function pickPersonality(): Personality {
  const ids: Personality[] = ["tembel", "yaramaz", "meraklı", "sevecen"];
  return ids[Math.floor(Math.random() * ids.length)];
}

// ===== Türkçe konuşma havuzu =====
export const CAT_NAMES = [
  "Pamuk", "Boncuk", "Tekir", "Minnoş", "Şıpsevdi",
  "Ponçik", "Maviş", "Çakıl", "Limon", "Mırnav",
  "Lokum", "Karamel", "Köfte", "Patates", "Zeytin",
  "Mırmır", "Findik", "Pati", "Sarman", "Tombiş",
];

export function pickName() {
  return CAT_NAMES[Math.floor(Math.random() * CAT_NAMES.length)];
}

export type BubbleContext =
  | "hungry"
  | "petted"
  | "sleepy"
  | "bored"
  | "greet"
  | "playful"
  | "annoyed"
  | "curious"
  | "wakeup"
  | "purr"
  | "stretch"
  | "groom"
  | "exit"
  | "thinking"
  | "potty_pre"
  | "potty_post"
  | "zoomies"
  | "tail_chase"
  | "freeze"
  | "loaf"
  | "swat"
  | "slip"
  | "derp";

const BUBBLES: Record<BubbleContext, string[]> = {
  hungry:    ["Acıktım..", "Mama? 🍖", "Mıyaav!", "Karnım zil çalıyor", "Açım yaaa", "Hazır mı?"],
  petted:    ["♥", "Mırrr~", "Daha!", "Aşkım", "Mmmm", "♥♥"],
  sleepy:    ["Zzz", "Uykum geldi 😴", "Mola..", "Bir kestireyim", "Uykuluyum"],
  bored:    ["Sıkıldım..", "Hadi oyna 🐾", "Bir şey yap", "Lazer aç!", "Mıyav?", "Naparız?"],
  greet:    ["Selam!", "Mırnav!", "Hooş geldin", "Buradayım 🐾"],
  playful:  ["Yakaladım! 🎯", "Hop!", "Hihi", "Vurdum!", "Daha hızlı!"],
  annoyed:  ["💢", "Yeter ya", "Bırak beni!", "Cıs!", "Hıh!", "Çekil"],
  curious:  ["Bu ne?", "Hmm..", "Aaa?", "?", "👀"],
  wakeup:   ["Mıyav 🥱", "Erken uyandım", "Aaaah", "Selammm"],
  purr:     ["Mırr mırr", "Mrrrr", "Mırnaaaav"],
  stretch:  ["Aaaah ✨", "Gerinmek lazım", "Şööööyle"],
  groom:    ["Tertemiz olayım", "Yala-yala", "Pati silinsin"],
  exit:     ["Hadi bay 👋", "Görüşürüz", "Gidiyorum", "Sonra gelirim"],
  thinking: ["Düşünüyorum..", "Bir saniye", "🧐", "Hmm?"],
  potty_pre:  ["Bir saniye..", "Tuvaletim geldi 🚽", "Bakma şimdi", "İzin ver", "Müsait yer arıyorum"],
  potty_post: ["Oh be 😌", "Hafifledim", "Görmedin sayılır", "Hadi temizle 🧹", "Şimdi daha iyi"],
  // SILLY contexts (separate keys for variety)
  zoomies:    ["ZOOMIES! 🏎️", "FRRRRRRR", "ÇIK ÇIK ÇIK!", "AAAAAAA!", "HOPPALA!", "NEDEN??"],
  tail_chase: ["Yakala!", "Hop hop hop!", "Bu kim?!", "ALMOST!", "Lan dur!"],
  freeze:     ["👁️_👁️", "Ne o?!", "...", "Bekle", "Duydun mu?", "Dur bir dakika"],
  loaf:       ["🍞 mod aktif", "Ekmek olduum", "Yumuşacığım", "Mıv", "Kıyak"],
  swat:       ["VURDUM!", "Cıss!", "HOP!", "Çık çık!", "Şıp!"],
  slip:       ["Aaaa!", "Hop! 😵", "Yere bak!", "Pardon", "Düştüm yaa"],
  derp:       ["Ne yapıyorum ben", "💀", "??!", "Wjd?", "Aklımı yedim", "Beynim erimiş"],
};

export function pickBubble(ctx: BubbleContext): string {
  const list = BUBBLES[ctx];
  return list[Math.floor(Math.random() * list.length)];
}
