import { describe, expect, it } from "vitest";
import { getRitualById, rituals } from "../data/rituals";
import { inferTrackMoods, pickTrackForMood } from "./musicMood";
import { createEmptyPassport, recordDiscoveryVisit, summarizePassport, toggleDiscoveryFavorite } from "./discoveryPassport";
import { pickCatCoachSuggestions } from "./catCoach";
import { summarizeFocusRoom } from "./focusRoom";

describe("chillout feature glue", () => {
  it("defines focused ritual presets that connect scene, music mood, tab and cat copy", () => {
    expect(rituals.length).toBeGreaterThanOrEqual(5);
    const deepFocus = getRitualById("deep-focus");
    expect(deepFocus).toBeTruthy();
    expect(deepFocus?.tab).toBe("pomodoro");
    expect(deepFocus?.sceneId).toBe("library");
    expect(deepFocus?.musicMood).toBe("focus");
    expect(deepFocus?.catLinePool.length).toBeGreaterThan(1);
  });

  it("infers useful music moods from filenames and picks matching tracks deterministically", () => {
    expect(inferTrackMoods("/music/Yağmur ve Şömine.mp3")).toContain("rainy");
    expect(inferTrackMoods("/music/Kristal Yörünge (8D).mp3")).toContain("space");
    const picked = pickTrackForMood(
      ["/music/FUNK.mp3", "/music/Yağmur ve Şömine.mp3", "/music/Neoclassical Guitar Chords.mp3"],
      "rainy",
      "ritual-seed"
    );
    expect(picked).toBe("/music/Yağmur ve Şömine.mp3");
  });

  it("tracks discovery passport visits, likes, skips and favorites as pure state", () => {
    let state = createEmptyPassport();
    state = recordDiscoveryVisit(state, { siteId: "sanger", vibe: "rahatlatici", vote: 1, now: 1_000 });
    state = recordDiscoveryVisit(state, { siteId: "neal-fun", vibe: "oyunlu", vote: -1, now: 2_000 });
    state = toggleDiscoveryFavorite(state, "sanger", 3_000);
    const summary = summarizePassport(state);
    expect(summary.totalVisited).toBe(2);
    expect(summary.liked).toBe(1);
    expect(summary.skipped).toBe(1);
    expect(summary.favoriteIds).toEqual(["sanger"]);
    expect(summary.topVibe).toBe("rahatlatici");
  });

  it("cat coach suggests high-value next actions from focus, discovery and hour context", () => {
    const night = pickCatCoachSuggestions({ focusToday: 0, likedDiscoveries: 0, hour: 23, activeTab: "kesfet" });
    expect(night.map((s) => s.ritualId)).toContain("night-drift");
    expect(night.map((s) => s.ritualId)).toContain("deep-focus");

    const playful = pickCatCoachSuggestions({ focusToday: 3, likedDiscoveries: 4, hour: 14, activeTab: "pomodoro" });
    expect(playful[0]?.kind).toBe("play");
  });

  it("summarizes focus room docs into active, completed and own-task counts", () => {
    const summary = summarizeFocusRoom([
      { id: "a", kind: "task", uid: "u1", displayName: "Ada", text: "Makale yaz", taskId: null, createdAtMs: 10 },
      { id: "b", kind: "task", uid: "u2", displayName: "Can", text: "Deploy", taskId: null, createdAtMs: 20 },
      { id: "c", kind: "task_complete", uid: "u2", displayName: "Can", text: "done", taskId: "b", createdAtMs: 30 },
    ], "u1");
    expect(summary.activeCount).toBe(1);
    expect(summary.completedCount).toBe(1);
    expect(summary.participantNames).toEqual(["Ada", "Can"]);
    expect(summary.ownActiveTask?.id).toBe("a");
  });
});
