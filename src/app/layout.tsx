import type { Metadata, Viewport } from "next";
import { Fraunces, Sora } from "next/font/google";
import "./globals.css";
import { PwaRegister } from "@/components/PwaRegister";
import { PrefsSync } from "@/components/PrefsSync";

const sora = Sora({
  subsets: ["latin", "latin-ext"],
  variable: "--font-sans",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin", "latin-ext"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Chillout",
  description: "Müzik, odaklanma ve keşif.",
  manifest: "/manifest.webmanifest",
  applicationName: "Chillout",
  appleWebApp: {
    capable: true,
    title: "Chillout",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: "/icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#0d151e",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body className={`${sora.variable} ${fraunces.variable}`}>
        {children}
        <PwaRegister />
        <PrefsSync />
      </body>
    </html>
  );
}
