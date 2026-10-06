import { availablePractice } from "./insights";
import { evidenceValid, normalise } from "./evidence";
import { sourcePassages } from "./source-passages";
import type { Lesson, PracticeItem } from "./types";

/** Reuse a saved explanation only where both its wording and citations support this answer.
 * A shared segment alone is not enough: the item's displayed quotation must cover
 * every note citation, and the note must explicitly contain the answer phrase.
 * Require captured wording for this label; citation presence alone cannot prove
 * that a generated paraphrase explains the answer without changing its meaning.
 */
export function practiceAnswerNote(lesson: Lesson, item: PracticeItem) {
  const passages = sourcePassages(lesson);
  if (!evidenceValid(item.evidence, passages)) return null;
  const phrase = normalise(item.answer).trim().replace(/\s+/g, " ");
  if (phrase.length < 8) return null;
  return lesson.artifacts?.notes.find(note => {
    if (!evidenceValid(note.evidence, passages)) return false;
    const text = normalise(note.text).trim().replace(/\s+/g, " ");
    return ` ${text} `.includes(` ${phrase} `)
      && note.evidence.some(citation => ` ${normalise(citation.quote).trim().replace(/\s+/g, " ")} `.includes(` ${text} `))
      && note.evidence.every(citation => item.evidence.some(source => source.segmentId === citation.segmentId && source.quote.includes(citation.quote)));
  }) ?? null;
}

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

export const examFormats = ["multiple-choice", "true-false", "fill-blank", "written"] as const;
export type ExamFormat = typeof examFormats[number];
export type ExamPlan = Record<ExamFormat, number>;
export type ExamQuestion = {
  key: string;
  format: ExamFormat;
  source: PracticeItem;
  prompt: string;
  choices: string[];
  candidate?: string;
  maskedQuote?: string;
  missingWord?: string;
};
export const examFormatLabels: Record<ExamFormat, string> = {
  "multiple-choice": "Multiple choice", "true-false": "True / False", "fill-blank": "Fill in the blank", written: "Written recall",
};

/** Formatting tolerance only: no synonyms, translation or semantic/religious assessment. */
export function normalizeLiteralAnswer(value: string) {
  return value.normalize("NFKC").normalize("NFD").replace(/\p{M}/gu, mark => ["\u0653", "\u0654", "\u0655"].includes(mark) ? mark : "").normalize("NFC").replace(/\u0640/g, "")
    .replace(/[’‘]/g, "'").toLowerCase().trim().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "").replace(/\s+/g, " ");
}

const literalStopWords = new Set(["this", "that", "these", "those", "with", "from", "your", "their", "they", "then", "when", "what", "which", "have", "were", "been", "will", "would", "could", "should", "there", "about", "before", "after", "while", "into", "only", "also"]);
const criticalLiteralWords = new Set(["not", "no", "never", "only", "except", "unless", "if", "must", "shall", "don't", "doesn't", "isn't", "aren't", "wasn't", "weren't", "can't", "cannot", "won't", "without", "none", "neither", "nor", "ruling", "halal", "haram", "sahih", "daif", "hadith", "obligatory", "prohibited", "fard", "wajib", "forbidden", "permitted", "required", "condition", "grade", "authentic", "weak", "لا", "ليس", "لم", "لن", "حلال", "حرام", "حديث", "صحيح", "ضعيف", "واجب", "فرض", "شرط", "إلا", "الا", "إذا", "اذا", "إن", "ان", "نہیں", "نہ", "صرف", "اگر", "حدیث", "صحیح", "ضعیف", "لازم", "سوا", "مگر", "فتوى", "فتوی", "جائز", "ناجائز", "منع", "ممنوع"].map(normalizeLiteralAnswer));
export function literalCloze(item: PracticeItem): { maskedQuote: string; missingWord: string } | null {
  if (item.kind !== "flashcard") return null;
  for (const evidence of item.evidence) {
    const quote = evidence.quote;
    // Keep a whole captured passage; never manufacture a sentence or infer an answer.
    if (quote.length < 24 || quote.length > 450) continue;
    const words = [...quote.matchAll(/\p{L}[\p{L}\p{M}]*(?:['’][\p{L}\p{M}]+)*/gu)];
    // A conservative passage exclusion prevents blanks around negation, conditions, rulings or narration grades.
    if (words.some(word => criticalLiteralWords.has(normalizeLiteralAnswer(word[0]))
      || criticalLiteralWords.has(normalizeLiteralAnswer(word[0]).replace(/^[وف]/u, "").replace(/^(?:بال|لل|ال)/u, "")))) continue;
    const candidate = words.filter(word => normalizeLiteralAnswer(word[0]).length >= 4
      && !literalStopWords.has(normalizeLiteralAnswer(word[0]))
      && words.filter(other => normalizeLiteralAnswer(other[0]) === normalizeLiteralAnswer(word[0])).length === 1)
      .sort((a, b) => normalizeLiteralAnswer(b[0]).length - normalizeLiteralAnswer(a[0]).length)[0];
    if (candidate?.index !== undefined) return { maskedQuote: quote.slice(0, candidate.index) + "________" + quote.slice(candidate.index + candidate[0].length), missingWord: candidate[0] };
  }
  return null;
}

export function examPools(items: PracticeItem[]) {
  const unique = [...new Map(items.map(item => [item.id, item])).values()];
  const quiz = unique.filter(item => item.kind === "quiz");
  const cards = unique.filter(item => item.kind === "flashcard");
  return { quiz, cards, cloze: cards.filter(item => literalCloze(item) !== null) };
}
export function defaultExamPlan(items: PracticeItem[]): ExamPlan {
  return { "multiple-choice": examPools(items).quiz.length, "true-false": 0, "fill-blank": 0, written: 0 };
}
export function examFormatLimit(items: PracticeItem[], plan: ExamPlan, format: ExamFormat) {
  const pools = examPools(items);
  if (format === "multiple-choice") return Math.max(0, pools.quiz.length - plan["true-false"]);
  if (format === "true-false") return Math.max(0, pools.quiz.length - plan["multiple-choice"]);
  if (format === "fill-blank") return Math.max(0, Math.min(pools.cloze.length, pools.cards.length - plan.written));
  return Math.max(0, pools.cards.length - plan["fill-blank"]);
}
export function updateExamPlan(items: PracticeItem[], plan: ExamPlan, format: ExamFormat, value: number): ExamPlan {
  return { ...plan, [format]: Math.max(0, Math.min(examFormatLimit(items, plan, format), Math.trunc(Number.isFinite(value) ? value : 0))) };
}

/** Mix the complete ID, so sequential IDs do not expose an alternating answer pattern. */
function itemHash(id: string) {
  let hash = 2166136261;
  for (let position = 0; position < id.length; position++) hash = Math.imul(hash ^ id.charCodeAt(position), 16777619);
  hash = Math.imul(hash ^ (hash >>> 16), 0x7feb352d);
  hash = Math.imul(hash ^ (hash >>> 15), 0x846ca68b);
  return (hash ^ (hash >>> 16)) >>> 0;
}

/** Each canonical source item appears once. The format key stays stable across navigation and retries. */
export function buildExam(items: PracticeItem[], requested: ExamPlan,sourceKind?:"audio"|"pdf",language?:"ar"|"ur"|"en"): ExamQuestion[] {
  const pools = examPools(items), count = (value: number, max: number) => Math.max(0, Math.min(max, Math.trunc(Number.isFinite(value) ? value : 0)));
  const mcqCount = count(requested["multiple-choice"], pools.quiz.length);
  const tfCount = count(requested["true-false"], pools.quiz.length - mcqCount);
  const clozeCount = count(requested["fill-blank"], Math.min(pools.cloze.length, pools.cards.length));
  const cloze = pools.cloze.slice(0, clozeCount), used = new Set(cloze.map(item => item.id));
  const written = pools.cards.filter(item => !used.has(item.id)).slice(0, count(requested.written, pools.cards.length - clozeCount));
  const question = (source: PracticeItem, format: ExamFormat, extra: Partial<ExamQuestion> = {}): ExamQuestion => ({ key: `${format}:${source.id}`, source, format, prompt: source.question, choices: [], ...extra });
  return [
    ...pools.quiz.slice(0, mcqCount).map(source => question(source, "multiple-choice", { choices: source.choices })),
    ...pools.quiz.slice(mcqCount, mcqCount + tfCount).map(source => {
      const hash = itemHash(source.id), alternatives = source.choices.filter(choice => choice !== source.answer).sort();
      const candidate = (hash & 1) !== 0 || !alternatives.length ? source.answer : alternatives[(hash >>> 1) % alternatives.length];
      return question(source, "true-false", { prompt: language==="ar"?`هل يدعم الدرس هذه الإجابة عن السؤال «${source.question}»؟`:language==="ur"?`کیا سبق اس سوال کے جواب کی تائید کرتا ہے: “${source.question}”؟`:`Is this the supported answer to “${source.question}”?`, choices: language==="ar"?["صحيح","خطأ"]:language==="ur"?["درست","غلط"]:["True", "False"], candidate });
    }),
    ...cloze.map(source => question(source, "fill-blank", { prompt: language==="ar"?"تذكر الكلمة الأصلية الناقصة من الاقتباس.":language==="ur"?"اقتباس میں خالی جگہ کا اصل لفظ یاد کریں۔":"Recall the missing word from the captured wording.", ...literalCloze(source)! })),
    ...written.map(source => question(source, "written")),
  ];
}
export function examHasAnswer(question: ExamQuestion, answer: string | undefined) {
  return typeof answer === "string" && (question.choices.length ? question.choices.includes(answer) : answer.trim().length > 0);
}
export function automaticExamResult(question: ExamQuestion, answer: string | undefined): boolean | undefined {
  if (question.format === "written" || !examHasAnswer(question, answer)) return undefined;
  if (question.format === "fill-blank") return normalizeLiteralAnswer(answer!) === normalizeLiteralAnswer(question.missingWord!);
  if (question.format === "true-false") return (answer === question.choices[0]) === (question.candidate === question.source.answer);
  return answer === question.source.answer;
}
export function examReviewPayload(question: ExamQuestion, answer: string | undefined, version: number, remembered?: boolean) {
  if (!examHasAnswer(question, answer)) return null;
  const base = { itemId: question.source.id, version };
  if (question.format === "written") return typeof remembered === "boolean" ? { ...base, remembered } : null;
  if (question.format === "fill-blank") return { ...base, remembered: automaticExamResult(question, answer) === true };
  if (question.format === "true-false") {
    const selected = answer === question.choices[0] ? question.candidate! : question.candidate === question.source.answer
      ? question.source.choices.find(choice => choice !== question.source.answer)! : question.source.answer;
    return { ...base, answer: selected };
  }
  return { ...base, answer: answer! };
}
export function mixedExamScore(items: ExamQuestion[], results: Record<string, { correct: boolean }>, answers: Record<string, string>) {
  const automatic = items.filter(item => item.format !== "written"), written = items.filter(item => item.format === "written");
  return {
    total: items.length, answered: items.filter(item => examHasAnswer(item, answers[item.key])).length,
    saved: items.filter(item => results[item.key] !== undefined).length,
    automaticTotal: automatic.length, automaticAnswered: automatic.filter(item => examHasAnswer(item, answers[item.key])).length,
    automaticCorrect: automatic.filter(item => results[item.key]?.correct).length,
    writtenTotal: written.length, writtenAnswered: written.filter(item => examHasAnswer(item, answers[item.key])).length,
    writtenChecked: written.filter(item => results[item.key] !== undefined).length,
    writtenRemembered: written.filter(item => results[item.key]?.correct).length,
  };
}
