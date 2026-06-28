"use client";

// SVG kedi - yan profil. Pose ve action bağımsız.
export type Pose =
  | "walking"
  | "running"
  | "sitting"
  | "lying"
  | "eating"
  | "alert"
  | "stretching";

export type IdleAction =
  | null
  | "looking"
  | "licking"
  | "grooming"
  | "yawning"
  | "kneading"
  | "tail_chasing"     // kendi kuyruğunu kovalar (yerinde döner)
  | "staring"          // boş boş bakar, gözler büyür
  | "loafing"          // ekmek somunu gibi büzülür
  | "swatting"         // hayalete pati atar
  | "slipping"         // ayağı kayar, düşer ve kalkar
  | "derp";            // saçma kafa pozisyonu

interface Props {
  pose: Pose;
  action: IdleAction;
  blinking: boolean;
  earTwitch: boolean;
  mouthOpen: boolean;
  pupilDilate: boolean;
  /** Sürekli artan yürüyüş fazı (radyan) — hıza göre CatCompanion sürer */
  walkPhase?: number;
  /** Yürüyüş şiddeti 0..~1.7 (hıza bağlı); 0 = duruyor (bacaklar dinlenir) */
  gait?: number;
}

export function CatSprite({
  pose,
  action,
  blinking,
  earTwitch,
  mouthOpen,
  pupilDilate,
  walkPhase = 0,
  gait = 0,
}: Props) {
  const cls = [
    "cat-svg",
    `pose-${pose}`,
    action ? `action-${action}` : "",
    earTwitch ? "ear-twitch" : "",
    mouthOpen ? "mouth-open" : "",
    pupilDilate ? "pupil-dilate" : "",
  ].filter(Boolean).join(" ");

  // === Prosedürel yürüyüş: hıza eşlenen 4-bacak gait + gövde bob'u ===
  // Bacaklar SVG transform attribute'üyle sürülür (CSS yürüyüş animasyonları
  // kaldırıldı, böylece çakışma yok). Sadece walking/running pose'da etkin.
  // Düşük eşik: çok yavaş yürürken de bacaklar canlanır. Genlik gait'e (hıza)
  // orantılı olduğundan eşiğe yakın değerlerde salınım ~0'dır → dinlenmeye
  // sıçrama görünmez (yumuşak geçiş).
  const moving = (pose === "walking" || pose === "running") && gait > 0.015;
  const eff = Math.min(1.7, Math.max(0, gait));
  const p = walkPhase;

  // Bir bacağın transformu: tepe noktası etrafında salınım + ileri savruluşta kalkış
  const legT = (cx: number, off: number, swing: number, lift: number): string | undefined => {
    if (!moving) return undefined;
    const ph = p + off;
    const angle = swing * eff * Math.cos(ph);
    const up = lift * eff * Math.max(0, -Math.sin(ph));
    return `rotate(${angle.toFixed(2)} ${cx} 38) translate(0 ${(-up).toFixed(2)})`;
  };

  // Çapraz çiftler (trot benzeri): (arka-uzak + ön-yakın) ↔ (arka-yakın + ön-uzak)
  const PI = Math.PI;
  const tBackFar = legT(24.5, 0, 15, 3.8);
  const tFrontNear = legT(74.5, 0, 19, 5);
  const tBackNear = legT(32.5, PI, 15, 3.8);
  const tFrontFar = legT(66.5, PI, 19, 5);

  // Gövde: adım başına iki kez hafif yükselme + minik yana yatış (waddle)
  const bob = -1.3 * eff * (0.5 - 0.5 * Math.cos(2 * p));
  const sway = 1.3 * eff * Math.sin(p);
  const rigT = moving
    ? `translate(0 ${bob.toFixed(2)}) rotate(${sway.toFixed(2)} 50 42)`
    : undefined;

  return (
    <svg viewBox="0 0 100 60" className={cls} aria-hidden>
      <defs>
        {/* Kürk gölgelendirme — sırt koyu, karın açık (hacim hissi) */}
        <linearGradient id="catBody" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e89a5c" />
          <stop offset="55%" stopColor="#d97a3c" />
          <stop offset="100%" stopColor="#b8612b" />
        </linearGradient>
        <linearGradient id="catHead" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#eaa063" />
          <stop offset="100%" stopColor="#cf6f33" />
        </linearGradient>
        <linearGradient id="catEarInner" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffd0b0" />
          <stop offset="100%" stopColor="#f5a878" />
        </linearGradient>
        {/* Gerçekçi yeşil iris + koyu pupil */}
        <radialGradient id="catIris" cx="50%" cy="50%" r="55%">
          <stop offset="0%" stopColor="#0c0f09" />
          <stop offset="34%" stopColor="#0c0f09" />
          <stop offset="46%" stopColor="#86c94a" />
          <stop offset="78%" stopColor="#4f8f2e" />
          <stop offset="100%" stopColor="#2f5a1c" />
        </radialGradient>
      </defs>

      {/* Ground shadow (rig dışında — yürürken zıplamaz) */}
      <ellipse className="cat-shadow" cx="50" cy="56" rx="32" ry="3" />

      {/* RIG — gölge hariç tüm gövde; yürürken hafif bob + waddle */}
      <g className="cat-rig" transform={rigT}>

      {/* TAIL - separate elements for layered animation */}
      <g className="cat-tail-grp">
        {/* yumuşak kabarık alt katman — daha gür kuyruk silüeti */}
        <path className="cat-tail-fluff" d="M 22 32 Q 7 26 5 11" fill="none" strokeWidth={8} strokeLinecap="round" />
        <path className="cat-tail" d="M 22 32 Q 8 26 6 12" fill="none" strokeWidth={4.5} strokeLinecap="round" />
        <path className="cat-tail-tip" d="M 6 12 L 6 9" fill="none" strokeWidth={5} strokeLinecap="round" />
        {/* kuyrukta tabby halkaları */}
        <g className="cat-tail-rings" strokeWidth={1.3} strokeLinecap="round">
          <path d="M 16 30 q 2 -2 0 -4" />
          <path d="M 11 24 q 2 -2 0 -4" />
        </g>
      </g>

      {/* BACK LEGS */}
      <g className="cat-legs cat-back-legs">
        <rect className="cat-leg leg-back-far"  x="22" y="38" width="5" height="14" rx="2.4" transform={tBackFar} />
        <rect className="cat-leg leg-back-near" x="30" y="38" width="5" height="14" rx="2.4" transform={tBackNear} />
      </g>

      {/* BODY + belly + stripes */}
      <ellipse className="cat-body"  cx="50" cy="33" rx="28" ry="11" />
      <ellipse className="cat-belly" cx="52" cy="38" rx="22" ry="5.5" />
      <g className="cat-stripes">
        <path d="M 34 24 Q 35 27 34 30" />
        <path d="M 38 23 Q 39 27 38 31" />
        <path d="M 46 22 Q 47 26 46 30" />
        <path d="M 54 22 Q 55 26 54 30" />
        <path d="M 62 23 Q 63 27 62 31" />
        <path d="M 68 24 Q 69 27 68 30" />
      </g>
      {/* Sırt boyunca koyu dorsal bant — hacim */}
      <path className="cat-dorsal" d="M 26 28 Q 50 20 76 26" fill="none" />

      {/* FRONT LEGS - the near front leg can lift for paw-lick */}
      <g className="cat-legs cat-front-legs">
        <rect className="cat-leg leg-front-far"  x="64" y="38" width="5" height="14" rx="2.4" transform={tFrontFar} />
        <rect className="cat-leg leg-front-near" x="72" y="38" width="5" height="14" rx="2.4" transform={tFrontNear} />
      </g>

      {/* NECK */}
      <path className="cat-neck" d="M 70 28 Q 75 22 80 19 L 84 28 Z" />

      {/* HEAD GROUP */}
      <g className="cat-head-grp">
        {/* Ears */}
        <polygon className="cat-ear ear-far"  points="74,16 76,7 81,15" />
        <polygon className="cat-ear-inner ear-far-i" points="76.5,14 77.5,10 80,14" />
        <polygon className="cat-ear ear-near" points="83,15 87,5 90,17" />
        <polygon className="cat-ear-inner ear-near-i" points="85,14 87.5,9 89,16" />

        {/* Head */}
        <ellipse className="cat-head" cx="83" cy="22" rx="10" ry="9.5" />
        <path className="cat-cheek" d="M 90 25 Q 95 26 93 28 Q 90 28 89 27 Z" />

        {/* Eye */}
        <g className="cat-eye-grp">
          <ellipse className={`cat-eye ${blinking ? "blink" : ""}`} cx="87" cy="20" rx="1.95" ry="2.55" />
          <circle className="cat-eye-shine" cx="86.3" cy="19" r="0.55" />
        </g>

        {/* Nose */}
        <path className="cat-nose" d="M 91.5 23.5 L 92.5 25 L 90.5 25 Z" />

        {/* Mouth (animates open for yawn/meow) */}
        <g className="cat-mouth-grp">
          <path className="cat-mouth" d="M 91.5 25 Q 90.5 27 89 26.2 M 91.5 25 Q 92.5 27 94 26.2" fill="none" strokeWidth={0.6} strokeLinecap="round" />
          {/* Open-mouth oval (visible only when mouth-open) */}
          <ellipse className="cat-mouth-open" cx="91.5" cy="26.6" rx="1.2" ry="1" />
          {/* Tongue */}
          <ellipse className="cat-tongue" cx="91.5" cy="27" rx="0.8" ry="0.5" />
        </g>

        {/* Whiskers */}
        <g className="cat-whiskers" strokeWidth={0.45}>
          <line x1="91" y1="24" x2="98" y2="22" />
          <line x1="91" y1="25" x2="99" y2="25" />
          <line x1="91" y1="26" x2="98" y2="28" />
        </g>
      </g>

      {/* Z's for sleep */}
      <g className="cat-zzz">
        <text x="86" y="14" fontSize="6" fontWeight="700">z</text>
        <text x="91" y="9"  fontSize="5" fontWeight="700">z</text>
      </g>

      {/* Hearts when petted */}
      <g className="cat-hearts" aria-hidden>
        <text x="86" y="10" fontSize="6">♥</text>
      </g>

      </g>{/* /cat-rig */}
    </svg>
  );
}
