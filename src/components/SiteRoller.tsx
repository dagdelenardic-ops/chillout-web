"use client";

import { useEffect, useMemo, useState } from "react";
import { discoverySites, sourceText } from "@/data/discoverySites";
import {
  getFirebaseServices,
  googleProvider,
  isCompleteFirebaseConfig,
} from "@/lib/firebase";
import { SiteSource } from "@/types/site";
import { User, onAuthStateChanged, signInWithPopup, signInWithRedirect } from "firebase/auth";
import {
  addDoc,
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";

type SourceFilter = SiteSource | "all";
type VoteValue = -1 | 0 | 1;

type SiteVoteEvent = {
  siteId: string;
  uid: string;
  value: VoteValue;
  createdAtMs: number;
};

type SiteVoteSummary = {
  likes: number;
  dislikes: number;
  score: number;
  myVote: VoteValue | 0;
};

const VIBE_LABELS = {
  rahatlatici: "Rahatlatıcı",
  sasirtici: "Şaşırtıcı",
  oyunlu: "Oyunlu",
  kesif: "Keşif",
} as const;

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function getDisplayName(user: User | null): string {
  if (!user) {
    return "Anonim";
  }

  return user.displayName ?? user.email ?? "Anonim";
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asVoteValue(value: unknown): VoteValue | null {
  if (value === 1 || value === -1 || value === 0) {
    return value;
  }

  return null;
}

export function SiteRoller() {
  const [filter, setFilter] = useState<SourceFilter>("all");
  const [selectedId, setSelectedId] = useState<string>(discoverySites[0]?.id ?? "");
  const [services] = useState(() => getFirebaseServices());
  const [user, setUser] = useState<User | null>(null);
  const [voteEvents, setVoteEvents] = useState<SiteVoteEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isVoting, setIsVoting] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);

  const auth = services?.auth ?? null;
  const db = services?.db ?? null;

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

    const votesQuery = query(
      collection(db, "singleRoomMessages"),
      orderBy("createdAt", "desc"),
      limit(5000)
    );

    const unsubscribe = onSnapshot(
      votesQuery,
      (snapshot) => {
        const nextVotes = snapshot.docs
          .map((siteVoteDoc) => {
            const data = siteVoteDoc.data() as Record<string, unknown>;
            if (asString(data.type) !== "site_vote") {
              return null;
            }
            const siteId = asString(data.siteId);
            const uid = asString(data.uid);
            const value = asVoteValue(data.value);
            const createdAtDate = (
              data.createdAt as { toDate?: () => Date } | undefined
            )?.toDate?.();
            if (!siteId || !uid || value === null) {
              return null;
            }

            return {
              siteId,
              uid,
              value,
              createdAtMs: createdAtDate ? createdAtDate.getTime() : 0,
            } satisfies SiteVoteEvent;
          })
          .filter((item): item is SiteVoteEvent => Boolean(item))
          .sort((a, b) => a.createdAtMs - b.createdAtMs);

        setVoteEvents(nextVotes);
      },
      () => {
        setError("Site oylamaları alınamadı. Firestore izinlerini kontrol et.");
      }
    );

    return () => unsubscribe();
  }, [db]);

  const voteSummaryBySite = useMemo(() => {
    const summary = new Map<string, SiteVoteSummary>();

    discoverySites.forEach((site) => {
      summary.set(site.id, { likes: 0, dislikes: 0, score: 0, myVote: 0 });
    });

    const latestByUserSite = new Map<string, SiteVoteEvent>();

    voteEvents.forEach((voteEvent) => {
      const key = `${voteEvent.uid}__${voteEvent.siteId}`;
      const prev = latestByUserSite.get(key);
      if (!prev || prev.createdAtMs <= voteEvent.createdAtMs) {
        latestByUserSite.set(key, voteEvent);
      }
    });

    latestByUserSite.forEach((vote) => {
      if (!summary.has(vote.siteId)) {
        return;
      }

      const current = summary.get(vote.siteId);
      if (!current) {
        return;
      }

      if (vote.value === 1) {
        current.likes += 1;
      } else if (vote.value === -1) {
        current.dislikes += 1;
      }

      if (user && vote.uid === user.uid) {
        current.myVote = vote.value;
      }

      current.score = current.likes - current.dislikes;
    });

    return summary;
  }, [voteEvents, user]);

  const filteredSites = useMemo(() => {
    const pool =
      filter === "all"
        ? discoverySites
        : discoverySites.filter((site) => site.source === filter);

    return [...pool].sort((left, right) => {
      const leftVote = voteSummaryBySite.get(left.id) ?? {
        likes: 0,
        dislikes: 0,
        score: 0,
        myVote: 0,
      };
      const rightVote = voteSummaryBySite.get(right.id) ?? {
        likes: 0,
        dislikes: 0,
        score: 0,
        myVote: 0,
      };

      if (rightVote.score !== leftVote.score) {
        return rightVote.score - leftVote.score;
      }

      if (rightVote.likes !== leftVote.likes) {
        return rightVote.likes - leftVote.likes;
      }

      return left.name.localeCompare(right.name, "tr");
    });
  }, [filter, voteSummaryBySite]);

  useEffect(() => {
    if (filteredSites.length === 0) {
      setSelectedId("");
      return;
    }

    const exists = filteredSites.some((site) => site.id === selectedId);
    if (!exists) {
      setSelectedId(filteredSites[0].id);
    }
  }, [filteredSites, selectedId]);

  const selectedSite =
    filteredSites.find((site) => site.id === selectedId) ?? filteredSites[0];

  const rollSite = () => {
    if (filteredSites.length === 0) {
      return;
    }

    const random = pickRandom(filteredSites);
    setSelectedId(random.id);
  };

  const openCurrent = () => {
    if (!selectedSite) {
      return;
    }

    window.open(selectedSite.url, "_blank", "noopener,noreferrer");
  };

  const voteForSite = async (siteId: string, value: VoteValue) => {
    if (!db || !auth || !user) {
      setError("Oy vermek için Google ile giriş yap.");
      return;
    }

    const currentVote = voteSummaryBySite.get(siteId)?.myVote ?? 0;
    const nextValue: VoteValue = currentVote === value ? 0 : value;
    setError(null);
    setIsVoting(true);

    try {
      await addDoc(collection(db, "singleRoomMessages"), {
        type: "site_vote",
        text: "",
        taskId: null,
        siteId,
        uid: user.uid,
        displayName: getDisplayName(user),
        value: nextValue,
        createdAt: serverTimestamp(),
      });
    } catch {
      setError("Oy gönderilemedi. Bağlantıyı kontrol edip tekrar dene.");
    } finally {
      setIsVoting(false);
    }
  };

  const signIn = async () => {
    if (!auth) {
      setError("Firebase bağlantısı yok. Konfigürasyonu kontrol et.");
      return;
    }

    setError(null);
    setIsSigningIn(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (reason) {
      const errorCode = asString(
        (reason as { code?: string } | null | undefined)?.code
      );
      if (errorCode === "auth/popup-blocked") {
        try {
          await signInWithRedirect(auth, googleProvider);
        } catch {
          setError("Google girişi başlatılamadı. Tekrar dene.");
        }
      } else {
        setError("Google girişi başarısız. Tekrar dene.");
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <article className="soft-card">
      <h2>İlginç Sitelerde Yuvarlan</h2>
      <p>
        Ekşi listesinden ve global seçimlerden derlenen siteler. Rastgele seç,
        yeni bir sekmede aç ve yoluna devam et.
      </p>

      <div className="inline-controls" style={{ marginBottom: 12 }}>
        <label htmlFor="source-filter">Kaynak</label>
        <select
          id="source-filter"
          value={filter}
          onChange={(event) => setFilter(event.target.value as SourceFilter)}
        >
          <option value="all">{sourceText.all}</option>
          <option value="eksi">{sourceText.eksi}</option>
          <option value="global">{sourceText.global}</option>
        </select>
      </div>

      <div className="vote-auth-row">
        <p className="meta-line">
          Sıralama global like/dislike skoruna göre canlı güncellenir. Aynı emojiye tekrar
          basarsan oyun kaldırılır.
        </p>
        {user ? (
          <p className="meta-line">Oy veriyorsun: {getDisplayName(user)}</p>
        ) : (
          <button
            type="button"
            className="secondary-btn"
            onClick={signIn}
            disabled={isSigningIn || !auth}
          >
            {isSigningIn ? "Giriş yapılıyor..." : "Oy vermek için Google ile giriş yap"}
          </button>
        )}
      </div>

      {selectedSite ? (
        <section className="roll-highlight" aria-live="polite">
          <h3>{selectedSite.name}</h3>
          <p>{selectedSite.description}</p>
          <p className="meta-line">
            Ruh hali: {VIBE_LABELS[selectedSite.vibe]} | Kaynak:{" "}
            {sourceText[selectedSite.source]}
          </p>
          <div className="vote-bar">
            <button
              type="button"
              className={`vote-btn ${voteSummaryBySite.get(selectedSite.id)?.myVote === 1 ? "active-like" : ""}`}
              onClick={() => voteForSite(selectedSite.id, 1)}
              disabled={isVoting || !db || !isCompleteFirebaseConfig(services?.config)}
              aria-label={`${selectedSite.name} beğen`}
            >
              👍 {voteSummaryBySite.get(selectedSite.id)?.likes ?? 0}
            </button>
            <button
              type="button"
              className={`vote-btn ${voteSummaryBySite.get(selectedSite.id)?.myVote === -1 ? "active-dislike" : ""}`}
              onClick={() => voteForSite(selectedSite.id, -1)}
              disabled={isVoting || !db || !isCompleteFirebaseConfig(services?.config)}
              aria-label={`${selectedSite.name} beğenme`}
            >
              👎 {voteSummaryBySite.get(selectedSite.id)?.dislikes ?? 0}
            </button>
            <span className="vote-score">
              Skor: {voteSummaryBySite.get(selectedSite.id)?.score ?? 0}
            </span>
          </div>
          <div className="roll-actions" style={{ marginTop: 16, display: "flex", gap: 10 }}>
            <button type="button" className="action-btn" onClick={rollSite}>
              Rastgele Seç
            </button>
            <button
              type="button"
              className="link-btn"
              onClick={openCurrent}
              disabled={!selectedSite}
            >
              Seçili Siteyi Aç
            </button>
          </div>
        </section>
      ) : null}

      {error ? <p className="note-warn">{error}</p> : null}

      <div className="roll-grid">
        {filteredSites.map((site) => {
          const vote = voteSummaryBySite.get(site.id) ?? {
            likes: 0,
            dislikes: 0,
            score: 0,
            myVote: 0,
          };

          return (
            <article className="roll-card" key={site.id}>
              <span className="source">{sourceText[site.source]}</span>
              <strong>{site.name}</strong>
              <p className="meta-line">{site.description}</p>
              <div className="vote-bar vote-bar-card">
                <button
                  type="button"
                  className={`vote-btn ${vote.myVote === 1 ? "active-like" : ""}`}
                  onClick={() => voteForSite(site.id, 1)}
                  disabled={isVoting || !db || !isCompleteFirebaseConfig(services?.config)}
                  aria-label={`${site.name} beğen`}
                >
                  👍 {vote.likes}
                </button>
                <button
                  type="button"
                  className={`vote-btn ${vote.myVote === -1 ? "active-dislike" : ""}`}
                  onClick={() => voteForSite(site.id, -1)}
                  disabled={isVoting || !db || !isCompleteFirebaseConfig(services?.config)}
                  aria-label={`${site.name} beğenme`}
                >
                  👎 {vote.dislikes}
                </button>
                <span className="vote-score">Skor: {vote.score}</span>
              </div>
              <a href={site.url} target="_blank" rel="noreferrer" className="ghost-btn">
                Siteye Git
              </a>
            </article>
          );
        })}
      </div>

      <p className="footer-note">
        Kaynak: Ekşi Sözlük &quot;az kişinin bildiği muhteşem web siteleri&quot;
        başlığı ve global internet keşif seçimleri.
      </p>
    </article>
  );
}
