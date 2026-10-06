import { describe, expect, it } from "vitest";
import { studySkillsLesson as exampleLesson } from "./fixtures/study-skills";
import { getStudyPlan } from "../src/lib/study-plan";
import type { Lesson, Review } from "../src/lib/types";

const lesson: Lesson = { ...exampleLesson(), id: "saved-lesson", demo: false };
const item = lesson.artifacts!.practice[0];
const review: Review = {
  itemId: item.id, lessonId: lesson.id, version: lesson.version,
  attempts: 1, lastResult: false, dueAt: "2026-10-05T01:00:00.000Z", intervalDays: 0,
};

describe("evidence-backed study plan", () => {
  it("links saved practice to its supporting passage and reports due work without a mastery claim", () => {
    const plan = getStudyPlan([lesson, exampleLesson()], [
      review,
      { ...review, version: 99 },
      { ...review, itemId: "invented" },
    ], { now: Date.parse("2026-10-05T02:00:00.000Z") });
    expect(plan.units).toHaveLength(1);
    expect(plan.summary).toMatchObject({ lessons: 1, topics: 4, topicsWithPractice: 3, topicsPractised: 1, topicsDue: 1, practiceItems: 3, practiceItemsTried: 1, practiceItemsDue: 1 });
    const topic = plan.units[0].topics.find(topic => topic.practiceItemIds.includes(item.id))!;
    expect(topic.status).toBe("due");
    expect(topic.sources[0].quote).toContain("Listening and writing");
    expect(topic.sources[0].start).toBeGreaterThanOrEqual(0);
    expect(plan.next).toEqual({ lessonId: lesson.id, topicId: topic.id, action: "practice", reason: "due" });
    expect(plan.summary).not.toHaveProperty("mastered");
  });

  it("omits unsupported notes and falls back to the clear original transcript when notes are off", () => {
    const noNotes: Lesson = {
      ...lesson, noteOptions: { enabled: false, detail: "standard" },
      artifacts: { ...lesson.artifacts!, practice: [] },
    };
    const plan = getStudyPlan([noNotes], [review]);
    expect(plan.units[0].topics).toHaveLength(1);
    expect(plan.units[0].topics[0]).toMatchObject({ kind: "transcript", status: "read_only", practiceItemIds: [] });
    expect(plan.units[0].topics[0].sources[0].quote).toBe(noNotes.segments[0].text);
    expect(plan.summary.practiceItemsTried).toBe(0);
    const invalid: Lesson = {
      ...lesson,
      artifacts: {
        ...lesson.artifacts!, practice: [],
        notes: [{ heading: "Unsupported claim", text: "An invented statement", evidence: [{ segmentId: "wrong", quote: "An invented statement" }] }],
      },
    };
    expect(getStudyPlan([invalid], []).units[0].topics[0].kind).toBe("transcript");
  });
});
