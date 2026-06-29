import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Chillout — Müzik, odak & keşif",
    short_name: "Chillout",
    description: "Müzik, odaklanma ve keşif. Rahatla, çalış, eğlen.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#0d151e",
    theme_color: "#0d151e",
    lang: "tr",
    categories: ["lifestyle", "productivity", "entertainment"],
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
