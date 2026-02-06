"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
} from "firebase/auth";
import {
  addDoc,
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import {
  FIREBASE_RUNTIME_STORAGE_KEY,
  getFirebaseServices,
  googleProvider,
  isCompleteFirebaseConfig,
  parseFirebaseConfigInput,
} from "@/lib/firebase";

type ChatMessage = {
  id: string;
  text: string;
  uid: string;
  displayName: string;
  createdAtLabel: string;
};

type ChatBoxProps = {
  isBreakPhase: boolean;
};

function extractErrorMeta(reason: unknown): { code: string; message: string } {
  if (typeof reason === "string") {
    return { code: "unknown", message: reason };
  }

  if (reason && typeof reason === "object") {
    const maybe = reason as { code?: unknown; message?: unknown };
    const code = typeof maybe.code === "string" ? maybe.code : "unknown";
    const message = typeof maybe.message === "string" ? maybe.message : "";
    return { code, message };
  }

  return { code: "unknown", message: "" };
}

function authHelpText(code: string, fallbackMessage: string): string {
  const normalized = code.toLowerCase();

  if (
    normalized === "auth/invalid-api-key" ||
    normalized.includes("api-key-not-valid")
  ) {
    return "Firebase API key hatalı. Vercel Environment Variables içindeki değerleri Firebase config'ten birebir kopyala.";
  }

  if (normalized === "auth/unauthorized-domain") {
    return "Bu domain Firebase > Authentication > Settings > Authorized domains listesinde olmalı.";
  }

  if (normalized === "auth/operation-not-allowed") {
    return "Firebase Authentication > Sign-in method içinde Google sağlayıcısı etkin olmalı.";
  }

  if (normalized === "auth/network-request-failed") {
    return "Ağ isteği başarısız. VPN/engel/bağlantıyı kontrol edip tekrar dene.";
  }

  if (normalized === "auth/popup-blocked") {
    return "Tarayıcı popup engelledi. İzin ver veya tekrar dene.";
  }

  if (normalized === "auth/popup-closed-by-user") {
    return "Google giriş penceresi erken kapatıldı. Tekrar dene.";
  }

  if (normalized === "auth/cancelled-popup-request") {
    return "Aynı anda birden fazla popup isteği başladı. Bir kez tıklayıp bekle.";
  }

  return fallbackMessage || "Firebase ayarlarını (Auth + Domain + env) kontrol edip tekrar dene.";
}

function formatCreatedAt(value: Date | null): string {
  if (!value) {
    return "şimdi";
  }

  return new Intl.DateTimeFormat("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

export function ChatBox({ isBreakPhase }: ChatBoxProps) {
  const [services, setServices] = useState(() => getFirebaseServices());
  const [user, setUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [setupDraft, setSetupDraft] = useState("");
  const [setupError, setSetupError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  const auth = services?.auth ?? null;
  const db = services?.db ?? null;
  const isFirebaseConfigured = Boolean(services);

  useEffect(() => {
    if (!auth) {
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
    });

    return () => unsubscribe();
  }, [auth]);

  useEffect(() => {
    if (!db) {
      return;
    }

    const roomQuery = query(
      collection(db, "singleRoomMessages"),
      orderBy("createdAt", "desc"),
      limit(80)
    );

    const unsubscribe = onSnapshot(
      roomQuery,
      (snapshot) => {
        const next = snapshot.docs
          .map((doc) => {
            const data = doc.data();
            const createdAt = data.createdAt?.toDate?.() ?? null;
            return {
              id: doc.id,
              text: (data.text as string) ?? "",
              uid: (data.uid as string) ?? "",
              displayName: (data.displayName as string) ?? "Anonim",
              createdAtLabel: formatCreatedAt(createdAt),
            };
          })
          .reverse();

        setMessages(next);
      },
      () => {
        setError("Mesajlar alınamadı. Firestore izinlerini kontrol et.");
      }
    );

    return () => unsubscribe();
  }, [db]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const canSend = Boolean(user) && draft.trim().length > 0;

  const statusText = useMemo(() => {
    if (!user) {
      return "Mesaj göndermek için Google ile giriş yap.";
    }
    if (!isBreakPhase) {
      return "Sohbet açık. Şu an odak modundasın, istersen yine mesaj yazabilirsin.";
    }
    return "Tek oda aktif. Kısa ve sakin mesajlar bırak.";
  }, [isBreakPhase, user]);

  const handleSetupSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSetupError(null);

    const parsed = parseFirebaseConfigInput(setupDraft);
    if (!parsed || !isCompleteFirebaseConfig(parsed)) {
      setSetupError("Firebase config eksik veya format hatalı.");
      return;
    }

    try {
      window.localStorage.setItem(
        FIREBASE_RUNTIME_STORAGE_KEY,
        JSON.stringify(parsed)
      );

      const next = getFirebaseServices(parsed);
      if (!next) {
        setSetupError("Config kaydedildi ama Firebase başlatılamadı.");
        return;
      }

      setServices(next);
      setSetupDraft("");
      setError(null);
      setIsSigningIn(false);
    } catch {
      setSetupError("Config kaydedilemedi. Tarayıcı izinlerini kontrol et.");
    }
  };

  const handleResetRuntimeConfig = () => {
    window.localStorage.removeItem(FIREBASE_RUNTIME_STORAGE_KEY);
    setServices(getFirebaseServices());
    setUser(null);
    setMessages([]);
    setSetupDraft("");
    setSetupError(null);
    setIsSigningIn(false);
  };

  const handleLogin = async () => {
    if (!auth) {
      return;
    }

    setError(null);
    setIsSigningIn(true);

    try {
      await signInWithPopup(auth, googleProvider);
    } catch (reason) {
      const popupMeta = extractErrorMeta(reason);
      const code = popupMeta.code;
      if (
        code === "auth/popup-blocked" ||
        code === "auth/popup-closed-by-user" ||
        code === "auth/operation-not-supported-in-this-environment" ||
        code === "auth/cancelled-popup-request"
      ) {
        try {
          await signInWithRedirect(auth, googleProvider);
          return;
        } catch (redirectReason) {
          const redirectMeta = extractErrorMeta(redirectReason);
          setError(
            `Google girişi başarısız (${redirectMeta.code}). ${authHelpText(
              redirectMeta.code,
              redirectMeta.message
            )}`
          );
          return;
        }
      }
      setError(
        `Google girişi başarısız (${code}). ${authHelpText(code, popupMeta.message)}`
      );
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleLogout = async () => {
    if (!auth) {
      return;
    }

    await signOut(auth);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!db || !user) {
      return;
    }

    const cleaned = draft.trim();
    if (!cleaned) {
      return;
    }

    setError(null);

    try {
      await addDoc(collection(db, "singleRoomMessages"), {
        text: cleaned,
        uid: user.uid,
        displayName: user.displayName ?? "Anonim",
        createdAt: serverTimestamp(),
      });
      setDraft("");
    } catch {
      setError("Mesaj gönderilemedi. Firestore yazma izinlerini kontrol et.");
    }
  };

  if (!isFirebaseConfigured) {
    return (
      <article className="soft-card chat-shell">
        <h2>Dinlen Sohbeti (Tek Oda)</h2>
        <p>
          Hızlı kurulum: Firebase web uygulama config&apos;ini buraya yapıştır,
          sohbet anında aktif olsun.
        </p>

        <form onSubmit={handleSetupSubmit} className="chat-shell">
          <textarea
            rows={7}
            placeholder={`{
  "apiKey": "...",
  "authDomain": "...",
  "projectId": "...",
  "storageBucket": "...",
  "messagingSenderId": "...",
  "appId": "..."
}`}
            value={setupDraft}
            onChange={(event) => setSetupDraft(event.target.value)}
          />
          <div className="inline-controls">
            <button type="submit" className="action-btn">
              Config Kaydet ve Sohbeti Aç
            </button>
          </div>
        </form>

        <p className="meta-line">
          Firebase Console &gt; Project settings &gt; Your apps &gt; SDK setup and
          config &gt; Config
        </p>

        {setupError ? <p className="error-text">{setupError}</p> : null}
      </article>
    );
  }

  return (
    <article className="soft-card chat-shell">
      <h2>Dinlen Sohbeti (Tek Oda)</h2>
      <p>{statusText}</p>

      {services?.source === "runtime" ? (
        <div className="inline-controls" style={{ justifyContent: "space-between" }}>
          <p className="meta-line" style={{ margin: 0 }}>
            Firebase ayarı tarayıcıda kayıtlı.
          </p>
          <button
            type="button"
            className="ghost-btn"
            onClick={handleResetRuntimeConfig}
          >
            Config Sıfırla
          </button>
        </div>
      ) : null}

      <div className="inline-controls">
        {!user ? (
          <button
            type="button"
            className="action-btn"
            onClick={handleLogin}
            disabled={isSigningIn}
          >
            {isSigningIn ? "Giriş Yapılıyor..." : "Google ile Giriş Yap"}
          </button>
        ) : (
          <>
            <p className="meta-line" style={{ margin: 0 }}>
              Giriş: <strong>{user.displayName ?? user.email}</strong>
            </p>
            <button type="button" className="ghost-btn" onClick={handleLogout}>
              Çıkış
            </button>
          </>
        )}
      </div>

      <div className="chat-list" role="log" aria-live="polite">
        {messages.length === 0 ? (
          <p className="meta-line">Henüz mesaj yok. İlk mesajı bırakabilirsin.</p>
        ) : (
          messages.map((message) => (
            <article key={message.id} className="chat-message">
              <strong>
                {message.displayName} - {message.createdAtLabel}
              </strong>
              <p>{message.text}</p>
            </article>
          ))
        )}
        <div ref={endRef} />
      </div>

      <form className="chat-form" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Mesajını yaz..."
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          disabled={!user}
          maxLength={240}
        />
        <button type="submit" className="secondary-btn" disabled={!canSend}>
          Gönder
        </button>
      </form>

      {error ? <p className="error-text">{error}</p> : null}
    </article>
  );
}
