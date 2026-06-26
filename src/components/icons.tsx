"use client";

// =====================================================
// Özel SVG ikon seti — currentColor ile renklenir.
// Hepsi 24x24 viewBox, ince çizgi (stroke) stili.
// =====================================================

type IconProps = {
  size?: number;
  className?: string;
  strokeWidth?: number;
};

function base(size = 24, className = "", strokeWidth = 1.7) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
    "aria-hidden": true,
  };
}

/* ---------- Sekme ikonları ---------- */

export function IconTimer({ size, className, strokeWidth }: IconProps) {
  return (
    <svg {...base(size, className, strokeWidth)}>
      <path d="M10 2h4" />
      <path d="M12 14V8" />
      <circle cx="12" cy="14" r="8" />
      <path d="M19 6.5 17.5 8" />
    </svg>
  );
}

export function IconCompass({ size, className, strokeWidth }: IconProps) {
  return (
    <svg {...base(size, className, strokeWidth)}>
      <circle cx="12" cy="12" r="9.2" />
      <path d="M15.6 8.4 13.4 13.4 8.4 15.6 10.6 10.6Z" />
      <circle cx="12" cy="12" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconBook({ size, className, strokeWidth }: IconProps) {
  return (
    <svg {...base(size, className, strokeWidth)}>
      <path d="M12 5.5C10.5 4 8 3.5 4 3.8v13.4c4-.3 6.5.2 8 1.8" />
      <path d="M12 5.5C13.5 4 16 3.5 20 3.8v13.4c-4-.3-6.5.2-8 1.8" />
      <path d="M12 5.5V19" />
    </svg>
  );
}

export function IconSnake({ size, className, strokeWidth }: IconProps) {
  return (
    <svg {...base(size, className, strokeWidth)}>
      <path d="M6 19c4 0 4-4 0-4S2 11 6 11h7c3 0 3-4 0-4H8" />
      <circle cx="17.5" cy="6" r="0.6" fill="currentColor" stroke="none" />
      <path d="M17 8.4c1.3-.4 2.4-1.5 2.4-3" />
    </svg>
  );
}

export function IconPuzzle({ size, className, strokeWidth }: IconProps) {
  return (
    <svg {...base(size, className, strokeWidth)}>
      <path d="M10 4.5a1.6 1.6 0 0 1 3.1 0c0 .9.7 1.2 1.4 1.2H17a1 1 0 0 1 1 1v2.4c0 .7.3 1.4 1.2 1.4a1.6 1.6 0 0 1 0 3.1c-.9 0-1.2.7-1.2 1.4V18a1 1 0 0 1-1 1h-2.4c-.7 0-1.4.3-1.4 1.2a1.6 1.6 0 0 1-3.1 0c0-.9-.7-1.2-1.4-1.2H6a1 1 0 0 1-1-1v-2.4c0-.7-.3-1.4-1.2-1.4a1.6 1.6 0 0 1 0-3.1c.9 0 1.2-.7 1.2-1.4V6.7a1 1 0 0 1 1-1h2.6c.7 0 1.4-.3 1.4-1.2Z" />
    </svg>
  );
}

/* ---------- Vibe (kart) ikonları ---------- */

export function IconLeaf({ size, className, strokeWidth }: IconProps) {
  return (
    <svg {...base(size, className, strokeWidth)}>
      <path d="M5 19c-1-7 4-13 14-13 0 10-6 14-12 12" />
      <path d="M5 19c2-5 5-7 9-8.5" />
    </svg>
  );
}

export function IconSparkle({ size, className, strokeWidth }: IconProps) {
  return (
    <svg {...base(size, className, strokeWidth)}>
      <path d="M12 3c.5 4 1.5 5 5.5 6-4 1-5 2-5.5 6-.5-4-1.5-5-5.5-6 4-1 5-2 5.5-6Z" />
      <path d="M18.5 14.5c.2 1.4.6 1.9 2 2.2-1.4.4-1.8.9-2 2.3-.3-1.4-.7-1.9-2.1-2.3 1.4-.3 1.8-.8 2.1-2.2Z" />
    </svg>
  );
}

export function IconGamepad({ size, className, strokeWidth }: IconProps) {
  return (
    <svg {...base(size, className, strokeWidth)}>
      <path d="M7 8.5h10a4 4 0 0 1 4 4l-.6 3.5a2.4 2.4 0 0 1-4.3 1L14.5 15h-5l-1.6 2a2.4 2.4 0 0 1-4.3-1L3 12.5a4 4 0 0 1 4-4Z" />
      <path d="M7 11v2.5M5.8 12.2h2.4" />
      <circle cx="16" cy="11.6" r="0.7" fill="currentColor" stroke="none" />
      <circle cx="17.6" cy="13.2" r="0.7" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconTelescope({ size, className, strokeWidth }: IconProps) {
  return (
    <svg {...base(size, className, strokeWidth)}>
      <path d="m3.5 13.5 9-3 1.8 4-9 3z" />
      <path d="m12.5 10.5 5.5-2 1.6 3.4-5.3 1.9z" />
      <path d="M9 14.5 12 21M9.5 16l-3 4.5" />
      <circle cx="12" cy="20.6" r="0.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

/* ---------- Marka işareti ---------- */

export function IconWave({ size, className, strokeWidth }: IconProps) {
  return (
    <svg {...base(size, className, strokeWidth)}>
      <path d="M2 9c2.5-3 5-3 7.5 0s5 3 7.5 0 5-3 5-3" />
      <path d="M2 15c2.5-3 5-3 7.5 0s5 3 7.5 0 5-3 5-3" />
    </svg>
  );
}

/* ---------- Animasyonlu hava durumu ikonları ---------- */
// CSS sınıfları (globals.css) ile canlanır.

export function WeatherSVG({ mood, size = 30 }: { mood: string; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 32 32",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className: `wx-svg wx-${mood}`,
    "aria-hidden": true,
  };

  if (mood === "sunny") {
    return (
      <svg {...common}>
        <g className="wx-sun-rays">
          {[...Array(8)].map((_, i) => (
            <line
              key={i}
              x1="16"
              y1="3.5"
              x2="16"
              y2="6.5"
              transform={`rotate(${i * 45} 16 16)`}
            />
          ))}
        </g>
        <circle className="wx-sun-core" cx="16" cy="16" r="5.5" />
      </svg>
    );
  }

  if (mood === "cloudy") {
    return (
      <svg {...common}>
        <circle className="wx-sun-core wx-sun-peek" cx="11" cy="12" r="4" />
        <path className="wx-cloud" d="M9 22h12a4 4 0 0 0 .4-7.98A5.5 5.5 0 0 0 11 13a4.2 4.2 0 0 0-2 9Z" />
      </svg>
    );
  }

  if (mood === "foggy") {
    return (
      <svg {...common}>
        <path className="wx-cloud" d="M8 17h12a4 4 0 0 0 .4-7.98A5.5 5.5 0 0 0 10 8a4.2 4.2 0 0 0-2 9Z" />
        <g className="wx-fog">
          <line x1="6" y1="21" x2="24" y2="21" />
          <line x1="8" y1="24.5" x2="22" y2="24.5" />
        </g>
      </svg>
    );
  }

  if (mood === "snowy") {
    return (
      <svg {...common}>
        <path className="wx-cloud" d="M8 16h12a4 4 0 0 0 .4-7.98A5.5 5.5 0 0 0 10 7a4.2 4.2 0 0 0-2 9Z" />
        <g className="wx-snow">
          <circle cx="11" cy="22" r="1" fill="currentColor" stroke="none" />
          <circle cx="16" cy="25" r="1" fill="currentColor" stroke="none" />
          <circle cx="21" cy="22" r="1" fill="currentColor" stroke="none" />
        </g>
      </svg>
    );
  }

  if (mood === "stormy") {
    return (
      <svg {...common}>
        <path className="wx-cloud" d="M8 15h12a4 4 0 0 0 .4-7.98A5.5 5.5 0 0 0 10 6a4.2 4.2 0 0 0-2 9Z" />
        <path className="wx-bolt" d="M16 16l-3 5h3l-1.5 4 5-6h-3l2-3z" fill="currentColor" stroke="none" />
      </svg>
    );
  }

  // rainy (default)
  return (
    <svg {...common}>
      <path className="wx-cloud" d="M8 16h12a4 4 0 0 0 .4-7.98A5.5 5.5 0 0 0 10 7a4.2 4.2 0 0 0-2 9Z" />
      <g className="wx-rain">
        <line x1="11" y1="21" x2="10" y2="25" />
        <line x1="16" y1="21" x2="15" y2="25" />
        <line x1="21" y1="21" x2="20" y2="25" />
      </g>
    </svg>
  );
}

export const TAB_ICONS = {
  pomodoro: IconTimer,
  roller: IconCompass,
  oku: IconBook,
  snake: IconSnake,
  bulmaca: IconPuzzle,
} as const;

export const VIBE_ICONS = {
  rahatlatici: IconLeaf,
  sasirtici: IconSparkle,
  oyunlu: IconGamepad,
  kesif: IconTelescope,
} as const;
