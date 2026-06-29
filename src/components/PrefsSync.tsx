"use client";

import { useEffect } from "react";
import { startPrefsSync } from "@/lib/prefsSync";

// Görünmez senkron köprüsü: kullanıcı (ChatBox üzerinden) Google ile giriş
// yaptığında tercihleri Firestore ile çift yönlü senkronlar. UI yok.
export function PrefsSync() {
  useEffect(() => {
    const stop = startPrefsSync();
    return stop;
  }, []);
  return null;
}
