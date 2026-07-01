"use client";

export const CAT_REACTION_EVENT = "chillout:cat-reaction";

export type CatReactionDetail = {
  line?: string;
  pool?: string[];
};

export function tellCat(detail: CatReactionDetail | string) {
  if (typeof window === "undefined") {
    return;
  }

  const payload: CatReactionDetail =
    typeof detail === "string" ? { line: detail } : detail;

  window.dispatchEvent(
    new CustomEvent(CAT_REACTION_EVENT, { detail: payload })
  );
}
