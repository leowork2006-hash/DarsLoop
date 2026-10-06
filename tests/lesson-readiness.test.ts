import { describe, expect, it } from "vitest";
import { exampleLesson } from "../src/lib/example";
import { lessonMatchesReadinessFilter, lessonReadiness } from "../src/lib/lesson-readiness";
import type { Lesson } from "../src/lib/types";

const complete: Lesson = { ...exampleLesson(), id: "authored-readiness", demo: false, transcriptionComplete: true };
const sourceOnly: Lesson = { ...complete, artifacts: null, error: "Study preparation took too long. Your source is saved." };
const partial: Lesson = { ...complete, artifacts: { ...complete.artifacts!, preparation: { revision: "section-fidelity-v1", detail: "detailed", totalSections: 9, coveredSections: [1], uncoveredSections: [2, 3, 4, 5, 6, 7, 8, 9] } } };

describe("honest source and study readiness", () => {
  it("does not call a completed transcript with a generation error fully ready", () => {
    const result = lessonReadiness(sourceOnly);
    expect(result).toMatchObject({ state: "source", label: "Source ready", sourceReady: true, materialReady: false, needsAttention: true, retryEligible: true });
    expect(result.description).toContain("took too long");
    expect(lessonMatchesReadinessFilter(sourceOnly, "ready")).toBe(false);
    expect(lessonMatchesReadinessFilter(sourceOnly, "failed")).toBe(true);
  });

  it("identifies missing enabled notes even when legacy status says ready and has practice", () => {
    const lesson: Lesson = { ...complete, artifacts: { ...complete.artifacts!, notes: [] } };
    expect(lessonReadiness(lesson)).toMatchObject({ label: "Source ready", materialReady: false, needsAttention: true, retryEligible: false });
  });

  it("distinguishes source-only ready records without an error from full study success", () => {
    expect(lessonReadiness({ ...sourceOnly, error: null })).toMatchObject({ label: "Source ready", materialReady: false, retryEligible: false });
  });

  it("retains available old material but reports a failed detailed preparation", () => {
    expect(lessonReadiness({ ...complete, error: "Detailed notes could not be prepared.", materialFailure: "detailed" })).toMatchObject({ label: "Needs attention", sourceReady: true, materialReady: false, retryEligible: true });
  });

  it("reports detailed source coverage without declaring all study stages complete", () => {
    const result = lessonReadiness(partial);
    expect(result).toMatchObject({ state: "partial", label: "Partial notes", sourceReady: true, materialReady: false, retryEligible: false });
    expect(result.coverageText).toContain("1 of 9 source sections");
    expect(lessonMatchesReadinessFilter(partial, "ready")).toBe(false);
    expect(lessonMatchesReadinessFilter(partial, "partial")).toBe(true);
  });

  it("does not invent extra uncovered sections from duplicate or invalid metadata", () => {
    const lesson: Lesson = { ...partial, artifacts: { ...partial.artifacts!, preparation: { ...partial.artifacts!.preparation!, uncoveredSections: [2, 2, 0, 10] } } };
    expect(lessonReadiness(lesson).coverageText).toContain("8 of 9 source sections");
  });

  it("honors deliberately disabled notes when prepared practice exists", () => {
    const lesson: Lesson = { ...complete, noteOptions: { enabled: false, detail: "standard" }, artifacts: { ...complete.artifacts!, notes: [] } };
    expect(lessonReadiness(lesson)).toMatchObject({ label: "Ready", materialReady: true });
    expect(lessonReadiness({ ...lesson, artifacts: { ...lesson.artifacts!, practice: [] } }).materialReady).toBe(false);
  });

  it("retains prepared notes without calling a missing quiz fully ready", () => {
    const lesson: Lesson = { ...complete, artifacts: { ...complete.artifacts!, practice: complete.artifacts!.practice.filter(item => item.kind === "flashcard") } };
    expect(lessonReadiness(lesson)).toMatchObject({ state: "partial", label: "Partial study material", sourceReady: true, materialReady: false, retryEligible: false });
    expect(lessonReadiness(lesson).description).toContain("quiz questions could not be prepared");
    expect(lessonMatchesReadinessFilter(lesson, "ready")).toBe(false);
    expect(lessonMatchesReadinessFilter(lesson, "partial")).toBe(true);
  });

  it("names a missing flashcard set while retaining available quiz questions", () => {
    const lesson: Lesson = { ...complete, noteOptions: { enabled: false, detail: "standard" }, artifacts: { ...complete.artifacts!, notes: [], practice: complete.artifacts!.practice.filter(item => item.kind === "quiz") } };
    expect(lessonReadiness(lesson)).toMatchObject({ state: "partial", label: "Partial study material", materialReady: false, retryEligible: false });
    expect(lessonReadiness(lesson).description).toContain("flashcards could not be prepared");
  });

  it("keeps queued and processing semantics during a revision with old saved notes", () => {
    for (const status of ["queued", "processing"] as const) {
      const lesson: Lesson = { ...complete, status, stage: "Preparing detailed notes from your saved source" };
      expect(lessonReadiness(lesson)).toMatchObject({ state: status, sourceReady: true, materialReady: false, needsAttention: false, retryEligible: false });
      expect(lessonMatchesReadinessFilter(lesson, "preparing")).toBe(true);
      expect(lessonMatchesReadinessFilter(lesson, "ready")).toBe(false);
    }
  });

  it("keeps extracted PDF source available after a notes failure", () => {
    const lesson: Lesson = { ...sourceOnly, sourceKind: "pdf", segments: [], transcriptionComplete: false, pdfPages: [{ id: "v1-p1", page: 1, text: "Authored source", flags: [] }] };
    expect(lessonReadiness(lesson)).toMatchObject({ label: "Source ready", sourceReady: true, materialReady: false });
  });

  it("keeps failed jobs actionable without offering retries to shared or demo viewers", () => {
    const lesson: Lesson = { ...sourceOnly, status: "failed" };
    expect(lessonReadiness(lesson)).toMatchObject({ label: "Needs attention", sourceReady: true, retryEligible: true });
    expect(lessonReadiness({ ...lesson, shared: true }).retryEligible).toBe(false);
    expect(lessonReadiness({ ...lesson, demo: true }).retryEligible).toBe(false);
  });
});
