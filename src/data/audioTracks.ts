export type AudioTrack = {
  id: string;
  title: string;
  file: string;
};

export type TrackCat = "müzik" | "ambiyans" | "8d";

export const audioTracks: AudioTrack[] = [
  { id: "/music/trip.mp3",   title: "Yolculuk", file: "/music/trip.mp3" },
  { id: "/music/sour.mp3",   title: "Ekşi",     file: "/music/sour.mp3" },
  { id: "/music/sleek.mp3",  title: "Pürüzsüz", file: "/music/sleek.mp3" },
];

/* Dosya adı → görünen isim + kategori */
export const TRACK_META: Record<string, { title: string; cat: TrackCat }> = {
  // ── 8D ──────────────────────────────────────────────────
  "8D  AirPods ProMax  ANC Music Heaven! #8D.mp3":                 { title: "8D Cennet",           cat: "8d" },
  "8D audio brain massage - the most effective way to relax your mind.mp3": { title: "8D Beyin Masajı", cat: "8d" },

  // ── AMBİYANS ────────────────────────────────────────────
  "ambient_rain_cello.mp3":       { title: "Yağmur & Çello",        cat: "ambiyans" },
  "pure_ambient_rain.mp3":        { title: "Saf Yağmur",            cat: "ambiyans" },
  "Sakin Yağmur.mp3":             { title: "Sakin Yağmur",          cat: "ambiyans" },
  "Yağmur ve Şömine.mp3":         { title: "Yağmur ve Şömine",      cat: "ambiyans" },
  "Yağmurlu Gece.mp3":            { title: "Yağmurlu Gece",         cat: "ambiyans" },
  "earth.mp3":                    { title: "Toprak",                 cat: "ambiyans" },
  "fire.mp3":                     { title: "Ateş",                  cat: "ambiyans" },
  "Okyanus Gecesi.mp3":           { title: "Okyanus Gecesi",        cat: "ambiyans" },
  "Meditasyon.mp3":               { title: "Meditasyon",            cat: "ambiyans" },
  "Kar Sessizliği.mp3":           { title: "Kar Sessizliği",        cat: "ambiyans" },
  "Derin Uzay.mp3":               { title: "Derin Uzay",            cat: "ambiyans" },
  "Orman Sabahı.mp3":             { title: "Orman Sabahı",          cat: "ambiyans" },
  "Gece Fırtınası.mp3":           { title: "Gece Fırtınası",        cat: "ambiyans" },
  "Chillgressive.mp3":            { title: "Chillgressive",         cat: "ambiyans" },
  "Ethereal Depths.mp3":          { title: "Esrarengiz Derinlikler",cat: "ambiyans" },
  "Sessiz Sürüklenme.mp3":        { title: "Sessiz Sürüklenme",     cat: "ambiyans" },
  "Uzak Kıyı.mp3":                { title: "Uzak Kıyı",             cat: "ambiyans" },
  "Minimax Ambient 1.mp3":        { title: "Minimax I",             cat: "ambiyans" },
  "Minimax Ambient 2.mp3":        { title: "Minimax II",            cat: "ambiyans" },
  "Ada.mp3":                      { title: "Ada",                   cat: "ambiyans" },
  "Ada II.mp3":                   { title: "Ada II",                cat: "ambiyans" },
  "sleek.mp3":                    { title: "Pürüzsüz",              cat: "ambiyans" },
  "vleek.mp3":                    { title: "Vleek",                 cat: "ambiyans" },
  "trip.mp3":                     { title: "Yolculuk",              cat: "ambiyans" },
  "sour.mp3":                     { title: "Ekşi",                  cat: "ambiyans" },

  // ── MÜZİK ───────────────────────────────────────────────
  "FUNK.mp3":                     { title: "FUNK",                  cat: "müzik" },
  "Acoustic & Bass Guitar.m4a":   { title: "Akustik & Bas",         cat: "müzik" },
  "Ambient III - Creative Common.m4a": { title: "Ambient III",      cat: "müzik" },
  "Escape+From+Istanbul.m4a":     { title: "İstanbul'dan Kaçış",    cat: "müzik" },
  "Midnight+Groove.mp3":          { title: "Gece Yarısı Groove",    cat: "müzik" },
  "Neoclassical Guitar Chords.mp3": { title: "Neoklasik Gitar",     cat: "müzik" },
  "Neon Hustle.mp3":              { title: "Neon Koşusu",           cat: "müzik" },
  "Güneşe Türküler Yakma.mp3":    { title: "Güneşe Türküler",       cat: "müzik" },
  "Kus1.mp3":                     { title: "Kuş",                   cat: "müzik" },
  "Gittikten Sonra.mp3":          { title: "Gittikten Sonra",       cat: "müzik" },
  "Dünyanın Eğimi.mp3":           { title: "Dünyanın Eğimi",        cat: "müzik" },
  "Kır.mp3":                      { title: "Kır",                   cat: "müzik" },
  "hızhızhız.mp3":                { title: "Hız³",                  cat: "müzik" },
  "bass song 2.mp3":              { title: "Bas II",                cat: "müzik" },
  "bass song I.mp3":              { title: "Bas I",                 cat: "müzik" },
  "Tutto Passa Ver 2.mp3":        { title: "Her Şey Geçer",         cat: "müzik" },
};

export function trackDisplayTitle(filePath: string): string {
  const raw = filePath.split("/").pop() ?? filePath;
  const filename = decodeURIComponent(raw);
  return TRACK_META[filename]?.title ?? filename.replace(/\.[^.]+$/, "");
}

export function trackCat(filePath: string): TrackCat {
  const raw = filePath.split("/").pop() ?? filePath;
  const filename = decodeURIComponent(raw);
  return TRACK_META[filename]?.cat ?? "müzik";
}
