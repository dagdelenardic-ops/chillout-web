# Kedi varlıkları (Blender'dan render)

Kaynak rig: `~/Downloads/48-cat_rigged/cat_render_rig.blend` (kalibre kamera/ışık/materyal kayıtlı).
Render: headless Cycles 48 samples + denoise, şeffaf film, 768×384/kare, view_transform=Standard.
Pozlama/şerit üretimi scriptle yapılır (bkz. hafıza: chillout-web-assets).

Varlıklar (hepsi **şeffaf zemin**; şeritler yatay, kare başı 768×384):

| Dosya | Ne | Kare |
|---|---|---|
| `cat-run-sprite.png` | Koşu: 6×6 sprite sheet (192×96/kare, 1152×576) | 36 |
| `cat-run.webm` | Koşu VP9 alfa, 384×192, 24fps loop | 36 |
| `cat-idle-strip.png` | Ayakta dinlenme: nefes + kuyruk salınımı + kulak mikro (kare 0 ≈ rest) | 12 |
| `cat-eat-strip.png` | Mama kabında çiğneme döngüsü (baş aşağı bob + keyif kuyruğu) | 6 |
| `cat-sleep-strip.png` | Yerde loaf + yavaş nefes döngüsü | 8 |
| `cat-groom-strip.png` | Pati yalama döngüsü (sağ ön pati kalkık, baş iner-kalkar) | 8 |
| `cat-stretch-strip.png` | Play-bow gerinme dizisi, tek yön (CSS `forwards` son karede tutar) | 6 |
| `cat-angry-strip.png` | Kambur hışş + kuyruk kamçısı döngüsü | 6 |
| `cat-happy-strip.png` | Sevilme: baş nazlanma + kuyruk sallanma döngüsü | 8 |
| `cat-fall-strip.png` | Kanat açma (tuck→açık), süzülme öncesi | 3 |
| `cat-crouch.png` / `cat-jump.png` | Çömelme / sıçrama tek kare (geçiş pozları) | 1 |
| `cat-look-up/down/back/front.png`, `cat-ear-flick.png`, `cat-blink.png` | Idle mimik bindirmeleri | 1 |
| `cat-idle.png`, `cat-sleep.png`, `cat-groom.png`, `cat-stretch.png`, `cat-angry.png`, `cat-fall.png`, `cat-sleep-tab-strip.png` | ESKİ tek kare/şeritler — artık CSS'te kullanılmıyor, arşiv | — |

`CatCompanion.tsx` şeritleri `steps(N)` CSS animasyonlarıyla oynatır:
`background-size: (108*N)px 54px` + `@keyframes ... background-position-x: -(108*N)px`.
Döngüler `infinite`, stretch `1 forwards` (son karede tutar). Sanal bebek eylemleri
(Besle/Oyna/Fırçala/Uyut + öfke) bu şeritlere bağlanır. Kedi sağa bakar; sola giderken
`scaleX(-1)` ile döner. Stroll/enter/gofood modunda koşu döngüsü `.run-slow` ile %55 yavaş oynar.

> Not: `public/cat/` altında — `/api/videos` yalnız `public/images` kökünü taradığı için webm
> arka plan videosu rotasyonuna **girmez**.
