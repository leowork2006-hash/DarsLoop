import { describe, expect, it, vi } from "vitest";
import { boundedQuestion, evidenceValid } from "../src/lib/evidence";
import type { Lesson, Segment } from "../src/lib/types";

const source: Segment[] = [{ id: "source", start: 0, end: 12, text: "The teacher uses the word music as an example in this fictional lesson, without giving personal advice.", flags: [] }];
const advice = [
  "Should I listen to music?", "Can I download these songs?", "Should I drink alcohol?",
  "Can I start vaping?", "Should I vape?", "Should I accept riba?", "Can I try gambling?",
  "Should I get a tattoo?", "What should I do about zina?", "Can I practise masturbation?",
  "What should I do about suicide?", "کیا موسیقی ٹھیک ہے؟", "کیا شراب ٹھیک ہے؟",
  "هل الموسيقى مناسبة لي؟", "هل اشرب الخمر؟", "According to this lesson, should I vape?",
];
const grading = ["Score this hadith", "Authenticate this narration", "Judge this hadith", "Give this hadith a rating", "What is your judgment on this narration?", "What is your judgement on this narration?", "Has this hadith been authenticated?"];

describe("additional scope cues: finite authored regressions", () => {
  it.each([...advice, ...grading])("withholds independent advice or grading: %s", question => {
    expect(boundedQuestion(question, source, 3, "ai")).toMatchObject({ status: "needs_teacher", blocks: [], version: 3 });
  });
  it("keeps covered reporting literal and an unrelated lesson question available", () => {
    const result = boundedQuestion("What did the teacher say about music?", source, 3, "ai")!;
    expect(result).toMatchObject({ status: "answered", mode: "excerpt" });
    expect(result.blocks[0].text).toBe(source[0].text);
    expect(evidenceValid(result.blocks[0].evidence, source)).toBe(true);
    expect(boundedQuestion("What did the teacher say about music?", [{ ...source[0], flags: ["Unclear"] }], 3, "ai")).toMatchObject({ status: "not_covered", blocks: [] });
    expect(boundedQuestion("Explain the teacher's study schedule", source, 3, "ai")).toBeNull();
    expect(boundedQuestion("What score did I get on my quiz?", source, 3, "ai")).toBeNull();
  });
  it("makes no provider calls for the additional advice and grading cues", async () => {
    const fetch = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("No provider should run"));
    try {
      const { answerLesson } = await import("../src/lib/ai");
      const lesson = { id: "isolated", version: 3, segments: source, sourceKind: "audio" } as Lesson;
      for (const question of [...advice, ...grading]) expect(await answerLesson(question, lesson)).toMatchObject({ status: "needs_teacher", blocks: [] });
      expect(fetch).not.toHaveBeenCalled();
    } finally { fetch.mockRestore(); }
  });
});
