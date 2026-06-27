// Odak (Pomodoro) serisi takibi — günlük tamamlanan odak seansları log'u.
// localStorage'da { days: { "YYYY-MM-DD": adet } } tutar; seri, ısı haritası ve
// toplamları buradan türetir. Pomodoro tamamlanınca recordFocusSession() çağrılır
// ve "chillout:focus-complete" penceresel olayı yayınlanır (kedi + panel dinler).

export const FOCUS_LOG_KEY = "chillout_focus_log_v1";
export const FOCUS_COMPLETE_EVENT = "chillout:focus-complete";

export type FocusSummary = {
  today: number;
  week: number;
  total: number;
  streak: number;
  best: number;
  heatmap: { key: string; count: number; level: number }[];
};

type FocusLog = { days: Record<string, number> };

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function shiftDay(d: Date, deltaDays: number): Date {
  const next = new Date(d.getTime());
  next.setUTCDate(next.getUTCDate() + deltaDays);
  return next;
}

function readLog(): FocusLog {
  if (typeof window === "undefined") {
    return { days: {} };
  }
  try {
    const raw = window.localStorage.getItem(FOCUS_LOG_KEY);
    if (!raw) {
      return { days: {} };
    }
    const parsed = JSON.parse(raw) as Partial<FocusLog>;
    return { days: parsed.days && typeof parsed.days === "object" ? parsed.days : {} };
  } catch {
    return { days: {} };
  }
}

function writeLog(log: FocusLog): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(FOCUS_LOG_KEY, JSON.stringify(log));
  } catch {
    /* ignore */
  }
}

function levelFor(count: number): number {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count <= 3) return 2;
  if (count <= 5) return 3;
  return 4;
}

function summarize(log: FocusLog): FocusSummary {
  const days = log.days;
  const now = new Date();
  const todayKey = isoDay(now);
  const today = days[todayKey] ?? 0;

  let total = 0;
  Object.values(days).forEach((c) => {
    total += c;
  });

  // Bu hafta (son 7 gün)
  let week = 0;
  for (let i = 0; i < 7; i += 1) {
    week += days[isoDay(shiftDay(now, -i))] ?? 0;
  }

  // Mevcut seri — bugün varsa bugünden, yoksa dünden geriye doğru
  let streak = 0;
  for (let cursor = today > 0 ? 0 : -1; cursor > -3650; cursor -= 1) {
    const c = days[isoDay(shiftDay(now, cursor))] ?? 0;
    if (c <= 0) {
      break;
    }
    streak += 1;
  }

  // En iyi seri (tüm geçmiş)
  const sortedKeys = Object.keys(days)
    .filter((k) => (days[k] ?? 0) > 0)
    .sort();
  let best = 0;
  let run = 0;
  let prev: Date | null = null;
  sortedKeys.forEach((k) => {
    const d = new Date(`${k}T00:00:00.000Z`);
    if (prev && Math.round((d.getTime() - prev.getTime()) / 86_400_000) === 1) {
      run += 1;
    } else {
      run = 1;
    }
    best = Math.max(best, run);
    prev = d;
  });
  best = Math.max(best, streak);

  // Isı haritası — son 49 gün (eski → yeni)
  const heatmap: FocusSummary["heatmap"] = [];
  for (let i = 48; i >= 0; i -= 1) {
    const key = isoDay(shiftDay(now, -i));
    const count = days[key] ?? 0;
    heatmap.push({ key, count, level: levelFor(count) });
  }

  return { today, week, total, streak, best, heatmap };
}

export function getFocusSummary(): FocusSummary {
  return summarize(readLog());
}

export function recordFocusSession(): FocusSummary {
  const log = readLog();
  const key = isoDay(new Date());
  log.days[key] = (log.days[key] ?? 0) + 1;
  writeLog(log);
  const summary = summarize(log);
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(FOCUS_COMPLETE_EVENT, { detail: summary })
    );
  }
  return summary;
}
