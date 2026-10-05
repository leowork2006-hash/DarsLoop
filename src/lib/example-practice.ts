import type { Lesson, PracticeItem, Review } from "./types";

// This is transient UI feedback, never a saved account review or mastery measure.
export function exampleReview(lesson: Lesson, item: PracticeItem, correct: boolean): { correct: boolean; review: Review } {
  return { correct, review: {
    itemId: item.id, lessonId: lesson.id, version: lesson.version, attempts: 1, lastResult: correct,
    intervalDays: correct ? 1 : 0, dueAt: new Date(Date.now() + (correct ? 86400_000 : 600_000)).toISOString(),
  } };
}
