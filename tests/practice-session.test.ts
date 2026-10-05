import { describe, expect, it } from "vitest";
import { exampleLesson } from "../src/lib/example";
import { availablePractice } from "../src/lib/insights";
import { examSecondsLeft, sessionPractice, sessionScore } from "../src/lib/practice-session";

describe("supported practice sessions", () => {
  const lesson = exampleLesson(), supported = availablePractice(lesson), quiz = supported.filter(item => item.kind === "quiz");
  it("resolves actual current lesson items and rejects arbitrary, duplicate or unsupported questions", () => {
    const requested = [{ ...quiz[0], question: "Injected replacement", answer: "Invented answer" }, quiz[0], { ...quiz[0], id: "another-lesson" }];
    expect(sessionPractice(lesson, requested)).toEqual([quiz[0]]);
    const unclear = { ...lesson, segments: lesson.segments.map(segment => ({ ...segment, flags: ["unclear"] })) };
    expect(sessionPractice(unclear, supported)).toEqual([]);
    expect(sessionPractice({ ...lesson, status: "processing" }, supported)).toEqual([]);
  });
  it("uses only quizzes for mock exams, while preserving requested source order", () => {
    expect(sessionPractice(lesson, [...supported].reverse(), true)).toEqual([...quiz].reverse());
  });
  it("a background-tab time jump expires the deadline rather than extending it", () => {
    expect(examSecondsLeft(61_000, 1_000)).toBe(60);
    expect(examSecondsLeft(61_000, 60_001)).toBe(1);
    expect(examSecondsLeft(61_000, 70_000)).toBe(0);
  });
  it("keeps unanswered questions in the attempt denominator without inventing saved responses", () => {
    expect(quiz.length).toBeGreaterThan(1);
    expect(sessionScore(quiz, { [quiz[0].id]: { correct: true }, unrelated: { correct: true } }, { [quiz[0].id]: quiz[0].answer, [quiz[1].id]: "not a choice" })).toEqual({ total: quiz.length, correct: 1, answered: 1, saved: 1 });
  });
});
