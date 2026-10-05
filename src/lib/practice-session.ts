import { availablePractice } from "./insights";
import type { Lesson, PracticeItem } from "./types";

/** Resolve requested IDs back to this lesson's supported current material. */
export function sessionPractice(lesson: Lesson, requested: PracticeItem[], test = false) {
  const supported = new Map(availablePractice(lesson).map(item => [item.id, item]));
  const seen = new Set<string>();
  return requested.flatMap(item => {
    const current = supported.get(item.id);
    if (!current || seen.has(current.id) || test && current.kind !== "quiz") return [];
    seen.add(current.id);
    return [current];
  });
}

/** Use the deadline, so background tabs cannot extend a timed attempt. */
export function examSecondsLeft(deadline: number, now = Date.now()) {
  return Math.max(0, Math.ceil((deadline - now) / 1000));
}

export function sessionScore(items: PracticeItem[], results: Record<string, { correct: boolean }>, answers: Record<string, string>) {
  return {
    total: items.length,
    correct: items.filter(item => results[item.id]?.correct).length,
    answered: items.filter(item => item.kind === "flashcard" ? results[item.id] !== undefined : item.choices.includes(answers[item.id])).length,
    saved: items.filter(item => results[item.id] !== undefined).length,
  };
}
