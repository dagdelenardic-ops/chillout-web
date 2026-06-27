import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// iOS ana ekran ikonu (PNG). public/icon.svg ile aynı dili konuşur ama
// satori uyumlu olması için div'lerle çizilir.
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          gap: 14,
          background: "linear-gradient(135deg, #0d151e, #13202b)",
        }}
      >
        {[1, 0.85, 0.6].map((opacity, i) => (
          <div
            key={i}
            style={{
              width: 104,
              height: 12,
              borderRadius: 999,
              opacity,
              background: "linear-gradient(90deg, #6df0c2, #ffd373)",
            }}
          />
        ))}
      </div>
    ),
    size
  );
}
