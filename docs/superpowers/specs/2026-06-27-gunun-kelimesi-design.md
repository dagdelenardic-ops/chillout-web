# Gunun Kelimesi — Tasarim Spec

Chillout-web'in mevcut "Bulmaca" sekmesini, herkese ayni gun ayni kelimeyi sunan, her gece yerel saatle sifirlanan Wordle tarzi gunluk bir Turkce kelime oyununa ("Gunun Kelimesi") evriltiyoruz. Hedef kitle: **halka acik** siteyi tekrar tekrar ziyaret eden yabancilar; optimize edilen kitle **geri donen yabancilar**. Geri donus dongusu **gunluk ritueli** kuruyor ("herkese ayni sey, her gun sifirlanir"): 5 harf, 6 tahmin, gun icinde tek bilmece, gece sifirlanir. v1 tamamen istemci tarafinda calisir (sifir backend, login yok); gunun kelimesi tarihten deterministik turetilir, seri ve istatistikler localStorage'da tutulur, sonuc spoiler'siz emoji izgara olarak panoya kopyalanir. Bu, dusuk surtunmeyle viral paylasilabilir ve her gun geri gelmeyi odullendiren bir "tek oturus" deneyimi yaratir.

Sekme etiketi: **"Kelime"**. In-game baslik: **"Gunun Kelimesi"**.

---

## 1. Amac ve Basari Kriterleri

**Amac.** Halka acik chillout-web'e, yabancilarin her gun geri donmesini saglayan tek bir guclu "kanca" eklemek. Kanca = gunluk rituel: tek kelime, herkese ayni, her gun sifir.

**Tasarim ilkeleri.**
- v1 = SOLID MVP, %100 istemci tarafi, sifir backend, login yok, network yok, Firebase yok, SSR-guvenli.
- Deterministik: gunun kelimesi sadece yerel takvim tarihinden turetilir; ayni gun herkeste ayni kelime cikar.
- Dusuk surtunme paylasim: spoiler'siz emoji izgara, tek tikla panoya.
- Mevcut tasarim diline tam uyum: yeni CSS token uretmeden `globals.css` mint/sun paletini yeniden kullan.
- Tum yeni dosyalar `eslint . --max-warnings=0` kapisindan **uyarisiz** gecmeli (projedeki tek kalite kapisi; bkz. §9, §11).

**Somut basari kriterleri (retention odakli).**
1. Bir ziyaretci oyunu bitirdiginde (kazan/kaybet) sonuc kartinda **"yarinki kelimeye kalan sure" geri sayimi** gorur — ertesi gun geri gelmesi icin acik cagri.
2. Kazanan oyuncu **tek tikla** spoiler'siz sonucu panoya kopyalayabilir (viral dongu).
3. Geri donen oyuncuda **seri ("🔥 N gun")** hero rozetinde gorunur ve oyunun bitisiyle (kazan **veya** kaybet) reload olmadan guncellenir.
4. Ayni gun ikinci ziyarette oyun **yeniden oynanamaz**; tamamlanmis tahta + sonuc karti + geri sayim gosterilir (gunluk rituel butunlugu). Yarim kalan oyun ise **devam ettirilir** (resume).
5. localStorage kapali/private modda bile oyun **cokmeden** oynanir (o oturumda seri/istat tutulamaz, oyun calisir).
6. "Kelime" sekmesi **varsayilan sekme**dir; site acilisinda ilk gorulen yuzdur.

---

## 2. Kullanici Akisi

**Ilk kez gelen yabanci.**
1. Siteyi acar; varsayilan sekme **"Kelime"** (in-game baslik "Gunun Kelimesi"). Hero alaninda seri rozeti gosterilmez (ilk SSR boyamasinda seri 0; mount sonrasi okunur, hala 0 ise rozet yok — bkz. §3 hidrasyon notu).
2. 6x5 bos izgara + Turkce ekran klavyesi gorur. Kisa altyazi: "Gunun 5 harfli kelimesini 6 hakta bul."
3. Fiziksel klavye veya ekran klavyesiyle 5 harf yazar, Enter'a basar.
4. Gecersiz kelime ise satir **shake** animasyonu + `aria-live` ile "Listede yok" uyarisi; tahmin tuketilmez.
5. Gecerli tahmin ise satir **flip** animasyonuyla renklenir (yesil/sari/koyu) ve klavye tuslari guncellenir.

**Kazanma.** Dogru kelimede son satir yesile doner, kisa kutlama animasyonu (`kelime-pop`) olur. Tamamlama isleyicisi su sirayla calisir (kritik sira, bkz. §3 ve §7):
1. son `KelimeState` hesaplanir, `writeKelimeState(...)`,
2. `stats = applyResult(...)` + `writeKelimeStats(stats)`,
3. `window.dispatchEvent(new CustomEvent("kelime:streak"))` (hero rozeti tetigi — stats yazildiktan **sonra**),
4. `window.dispatchEvent(new CustomEvent("kelime:win", { detail: { word, streak } }))` (yalniz kazanmada; cat kutlamasi tetigi).
Sonuc karti acilir: tebrik + istatistik (oynanan, kazanma %, mevcut seri, en uzun seri) + geri sayim + **"Paylas"** butonu. (Tahmin dagilimi histogrami v2'ye ertelendi — bkz. §10.)

**Kaybetme.** 6. yanlis tahminden sonra ayni tamamlama sirasi calisir, **fark sudur:** adim 4 (`kelime:win`) ATILMAZ; adim 3 (`kelime:streak`) **yine atilir** ki seri 0'a dustugunde hero rozeti reload olmadan **gizlenebilsin**. Sonuc kartinda **dogru kelime acikca gosterilir** ("Kelime: KAYAK"), seri sifirlanir, ayni istatistik/geri sayim/Paylas gosterilir.

**Paylasma.** "Paylas" → `navigator.clipboard.writeText(buildShare(...))`; buton metni kisa sure "Kopyalandi!" olur. Panodaki metin spoiler'siz emoji izgara + baslik + URL.

**Ertesi gun geri donus.** Yerel tarih degisince `kelime:state` icindeki `date` bugune uymaz → `readKelimeState` `null` doner → taze tahta. Seri korunmustur (dun oynanmissa). Yeni gunun kelimesi farklidir.

**Ayni gun tekrar ziyaret.** `kelime:state.date === bugun` ve `status !== "playing"` → oyun **kilitli**: tamamlanmis tahta + sonuc karti dogrudan render edilir, giris kapali. `status === "playing"` ise yarim kalan tahta ve klavye durumu **devam ettirilir** (resume; renkler depolanmaz, `evaluateGuess` ile yeniden uretilir — bkz. §3, §8).

---

## 3. Mimari ve Bilesenler

Tum yollar `/Users/gurursonmez/Documents/chillout-web/` altinda (gercek proje burasi; `Downloads/chillout-web` yalnizca bos `.claude/` icerir).

### Yeni dosyalar

**`src/data/kelimeler.ts`** — Veri.
Sorumluluk: iki kelime havuzu. Repo konvansiyonu (named `const`, plain `string[]`, `readonly`/`as const` YOK, Turkce yorum basligi — bkz. `audioTracks.ts`, `discoverySites.ts`).
```ts
export const kelimeCevaplari: string[];   // gunun cevabi olabilecek, adil/yaygin, canonical UPPERCASE
export const gecerliKelimeler: string[];  // oyuncunun yazabilecegi TUM gecerli tahminler; cevaplarin ust kumesi
```
Kurallar: tum kelimeler **canonical UPPERCASE** (bkz. §4 `normalizeTr`), tam 5 harf (`[...normalizeTr(w)].length === 5`), `gecerliKelimeler` `kelimeCevaplari`'ni kapsar (`...kelimeCevaplari` spread). Tuketici tarafta `new Set(gecerliKelimeler)` ile O(1) dogrulama. Veri kalitesi blocker'i §11'de; kontrol testi §9 `kelimeler.test.ts`'de.

**`src/lib/kelimeLogic.ts`** — Saf oyun mantigi (test edilen cekirdek, React'siz, DOM'suz).
```ts
export type Durum = "dogru" | "yer" | "yok";
export const TR_UPPER: Record<string, string>;
export const TR_ALPHABET: Set<string>;
export function normalizeTr(s: string): string;            // NFC + acik Turkce buyuk-harf esleme; alfabe disi DUSURULUR
export function evaluateGuess(guess: string, answer: string): Durum[];  // iki gecisli, duplikat-harf dogru
export function isValidGuess(guess: string, valid: Set<string>): boolean;
export function dayNoFor(date: Date): number;              // PAYLASILAN yardimci — gun numarasi
export function dailyIndex(date: Date, poolLength: number): number;     // dayNoFor → mod
export function puzzleNo(date: Date): number;              // dayNoFor + 1
```
**Paylasilan `dayNoFor` yardimcisi (kritik — divergens onleme).** Hem `dailyIndex` hem `puzzleNo`, `dayNo`'yu bagimsiz hesaplamaz; ikisi de tek `dayNoFor(date)` yardimcisini cagirir. Boylece biri duzenlense bile ikisi tutarli kalir.
```ts
const EPOCH = Date.UTC(2026, 5, 27);                       // YEREL launch gunu = puzzle #1 (bkz. §11.3)
function dayNoFor(date: Date): number {
  const local = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()); // gun bileseni YEREL
  return Math.floor((local - EPOCH) / 86400000);
}
function dailyIndex(date, L) { const d = dayNoFor(date); return ((d % L) + L) % L; } // negatif-guvenli
function puzzleNo(date)      { return dayNoFor(date) + 1; }
```
Gun bileseni **yerel** tarihten (`getFullYear/getMonth/getDate`) alinir ki gun sifirlamasi kullanicinin yerel gece yarisinda olsun; `Date.UTC(...)` yalnizca tam-gun farkini DST'den etkilenmeden hesaplamak icin.

**`src/lib/kelimeStorage.ts`** — SSR-guvenli kaliciligi (mevcut `readStored*` deseni; bkz. `AudioPlayer.readStoredAudioState`, `SnakeDonerGame.readBestScoreFromStorage`).
```ts
export type KelimeState = { v: 1; date: string; answer: string; guesses: string[]; status: "playing"|"won"|"lost" };
export type KelimeStats = { v: 1; played: number; wins: number; currentStreak: number; maxStreak: number;
  lastCompletedDate: string; guessDistribution: Record<number, number> };
export function todayKey(d?: Date): string;                  // "YYYY-MM-DD" yerel
export function dayDiff(a: string, b: string): number;       // iki "YYYY-MM-DD" arasi gun farki (UTC-parse, DST-bagimsiz)
export function readKelimeState(today: string): KelimeState | null;  // date !== today ise null
export function writeKelimeState(s: KelimeState): void;      // window yoksa no-op
export function clearKelimeState(): void;                    // resume gecersizse state'i sil
export function readKelimeStats(): KelimeStats;              // SSR/parse hatasi/eksikte sifir default (6 kova 0)
export function writeKelimeStats(s: KelimeStats): void;
export function applyResult(stats: KelimeStats, today: string, won: boolean, tries: number): KelimeStats;  // seri matematigi, saf
```
**`lastPlayedDate` KALDIRILDI (kritik sadelestirme).** Tek tarih alani `lastCompletedDate` hem cift-sayim korumasi (erken-return) hem seri "dun mu" hesabi icin yeterli; iki alanin ayni isi iddia etmesi (write-only dead field) onlendi.

Anahtarlar: **`kelime:state`** ve **`kelime:stats`** (kolon namespace; baskin `chillout_*_v1` stiline alternatif olarak secildi ve burada sabitlendi). Her okuma `if (typeof window === "undefined") return <default>;` ile baslar, `JSON.parse` try/catch icinde, alanlar yeniden dogrulanir; `v !== 1` veya alan eksikse default'a duser. `readKelimeStats` default'u **alti kovayi da 0 ile init eder** (`{1:0,2:0,3:0,4:0,5:0,6:0}`) ki `guessDistribution[tries]` hicbir zaman `undefined++` → `NaN` uretmesin (bkz. §5).

**`src/lib/kelimeShare.ts`** — Paylasim metni (saf).
```ts
export const PAYLAS_URL: string;                            // tek kaynakli URL sabiti (bkz. §11.2)
export function buildShare(puzzleNo: number, rows: Durum[][], solved: boolean): string;
```
Format: `Gunun Kelimesi #<n> <tries>/6` (kayipta `X/6`), bos satir, emoji izgara (🟩=dogru, 🟨=yer, ⬛=yok), bos satir, `PAYLAS_URL`. **Marka stringi `Gunun Kelimesi`** — in-game basligiyla birebir uyumlu; bu, GROUNDING'deki `Chillout Kelime` etiketini **ezer** (tek marka, tek string). URL inline degil, `PAYLAS_URL` sabitinde; produksiyon domain'i netlesince tek satir guncellenir (bkz. §11.2).

**`src/components/KelimeOyunu.tsx`** — Hero oyun bileseni (`"use client"`, named export `KelimeOyunu`, prop yok).
Sorumluluk: tum UI + durum makinesi; saf mantigi `kelimeLogic`/`kelimeStorage`/`kelimeShare`'den cagirir.
- **Hidrasyon-guvenli mount (KRITIK — SSR tuzagi).** `useState` initializer'i **SSR-guvenli default** ile baslatilir (bos tahta, seri 0). Gercek `localStorage` okumasi `useEffect` icinde, **mount sonrasi** yapilir — `CatCompanion` deseninin aynisi (`const [mounted, setMounted] = useState(false)`; mount efektinde `setMounted(true)` + storage okumasi; `mounted` `false` iken oyun yuzeyi `null` veya iskelet render edilir). `useState(() => readKelimeState(today))` **kullanilmaz** — initializer sunucuda da calisir (default doner) ve istemcide (stored doner) farkli sonuc verir → React 19 hidrasyon hatasi. Tahta ve seri ilk paint'te gorunur oldugundan bu, "dev'de calisir, prod'da patlar" sinifindan gercek bir hatadir; mount-sonrasi okuma zorunludur.
- Kazanma/kaybetmede §2'deki tamamlama sirasi uygulanir.
- **Resume renk yeniden uretimi.** Mount sonrasi `state.answer` bugunku deterministik cevapla esitse, depolanan her `guess` icin `evaluateGuess(guess, answer)` yeniden cagrilir; tile renkleri ve klavye tus durumlari bu tureyen `Durum[]`'lerden hesaplanir (renkler **depolanmaz**, deterministik olarak yeniden uretilir). Klavye "en iyi durum" onceligi (yesil > sari > koyu) tum satirlardan hesaplanir.
- Iceride 6x5 izgara, Turkce klavye, sonuc karti, geri sayim. Geri sayim `setInterval` `useEffect` cleanup'inda `clearInterval` ile temizlenir; tum efekt bagimliliklari `react-hooks/exhaustive-deps`'i tatmin edecek sekilde yazilir (lint kapisi).

**`src/lib/kelimeLogic.test.ts`**, **`src/lib/kelimeStorage.test.ts`**, **`src/data/kelimeler.test.ts`** — vitest (bkz. §9). Repo'da test altyapisi YOK; hafif kurulum eklenir (bkz. §9 ve §11 — lint etkilesimi).

### Duzenlenen mevcut dosyalar (GROUNDING'e gore tam degisiklikler)

**`src/app/page.tsx`** (satir numaralari GROUNDING'den, dogrulandi):
- **satir 12**: `import { RiddleWidget } from "@/components/RiddleWidget";` → `import { KelimeOyunu } from "@/components/KelimeOyunu";` (RiddleWidget baska yerde kullanilmiyor → bu satir degisir).
- **satir 12 sonrasi (yeni import)**: `import { readKelimeStats } from "@/lib/kelimeStorage";` (hero seri cipi icin).
- **satir 17** (union): `type Tab = "pomodoro" | "roller" | "snake" | "kelime" | "oku";`
- **satir 19** (sira): `const TAB_ORDER: Tab[] = ["pomodoro", "roller", "oku", "snake", "kelime"];`
- **satir 20–26** (etiketler): `bulmaca: "Bulmaca"` → `kelime: "Kelime"`.
- **satir 66** (varsayilan): `const [activeTab, setActiveTab] = useState<Tab>("kelime");`
- **`Home()` icinde, indikator state'inden sonra (satir ~73)**: hero seri cipi okuyucusu (asagida).
- **satir 99–109 (hero-left)**: `.hero-badge`'in kapanan `</div>`'inden (satir 104) sonra cip JSX'i eklenir (asagida).
- **satir 165–177** (panel dali): tum `bulmaca` blogu (bulmaca-hero/grid + 4x `RiddleWidget`) yerine `{activeTab === "kelime" && <KelimeOyunu />}`.
- Not: `Record<Tab, string>` (satir 20) ve `as const` `TAB_ICONS` exhaustiveness'i zorlar; herhangi biri atlanirsa build hatasi verir — bu, rename'in guvenlik agi.

**`src/components/icons.tsx`** (GROUNDING, dogrulandi):
- **78. satirdan sonra** (`IconPuzzle`'in kapanis `}`'sindan sonra, 80. satirdaki vibe-yorumundan once; "Sekme ikonlari" bolumunde) `IconKeyboard` icon bileseni eklenir (`base()` desenine birebir uyar):
```tsx
export function IconKeyboard({ size, className, strokeWidth }: IconProps) {
  return (
    <svg {...base(size, className, strokeWidth)}>
      <rect x="2.5" y="6" width="19" height="12" rx="2" />
      <path d="M6 9.5h.01M9.5 9.5h.01M13 9.5h.01M16.5 9.5h.01" />
      <path d="M6 13h.01M9.5 13h.01M13 13h.01M16.5 13h.01" />
      <path d="M8 15.5h8" />
    </svg>
  );
}
```
- `TAB_ICONS` (satir 226–232): `bulmaca: IconPuzzle` → `kelime: IconKeyboard`. `IconPuzzle` tanimi dosyada KALIR (silinmez).

**`src/components/CatCompanion.tsx`** (GROUNDING, dogrulandi — yalnizca bir yeni `useEffect`):
- `showBubble` (satir 225) ve `showCtxBubble` (satir 230) tanimlandiktan sonra, **232. satirdan hemen sonra** (Hunger/affection efektinden, satir 234'ten once) yeni efekt eklenir:
```ts
useEffect(() => {
  const onWin = (e: Event) => {
    const s = stateRef.current;
    if (s === "leaving" || s === "gone" || s === "eating" || s === "annoyed") return;
    const detail = (e as CustomEvent<{ word?: string }>).detail;
    setState("zoomies");
    setPupilDilate(true);
    setTimeout(() => setPupilDilate(false), 1600);
    showBubble(detail?.word ? `${detail.word}! 🎉` : pickBubble("playful"), 1800);
  };
  window.addEventListener("kelime:win", onWin);
  return () => window.removeEventListener("kelime:win", onWin);
}, [showBubble]);
```
`zoomies` durumu mevcut (`:30`), kendiliginden ~3600ms sonra `idle`'a doner (`:381-388`); `pickBubble`/`"playful"` zaten import/mevcut (`:11`, `personality.ts:117`). **`personality.ts`'e SIFIR dokunus.**
- **Bilinen kucuk etkilesim (airtight degil, v1 icin kabul edilir):** koruma yalnizca `leaving/gone/eating/annoyed`'i bloklar; `pooping`/`chasing_laser`/`being_petted` sirasinda gelen bir kazanma kediyi animasyon ortasinda `zoomies`'e ceker. Zararsiz, kendiliginden duzelir.

**`src/app/globals.css`**: `kelime` sekmesini calistirmak icin **zorunlu degisiklik yok** (indikator geometri-surumlu, tokenlar yeniden kullanilabilir). Yeni `.kelime-*` kurallari eklenir (bkz. §6); `.bulmaca-page`/`.bulmaca-hero` ve `.riddle-*` da oldugu gibi kalir (RiddleWidget dormant; ileride temizlik).

### Hero seri cipi (uygulama geneli) — page.tsx icinde tam kod
`page.tsx`'te hero badge alanina kucuk bir okuyucu eklenir. `readKelimeStats()` SSR-guvenli oldugundan (sifir default doner) ve cip yalnizca `useEffect` icinde okundugundan (initializer'da DEGIL), seri sayisinda hidrasyon uyusmazligi olmaz; ilk SSR paint'inde seri 0 → cip gizli (kasitli).
```ts
// Home() icinde, indikator useState'inden sonra:
const [streak, setStreak] = useState(0);
useEffect(() => {
  const read = () => setStreak(readKelimeStats().currentStreak);
  read();
  window.addEventListener("kelime:streak", read);
  return () => window.removeEventListener("kelime:streak", read);
}, []);
```
```tsx
{/* hero-left icinde, .hero-badge </div>'inden sonra (satir ~104) */}
{streak > 0 && <span className="kelime-streak-chip">🔥 {streak} gün</span>}
```
`kelime:streak` eventi oyun **her bittiginde** (kazan/kaybet) atilir; okuyucu `readKelimeStats().currentStreak`'i yeniden okur ve cipi **reload olmadan** gunceller — seri 0'a duserse cip gizlenir. `.kelime-streak-chip` CSS'i §6'da. Yeni global store gerekmez.

### Korunan (silinmeyen) dosyalar
`src/components/RiddleWidget.tsx` ve `src/data/turkishRiddles.ts` **diskte oldugu gibi kalir** (kendi kendine yeten, sifir runtime maliyeti). Bilmeceler ileride `import` + `<RiddleWidget />` geri eklenerek doner. Bu, kullanicinin "kaynak kaybi dersi" hafiza notuyla uyumludur.

---

## 4. Oyun Mantigi

**Gunun kelimesi (deterministik).** `kelimeLogic` (paylasilan `dayNoFor` ile):
```
EPOCH = Date.UTC(2026, 5, 27)                     // YEREL launch gunu = puzzle #1
dayNo = floor((Date.UTC(y, m, d) - EPOCH) / 86400000)   // y,m,d = YEREL takvim
index = ((dayNo % L) + L) % L                     // L = kelimeCevaplari.length
answer = kelimeCevaplari[index]
puzzleNo = dayNo + 1                               // launch gunu #1
```
Gun bileseni yerel tarihten alinir (gece yarisi yerel saatte sifirlanir); `Date.UTC(...)` yalnizca tam-gun farkini stabil hesaplamak icin (DST'den etkilenmez). `dayNoFor` tek kaynak; `dailyIndex` ve `puzzleNo` onu cagirir (divergens olmaz).

**Normalize — Turkce i tuzagi.** `normalizeTr`:
1. `s.normalize("NFC")` — `İ` gibi harfler tek kod noktasi olur.
2. Kod-noktasi bazinda iterasyon (`for...of`, UTF-16 birimi degil): `TR_ALPHABET` (29 buyuk harf) zaten canonical ise aynen birak; degilse `TR_UPPER` ile esle.
3. **`else` dali — alfabe disi kod noktalarini DUSUR.** Q/W/X, rakam, bosluk, noktalama ve **birlestirici aksanlar (`U+0300–U+036F`)** ciktiya yazilmaz. Bu, "sessiz harf-kaybi" yerine **ongorulebilir ret** garantiler (asagi bkz.).

Kritik kurallar: `"i" → "İ"` ve `"ı" → "I"`. `String.toUpperCase()`/`toLocaleUpperCase("tr")` **kullanilmaz** (locale-bagimli/kirilgan). Boylece `i ≠ ı`, `İ ≠ I` ayri harfler olarak zorlanir; klavye zaten canonical buyuk harf yaydigi icin `normalizeTr` cogunlukla yapistirma/IME girisi icin koruma katmanidir.

> **Decomposed dotted-i notu (kritik — yanlis iddianin duzeltilmesi).** `İ` (U+0130) **zaten** tek kod noktasidir; NFC onu kendisi olarak birakir. Ama ayrik form `i` + `U+0307` (combining dot) **NFC ile BIRLESMEZ** — iki kod noktasi kalir. `normalizeTr` bu durumda taban `i`'yi `İ`'ye eslerken, ayrik `U+0307`'yi `else` dalinda (combining mark araligi) **dusurur**; sonuc dogru sekilde `"İ"` olur — ama "NFC tek kod noktasina cevirdigi icin" DEGIL, combining mark dusuruldugu icin. Test bunu acikca dogrular: `normalizeTr("i̇") === "İ"` (bkz. §9).

**Alfabe disi giris davranisi.** `normalizeTr("QWERT")` → `""` (uzunluk 0). `normalizeTr("kıZx9")` → `"KIZ"` (3 harf; X ve 9 duser). **Sonuc:** normalize SONRASI uzunluk 5 degilse `isValidGuess` reddeder ve Enter no-op'tur. Tek-harf girisinde (fiziksel klavye/ekran klavyesi) alfabe disi tus tahtaya **yazilmaz** (yok sayilir). Boylece kullanici "tahminim neden kisaldi" sasirmasi yasamaz.

**Tahmin dogrulama.** `isValidGuess(guess, validSet)`: `validSet.has(normalizeTr(guess))`. Uzunluk 5 degilse veya sette yoksa reddedilir (satir shake, tahmin tuketilmez). `validSet = new Set(gecerliKelimeler)`.

**Degerlendirme — iki gecisli (duplikat-harf dogru).** `evaluateGuess(guess, answer)`:
1. Cevap harflerinden sayac havuzu kur (`pool[ch]++`).
2. **1. gecis (yesil/dogru):** `g[i] === a[i]` → `"dogru"`, `pool[g[i]]--`.
3. **2. gecis (sari/koyu):** yesil olmayanlar icin `pool[ch] > 0` → `"yer"` + `pool[ch]--`, degilse `"yok"`.

**Calisilmis ornek (tekrarli harf).** Cevap `KAYAK` (K A Y A K), tahmin `KAZAK` (K A Z A K). Havuz `{K:2, A:2, Y:1}`.
- 1. gecis: poz0 K=K dogru (K:1), poz1 A=A dogru (A:1), poz2 Z≠Y, poz3 A=A dogru (A:0), poz4 K=K dogru (K:0).
- 2. gecis: yalniz poz2 Z; `pool["Z"]` yok → `yok`.
- Sonuc: `["dogru","dogru","yok","dogru","dogru"]` → 🟩🟩⬛🟩🟩.

**Naif tek-gecis neden yanlis.** Cevap `KASAP`, tahmin `SALSA` icin "harfin cevapta gecmesi" yeterli sayilirsa fazladan `S`/`A` kopyalari yanlislikla sari kalir; havuz tuketimi bunlari dogru sekilde griye cevirir (resmi Wordle davranisi). Iki-gecisli sonuc: `["yer","dogru","yok","yok","yer"]` → 🟨🟩⬛⬛🟨.

---

## 5. Veri Modeli ve Kalicilik

**`kelimeler.ts` sekli.** Iki plain `string[]`: `kelimeCevaplari` (kucuk, hand-vetted, canonical UPPERCASE, tam 5 harf) ve `gecerliKelimeler` (buyuk ust kume, `...kelimeCevaplari` dahil). Onerilen boyutlar: cevaplar ~500–800, gecerli tahminler ~8.000–15.000 (statik asset). Ship oncesi `[...normalizeTr(w)].length === 5` filtresi + TDK karsi insan kontrolu zorunlu (bkz. §11.1); §9 `kelimeler.test.ts` bu invariant'i derlemede degil **testte** yakalar.

**localStorage anahtarlari ve JSON sekilleri.**

`kelime:state` — bugunku yarim/biten oyun:
```ts
{ v: 1, date: "YYYY-MM-DD", answer: "KAYAK", guesses: ["KAZAK", ...], status: "playing"|"won"|"lost" }
```
`date !== bugun` ise `readKelimeState` `null` doner → taze tahta. `answer` resume dogrulamasi icin saklanir. **Renkler (`Durum[]`) DEPOLANMAZ** — resume'da `evaluateGuess` ile yeniden uretilir (bkz. §3, §8).

`kelime:stats` — yasamboyu istatistik + seri (`lastPlayedDate` YOK):
```ts
{ v: 1, played: n, wins: n, currentStreak: n, maxStreak: n,
  lastCompletedDate: "YYYY-MM-DD",
  guessDistribution: { "1":n,"2":n,"3":n,"4":n,"5":n,"6":n } }
```
> `guessDistribution` tipi `Record<number, number>`; JSON anahtarlari string ("1".."6") olarak parse edilir ama TS sayisal indexlemeye izin verir. **`readKelimeStats` default'u alti kovayi 0 ile init eder** ve `applyResult` icinde `dist[tries] = (dist[tries] ?? 0) + 1` kullanilir — boylece `undefined++` → `NaN` sessizce kalici olmaz.

**Seri kurallari (`applyResult`, saf — testlenir).**
- `lastCompletedDate === today` ise **hicbir sey yapma** (ayni gun cift-sayim korumasi; erken return).
- `played++`. Kazanildiysa `wins++`, `guessDistribution[tries] = (guessDistribution[tries] ?? 0) + 1`.
- Seri: `dayDiff(lastCompletedDate, today) === 1` (dun) ve kazandiysa `currentStreak++`; `dayDiff > 1` (bosluk) ve kazandiysa `currentStreak = 1`; kaybedildiyse `currentStreak = 0`.
- `maxStreak = max(maxStreak, currentStreak)`.
- `lastCompletedDate = today`.

**"Dun mu" karsilastirmasi — `dayDiff` (kritik — timezone tuzagi onleme).** İki "YYYY-MM-DD" string'i de **ayni sabit referansta** `Date.UTC(y,m,d)` ile parse edilir (`new Date("YYYY-MM-DD")` gibi locale/UTC-kaymali parse KULLANILMAZ), fark `(bUTC - aUTC)/86400000` doner. Her iki operand ayni UTC-parse kullandigi icin karsilastirma saf takvim-gun aritmetigidir; timezone/DST kaymasi yoktur (yerel gece yarisina yakin oyuncuda seri yanlis sifirlanmaz/devam etmez).
```ts
function dayDiff(a: string, b: string): number {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  return (Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86400000;
}
```

**SSR-guvenli erisim.** Her okuyucu `if (typeof window === "undefined") return <default>;` ile baslar; `JSON.parse` try/catch; `v !== 1` veya alan eksik/bozuksa default'a duser. Yazicilar `window` yoksa no-op. **Bileskenler bu okuyuculari `useState` initializer'inda DEGIL, mount-sonrasi `useEffect`'te cagirir** (hidrasyon-guvenli; bkz. §3). localStorage tamamen kapaliysa (private mode throw) tum erisimler sessizce default'a duser; oyun oynanir, kalicilik o oturumda devre disidir.

---

## 6. Arayuz / UX

**Sayfa iskeleti.** `<section className="panel">` otomatik (tab degisince `key={activeTab}` ile `panel-in` animasyonu re-fire). Icte `.kelime-page` (= `.bulmaca-page` deseni: `display:grid; gap:22px; z-index:2`) + `.kelime-hero h2/p` baslik blogu (in-game baslik "Gunun Kelimesi", altyazi "Gunun 5 harfli kelimesini 6 hakta bul.").

**6x5 izgara.** `.kelime-grid` = 6 satir; her satir `.kelime-row` `display:grid; grid-template-columns: repeat(5, minmax(0,1fr)); gap:8px` (`.snake-dpad` deseni). Her hucre `.kelime-tile`:
- **Bos/idle:** border `1px solid var(--line-soft)`, background `rgba(10,20,26,0.84)` (global `input` ile uyumlu), `border-radius:12px`, `color:var(--ink-strong)`, `font-family:var(--font-display),serif`, buyuk harf.
- **dogru (yesil):** **dolu mint zemin** — background `var(--accent-mint)` (`#6df0c2`), text `#042a23`, border `1px solid var(--accent-mint)`. (Wordle'a yakin, yuksek kontrast, erisilebilir.)
- **yer (sari):** **dolu sun zemin** — background `var(--accent-sun)` (`#ffd373`), text `#042a23`, border `1px solid var(--accent-sun)`. (Sari-tint zemin + sari metin dusuk kontrast oldugu icin **dolu zemin + koyu metin** secildi ve sabitlendi.)
- **yok (koyu):** background `rgba(8,16,20,0.85)`, border `1px solid rgba(182,227,216,0.14)`, text `var(--ink-muted)`.

**Animasyonlar (concrete keyframe'ler).**
```css
@keyframes kelime-shake {
  0%,100% { transform: translateX(0); }
  20%,60% { transform: translateX(-6px); }
  40%,80% { transform: translateX(6px); }
}
@keyframes kelime-flip {
  0%   { transform: rotateX(0); }
  50%  { transform: rotateX(90deg); }
  100% { transform: rotateX(0); }
}
@keyframes kelime-pop {
  0% { transform: scale(1); } 40% { transform: scale(1.12); } 100% { transform: scale(1); }
}
```
- **flip:** tahmin gonderilince hucreler sirayla (stagger ~150ms) Y ekseninde flip; renk degisimi `50%` noktasinda (kart "arka yuzu" donerken); `~0.5s`, `var(--ease-spring)`.
- **shake:** gecersiz kelime → satir yatay shake (`~0.4s`), tahmin tuketilmez.
- **pop/kutlama:** kazanma satirinda `kelime-pop` (`~0.3s`, `var(--ease-spring)`).

**Turkce ekran klavyesi.** 3 satir, **canonical UPPERCASE** etiketler (`toUpperCase`'e GUVENME; glyph'ler hardcode):
```
Satir 1: E R T Y U I İ O P Ğ Ü        (11)
Satir 2: A S D F G H J K L Ş Ö        (11)
Satir 3: ENTER Z C V B N M Ç BACKSPACE (7 harf)
```
**Harf envanteri dogrulamasi (ship-blocker kural):** uc satirda 29 harf tam bir kez bulunmali — toplam `11 + 11 + 7 = 29`. Tum alfabe `B C Ç D E F G Ğ H I İ J K L M N O Ö P R S Ş T U Ü V Y Z` + `A` mevcut, hicbiri tekrarsiz, Q/W/X yok. **GROUNDING'deki onceki taslak diziler (farkli satir dagilimlari, `İ` mukerrer, `Ö` dusuk olanlar) KULLANILMAZ; yalnizca bu dizi.** Her tus `.kelime-key` (`.ghost-btn` / `.snake-dpad .ghost-btn` deseni: `font-weight:700`, `padding:10px 0`), satir konteyneri `display:grid; gap:6–8px`. Tus durumu degerlendirmenin **en iyi** sonucuyla boyanir (yesil > sari > koyu oncelik), tum satirlardan hesaplanir. Press feedback global `.ghost-btn:active { transform:scale(0.95) }` ile gelir.

**Fiziksel klavye.** `window` `keydown` dinleyicisi: harf tuslari (Turkce layout'tan gelen glyph `normalizeTr`'den gecer; alfabe disi yok sayilir), `Enter` → gonder, `Backspace` → sil. **Oyun kilitliyken** (bitmis) hem fiziksel dinleyici erkenden return eder hem ekran klavyesi tuslari `disabled`'dir (sadece no-op degil — odak/AT davranisi icin gercek `disabled`).

**Sonuc karti (`.kelime-result`).** Kazan/kaybette acilir:
- Baslik: kazanmada tebrik; kaybetmede **dogru kelime acikca** ("Kelime: KAYAK"). Opsiyonel: baslikta `#<puzzleNo>` gosterilebilir (paylasim metniyle tutarlilik).
- Istatistik blogu (`.kpi`/`.stats-pill` ruhunda) — **4 sayisal deger**: Oynanan, Kazanma %, Mevcut seri, En uzun seri. (Tahmin dagilimi histogrami v2'ye ertelendi; veri `guessDistribution`'da kaydedilmeye devam eder, sadece gorsel ertelendi — bkz. §10.)
- **Geri sayim:** "Yarinki kelimeye: HH:MM:SS" — yerel gece yarisina kadar, `setInterval` ile saniyede guncellenir; `useEffect` cleanup'inda `clearInterval`. **00:00:00'a ulastiginda:** sonraki tick `todayKey()`'i yeniden okur; yerel tarih degismisse `kelime:state` artik bugune uymaz → bilesen taze tahtaya remount eder (reload YOK, state bugunku tarihle yeniden hesaplanir). v1 basit yol: tick'te `todayKey()` degisikligini farket → yeni gunun deterministik cevabiyla tahtayi sifirla.
- **Paylas butonu:** `.action-btn` (mint→sun gradient, text `#042a23`); tik → `buildShare(...)` panoya, metin gecici "Kopyalandi!".

**Erisilebilirlik bolgesi.** Tek kalici `<div aria-live="polite" className="kelime-status">` mount'ta bos render edilir; uyari ("Listede yok") veya sonuc metni icine yazilir, ~1.5s sonra temizlenir (bkz. §8).

**`.kelime-streak-chip`** (hero): `.hero-badge`/`.pill` token muamelesi — sun-tint pill, kucuk, `🔥 N gün`. Ornek: `background: rgba(255,211,115,0.14); border:1px solid rgba(255,211,115,0.32); color:var(--accent-sun); border-radius:999px; padding:4px 10px; font-weight:600; font-size:0.82rem;`.

**Responsive.** Mevcut `@media (max-width:640px)` bloklarina eklenir: izgara hucre boyutu kuculur, `.kelime-key` font ~`1rem`'e iner (cok-kolonlu gridler 1fr'e degil, sabit 5-kolon kalir; klavye satir ici sigar).

---

## 7. App Entegrasyonu

**Sekme rename + varsayilan.** `bulmaca` → `kelime` (etiket "Kelime"); union/`TAB_ORDER`/`TAB_LABELS`/`TAB_ICONS`/panel dali/varsayilan `useState` hepsi `"kelime"` literali ile guncellenir (kesin satirlar §3). `Record<Tab,...>` + `as const TAB_ICONS` exhaustiveness'i zorlar (eksik kalan derlemede yakalanir). Varsayilan sekme `"kelime"`. Varsayilan `"kelime"` TAB_ORDER'da **son** sirada; indikator `useLayoutEffect(placeIndicator, [activeTab])` ile ilk boyamada dogru (en sagdaki) butona oturur — geometri-surumlu, ekstra is/CSS gerektirmez.

**Hero seri cipi + yenileme eventi.** Hero badge alaninda "🔥 N gun" (seri > 0). Oyun **her bittiginde** (kazan veya kaybet, `applyResult` + `writeKelimeStats` cagrildiktan **sonra**) `KelimeOyunu` `window.dispatchEvent(new CustomEvent("kelime:streak"))` atar; hero okuyucu bu eventi dinler, `readKelimeStats().currentStreak`'i yeniden okur ve **reload olmadan** cipi gunceller (seri 0'a duserse cip gizlenir). `kelime:streak`, cipin tek dogruluk kaynagidir.

**Cat kutlamasi.** Yalnizca **kazanmada** `KelimeOyunu` `window.dispatchEvent(new CustomEvent("kelime:win", { detail: { word, streak } }))` atar. `CatCompanion.tsx`'e eklenen tek `useEffect` bunu dinler, `zoomies` durumuna gecer + opsiyonel `detail.word` ile balon; ~3.6s sonra kendiliginden `idle`. `personality.ts`'e dokunulmaz. Gevsek baglanti: oyun, cat'in varligini bilmez; cat, oyunun varligini bilmez — yalnizca event.

**Tamamlama isleyici sirasi (kritik — bayat-okuma onleme).** Stats, event'lerden **once** yazilmali yoksa cip bayat okur. Kesin sira: (1) son state hesapla → `writeKelimeState`, (2) `stats = applyResult(...)` + `writeKelimeStats(stats)`, (3) `kelime:streak` dispatch, (4) kazanmada `kelime:win` dispatch.

**Bilmece emekliligi.** `page.tsx`'ten `RiddleWidget` importu (satir 12) ve `bulmaca` panel dalindaki `<RiddleWidget />` JSX kaldirilir. **`RiddleWidget.tsx` ve `turkishRiddles.ts` SILINMEZ** — dormant kalir, ileride geri eklenebilir. `.riddle-*` CSS'i de kalir (ileride temizlik).

---

## 8. Kenar Durumlar ve Erisilebilirlik

- **Gecersiz/eksik kelime:** normalize SONRASI 5 harften az → Enter no-op; 5 harf ama `gecerliKelimeler`'de yok → satir shake + `aria-live="polite"` ile "Listede yok", tahmin tuketilmez.
- **Alfabe disi giris:** `normalizeTr` Q/W/X, rakam, bosluk, noktalama, combining mark'lari dusurur (cikti kisalir). Tek-harf girisinde alfabe disi tus tahtaya yazilmaz; yapistirma/IME girisinde normalize sonrasi uzunluk 5 degilse Enter no-op. Sessiz harf-kaybi yerine ongorulebilir ret.
- **i/I normalize:** `i↔İ`, `ı↔I` ayri harfler; `KILIÇ` (I) ile `İ` iceren cevap eslesmez. Tum karsilastirma `normalizeTr`'den gecer; `toUpperCase`/`toLocaleUpperCase` yok. Decomposed `i+U+0307` → `İ` (combining mark dusurulerek; NFC birlestirmez).
- **localStorage kapali/private mode:** her okuma try/catch + `typeof window` guard; throw'da sessizce default. Oyun oynanir, o oturumda seri/istat tutulamaz (cokme yok).
- **Timezone / yerel tarih:** gun bileseni yerel takvimden (`getFullYear/Month/Date`); sifirlamalar yerel gece yarisinda. "Dun mu" karsilastirmasi `dayDiff` (her iki operand UTC-parse, DST-bagimsiz). Bir oturumda yerel tarih degisirse bir sonraki mount/resume/geri-sayim-tick'i taze tahtaya gecer.
- **Geri sayim 00:00:00:** sonraki tick `todayKey()` degisikligini farkeder → reload'suz taze tahtaya remount; kullaniciya yeni kelime yuklenir.
- **Liste sarmasi (wrap-around):** `((dayNo % L) + L) % L` negatif gunlerde bile guvenli; `L` gun sonra liste basa sarar. Launch'tan (#1) sonra `L ≈ 600` icin ~600 gun (≈1.64 yil) benzersiz puzzle, sonra tekrar. (Wrap ufku launch'a gore, epoch'a gore degil — launch == epoch oldugu icin ikisi ayni.)
- **Resume renk yeniden uretimi:** depolanan `guesses`, `evaluateGuess(guess, answer)` ile yeniden degerlendirilir; tile + klavye renkleri tureyenden hesaplanir (depolanmaz). Bu, `state.answer === bugunku deterministik cevap` dogrulandiktan SONRA yapilir.
- **Answer-mismatch (resume gecersizligi):** `kelime:state.answer` bugunku deterministik cevapla eslesmezse (orn. cevap listesi gun ortasinda degistirildi — uretimde nadir), state **her durumda** (playing/won/lost) TAMAMEN gecersiz sayilir → `clearKelimeState()` ile silinir, taze tahta, bugunku dogru cevapla yeni oyun. "Tek oturus" kuralina gore taze baslamak, yanlis cevabi kilitli gostermekten iyidir.
- **aria-live:** tek kalici `aria-live="polite"` bolgesi (§6). Her tile ekran-okuyucu icin `aria-label` ile etiketlenir, format `"harf <X>: <durum>"` (orn. "harf K: dogru" / "harf A: yerinde degil" / "harf Z: yok").
- **Renk korlugu:** renk tek isaret degil; yesil/sari/koyu ayrimina ek olarak tile/tus durumu metinsel `aria-label` ile pekistirilir; sonuc karti ve seri de metin icerir.
- **Klavye erisimi:** ekran klavyesi tuslari gercek `<button>`; global `*:focus-visible` mint outline otomatik gelir. Fiziksel klavye tam destekli. Oyun kilitliyken tuslar `disabled`.

---

## 9. Test

Repo'da test altyapisi YOK. **Hafif vitest** eklenir. Kurulum:
- `npm i -D vitest`; `package.json` scripts'e `"test": "vitest run"`; jsdom **GEREKMEZ** (saf fonksiyonlar, `environment: 'node'`).
- Testler ayni klasorde **relative import** (`./kelimeLogic`) kullanir; `@/` alias gerekmez (tsconfig-paths plugin gerekmez). Gerekirse minimal `vitest.config.ts` (`test: { environment: 'node' }`).
- **Lint etkilesimi (zorunlu):** projenin tek kalite kapisi `eslint . --max-warnings=0` ve `.` her seyi tarar. `*.test.ts` dosyalari ya `eslint.config` ignore'una eklenir ya da uyarisiz yazilir (kullanilmayan degisken yok, vb.). Bu, test eklemenin parcasidir; aksi halde test dosyalari kapiyi kirar.

Yalnizca saf mantik test edilir; React/DOM/localStorage IO test edilmez.

**`src/lib/kelimeLogic.test.ts`**
- `normalizeTr`: `"iğne" → "İĞNE"`, `"ışık" → "IŞIK"`; **`normalizeTr("i̇") === "İ"`** (decomposed dotted-i; combining mark dusurulur, NFC birlestirmez); `i ≠ ı`, `İ ≠ I` ayri; kucuk harf girisi canonical buyuk dondurur; `normalizeTr("QWERT") === ""` ve `normalizeTr("kıZx9") === "KIZ"` (alfabe disi dusurulur).
- `evaluateGuess` duplikat-harf: cevap `KAYAK` / tahmin `KAZAK` → `["dogru","dogru","yok","dogru","dogru"]`; cevap `KASAP` / tahmin `SALSA` → `["yer","dogru","yok","yok","yer"]` (fazladan kopyalar `yok`); tam eslesme hepsi `dogru`; hic eslesme yoksa hepsi `yok`; tek dogru-yer karisik vaka.
- `isValidGuess`: sette olan kabul, olmayan ret; normalize sonrasi uzunluk 5 degilse ret; kucuk harf girisi normalize sonrasi kabul.
- `dayNoFor`/`dailyIndex`/`puzzleNo`: ayni tarih → ayni index; ardisik gunler → ardisik index (mod); `L`'de wrap-around; `puzzleNo = dayNoFor + 1`; launch gunu (`2026-06-27`) → `puzzleNo === 1`; ayni gunun iki farkli saatinde ayni index (yerel gun stabil); `dailyIndex` ve `puzzleNo` ayni `dayNoFor`'u kullanir (tutarli).

**`src/lib/kelimeStorage.test.ts`** (saf `applyResult` + `dayDiff`)
- `dayDiff`: ardisik gunler → 1; ayni gun → 0; bosluk → >1; ay/yil siniri dogru (orn. `dayDiff("2026-12-31","2027-01-01") === 1`).
- `applyResult`: dun tamamlanmis + bugun kazanma → `currentStreak + 1`; bosluk (2+ gun) + kazanma → `currentStreak = 1`; kaybetme → `0`; `maxStreak` monoton; ayni gun ikinci `applyResult` → degisiklik yok (cift-sayim korumasi, `lastCompletedDate === today`); `guessDistribution[tries]` artar (init 0'dan, NaN yok); `wins/played` dogru.

**`src/data/kelimeler.test.ts`** (veri invariant'i)
- Tum `kelimeCevaplari` icin `[...normalizeTr(w)].length === 5`; her `w` `new Set(gecerliKelimeler)`'de mevcut; tum kelimeler canonical (`normalizeTr(w) === w`). Bu, bozuk veri ship'ini derlemede degil **testte** yakalar.

---

## 10. Kapsam Disi (YAGNI) ve v2

**v1'de YOK (acikca):** backend/sunucu, login/auth, Firebase/network cagrisi, cihazlar-arasi seri, leaderboard, sosyal kanit ("N kisi cozdu"), paylasilan tahmin dagilimi, sohbette tartisma, degisken kelime uzunlugu, zorluk modlari, hesap/profil, bildirim, **tahmin dagilimi histogrami gorseli**. v1 = saf istemci + localStorage.

> **Not — vitest ve histogram konumlandirma.** Bu spec, vitest test altyapisini ve uc test dosyasini **v1'e dahil eder** (saf mantik regresyon korumasi ucuz ve degerli; lint etkilesimi §9'da cozuldu). Tahmin dagilimi **histogram gorseli** ise v1'den cikarildi — veri `guessDistribution`'da kaydedilmeye devam eder, yalniz cubuk gorseli v2'ye ertelenir (en agir, en az retention-tasiyan UI parcasi).

**v2 hizli-takip (Firebase sosyal kanit).** Mevcut `@/lib/firebase` `getFirebaseServices()` (`app`/`db`/`auth`) yeniden kullanilir; yazi atfi icin `ChatBox`'ta kanitlanmis lazy `signInAnonymously(auth)` akisi. Gunluk agregat doc (date = doc id):
```
collection "kelimeDaily", doc "YYYY-MM-DD":
  solvedCount, playedCount, distribution { "1".."6","fail" }, updatedAt: serverTimestamp
```
Tamamlanmada atomik artis: `setDoc(doc(db,"kelimeDaily",todayId), { solvedCount: increment(won?1:0), playedCount: increment(1), distribution:{[bucket]:increment(1)}, updatedAt: serverTimestamp() }, { merge:true })`. Cift-sayim korumasi `kelime:stats.lastCompletedDate` ile (cihaz basina gunde bir). Gosterim `getDoc` ya da `onSnapshot` (ChatBox deseni) → "N kisi bugun cozdu". "Bugunun kelimesini tartis" mevcut `singleRoomMessages` koleksiyonuna `type:"chat"` ile tarih-etiketli mesaj atar — yeni sohbet yuzeyi gerekmez. **v2 on kosulu:** Firestore kurali, kimlikli (anonim dahil) kullanicilarin `kelimeDaily/*` sayac alanlarini `update` etmesine izin vermeli. v1'de bunlarin **hicbiri** kurulmaz; v1 yalnizca §5 localStorage tasarimiyla cikar.

---

## 11. Acik Sorular / Riskler

1. **Kelime listeleri (action gerektirir — ship-blocker).** GROUNDING'deki starter dizi **%25 hatali** (80 girisin 20'si yanlis uzunluk: `MASA`=4, `YILDIZ`=6, `YAĞMUR`=6, `KARPUZ`=6, `DOMATES`=7, `OKYANUS`=7, `PEYNİR`=6, `YOĞURT`=6, `DEFTER`=6, `CETVEL`=6, `HARİTA`=6, `PUSULA`=6, `KAPI`=4, `KOLTUK`=6, `YASTIK`=6, `ÇARŞAF`=6, `BATTAL`=6, `AYNA`=4, `ÜZÜM`=4, `ETEK`=4) + ~7 gecersiz/sozcuk-olmayan (`KEDİG`, `TEREK`, `GÖMLE`, `GÖKYÜ`, `ELDİV`, `TERLİ`, `RAFLI`, `KIŞIN`, `DAĞCI`, `SÜTÇÜ`). Bu starter **kullanilabilir tohum DEGIL**. Aksiyon: (a) `[...normalizeTr(w)].length === 5` filtresini §9 `kelimeler.test.ts`'de **bloklayan invariant** yap (bozuk giris testi kirsin); (b) yanlis-uzunluk + sozcuk-olmayan girisleri tamamen at; (c) kalan her cevabi TDK Guncel Sozluk'e karsi insan-kontrol et (cevap listesi oyunun "yuzu"). `gecerliKelimeler` sozluk korpusundan makine-uretilebilir ama kufur/argo filtrelenmeli. Temiz tohum ornekleri: `KALEM, KİTAP, ÇİÇEK, BAHÇE, DENİZ, BULUT, KAPAK, SABUN, HAVLU, PERDE, HALAT, DUVAR, KÖPEK, BALIK, KUŞAK, ELMAS, KAVUN, SOĞAN, BİBER, SALÇA, TUZAK, ŞEKER, KAHVE, EKMEK, SİMİT, BÖREK, PİLAV, ÇORBA, KAZAK, ÇORAP, ŞAPKA, KEMER, PALTO, CEKET, NEHİR, ORMAN, ÇİMEN, TARLA, BAHAR, GÜNEŞ, SİLGİ, ÇANTA, TAHTA, KÜRSÜ, YATAK, DOLAP, LAMBA, FİLİZ`. Bu, mantik degil **veri kalitesi** riski.
2. **Produksiyon URL (action gerektirir — ship-blocker).** `kelimeShare.PAYLAS_URL` sabiti gercek canli alan adiyla degistirilmeli (placeholder ship edilmemeli). Deploy GitHub→Vercel (hafiza notu); gercek URL (orn. `https://chillout-web.vercel.app/` veya custom domain) netlesene kadar ship EDILMEZ. Inline degil, tek `const PAYLAS_URL` oldugu icin tek satirda guncellenir.
3. **Epoch / launch gunu.** `EPOCH = Date.UTC(2026, 5, 27)` = launch gunu = puzzle #1. Bu, ilk gun paylasilan izgaranin `#1` gostermesini saglar (oyuncular #1'i bekler; epoch'u `2026-01-01` yapmak ilk gun #178 gosterirdi — istenmeyen). Bugun (2026-06-27) launch gunu, sorun yok. Launch ertelenirse `EPOCH` o tarihe ayarlanir (tek satir).
4. **Yerel-tarih vs UTC ince ayar.** Sifirlama yerel gece yarisinda; farkli timezone'lardaki iki oyuncu ayni "takvim gunu"nde ayni kelimeyi gorur ama gercek dunya anlari kayar — bu kasitli ve Wordle ile tutarli. "Dun mu" hesabi `dayDiff` ile timezone-guvenli. Cihazlar-arasi seri olmadigi icin (v1) ek risk yok.
5. **ESLint kapisi.** Tum yeni dosyalar (ozellikle hooks/`setInterval`/`keydown` iceren `KelimeOyunu.tsx`) `eslint . --max-warnings=0`'dan uyarisiz gecmeli: `react-hooks/exhaustive-deps`, kullanilmayan-degisken, vb. temizlenmeli. Test dosyalari da kapsamda (§9).

Bunlar disinda mimari/entegrasyon noktalarinda acik soru yok; tum entegrasyon yuzeyleri (page.tsx satirlari 12/17/19/20–26/66/99–109/165–177, icons.tsx 78/226–232, CatCompanion 232 sonrasi efekt, localStorage anahtarlari, event adlari, tamamlama sirasi) GROUNDING'e gore kesinlestirildi ve kaynak dosyalara karsi dogrulandi.
