import type { Review, ReviewActivity } from "./types";

const DAY_MS = 86_400_000;
export const REVIEW_ACTIVITY_DAYS = 84;

/** Dates record actual save events in UTC; due dates are never activity evidence. */
export function boundedReviewActivity(input: unknown, now = Date.now(), maximumAttempts?: number): ReviewActivity[] {
  if (!Array.isArray(input) || !Number.isFinite(now)) return [];
  const today = new Date(now).toISOString().slice(0, 10);
  const oldest = new Date(Date.parse(`${today}T00:00:00Z`) - (REVIEW_ACTIVITY_DAYS - 1) * DAY_MS).toISOString().slice(0, 10);
  const days = new Map<string, number>();
  for (const value of input) {
    if (!value || typeof value !== "object" || typeof value.day !== "string"
      || !/^\d{4}-\d{2}-\d{2}$/.test(value.day) || !Number.isSafeInteger(value.attempts) || value.attempts <= 0) continue;
    const timestamp = Date.parse(`${value.day}T00:00:00Z`);
    if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString().slice(0, 10) !== value.day
      || value.day < oldest || value.day > today) continue;
    const attempts = (days.get(value.day) ?? 0) + value.attempts;
    if (!Number.isSafeInteger(attempts)) return [];
    days.set(value.day, attempts);
  }
  const activity = [...days].sort(([a], [b]) => a.localeCompare(b)).map(([day, attempts]) => ({ day, attempts }));
  const total = activity.reduce((count, day) => count + day.attempts, 0);
  if (!Number.isSafeInteger(total) || (maximumAttempts !== undefined && total > maximumAttempts)) return [];
  return activity;
}

/** Append only the attempt being saved. Old undated attempts remain undated. */
export function nextReview(lessonId: string, version: number, itemId: string, correct: boolean, old?: Review, now = Date.now()): Review {
  const previousAttempts = Number.isSafeInteger(old?.attempts) && old!.attempts > 0 ? old!.attempts : 0;
  const previousInterval = Number.isInteger(old?.intervalDays) && old!.intervalDays >= 0 && old!.intervalDays <= 30 ? old!.intervalDays : 0;
  const intervalDays = correct ? Math.min(30, previousInterval < 1 ? 1 : previousInterval * 2) : 0;
  const activity = boundedReviewActivity(old?.activity, now, previousAttempts);
  const day = new Date(now).toISOString().slice(0, 10);
  const current = activity.find(value => value.day === day);
  if (current) current.attempts += 1;
  else activity.push({ day, attempts: 1 });
  return {
    itemId, lessonId, version,
    dueAt: new Date(now + (correct ? intervalDays * DAY_MS : 10 * 60_000)).toISOString(),
    intervalDays, attempts: previousAttempts + 1, lastResult: correct, activity,
  };
}
