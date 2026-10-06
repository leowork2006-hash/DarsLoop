import { sourcePassages, validSourcePassage } from "./source-passages";
import { artifactSchema, evidenceValid, safePractice } from "./evidence";
import { boundedReviewActivity } from "./review-activity";
import type { Lesson, PracticeItem, Review, ReviewActivity } from "./types";


export function availablePractice(lesson: Lesson): PracticeItem[] {
  if (lesson.status !== "ready") return [];
  const parsed = artifactSchema.safeParse(lesson.artifacts);
  if (!parsed.success) return [];
  const segments = sourcePassages(lesson).filter(validSourcePassage), seen = new Set<string>();
  return safePractice(parsed.data).filter(item => {
    if (seen.has(item.id) || !item.question.trim() || !item.answer.trim() || !evidenceValid(item.evidence, segments)) return false;
    seen.add(item.id);
    return item.kind === "quiz" ? item.choices.length >= 2 && new Set(item.choices).size === item.choices.length
      && item.choices.includes(item.answer) : item.choices.length === 0;
  });
}

/** Derive private counts from current authorized lessons and saved responses; no mastery inference. */
export function studyInsights(lessons: Lesson[], reviews: Review[], now = Date.now()) {
  const clock = Number.isFinite(now) ? now : Date.now();
  const current = new Map<string, Lesson>();
  for (const lesson of lessons) {
    if (!lesson || lesson.demo || typeof lesson.id !== "string" || !lesson.id || typeof lesson.course !== "string"
      || !Number.isSafeInteger(lesson.version) || lesson.version < 1 || !["queued", "processing", "ready", "failed"].includes(lesson.status)) continue;
    const previous = current.get(lesson.id);
    if (!previous || lesson.version > previous.version) current.set(lesson.id, lesson);
  }
  const real = [...current.values()];
  const practice = new Map(real.map(lesson => [lesson.id, new Map(availablePractice(lesson).map(item => [item.id, item]))]));
  const saved = new Map<string, Review>();
  for (const review of reviews) {
    if (!review || !Number.isSafeInteger(review.attempts) || review.attempts < 1 || typeof review.lastResult !== "boolean"
      || !Number.isInteger(review.intervalDays) || review.intervalDays < 0 || review.intervalDays > 30
      || typeof review.dueAt !== "string" || !Number.isFinite(Date.parse(review.dueAt))) continue;
    const lesson = current.get(review.lessonId);
    if (!lesson || review.version !== lesson.version || !practice.get(lesson.id)?.has(review.itemId)) continue;
    const key = `${review.lessonId}:${review.version}:${review.itemId}`, previous = saved.get(key);
    if (!previous || review.attempts > previous.attempts) saved.set(key, review);
  }
  const valid = [...saved.values()];
  const pair = (review: Review) => ({ review, lesson: current.get(review.lessonId)!, item: practice.get(review.lessonId)!.get(review.itemId)! });
  const latest = valid.map(pair), revisits = latest.filter(({ review }) => !review.lastResult);
  const quiz = latest.filter(({ item }) => item.kind === "quiz"), cards = latest.filter(({ item }) => item.kind === "flashcard");
  const due = valid.filter(review => Date.parse(review.dueAt) <= clock);
  const daily = new Map<string, number>();
  for (const review of valid) for (const event of boundedReviewActivity(review.activity, clock, review.attempts)) {
    daily.set(event.day, (daily.get(event.day) ?? 0) + event.attempts);
  }
  const activity: ReviewActivity[] = [...daily].sort(([a], [b]) => a.localeCompare(b)).map(([day, attempts]) => ({ day, attempts }));
  const future = valid.filter(review => Date.parse(review.dueAt) > clock).sort((a, b) => Date.parse(a.dueAt) - Date.parse(b.dueAt));
  const dueItems=due.map(pair).sort((a,b)=>Number(a.review.lastResult)-Number(b.review.lastResult)||Date.parse(a.review.dueAt)-Date.parse(b.review.dueAt)||a.item.id.localeCompare(b.item.id));
  const untried=real.flatMap(lesson=>[...practice.get(lesson.id)!.values()].filter(item=>!saved.has(`${lesson.id}:${lesson.version}:${item.id}`)).map(item=>({lesson,item})));
  const recommendations:{lesson:Lesson;item:PracticeItem;reason:"due"|"revisit"|"new"}[]=[],suggested=new Set<string>();
  for(const candidate of [...dueItems.map(value=>({...value,reason:"due" as const})),...revisits.map(value=>({...value,reason:"revisit" as const})),...untried.map(value=>({...value,reason:"new" as const}))]){
    const key=`${candidate.lesson.id}:${candidate.item.id}`;
    if(suggested.has(key))continue;
    suggested.add(key);recommendations.push({lesson:candidate.lesson,item:candidate.item,reason:candidate.reason});if(recommendations.length===3)break;
  }
  const today=new Date(clock).toISOString().slice(0,10),weekStart=new Date(Date.parse(`${today}T00:00:00Z`)-6*86_400_000).toISOString().slice(0,10);
  const recent=activity.filter(event=>event.day>=weekStart);
  return {
    lessons: real.length,
    readyLessons: real.filter(lesson => lesson.status === "ready").length,
    audioSeconds: real.reduce((seconds, lesson) => seconds + Math.max(0, Number.isFinite(lesson.duration) ? lesson.duration : 0), 0),
    attempts: valid.reduce((attempts, review) => attempts + review.attempts, 0),
    reviewed: valid.length,
    currentReviews: valid,
    available: [...practice.values()].reduce((total, items) => total + items.size, 0),
    due: due.length,
    untried: untried.length,
    recommendations,
    recentWeek: { days:recent.length, attempts:recent.reduce((total,event)=>total+event.attempts,0) },
    missed: revisits.length,
    revisits,
    activity,
    trackedAttempts: activity.reduce((total, event) => total + event.attempts, 0),
    lastActivityDay: activity.at(-1)?.day ?? null,
    nextDueAt: future[0]?.dueAt ?? null,
    latestQuiz: { correct: quiz.filter(({ review }) => review.lastResult).length, total: quiz.length },
    cards: { remembered: cards.filter(({ review }) => review.lastResult).length, total: cards.length },
    courses: [...new Set(real.map(lesson => lesson.course))].map(course => {
      const courseLessons = real.filter(lesson => lesson.course === course), ids = new Set(courseLessons.map(lesson => lesson.id));
      const courseReviews = latest.filter(({ lesson }) => ids.has(lesson.id)), courseQuiz = courseReviews.filter(({ item }) => item.kind === "quiz");
      return {
        course, lessons: courseLessons.length,
        points: courseLessons.reduce((total, lesson) => total + (practice.get(lesson.id)?.size ?? 0), 0),
        reviewed: courseReviews.length,
        correctQuiz: courseQuiz.filter(({ review }) => review.lastResult).length, triedQuiz: courseQuiz.length,
        due: courseReviews.filter(({ review }) => Date.parse(review.dueAt) <= clock).length,
        missed: courseReviews.filter(({ review }) => !review.lastResult).length,
      };
    }),
  };
}
