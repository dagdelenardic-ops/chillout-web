import storiesData from "./okuDoomStories.json";

export type StoryTone =
  | "cold" | "cosmic" | "red" | "sepia" | "warm" | "ocean"
  | "ember" | "forest" | "violet" | "ice" | "amber" | "dusk";

export interface OkuStory {
  id: string;
  category: string;
  readTime: string;
  title: string;
  hook: string;
  body: string[];
  hero: {
    hue: number;
    tone: StoryTone | string;
  };
}

export const okuStories = storiesData as OkuStory[];

export const okuCategories = Array.from(
  new Set(okuStories.map((s) => s.category))
).sort();
