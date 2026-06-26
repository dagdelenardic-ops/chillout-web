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
}

export function CatSprite({ pose, action, blinking, earTwitch, mouthOpen, pupilDilate }: Props) {
  const cls = [
    "cat-svg",
    `pose-${pose}`,
    action ? `action-${action}` : "",
    earTwitch ? "ear-twitch" : "",
    mouthOpen ? "mouth-open" : "",
    pupilDilate ? "pupil-dilate" : "",
  ].filter(Boolean).join(" ");

  return (
    <svg viewBox="0 0 100 60" className={cls} aria-hidden>
      {/* Ground shadow */}
      <ellipse className="cat-shadow" cx="50" cy="56" rx="32" ry="3" />

      {/* TAIL - separate elements for layered animation */}
      <g className="cat-tail-grp">
        <path className="cat-tail" d="M 22 32 Q 8 26 6 12" fill="none" strokeWidth={4.5} strokeLinecap="round" />
        <path className="cat-tail-tip" d="M 6 12 L 6 9" fill="none" strokeWidth={4.5} strokeLinecap="round" />
      </g>

      {/* BACK LEGS */}
      <g className="cat-legs cat-back-legs">
        <rect className="cat-leg leg-back-far"  x="22" y="38" width="5" height="14" rx="2.4" />
        <rect className="cat-leg leg-back-near" x="30" y="38" width="5" height="14" rx="2.4" />
      </g>

      {/* BODY + belly + stripes */}
      <ellipse className="cat-body"  cx="50" cy="33" rx="28" ry="11" />
      <ellipse className="cat-belly" cx="52" cy="38" rx="22" ry="5.5" />
      <g className="cat-stripes">
        <path d="M 38 23 Q 39 27 38 31" />
        <path d="M 46 22 Q 47 26 46 30" />
        <path d="M 54 22 Q 55 26 54 30" />
        <path d="M 62 23 Q 63 27 62 31" />
      </g>

      {/* FRONT LEGS - the near front leg can lift for paw-lick */}
      <g className="cat-legs cat-front-legs">
        <rect className="cat-leg leg-front-far"  x="64" y="38" width="5" height="14" rx="2.4" />
        <rect className="cat-leg leg-front-near" x="72" y="38" width="5" height="14" rx="2.4" />
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
          <ellipse className={`cat-eye ${blinking ? "blink" : ""}`} cx="87" cy="20" rx="1.5" ry="2.2" />
          <circle className="cat-eye-shine" cx="86.6" cy="19.5" r="0.5" />
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
    </svg>
  );
}
