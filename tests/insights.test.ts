import { describe, expect, it } from "vitest";
import { studyInsights } from "../src/lib/insights";
import { exampleLesson } from "../src/lib/example";
import type { Review } from "../src/lib/types";
const lesson={...exampleLesson(),id:"owned-lesson",demo:false};
const review:Review={lessonId:lesson.id,itemId:lesson.artifacts!.practice[0].id,version:1,attempts:3,lastResult:false,dueAt:"2026-10-04T12:00:00Z",intervalDays:0};
describe("private study insights",()=>{
 it("excludes samples, unauthorized items and outdated transcript versions",()=>{const data=studyInsights([lesson,exampleLesson()],[review,{...review,lessonId:"another-user"},{...review,version:2},{...review,itemId:"invented"},{...review,lessonId:"fictional-example"}],Date.parse("2026-10-04T12:01:00Z"));expect(data.lessons).toBe(1);expect(data.attempts).toBe(3);expect(data.reviewed).toBe(1);expect(data.due).toBe(1);expect(data.revisits).toHaveLength(1);expect(data.courses[0].reviewed).toBe(1);});
 it("a remembered response leaves revisits but still counts as tried, not mastery",()=>{const data=studyInsights([lesson],[{...review,lastResult:true,dueAt:"2026-10-06T12:00:00Z"}],Date.parse("2026-10-04T12:00:00Z"));expect(data.revisits).toEqual([]);expect(data.reviewed).toBe(1);expect(data.due).toBe(0);expect(data).not.toHaveProperty("mastery");expect(data).not.toHaveProperty("streak");});
 it("empty libraries have zero activity",()=>{expect(studyInsights([],[])).toMatchObject({lessons:0,audioSeconds:0,attempts:0,reviewed:0,due:0,revisits:[],courses:[]});});
 it("keeps quiz correctness separate from flashcard self-report and untried items",()=>{
  const quiz=lesson.artifacts!.practice.find(item=>item.kind==="quiz")!,card=lesson.artifacts!.practice.find(item=>item.id==="card-murajaah")!;
  const data=studyInsights([lesson],[{...review,itemId:quiz.id,lastResult:true},{...review,itemId:card.id,lastResult:false}],Date.parse("2026-10-04T12:01:00Z"));
  expect(data.latestQuiz).toEqual({correct:1,total:1});expect(data.cards).toEqual({remembered:0,total:1});
  expect(data.readyLessons).toBe(1);expect(data.available).toBeGreaterThan(2);expect(data.reviewed).toBe(2);expect(data.missed).toBe(1);
  expect(data.courses[0]).toMatchObject({correctQuiz:1,triedQuiz:1,due:2,missed:1,reviewed:2});
 });
 it("counts only recorded UTC events, never dates guessed from old review schedules",()=>{
  const card=lesson.artifacts!.practice.find(item=>item.id==="card-murajaah")!;
  const data=studyInsights([lesson],[{...review,attempts:10,activity:[{day:"2026-10-03",attempts:2},{day:"2026-10-04",attempts:1}]},{...review,itemId:card.id}],Date.parse("2026-10-04T12:00:00Z"));
  expect(data.attempts).toBe(13);expect(data.trackedAttempts).toBe(3);expect(data.activity).toEqual([{day:"2026-10-03",attempts:2},{day:"2026-10-04",attempts:1}]);
  expect(data.lastActivityDay).toBe("2026-10-04");expect(data).not.toHaveProperty("streak");
 });
 it("ignores malformed reviews and duplicates instead of inflating counts",()=>{
  const data=studyInsights([lesson],[review,review,{...review,attempts:NaN},{...review,attempts:-1},{...review,lastResult:"yes" as unknown as boolean},{...review,dueAt:"not-a-date"}],Date.parse("2026-10-04T12:01:00Z"));
  expect(data.attempts).toBe(3);expect(data.reviewed).toBe(1);expect(data.due).toBe(1);
 });
 it("excludes malformed, uncited and nonready practice from available and saved metrics",()=>{
  const card=lesson.artifacts!.practice[0];
  const invalid={...lesson,id:"invalid-practice",artifacts:{...lesson.artifacts!,practice:[{...card,evidence:[{segmentId:"missing",quote:"Invented unsupported words"}]}]}};
  const preparing={...lesson,id:"preparing",status:"processing" as const};
  const malformed={...lesson,id:"malformed",artifacts:{practice:[null]} as unknown as typeof lesson.artifacts};
  const data=studyInsights([invalid,preparing,malformed],[{...review,lessonId:invalid.id},{...review,lessonId:preparing.id},{...review,lessonId:malformed.id}]);
  expect(data.available).toBe(0);expect(data.reviewed).toBe(0);expect(data.attempts).toBe(0);expect(data.readyLessons).toBe(2);
 });
 it("aggregates dated events across lessons and selects only a future next due date",()=>{
  const second={...lesson,id:"second",course:"Another class"};
  const data=studyInsights([lesson,second],[{...review,activity:[{day:"2026-10-04",attempts:3}]},{...review,lessonId:second.id,dueAt:"2026-10-06T10:00:00Z",activity:[{day:"2026-10-04",attempts:2}]}],Date.parse("2026-10-04T12:01:00Z"));
  expect(data.activity).toEqual([{day:"2026-10-04",attempts:5}]);expect(data.trackedAttempts).toBe(5);expect(data.due).toBe(1);expect(data.nextDueAt).toBe("2026-10-06T10:00:00Z");
 });
 it("does not trust activity totals larger than the saved attempt count",()=>{
  const data=studyInsights([lesson],[{...review,activity:[{day:"2026-10-04",attempts:100}]}],Date.parse("2026-10-04T12:00:00Z"));
  expect(data.attempts).toBe(3);expect(data.trackedAttempts).toBe(0);expect(data.activity).toEqual([]);expect(data.lastActivityDay).toBeNull();
 });
});
