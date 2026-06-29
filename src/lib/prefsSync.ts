// Hesap senkronu — kullanıcı Google ile giriş yapınca tercihleri Firestore'da
// users-only bir dokümana (userPrefs/{uid}) aynalar. Mevcut sohbet/oy/görev
// koleksiyonlarına DOKUNMAZ. Sadece beyaz listedeki localStorage anahtarları
// senkronlanır; cihaza özel firebase config'i hariç tutulur.

import { doc, getDoc, setDoc } from "firebase/firestore";
import { onAuthStateChanged, type User } from "firebase/auth";
import { getFirebaseServices } from "./firebase";

export const PREFS_PULLED_EVENT = "chillout:prefs-pulled";
const META_KEY = "chillout_prefs_sync_meta";
const COLLECTION = "userPrefs";

// Senkronlanacak anahtarlar. Sayısal/birikimli olanlar özel birleştirilir.
const SYNC_KEYS = [
  "chillout_audio_state_v1",
  "chillout_scene_state_v1",
  "chillout_focus_log_v1",
  "pomodoro-settings-v2",
  "pomodoro-stats-v2",
  "chillout-cat-v2",
  "chillout-oku-saved",
  "snake_doner_best_score_v1",
  "chillout_guest_name_v1",
] as const;

const FOCUS_KEY = "chillout_focus_log_v1";
const SNAKE_KEY = "snake_doner_best_score_v1";

type PrefData = Record<string, string>;
type SyncMeta = { updatedAt: number; sig: string };

function snapshotLocal(): PrefData {
  const out: PrefData = {};
  SYNC_KEYS.forEach((key) => {
    const v = window.localStorage.getItem(key);
    if (v !== null) {
      out[key] = v;
    }
  });
  return out;
}

function signature(data: PrefData): string {
  return SYNC_KEYS.map((k) => `${k}=${data[k] ?? ""}`).join("|");
}

function readMeta(): SyncMeta {
  try {
    const raw = window.localStorage.getItem(META_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<SyncMeta>;
      return {
        updatedAt: typeof parsed.updatedAt === "number" ? parsed.updatedAt : 0,
        sig: typeof parsed.sig === "string" ? parsed.sig : "",
      };
    }
  } catch {
    /* ignore */
  }
  return { updatedAt: 0, sig: "" };
}

function writeMeta(meta: SyncMeta): void {
  try {
    window.localStorage.setItem(META_KEY, JSON.stringify(meta));
  } catch {
    /* ignore */
  }
}

function mergeFocusLogs(localRaw?: string, remoteRaw?: string): string | undefined {
  if (!localRaw && !remoteRaw) return undefined;
  const parse = (raw?: string): Record<string, number> => {
    if (!raw) return {};
    try {
      const p = JSON.parse(raw) as { days?: Record<string, number> };
      return p.days && typeof p.days === "object" ? p.days : {};
    } catch {
      return {};
    }
  };
  const a = parse(localRaw);
  const b = parse(remoteRaw);
  const days: Record<string, number> = { ...a };
  Object.entries(b).forEach(([k, v]) => {
    days[k] = Math.max(days[k] ?? 0, Number(v) || 0);
  });
  return JSON.stringify({ days });
}

function mergeSnake(localRaw?: string, remoteRaw?: string): string | undefined {
  const a = Number(localRaw ?? NaN);
  const b = Number(remoteRaw ?? NaN);
  const best = Math.max(Number.isFinite(a) ? a : 0, Number.isFinite(b) ? b : 0);
  if (best <= 0 && localRaw === undefined && remoteRaw === undefined) return undefined;
  return String(best);
}

// Yerel + uzak veriyi birleştir. remoteWins: skaler anahtarlarda uzak öncelikli mi?
function merge(local: PrefData, remote: PrefData, remoteWins: boolean): PrefData {
  const result: PrefData = { ...local };
  SYNC_KEYS.forEach((key) => {
    if (key === FOCUS_KEY) {
      const merged = mergeFocusLogs(local[key], remote[key]);
      if (merged !== undefined) result[key] = merged;
      return;
    }
    if (key === SNAKE_KEY) {
      const merged = mergeSnake(local[key], remote[key]);
      if (merged !== undefined) result[key] = merged;
      return;
    }
    const hasRemote = remote[key] !== undefined;
    if (remoteWins && hasRemote) {
      result[key] = remote[key];
    } else if (!(key in result) && hasRemote) {
      result[key] = remote[key];
    }
  });
  return result;
}

function applyToLocal(data: PrefData): boolean {
  let changed = false;
  SYNC_KEYS.forEach((key) => {
    const v = data[key];
    if (v !== undefined && window.localStorage.getItem(key) !== v) {
      window.localStorage.setItem(key, v);
      changed = true;
    }
  });
  return changed;
}

let pushTimer: ReturnType<typeof setTimeout> | null = null;
let pollTimer: ReturnType<typeof setInterval> | null = null;
let lastUser: User | null = null;
let started = false;

async function pushIfChanged(uid: string): Promise<void> {
  const services = getFirebaseServices();
  if (!services) return;
  const local = snapshotLocal();
  const sig = signature(local);
  const meta = readMeta();
  if (sig === meta.sig) return; // değişiklik yok

  const updatedAt = Date.now();
  try {
    await setDoc(
      doc(services.db, COLLECTION, uid),
      { data: local, updatedAt },
      { merge: true }
    );
    writeMeta({ updatedAt, sig });
  } catch {
    /* Firestore kuralları izin vermiyorsa sessizce geç — yerel çalışmaya devam eder */
  }
}

function schedulePush(uid: string): void {
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => void pushIfChanged(uid), 1500);
}

async function onSignIn(user: User): Promise<void> {
  const services = getFirebaseServices();
  if (!services) return;
  const local = snapshotLocal();
  const meta = readMeta();

  let remote: PrefData = {};
  let remoteUpdatedAt = 0;
  try {
    const snap = await getDoc(doc(services.db, COLLECTION, user.uid));
    if (snap.exists()) {
      const d = snap.data() as { data?: PrefData; updatedAt?: number };
      remote = d.data && typeof d.data === "object" ? d.data : {};
      remoteUpdatedAt = typeof d.updatedAt === "number" ? d.updatedAt : 0;
    }
  } catch {
    return; // okuyamadık (kural/çevrimdışı) — senkron pasif
  }

  // Uzak, son yerel push'tan yeniyse skaler anahtarlarda uzak kazanır
  const remoteWins = remoteUpdatedAt > meta.updatedAt;
  const merged = merge(local, remote, remoteWins);

  const changed = applyToLocal(merged);
  const updatedAt = Math.max(Date.now(), remoteUpdatedAt + 1);
  try {
    await setDoc(
      doc(services.db, COLLECTION, user.uid),
      { data: merged, updatedAt },
      { merge: true }
    );
  } catch {
    /* ignore */
  }
  writeMeta({ updatedAt, sig: signature(merged) });

  if (changed && typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(PREFS_PULLED_EVENT));
  }
}

export function startPrefsSync(): () => void {
  if (started || typeof window === "undefined") {
    return () => {};
  }
  const services = getFirebaseServices();
  if (!services) {
    return () => {};
  }
  started = true;

  const unsubAuth = onAuthStateChanged(services.auth, (user) => {
    lastUser = user;
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
    if (!user) {
      return;
    }
    void onSignIn(user);
    // Yerel değişiklikleri periyodik olarak buluta it (her yazar için instrument gerekmez)
    pollTimer = setInterval(() => {
      if (lastUser) schedulePush(lastUser.uid);
    }, 15_000);
  });

  const onHide = () => {
    if (lastUser && document.visibilityState === "hidden") {
      void pushIfChanged(lastUser.uid);
    }
  };
  document.addEventListener("visibilitychange", onHide);

  return () => {
    unsubAuth();
    document.removeEventListener("visibilitychange", onHide);
    if (pollTimer) clearInterval(pollTimer);
    if (pushTimer) clearTimeout(pushTimer);
    started = false;
  };
}
