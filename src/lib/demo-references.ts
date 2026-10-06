import { demoScript } from "./demo";
import type { Lesson } from "./types";

// Background references for the authored fixture, not retrieved matches or
// scholarly approval. Personal lessons never acquire these references by title.
export const demoReferences = [
  { label: "HadeethEnc · Islam is built on five", url: "https://hadeethenc.com/en/browse/hadith/66512" },
  { label: "Dar Al-Ifta · The five pillars of Islam", url: "https://www.dar-alifta.org/en/article/details/65/the-5-pillars-of-islam" },
] as const;

export function hasCurrentDemoScript(lesson: Lesson) {
  return lesson.demo && lesson.segments.length === demoScript.length
    && lesson.segments.every((segment, index) => segment.text === demoScript[index]);
}
