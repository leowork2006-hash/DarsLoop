import { beforeEach, describe, expect, it } from "vitest";
import { vi } from "vitest";
import { exampleLesson } from "../src/lib/example";
import type { Lesson, Review } from "../src/lib/types";

const cloud=vi.hoisted(()=>({lesson:null as Lesson|null,review:null as Review|null,writes:[] as URL[]}));
vi.mock("../src/lib/supabase/admin",async()=>{
 const {createClient}=await import("@supabase/supabase-js");
 const fetchFixture:typeof fetch=async(input,options)=>{
  const url=new URL(typeof input==="string"?input:input instanceof URL?input.href:input.url),method=options?.method??"GET";
  const response=(body:unknown,status=200)=>Response.json(body,{status});
  if(url.pathname.endsWith("/lessons"))return response(cloud.lesson&&url.searchParams.get("id")==="eq."+cloud.lesson.id?[{payload:cloud.lesson}]:[]);
  if(url.pathname.endsWith("/memberships"))return response([]);
  if(!url.pathname.endsWith("/reviews"))throw new Error("Unexpected fixture request");
  const identity=[url.searchParams.get("user_id"),url.searchParams.get("lesson_id"),url.searchParams.get("item_id"),url.searchParams.get("version")];
  if(method==="GET")return response(cloud.review?[{payload:structuredClone(cloud.review)}]:[]);
  const body=JSON.parse(String(options?.body));cloud.writes.push(url);
  if(method==="POST"){
   if(cloud.review)return response({code:"23505",message:"duplicate fixture row"},409);
   expect(body.user_id).toBe(cloud.lesson!.ownerId);expect(body.lesson_id).toBe(cloud.lesson!.id);expect(body.item_id).toBe("quiz-listening");expect(body.version).toBe(1);
   cloud.review=body.payload;return response({payload:cloud.review},201);
  }
  expect(identity).toEqual(["eq."+cloud.lesson!.ownerId,"eq."+cloud.lesson!.id,"eq.quiz-listening","eq.1"]);
  if(url.searchParams.get("payload")!=="eq."+JSON.stringify(cloud.review))return response([]);
  cloud.review=body.payload;return response([{payload:cloud.review}]);
 };
 return {adminClient:()=>createClient("https://fictional-test.invalid","fixture-only-key",{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:fetchFixture}}),rpc:()=>{throw new Error("Legacy RPC would erase activity");}};
});
const {saveReview}=await import("../src/lib/supabase/store");
const owner="b2a310ec-76fb-4e39-8a90-8e44cb23bca1";
const lesson={...exampleLesson(),id:"e6ae4880-58c3-44c1-aa8a-6ed2fc5b3a81",ownerId:owner,demo:false};
beforeEach(()=>{cloud.lesson=lesson;cloud.review=null;cloud.writes=[];});

describe("cloud review JSON persistence with mocked REST transport",()=>{
 it("retains old daily evidence while recording only one new event for undated legacy attempts",async()=>{
  cloud.review={itemId:"quiz-listening",lessonId:lesson.id,version:1,dueAt:"2026-10-01T00:00:00Z",intervalDays:1,attempts:5,lastResult:true};
  const saved=await saveReview(owner,lesson,"quiz-listening",false);
  expect(saved.attempts).toBe(6);expect(saved.activity).toEqual([{day:new Date().toISOString().slice(0,10),attempts:1}]);expect(cloud.review).toEqual(saved);
 });
 it("uses identity and JSON comparison to preserve simultaneous saves, including insert collision",async()=>{
  const responses=await Promise.all([saveReview(owner,lesson,"quiz-listening",false),saveReview(owner,lesson,"quiz-listening",true),saveReview(owner,lesson,"quiz-listening",true)]);
  expect(responses.map(value=>value.attempts).sort()).toEqual([1,2,3]);expect(cloud.review?.attempts).toBe(3);
  expect(cloud.review?.activity).toEqual([{day:new Date().toISOString().slice(0,10),attempts:3}]);
  expect(cloud.writes.some(url=>url.searchParams.has("payload"))).toBe(true);
 });
 it("makes no review writes when lesson ownership/access or transcript version changed",async()=>{
  await expect(saveReview("62430943-1a66-4f13-9377-52b533ebcb15",lesson,"quiz-listening",true)).rejects.toThrow("Lesson access ended");
  cloud.lesson={...lesson,version:2};await expect(saveReview(owner,lesson,"quiz-listening",true)).rejects.toThrow("lesson changed");
  expect(cloud.writes).toEqual([]);
 });
});
