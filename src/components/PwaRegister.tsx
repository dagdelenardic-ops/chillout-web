"use client";

import { useEffect } from "react";

// Service worker'ı kaydeder (çevrimdışı kabuk + yüklenebilir PWA).
// Yerel geliştirmede (localhost) kayıt yapılmaz; Turbopack HMR'ı bozmasın diye.
export function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") {
      return;
    }
    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* sessiz başarısızlık — PWA olmadan da site çalışır */
      });
    };
    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register, { once: true });
      return () => window.removeEventListener("load", register);
    }
  }, []);

  return null;
}
