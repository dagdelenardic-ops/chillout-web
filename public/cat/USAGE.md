# Kedi koşu varlığı (Blender'dan render)

Kaynak: `~/Downloads/48-cat_rigged/cat_rigged_animation_run.blend` → Blender'da EEVEE + ortografik
yan kamera + şeffaf film ile 36 kare (1–36, 24fps, 1.5sn loop) render edildi.

Varlıklar (hepsi **şeffaf zemin**, doğrulandı):

| Dosya | Ne | Boyut |
|---|---|---|
| `cat-run-sprite.png` | Koşu: 6×6 sprite sheet, kare başı 192×96 → 1152×576, RGBA | 341 KB |
| `cat-idle.png` | Ayakta dinlenme pozu (rest), 192×96 | 9 KB |
| `cat-happy.png` | Mutlu/sevme pozu (baş+kuyruk yukarı), 192×96 | 9 KB |
| `cat-run.webm` | Koşu VP9 alfa (`alpha_mode=1`), 384×192, 24fps loop | 82 KB |

`CatCompanion.tsx` bunları bir durum makinesinde kullanıyor: kedi koşarak gelir (`is-run`) →
durup dinlenir/nefes alır (`is-idle`) → tıklayınca sevilir (`is-happy` + kalpler + balon + sevgi
sayacı, localStorage `chillout-cat3d`) → yürür gider. İsim rastgele atanır.

> Not: `public/cat/` altında — `/api/videos` yalnız `public/images` kökünü taradığı için webm
> arka plan videosu rotasyonuna **girmez**. Kedi sağa bakar; sola giderken `scaleX(-1)` ile döner.

## Seçenek A — WebM (en basit, Chromium/Firefox)
```tsx
<video src="/cat/cat-run.webm" autoPlay loop muted playsInline
  style={{ width: 96, height: 48, pointerEvents: "none" }} />
```

## Seçenek B — Sprite sheet (her yerde çalışır, video decode yok)
```css
.cat-run {
  width: 192px; height: 96px;
  background: url('/cat/cat-run-sprite.png') 0 0 / 1152px 576px;
  animation: cat-run 1.5s steps(6) infinite,        /* satır içi 6 kare */
             cat-run-rows 9s steps(6) infinite;     /* 6 satır */
}
@keyframes cat-run      { to { background-position-x: -1152px; } }
@keyframes cat-run-rows { to { background-position-y: -576px;  } }
```
(36 kare = 6×6 ızgara; yatay döngü satırı, dikey döngü satırları ilerletir.)
