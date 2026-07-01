"use client";

import { useEffect, useState } from "react";
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  where,
} from "firebase/firestore";
import { getFirebaseServices } from "@/lib/firebase";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

type CountState = "loading" | "ready" | "empty" | "error";

export function WeeklyVisitorCount() {
  const [services] = useState(() => getFirebaseServices());
  const [count, setCount] = useState(0);
  const [state, setState] = useState<CountState>(() =>
    services ? "loading" : "empty"
  );

  useEffect(() => {
    if (!services) {
      return;
    }

    const cutoff = Timestamp.fromMillis(Date.now() - WEEK_MS);
    const activityQuery = query(
      collection(services.db, "singleRoomMessages"),
      where("createdAt", ">=", cutoff),
      orderBy("createdAt", "desc"),
      limit(750)
    );

    const unsubscribe = onSnapshot(
      activityQuery,
      (snapshot) => {
        const people = new Set<string>();
        snapshot.docs.forEach((doc) => {
          const data = doc.data() as Record<string, unknown>;
          const uid = typeof data.uid === "string" ? data.uid.trim() : "";
          const name =
            typeof data.displayName === "string" ? data.displayName.trim() : "";
          const identity = uid || name || doc.id;
          if (identity) {
            people.add(identity);
          }
        });

        setCount(people.size);
        setState("ready");
      },
      () => {
        setState("error");
      }
    );

    return () => unsubscribe();
  }, [services]);

  const value =
    state === "loading"
      ? "..."
      : state === "error"
        ? "?"
        : count.toString();
  const label =
    state === "empty"
      ? "veri yok"
      : state === "error"
        ? "okunamadı"
        : "kişi uğradı";

  return (
    <div className="weekly-visitors-pill" title="Sohbet ve iş akışındaki son 7 günlük benzersiz aktif kişi sayısı">
      <span>son 1 hafta</span>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}
