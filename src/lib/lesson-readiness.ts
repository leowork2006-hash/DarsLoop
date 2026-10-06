import { sourcePassages } from "./source-passages";
import type { Lesson } from "./types";

export type LessonReadinessFilter = "all" | "ready" | "partial" | "preparing" | "failed";
export type LessonReadiness = {
  state: "queued" | "processing" | "ready" | "partial" | "source" | "attention";
  label: string;
  description: string;
  sourceReady: boolean;
  materialReady: boolean;
  needsAttention: boolean;
  retryEligible: boolean;
  coverageText: string;
};

// A completed upload or transcript is useful independently of its study material.
// Backend status="ready" also preserves source access after preparation failures.
export function lessonReadiness(lesson: Lesson): LessonReadiness {
  const sourceReady = !lesson.sourceImport && sourcePassages(lesson).length > 0
    && (lesson.sourceKind === "pdf" || lesson.transcriptionComplete === true || lesson.status === "ready");
  const retryEligible = !lesson.demo && !lesson.shared
    && (lesson.status === "failed" || lesson.status === "ready" && !!lesson.error);
  const base = { sourceReady, retryEligible, materialReady: false, needsAttention: false, coverageText: "" };
  if (lesson.status === "queued" || lesson.status === "processing") return {
    ...base, state: lesson.status, label: lesson.status === "queued" ? "Queued" : "Preparing",
    description: lesson.stage || "Study material is being prepared.",
  };
  if (lesson.status === "failed") return {
    ...base, state: "attention", label: "Needs attention", needsAttention: true,
    description: lesson.error || "Preparation stopped. Your saved source is available; try preparing it again.",
  };

  const notesEnabled = lesson.noteOptions?.enabled !== false;
  const hasMaterial = !!lesson.artifacts
    && (notesEnabled ? lesson.artifacts.notes.length > 0 : lesson.artifacts.practice.length > 0);
  if (lesson.error || !hasMaterial) return {
    ...base, state: !hasMaterial && sourceReady ? "source" : "attention",
    label: !hasMaterial && sourceReady ? "Source ready" : "Needs attention", needsAttention: true,
    description: lesson.error || "Your source is saved, but study material is not ready. Open the source to check it.",
  };

  const preparation = lesson.artifacts?.preparation;
  const practice = lesson.artifacts?.practice || [];
  const missingPractice = [!practice.some(item => item.kind === "quiz") ? "quiz questions" : "", !practice.some(item => item.kind === "flashcard") ? "flashcards" : ""].filter(Boolean);
  const practiceGap = missingPractice.length ? `Supported ${missingPractice.join(" and ")} could not be prepared. Open the available material or check the source.` : "";
  const total = preparation?.totalSections || 0;
  const uncovered = new Set(preparation?.uncoveredSections.filter(index => Number.isInteger(index) && index > 0 && index <= total));
  if (total > 0 && uncovered.size > 0) {
    const coverageText = `${notesEnabled ? "Notes" : "Study material"} cover ${total - uncovered.size} of ${total} source sections. Check the original source for the remaining sections.`;
    return { ...base, state: "partial", label: notesEnabled ? "Partial notes" : "Partial study material", description: [coverageText, practiceGap].filter(Boolean).join(" "), coverageText };
  }
  if (missingPractice.length) return {
    ...base, state: "partial", label: "Partial study material", description: practiceGap,
  };
  return { ...base, state: "ready", label: "Ready", materialReady: true, description: "Open your lesson to read, ask and practise." };
}

export function lessonMatchesReadinessFilter(lesson: Lesson, filter: LessonReadinessFilter): boolean {
  const readiness = lessonReadiness(lesson);
  return filter === "all" || (filter === "ready" ? readiness.materialReady
    : filter === "partial" ? readiness.state === "partial"
    : filter === "failed" ? readiness.needsAttention
    : readiness.state === "queued" || readiness.state === "processing");
}
