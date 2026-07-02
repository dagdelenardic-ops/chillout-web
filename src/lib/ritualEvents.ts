"use client";

import type { ChillRitual } from "@/data/rituals";

export const RITUAL_START_EVENT = "chillout:ritual-start";
export const RITUAL_APPLY_SCENE_EVENT = "chillout:ritual-apply-scene";
export const RITUAL_PICK_TRACK_EVENT = "chillout:ritual-pick-track";
export const RITUAL_APPLY_POMODORO_EVENT = "chillout:ritual-apply-pomodoro";

export type RitualStartDetail = {
  ritual: ChillRitual;
  startedAt: number;
};

export function startRitual(ritual: ChillRitual): void {
  if (typeof window === "undefined") return;
  const detail: RitualStartDetail = { ritual, startedAt: Date.now() };
  window.dispatchEvent(new CustomEvent(RITUAL_START_EVENT, { detail }));
  window.dispatchEvent(new CustomEvent(RITUAL_PICK_TRACK_EVENT, { detail: { mood: ritual.musicMood, seed: ritual.id } }));
  if (ritual.sceneId) window.dispatchEvent(new CustomEvent(RITUAL_APPLY_SCENE_EVENT, { detail: { sceneId: ritual.sceneId } }));
  if (ritual.pomodoroFocusMin) window.dispatchEvent(new CustomEvent(RITUAL_APPLY_POMODORO_EVENT, { detail: { focusMin: ritual.pomodoroFocusMin } }));
}
