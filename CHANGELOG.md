# Chillout - Yapılan Değişiklikler

## 📁 Dosya: `src/app/page.tsx`

### 1. Sekme Sayısı Azaltıldı
**Eski:**
```typescript
type Tab = "chill" | "pomodoro" | "roller";

const TAB_LABELS: Record<Tab, string> = {
  chill: "Müzik",
  pomodoro: "Pomodoro",
  roller: "Keşfet",
};
```

**Yeni:**
```typescript
type Tab = "pomodoro" | "roller";

const TAB_LABELS: Record<Tab, string> = {
  pomodoro: "Pomodoro",
  roller: "Keşfet",
};
```

### 2. Varsayılan Sekme Değiştirildi
**Eski:** `const [activeTab, setActiveTab] = useState<Tab>("chill");`
**Yeni:** `const [activeTab, setActiveTab] = useState<Tab>("roller");`

### 3. "Chill" Sekmesi Tamamen Kaldırıldı
- Chill sekmesi ve içeriği silindi
- Müzik artık sadece alttaki sabit panelden kontrol ediliyor

---

## 📁 Dosya: `src/components/PomodoroTimer.tsx`

### 1. Dairesel Progress Ring Eklendi
**Eski:** Yatay ilerleme çubuğu
**Yeni:** SVG ile dairesel progress ring + gradient renkler

**Eklenen kod:**
```typescript
const circumference = 2 * Math.PI * 120;
const strokeDashoffset = circumference - (progress / 100) * circumference;
```

**SVG yapısı:**
```tsx
<svg className="pomodoro-ring" viewBox="0 0 260 260">
  <defs>
    <linearGradient id="gradient-focus" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stopColor="#70f2c6" />
      <stop offset="100%" stopColor="#ffd36d" />
    </linearGradient>
    ...
  </defs>
  <circle className="ring-bg" ... />
  <circle className={`ring-progress ${phase}`} ... />
</svg>
```

### 2. Yazılar Kaldırıldı
- "Klasik Pomodoro" başlığı kaldırıldı
- Açıklama paragrafı kaldırıldı
- Sadece süre ve faz (Odak/Dinlenme) gösteriliyor

---

## 📁 Dosya: `src/app/globals.css`

### 1. Pomodoro Stilleri Eklendi
```css
.pomodoro-card { ... }
.pomodoro-circle-wrap { ... }
.pomodoro-ring { ... }
.ring-bg { ... }
.ring-progress { ... }
.ring-progress.focus { stroke: var(--accent-mint); }
.ring-progress.break { stroke: var(--accent-sun); }
.pomodoro-center { ... }
.pomodoro-time { ... }
.pomodoro-phase { ... }
```

### 2. Responsive Stiller
```css
@media (max-width: 640px) {
  .pomodoro-circle-wrap { width: 240px; height: 240px; }
  .pomodoro-time { font-size: 2.6rem; }
}
```

---

## 📁 Dosya: `src/components/AudioPlayer.tsx`

### 1. Dışarı Tıklama Hook'u Eklendi
```typescript
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
```

### 2. Ses Çubuğu Otomatik Kapanma
**Eski:** Ses çubuğu açık kalıyordu, manuel kapatma gerekiyordu

**Yeni:** 
- Ses ayarlandıktan sonra (`onMouseUp` / `onTouchEnd`) otomatik kapanıyor
- Çubuğun dışına tıklayınca (`useClickOutside`) kapanıyor

```typescript
const volumeRef = useRef<HTMLDivElement>(null);
useClickOutside(volumeRef, () => setIsVolumeOpen(false));

// Input'a eklendi:
onMouseUp={() => setIsVolumeOpen(false)}
onTouchEnd={() => setIsVolumeOpen(false)}
```

---

## 📁 Dosya: `src/components/SiteRoller.tsx`

### 1. Buton Konumu Değişti
**Eski:** Butonlar "Kaynak" dropdown'unun yanındaydı
```tsx
<div className="inline-controls">
  <select>...</select>
  <button>Rastgele Seç</button>
  <button>Seçili Siteyi Aç</button>
</div>
```

**Yeni:** Butonlar seçili sitenin kartının içinde
```tsx
<section className="roll-highlight">
  <h3>{selectedSite.name}</h3>
  <p>{selectedSite.description}</p>
  <p className="meta-line">Kaynak: ...</p>
  <div className="roll-actions">
    <button>Rastgele Seç</button>
    <button>Seçili Siteyi Aç</button>
  </div>
</section>
```

---

## 📁 Dosya: `src/data/discoverySites.ts`

### 1. Site Sayısı Artırıldı
**Eski:** 35 site
**Yeni:** 79 site

### 2. Yeni Eklenen Siteler (44 adet):

**Keşif & Öğrenme:**
- GeoGuessr - Street View'da yer tahmini oyunu
- The Pudding - Veri gazeteciliği hikayeleri
- The Wiki Game - Wikipedia yarışması
- MapCrunch - Rastgele Street View gezisi
- Scale of the Universe - Boyut karşılaştırması
- 100,000 Stars - Galaksi keşfi
- Earth Nullschool - Canlı rüzgar haritası
- Every Second - Canlı istatistikler
- Internet Live Stats - İnternet sayaçları
- The Secret Door - Rastgele yer keşfi
- Wait But Why - Derin yazılar
- xkcd - Bilim çizgi romanı
- Astronomy Picture (APOD) - NASA günlük uzay fotoğrafı
- Music-Map - Müzik keşif haritası
- Behind the Name - İsim kökenleri
- Tinkercad - 3D tasarım ve devre simülasyonu
- Blitzortung - Canlı yıldırım haritası
- NASA Eyes - Uzay araçları takibi
- StumbleUpon - Rastgele site atlama
- Wayback Machine - İnternet arşivi
- Webamp - Retro Winamp simülatörü
- GifCities - Retro GIF arşivi
- My Retro TVs - Retro TV kanalları

**Oyun & Eğlence:**
- Agar.io - Hücre büyütme oyunu
- Slither.io - Yılan oyunu
- Skribbl.io - Çizim tahmin oyunu
- Line Rider - Çizgi kaykayı
- Quick Draw - Google çizim tahmini
- Little Alchemy / Little Alchemy 2 - Element birleştirme
- Incredibox - Beatbox müzik yapma
- Bored Button - Rastgele oyunlar
- HackerTyper - Sahte hacker ekranı
- Draw a Stickman - Çizim hikayesi
- 19 Questions - Yapay zeka tahmin oyunu
- Drawception - Çizim telefonu oyunu
- GeoGuessr - Coğrafya tahmini

**Rahatlatıcı:**
- Window Swap - Dünya pencereleri
- A Soft Murmur - Ortam sesleri
- This Is Sand - Kum sanatı
- Mondrian and Me - Modern sanat
- Pixel Thoughts - 60 saniyelik meditasyon
- Rainy Mood - Yağmur sesleri
- Paper Planes - Sanal kağıt uçak
- Music for Programming - Odaklanma müziği
- Ambient Mixer - Ortam ses karıştırıcı
- Sandspiel - Fizik simülasyonu
- Orb.Farm - Ekosistem simülasyonu
- Fidget - Online stres çarkı
- Weave Silk - Işık çizimleri
- Multiplication Table - Çarpım tablosu sanatı
- Zoomquilt - Sonsuz zoom deneyimi
- Koalas To The Max - Sürpriz görsel

**Şaşırtıcı:**
- Scream Into The Void - Çığlık atma
- Zombo - Absürt deneyim
- Pointer Pointer - İmleç takibi
- Staggering Beauty - Hareketli deneyim
- The Useless Web - Gereksiz siteler
- Cat Bounce - Zıplayan kediler
- Long Doge Challenge - Sonsuz Doge
- Falling Falling - Sonsuz düşüş
- Heeeeeey - Nostaljik site
- Pug In A Rug - Pug döngüsü
- OMFG Dogs - Koşan köpekler
- Is It Raining? - Basit yağmur kontrolü
- People In Space - Uzayda kaç kişi var
- Explosm/Cyanide & Happiness - Kara mizah çizgi roman

**Keşif (Eski):**
- EarthCam - Canlı dünya kameraları
- Radio Garden - Dünya radyoları
- FutureMe - Gelecekteki kendine mektup
- Neal.fun - İnteraktif deneyimler
- Patatap - Klavye müzik performansı
- The Wiki Game - Wikipedia yarışması

---

## 📁 Dosya: `README.md`

### Sadeleştirildi
**Eski:** 68 satır, detaylı kurulum talimatları
**Yeni:** 27 satır, temel bilgiler

```markdown
# Chillout

Müzik, odaklanma ve keşif.

## Başlangıç

```bash
npm install
cp .env.example .env.local
npm run dev
```

## Firebase (sohbet için)

1. Firebase Console'da proje aç
2. Authentication > Google aktif et
3. Firestore Database oluştur
4. `.env.local` içine değerleri gir

## Müzik

MP3 dosyalarını `public/music/` klasörüne koy.
```

---

## 📁 Dosya: `src/app/layout.tsx`

### Metadata Güncellendi
**Eski:**
```typescript
title: "Chillout Hub",
description: "Müzik, 25/5 pomodoro, dinlenme sohbeti ve rastgele ilginç web siteleri ile kafa dağıtma platformu.",
```

**Yeni:**
```typescript
title: "Chillout",
description: "Müzik, odaklanma ve keşif.",
```

---

## Özet

| Özellik | Eski | Yeni |
|---------|------|------|
| **Sekme Sayısı** | 3 (Müzik, Pomodoro, Keşfet) | 2 (Keşfet, Pomodoro) |
| **Varsayılan Sekme** | Müzik | Keşfet |
| **Pomodoro** | Yatay çubuk | Dairesel ring |
| **Site Sayısı** | 35 | 79 |
| **Ses Çubuğu** | Sabit kalıyordu | Otomatik kapanıyor |
| **SiteRoller Butonları** | Üstte yan yana | Seçili site kartının içinde |
