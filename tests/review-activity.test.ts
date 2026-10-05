import { describe, expect, it } from "vitest";
import { boundedReviewActivity, nextReview } from "../src/lib/review-activity";

describe("bounded UTC review events",()=>{
 it("aggregates repeated saves on their UTC day across a UTC midnight",()=>{
  const first=nextReview("lesson",1,"quiz",false,undefined,Date.parse("2026-10-04T23:59:59Z"));
  const second=nextReview("lesson",1,"quiz",true,first,Date.parse("2026-10-04T23:59:59.500Z"));
  const third=nextReview("lesson",1,"quiz",true,second,Date.parse("2026-10-05T00:00:00Z"));
  expect(third.attempts).toBe(3);expect(third.activity).toEqual([{day:"2026-10-04",attempts:2},{day:"2026-10-05",attempts:1}]);
  expect(third.intervalDays).toBe(2);expect(third.dueAt).toBe("2026-10-07T00:00:00.000Z");
 });
 it("starts daily tracking with one real save for a legacy undated review",()=>{
  const old={itemId:"quiz",lessonId:"lesson",version:1,attempts:12,intervalDays:30,dueAt:"2026-10-05T01:00:00Z",lastResult:true};
  const next=nextReview("lesson",1,"quiz",false,old,Date.parse("2026-10-05T01:00:00Z"));
  expect(next.attempts).toBe(13);expect(next.activity).toEqual([{day:"2026-10-05",attempts:1}]);expect(next.intervalDays).toBe(0);expect(next.dueAt).toBe("2026-10-05T01:10:00.000Z");
 });
 it("retains exactly 84 UTC days and rejects invalid/future/negative dates or counts",()=>{
  const now=Date.parse("2026-10-05T01:00:00Z"),today=Date.parse("2026-10-05T00:00:00Z");
  const input=Array.from({length:90},(_,index)=>({day:new Date(today-index*86400_000).toISOString().slice(0,10),attempts:1}));
  const result=boundedReviewActivity([...input,{day:"2026-10-06",attempts:1},{day:"2026-02-30",attempts:1},{day:"2026-10-05",attempts:-3},{day:"2026-10-05",attempts:1.5}],now,90);
  expect(result).toHaveLength(84);expect(result.at(-1)).toEqual({day:"2026-10-05",attempts:1});expect(result[0].day).toBe(new Date(today-83*86400_000).toISOString().slice(0,10));
 });
});
