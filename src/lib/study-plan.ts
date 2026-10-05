import { sourcePassages, validSourcePassage, isPdfPage, sourceLabel } from "./source-passages";
import { evidenceValid, safePractice } from "./evidence";
import { formatTime, type Citation, type Lesson, type PracticeItem, type Review, type StudyPassage } from "./types";

export type StudyPlanSource = { segmentId: string; quote: string; start?: number; end?: number;page?:number };
export type StudyPlanTopicStatus = "read_only" | "untried" | "in_progress" | "due" | "practised";
export type StudyPlanTopic = {
  id: string;
  lessonId: string;
  lessonVersion: number;
  title: string;
  description: string;
  kind: "note" | "practice" | "transcript";
  sources: StudyPlanSource[];
  practiceItemIds: string[];
  practiceCount: number;
  triedCount: number;
  dueCount: number;
  missedCount: number;
  nextDueAt: string | null;
  status: StudyPlanTopicStatus;
};
export type StudyPlanUnit = {
  lessonId: string;
  title: string;
  course: string;
  createdAt: string;
  duration: number;
  sourceKind?:"audio"|"pdf";sourcePageCount?:number;
  topics: StudyPlanTopic[];
  clearPassages: number;
  unclearPassages: number;
};
export type StudyPlanSummary = {
  lessons: number;
  topics: number;
  topicsWithPractice: number;
  topicsPractised: number;
  topicsDue: number;
  practiceItems: number;
  practiceItemsTried: number;
  practiceItemsDue: number;
};
export type StudyPlan = {
  courses: string[];
  units: StudyPlanUnit[];
  summary: StudyPlanSummary;
  next: { lessonId: string; topicId: string; action: "practice" | "read"; reason: "due" | "untried" | "read" } | null;
};

type PlanOptions = { course?: string | null; includeDemo?: boolean; now?: number };
type TopicDraft = Omit<StudyPlanTopic, "practiceCount" | "triedCount" | "dueCount" | "missedCount" | "nextDueAt" | "status">;

function sourceList(evidence: Citation[], segments: Map<string, StudyPassage>): StudyPlanSource[] {
  const seen = new Set<string>();
  return evidence.flatMap<StudyPlanSource>(citation => {
    const segment = segments.get(citation.segmentId);
    if (!segment || seen.has(segment.id)) return [];
    seen.add(segment.id);
    return [{ segmentId: segment.id, quote: citation.quote, ...(isPdfPage(segment)?{page:segment.page}:{start:segment.start,end:segment.end}) }];
  }).sort((a, b) => (a.page??a.start??0) - (b.page??b.start??0));
}

function safeReview(review: Review, lesson: Lesson, validItems: Set<string>): boolean {
  return review.lessonId === lesson.id && review.version === lesson.version && validItems.has(review.itemId)
    && Number.isInteger(review.attempts) && review.attempts > 0
    && Number.isFinite(Date.parse(review.dueAt));
}

function addProgress(draft: TopicDraft, reviews: Map<string, Review>, now: number): StudyPlanTopic {
  const saved = draft.practiceItemIds.flatMap(id => {
    const review = reviews.get(id);
    return review ? [review] : [];
  });
  const due = saved.filter(review => Date.parse(review.dueAt) <= now);
  const future = saved.map(review => review.dueAt).sort((a, b) => Date.parse(a) - Date.parse(b));
  const practiceCount = draft.practiceItemIds.length;
  const triedCount = saved.length;
  const status: StudyPlanTopicStatus = practiceCount === 0 ? "read_only"
    : due.length > 0 ? "due"
    : triedCount === 0 ? "untried"
    : triedCount < practiceCount || saved.some(review => !review.lastResult) ? "in_progress"
    : "practised";
  return {
    ...draft, practiceCount, triedCount, dueCount: due.length,
    missedCount: saved.filter(review => !review.lastResult).length,
    nextDueAt: future[0] ?? null, status,
  };
}

function lessonTopics(lesson: Lesson, reviews: Review[], now: number): StudyPlanTopic[] {
  const segments = new Map(sourcePassages(lesson).map(segment => [segment.id, segment]));
  const clear = sourcePassages(lesson).filter(segment => !segment.flags.length && segment.text.trim()&&validSourcePassage(segment));
  const notes = lesson.noteOptions?.enabled === false ? []
    : (lesson.artifacts?.notes ?? []).filter(note => note.heading.trim() && note.text.trim() && evidenceValid(note.evidence, sourcePassages(lesson)));
  const practice = lesson.artifacts ? safePractice(lesson.artifacts).filter(item => evidenceValid(item.evidence, sourcePassages(lesson))) : [];
  const drafts: TopicDraft[] = notes.map((note, index) => ({
    id: `${lesson.id}:${lesson.version}:note:${index}`, lessonId: lesson.id, lessonVersion: lesson.version,
    title: note.heading.trim(), description: note.text.trim(), kind: "note",
    sources: sourceList(note.evidence, segments), practiceItemIds: [],
  }));
  const unmatched = new Map<string, PracticeItem[]>();
  for (const item of practice) {
    // Attach a question only to a note that cites the same original passage.
    const matching = drafts.find(topic => topic.sources.some(source => item.evidence.some(citation => citation.segmentId === source.segmentId)));
    if (matching) matching.practiceItemIds.push(item.id);
    else {
      const key = item.evidence[0].segmentId;
      unmatched.set(key, [...(unmatched.get(key) ?? []), item]);
    }
  }
  for (const [segmentId, items] of unmatched) {
    const segment = segments.get(segmentId)!;
    drafts.push({
      id: `${lesson.id}:${lesson.version}:practice:${segmentId}`, lessonId: lesson.id, lessonVersion: lesson.version,
      title: `Practice from ${sourceLabel(segment)}`, description: segment.text, kind: "practice",
      sources: sourceList(items.flatMap(item => item.evidence), segments), practiceItemIds: items.map(item => item.id),
    });
  }
  // Notes-off or transcript-only lessons still give the student a truthful reading/listening step.
  if (!drafts.length && clear.length) {
    const first = clear[0];
    drafts.push({
      id: `${lesson.id}:${lesson.version}:transcript`, lessonId: lesson.id, lessonVersion: lesson.version,
      title: `${isPdfPage(first)?"Read":"Listen"} from ${sourceLabel(first)}`, description: first.text, kind: "transcript",
      sources: sourceList([{segmentId:first.id,quote:first.text}],segments), practiceItemIds: [],
    });
  }
  const validItems = new Set(practice.map(item => item.id));
  const saved = new Map<string, Review>();
  for (const review of reviews) {
    if (!safeReview(review, lesson, validItems)) continue;
    const current = saved.get(review.itemId);
    if (!current || review.attempts > current.attempts) saved.set(review.itemId, review);
  }
  return drafts.sort((a, b) => (a.sources[0]?.page??a.sources[0]?.start ?? 0) - (b.sources[0]?.page??b.sources[0]?.start ?? 0))
    .map(draft => addProgress(draft, saved, now));
}

/** Derive a plan from authorized lessons and this account's saved reviews; no writes or model calls. */
export function getStudyPlan(lessons: Lesson[], reviews: Review[], options: PlanOptions = {}): StudyPlan {
  const now = Number.isFinite(options.now) ? options.now! : Date.now();
  const eligible = lessons.filter(lesson => lesson.status === "ready" && (options.includeDemo || !lesson.demo));
  const courses = [...new Set(eligible.map(lesson => lesson.course))].sort((a, b) => a.localeCompare(b));
  const visible = eligible.filter(lesson => !options.course || lesson.course === options.course)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt) || a.id.localeCompare(b.id));
  const units = visible.map(lesson => ({
    lessonId: lesson.id, title: lesson.title, course: lesson.course, createdAt: lesson.createdAt, duration: lesson.duration,sourceKind:lesson.sourceKind,sourcePageCount:lesson.sourcePageCount,
    topics: lessonTopics(lesson, reviews, now),
    clearPassages: sourcePassages(lesson).filter(segment => !segment.flags.length && segment.text.trim()).length,
    unclearPassages: sourcePassages(lesson).filter(segment => segment.flags.length > 0).length,
  }));
  const topics = units.flatMap(unit => unit.topics);
  const summary: StudyPlanSummary = {
    lessons: units.length, topics: topics.length,
    topicsWithPractice: topics.filter(topic => topic.practiceCount > 0).length,
    topicsPractised: topics.filter(topic => topic.triedCount > 0).length,
    topicsDue: topics.filter(topic => topic.dueCount > 0).length,
    practiceItems: topics.reduce((sum, topic) => sum + topic.practiceCount, 0),
    practiceItemsTried: topics.reduce((sum, topic) => sum + topic.triedCount, 0),
    practiceItemsDue: topics.reduce((sum, topic) => sum + topic.dueCount, 0),
  };
  const recommended = topics.find(topic => topic.status === "due")
    ?? topics.find(topic => topic.status === "untried")
    ?? topics.find(topic => topic.status === "in_progress" && topic.triedCount < topic.practiceCount)
    ?? topics.find(topic => topic.status === "read_only")
    ?? null;
  const next = recommended ? {
    lessonId: recommended.lessonId, topicId: recommended.id,
    action: recommended.status === "read_only" ? "read" as const : "practice" as const,
    reason: recommended.status === "due" ? "due" as const : recommended.status === "read_only" ? "read" as const : "untried" as const,
  } : null;
  return { courses, units, summary, next };
}
