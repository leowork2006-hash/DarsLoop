import { describe, expect, it } from "vitest";
import { exampleLesson } from "../src/lib/example";
import { availablePractice } from "../src/lib/insights";
import { automaticExamResult, buildExam, defaultExamPlan, examFormatLimit, examHasAnswer, examPools, examReviewPayload, examSecondsLeft, literalCloze, mixedExamScore, normalizeLiteralAnswer, sessionPractice, sessionScore, updateExamPlan } from "../src/lib/practice-session";

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

describe("source-bound mixed mock exams", () => {
  const lesson = exampleLesson(), supported = availablePractice(lesson), pools = examPools(supported);
  const mixed = { "multiple-choice": 1, "true-false": 1, "fill-blank": 1, written: 1 };
  it("keeps MCQ as the default and extra formats optional", () => {
    expect(defaultExamPlan(supported)).toEqual({ "multiple-choice": pools.quiz.length, "true-false": 0, "fill-blank": 0, written: 0 });
  });
  it("allocates each canonical source once even with oversized, fractional and duplicate requests", () => {
    const attempts = buildExam([...supported, ...supported], { "multiple-choice": 1.9, "true-false": 99, "fill-blank": 1.5, written: 99 });
    expect(attempts).toHaveLength(supported.length);
    expect(new Set(attempts.map(item => item.source.id)).size).toBe(attempts.length);
    expect(new Set(attempts.map(item => item.key)).size).toBe(attempts.length);
    expect(buildExam(supported, mixed).map(item => item.key)).toEqual(buildExam(supported, mixed).map(item => item.key));
  });
  it("quantity limits reserve the items selected in the paired format and allow zero", () => {
    const plan = defaultExamPlan(supported);
    expect(examFormatLimit(supported, plan, "true-false")).toBe(0);
    expect(updateExamPlan(supported, plan, "true-false", 100)["true-false"]).toBe(0);
    const reduced = updateExamPlan(supported, plan, "multiple-choice", 1);
    expect(updateExamPlan(supported, reduced, "true-false", 100)["true-false"]).toBe(pools.quiz.length - 1);
    expect(updateExamPlan(supported, reduced, "written", -10).written).toBe(0);
    expect(updateExamPlan(supported, reduced, "written", NaN).written).toBe(0);
  });
  it("both True/False directions map back to a valid original quiz choice and unchanged version", () => {
    const questions = buildExam(supported, { "multiple-choice": 0, "true-false": pools.quiz.length, "fill-blank": 0, written: 0 });
    expect(questions.some(question => question.candidate === question.source.answer)).toBe(true);
    expect(questions.some(question => question.candidate !== question.source.answer)).toBe(true);
    for (const question of questions) for (const response of ["True", "False"]) {
      const payload = examReviewPayload(question, response, lesson.version)!;
      expect(payload.itemId).toBe(question.source.id);
      expect(payload.version).toBe(lesson.version);
      expect("answer" in payload && question.source.choices.includes(payload.answer)).toBe(true);
      expect("answer" in payload && payload.answer === question.source.answer).toBe(automaticExamResult(question, response));
    }
    expect(examReviewPayload(questions[0], "Invented", lesson.version)).toBeNull();
  });
  it("cloze removes one unique word from an exact captured quote and checks formatting, not synonyms", () => {
    const question = buildExam(supported, { "multiple-choice": 0, "true-false": 0, "fill-blank": 1, written: 0 })[0];
    expect(question.source.evidence.some(citation => citation.quote === question.maskedQuote!.replace("________", question.missingWord!))).toBe(true);
    expect(automaticExamResult(question, ` ${question.missingWord!.toUpperCase()}. `)).toBe(true);
    expect(automaticExamResult(question, "a different word")).toBe(false);
    expect(examReviewPayload(question, question.missingWord, lesson.version)).toEqual({ itemId: question.source.id, version: lesson.version, remembered: true });
    expect(normalizeLiteralAnswer(" CAFÉ ")).toBe("cafe");
    expect(normalizeLiteralAnswer(" مُرَاجَعَة ")).toBe("مراجعة");
    expect(normalizeLiteralAnswer("سَأَلَ")).toBe("سأل");
    expect(normalizeLiteralAnswer("سَأَلَ")).not.toBe(normalizeLiteralAnswer("سال"));
  });
  it("excludes English, Arabic and Urdu negation/conditions/ruling/grade passages rather than grading them", () => {
    for (const text of ["Do not replace the captured explanation with speculation.", "This is only permitted if the narration is sahih.", "یہ عمل حرام نہیں ہے اور شرط لازم ہے۔", "هذا الحديث ليس صحيحًا إلا بشرط مذكور.", "والحديث الضعيف له تفصيل في العبارة المذكورة.", "Don't infer an explanation from this sentence."]) {
      expect(literalCloze({ ...pools.cards[0], evidence: [{ segmentId: "source", quote: text }] })).toBeNull();
    }
    expect(literalCloze({ ...pools.cards[0], evidence: [{ segmentId: "source", quote: "The the the the the the the the." }] })).toBeNull();
  });
  it("unavailable cloze items stay out of the pool and written recall can still use the captured card", () => {
    const cards = pools.cards.map(item => ({ ...item, evidence: [{ segmentId: "source", quote: "Only recall this word if the condition applies." }] }));
    expect(examPools(cards).cloze).toHaveLength(0);
    expect(buildExam(cards, { "multiple-choice": 0, "true-false": 0, "fill-blank": 99, written: 99 })).toHaveLength(cards.length);
  });
  it("written recall has no automatic result or review payload until an explicit self-check", () => {
    const question = buildExam(supported, { "multiple-choice": 0, "true-false": 0, "fill-blank": 0, written: 1 })[0];
    expect(automaticExamResult(question, question.source.answer)).toBeUndefined();
    expect(examReviewPayload(question, question.source.answer, lesson.version)).toBeNull();
    expect(examReviewPayload(question, question.source.answer, lesson.version, false)).toEqual({ itemId: question.source.id, version: lesson.version, remembered: false });
    expect(examReviewPayload(question, " ", lesson.version, true)).toBeNull();
  });
  it("keeps automatic and self-assessed denominators separate, including unanswered timer items", () => {
    const fourSources = [...supported, { ...pools.cards[0], id: "written-fixture" }];
    const questions = buildExam(fourSources, mixed), mcq = questions[0], written = questions.at(-1)!;
    const responses = { [mcq.key]: mcq.source.answer, [written.key]: "My own wording" };
    const score = mixedExamScore(questions, { [mcq.key]: { correct: true }, [written.key]: { correct: true }, unrelated: { correct: true } }, responses);
    expect(score).toEqual({ total: 4, answered: 2, saved: 2, automaticTotal: 3, automaticAnswered: 1, automaticCorrect: 1, writtenTotal: 1, writtenAnswered: 1, writtenChecked: 1, writtenRemembered: 1 });
    expect(examHasAnswer(mcq, "wrong arbitrary choice")).toBe(false);
    expect(examHasAnswer(written, "   ")).toBe(false);
    expect(questions.filter(question => examReviewPayload(question, responses[question.key], lesson.version))).toEqual([mcq]);
  });
});
it("localizes derived True/False and blank prompts without translating source text or changing review IDs",()=>{
 const evidence=[{segmentId:"v1-p1",quote:"Leaves receive sunlight and roots absorb water.",page:1}];const quiz={id:"pdf-q",kind:"quiz" as const,question:"ما الذي تمتصه الجذور؟",answer:"الماء",choices:["الماء","ضوء الشمس"],evidence},card={id:"pdf-c",kind:"flashcard" as const,question:"استرجع النص",answer:evidence[0].quote,choices:[],evidence};
 for(const language of ["ar","ur"] as const){const questions=buildExam([quiz,card],{"multiple-choice":0,"true-false":1,"fill-blank":1,written:0},"pdf",language);const tf=questions[0];expect(tf.prompt).not.toContain("teacher");expect(tf.choices).toEqual(language==="ar"?["صحيح","خطأ"]:["درست","غلط"]);expect(automaticExamResult(tf,tf.choices[1])).toBe(true);expect(examReviewPayload(tf,tf.choices[1],1)).toEqual({itemId:"pdf-q",version:1,answer:"الماء"});expect(questions[1].source.evidence[0].quote).toBe(evidence[0].quote);expect(questions[1].prompt).not.toContain("Recall");}
});
