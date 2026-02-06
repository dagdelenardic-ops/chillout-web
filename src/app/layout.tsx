import type { Metadata } from "next";
import { Fraunces, Sora } from "next/font/google";
import "./globals.css";

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
  title: "Chillout Hub",
  description:
    "Müzik, 25/5 pomodoro, dinlenme sohbeti ve rastgele ilginç web siteleri ile kafa dağıtma platformu.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body className={`${sora.variable} ${fraunces.variable}`}>{children}</body>
    </html>
  );
}
