import type { Workspace } from "./types";

export type PreparationNotice = { title: string; description: string };
export function preparationNotice(configured: Workspace["configured"], source: "audio" | "pdf" | "any" = "any"): PreparationNotice | null {
  if (!configured.generation) return {
    title: "Study-material preparation isn’t available here yet.",
    description: source === "pdf"
      ? "You can save a permitted PDF. Its notes, quizzes and flashcards will wait until preparation is connected."
      : source === "audio"
        ? "You can save a permitted recording. Its transcript, notes, quizzes and flashcards will wait until preparation is connected."
        : "You can save permitted files. New transcripts, notes, quizzes and flashcards will wait until preparation is connected.",
  };
  if (source !== "pdf" && !configured.asr) return {
    title: "Audio and video transcription isn’t available here yet.",
    description: source === "any"
      ? "You can save a permitted recording to the queue. Selectable-text PDFs can still be prepared."
      : "You can save this permitted recording to the queue. Its transcript and study material will wait until transcription is connected.",
  };
  return null;
}
