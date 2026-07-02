export type DiscoveryVote = -1 | 0 | 1;

export type DiscoveryPassportEntry = {
  siteId: string;
  vibe: string;
  visits: number;
  lastVisitedAt: number;
  vote: DiscoveryVote;
  favorite: boolean;
  favoritedAt?: number;
};

export type DiscoveryPassportState = {
  version: 1;
  entries: Record<string, DiscoveryPassportEntry>;
};

export type DiscoveryPassportSummary = {
  totalVisited: number;
  liked: number;
  skipped: number;
  favoriteIds: string[];
  topVibe: string | null;
  vibeCounts: Record<string, number>;
};

export const DISCOVERY_PASSPORT_KEY = "chillout_discovery_passport_v1";

export function createEmptyPassport(): DiscoveryPassportState {
  return { version: 1, entries: {} };
}

export function recordDiscoveryVisit(
  state: DiscoveryPassportState,
  input: { siteId: string; vibe: string; vote?: DiscoveryVote; now?: number }
): DiscoveryPassportState {
  const now = input.now ?? Date.now();
  const prev = state.entries[input.siteId];
  return {
    version: 1,
    entries: {
      ...state.entries,
      [input.siteId]: {
        siteId: input.siteId,
        vibe: input.vibe,
        visits: (prev?.visits ?? 0) + 1,
        lastVisitedAt: now,
        vote: input.vote ?? prev?.vote ?? 0,
        favorite: prev?.favorite ?? false,
        favoritedAt: prev?.favoritedAt,
      },
    },
  };
}

export function setDiscoveryVote(
  state: DiscoveryPassportState,
  siteId: string,
  vibe: string,
  vote: DiscoveryVote,
  now = Date.now()
): DiscoveryPassportState {
  const prev = state.entries[siteId];
  return {
    version: 1,
    entries: {
      ...state.entries,
      [siteId]: {
        siteId,
        vibe,
        visits: Math.max(1, prev?.visits ?? 0),
        lastVisitedAt: now,
        vote,
        favorite: prev?.favorite ?? false,
        favoritedAt: prev?.favoritedAt,
      },
    },
  };
}

export function toggleDiscoveryFavorite(
  state: DiscoveryPassportState,
  siteId: string,
  now = Date.now()
): DiscoveryPassportState {
  const prev = state.entries[siteId];
  if (!prev) return state;
  const favorite = !prev.favorite;
  return {
    version: 1,
    entries: {
      ...state.entries,
      [siteId]: { ...prev, favorite, favoritedAt: favorite ? now : undefined },
    },
  };
}

export function summarizePassport(state: DiscoveryPassportState): DiscoveryPassportSummary {
  const entries = Object.values(state.entries);
  const vibeScores: Record<string, number> = {};
  const vibeCounts: Record<string, number> = {};
  let liked = 0;
  let skipped = 0;

  entries.forEach((entry) => {
    if (entry.vote === 1) liked += 1;
    if (entry.vote === -1) skipped += 1;
    vibeCounts[entry.vibe] = (vibeCounts[entry.vibe] ?? 0) + 1;
    vibeScores[entry.vibe] = (vibeScores[entry.vibe] ?? 0) + (entry.vote === 1 ? 2 : entry.vote === -1 ? 0.25 : 1);
  });

  const topVibe = Object.entries(vibeScores).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? null;
  const favoriteIds = entries
    .filter((entry) => entry.favorite)
    .sort((a, b) => (b.favoritedAt ?? 0) - (a.favoritedAt ?? 0) || a.siteId.localeCompare(b.siteId))
    .map((entry) => entry.siteId);

  return { totalVisited: entries.length, liked, skipped, favoriteIds, topVibe, vibeCounts };
}

export function readDiscoveryPassport(): DiscoveryPassportState {
  if (typeof window === "undefined") return createEmptyPassport();
  try {
    const raw = window.localStorage.getItem(DISCOVERY_PASSPORT_KEY);
    if (!raw) return createEmptyPassport();
    const parsed = JSON.parse(raw) as Partial<DiscoveryPassportState>;
    if (parsed.version !== 1 || !parsed.entries || typeof parsed.entries !== "object") return createEmptyPassport();
    return { version: 1, entries: parsed.entries as Record<string, DiscoveryPassportEntry> };
  } catch {
    return createEmptyPassport();
  }
}

export function writeDiscoveryPassport(state: DiscoveryPassportState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DISCOVERY_PASSPORT_KEY, JSON.stringify(state));
    window.dispatchEvent(new CustomEvent("chillout:discovery-passport", { detail: summarizePassport(state) }));
  } catch {
    /* localStorage full/disabled — ignore */
  }
}
