import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { cloudDemoId, DEMO_SEED_REVISION } from "../src/lib/demo-seed";
import { studySkillsArtifacts, studySkillsLesson } from "./fixtures/study-skills";
import { demoTitle } from "../src/lib/demo";
import type { Lesson } from "../src/lib/types";

const cloud=vi.hoisted(()=>({rows:new Map<string,Lesson>(),metadata:{} as Record<string,unknown>,writes:[] as URL[],authReads:0,onPatch:null as (()=>void)|null}));
const owner="b2a310ec-76fb-4e39-8a90-8e44cb23bca1";
vi.mock("../src/lib/supabase/admin",async()=>{
 const {createClient}=await import("@supabase/supabase-js");
 const fetchFixture:typeof fetch=async(input,options)=>{
  const url=new URL(typeof input==="string"?input:input instanceof URL?input.href:input.url),method=options?.method??"GET";
  const response=(body:unknown)=>Response.json(body);
  if(url.pathname.startsWith("/auth/v1/admin/users/")){
   const id=url.pathname.split("/").at(-1);expect(id).toBe(owner);
   if(method==="GET"){cloud.authReads++;return response({id,user_metadata:structuredClone(cloud.metadata)});}
   expect(method).toBe("PUT");cloud.writes.push(url);const updates=JSON.parse(String(options?.body)).user_metadata;
   expect(Object.keys(updates).sort()).toEqual(["darsloop_example_added","darsloop_example_revision"]);
   cloud.metadata={...cloud.metadata,...updates};return response({id,user_metadata:cloud.metadata});
  }
  if(!url.pathname.endsWith("/lessons"))throw new Error("Unexpected offline seed request");
  const id=url.searchParams.get("id")?.slice(3),wantedOwner=url.searchParams.get("owner_id")?.slice(3);
  if(method==="GET"){
   expect(wantedOwner).toBe(owner);const lesson=id?cloud.rows.get(id):undefined;
   return response(lesson?.ownerId===wantedOwner?[{payload:structuredClone(lesson)}]:[]);
  }
  cloud.writes.push(url);const body=JSON.parse(String(options?.body));expect(body.owner_id).toBe(owner);expect(body.payload.ownerId).toBe(owner);
  if(method==="POST"){
   expect(url.searchParams.get("on_conflict")).toBe("id");expect(new Headers(options?.headers).get("prefer")).toContain("resolution=ignore-duplicates");
   if(!cloud.rows.has(body.id))cloud.rows.set(body.id,body.payload);return response([]);
  }
  expect(method).toBe("PATCH");expect(wantedOwner).toBe(owner);cloud.onPatch?.();cloud.onPatch=null;
  const lesson=id?cloud.rows.get(id):undefined;
  if(!lesson||lesson.ownerId!==wantedOwner||url.searchParams.get("version")!==`eq.${lesson.version}`||url.searchParams.get("payload")!=="eq."+JSON.stringify(lesson))return response([]);
  cloud.rows.set(lesson.id,body.payload);return response([{payload:body.payload}]);
 };
 return {adminClient:()=>createClient("https://offline-seed.invalid","fixture-only-key",{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:fetchFixture}}),rpc:()=>{throw new Error("No RPC needed for example preference");}};
});
const {seedDemo}=await import("../src/lib/supabase/store");
const legacy=():Lesson=>{const segments=JSON.parse(readFileSync("fixtures/demo-timing.json","utf8"));return {...studySkillsLesson(),id:cloudDemoId(owner),ownerId:owner,title:"Demo lesson · Listening, catch-up & revision",course:"Adab of learning",stage:"Prepared example",segments,artifacts:studySkillsArtifacts(segments),audioPath:"fixtures/demo.mp3"};};
beforeEach(()=>{cloud.rows.clear();cloud.metadata={darsloop_onboarding:"keep-this",otherPreference:true};cloud.writes=[];cloud.authReads=0;cloud.onPatch=null;});

describe("system-demo upgrade via mocked cloud transport only",()=>{
 it("refreshes the deterministic legacy lesson once and preserves personal content and other metadata",async()=>{
  const old=legacy(),personal={...old,id:randomUUID(),demo:false,title:"My original upload",audioPath:"private/original-audio"};
  expect(old.id).toBe("a135ab05-51ce-5941-8772-340f374a3e63"); // Exact prior seed algorithm for this synthetic owner.
  cloud.rows.set(old.id,old);cloud.rows.set(personal.id,personal);cloud.metadata.darsloop_example_added=true;
  await seedDemo(owner);const current=cloud.rows.get(old.id)!;
  expect(current).toMatchObject({id:old.id,createdAt:old.createdAt,ownerId:owner,version:2,title:`Demo lesson · ${demoTitle}`,audioPath:"fixtures/demo-five-pillars.mp3"});
  expect(cloud.rows.get(personal.id)).toEqual(personal);expect(cloud.metadata).toMatchObject({otherPreference:true,darsloop_onboarding:"keep-this",darsloop_example_added:true,darsloop_example_revision:DEMO_SEED_REVISION});
  const writes=cloud.writes.length;await seedDemo(owner);expect(cloud.writes).toHaveLength(writes);expect(cloud.rows.get(old.id)).toEqual(current);
 });
 it("remembers deletion across old-marker upgrade, while a fresh account seeds current content once",async()=>{
  cloud.metadata.darsloop_example_added=true;await seedDemo(owner);expect(cloud.rows.size).toBe(0);
  cloud.metadata={};await Promise.all([seedDemo(owner),seedDemo(owner)]);expect(cloud.rows.size).toBe(1);expect(cloud.rows.get(cloudDemoId(owner))?.version).toBe(1);
  cloud.rows.delete(cloudDemoId(owner));await seedDemo(owner);expect(cloud.rows.size).toBe(0);
 });
 it("upgrades the original unprefixed authored legacy title without broadening passage identity",async()=>{
  const old={...legacy(),title:"Listening, catch-up & revision"};cloud.rows.set(old.id,old);cloud.metadata.darsloop_example_added=true;
  await seedDemo(owner);expect(cloud.rows.get(old.id)).toMatchObject({id:old.id,createdAt:old.createdAt,version:2,title:`Demo lesson · ${demoTitle}`});
  const current=structuredClone(cloud.rows.get(old.id));await seedDemo(owner);expect(cloud.rows.get(old.id)).toEqual(current);
 });
 it("preserves custom/foreign/personal occupants even at the deterministic ID and never replaces a different-ID old demo",async()=>{
  for(const change of [{title:"Customized example"},{demo:false},{ownerId:randomUUID()}]){
   const custom={...legacy(),...change};cloud.rows.clear();cloud.rows.set(custom.id,custom);cloud.metadata={darsloop_example_added:true};cloud.writes=[];
   await seedDemo(owner);expect(cloud.rows.get(custom.id)).toEqual(custom);expect(cloud.writes.some(url=>url.pathname.endsWith("/lessons"))).toBe(false);
  }
  const different={...legacy(),id:randomUUID()};cloud.rows.clear();cloud.rows.set(different.id,different);cloud.metadata={darsloop_example_added:true};await seedDemo(owner);expect(cloud.rows.size).toBe(1);expect(cloud.rows.get(different.id)).toEqual(different);
 });
 it("fences simultaneous upgrades and preserves a concurrent deletion",async()=>{
  cloud.rows.set(cloudDemoId(owner),legacy());cloud.metadata.darsloop_example_added=true;
  await Promise.all([seedDemo(owner),seedDemo(owner)]);expect(cloud.rows.get(cloudDemoId(owner))?.version).toBe(2);
  cloud.rows.set(cloudDemoId(owner),legacy());cloud.metadata={darsloop_example_added:true};cloud.onPatch=()=>{cloud.rows.delete(cloudDemoId(owner));};
  await seedDemo(owner);expect(cloud.rows.size).toBe(0);expect(cloud.metadata.darsloop_example_revision).toBe(DEMO_SEED_REVISION);
 });
 it("does not overwrite a source modified between read and update or mark a failed refresh complete",async()=>{
  const old=legacy();cloud.rows.set(old.id,old);cloud.metadata.darsloop_example_added=true;
  cloud.onPatch=()=>{cloud.rows.set(old.id,{...old,title:"Student changed this source",version:2});};
  await expect(seedDemo(owner)).rejects.toThrow("changed");expect(cloud.rows.get(old.id)?.title).toBe("Student changed this source");expect(cloud.metadata.darsloop_example_revision).toBeUndefined();
 });
 it("does not rewrite a current V46 demo merely to add its preference revision",async()=>{
  await seedDemo(owner);const current=structuredClone(cloud.rows.get(cloudDemoId(owner))!);cloud.metadata={darsloop_example_added:true};cloud.writes=[];
  await seedDemo(owner);expect(cloud.rows.get(current.id)).toEqual(current);expect(cloud.writes).toHaveLength(1);expect(cloud.writes[0].pathname).toContain("/auth/v1/admin/users/");
 });
 it("preserves unrelated preferences changed while the system-demo refresh is in flight",async()=>{
  cloud.rows.set(cloudDemoId(owner),legacy());cloud.metadata.darsloop_example_added=true;
  cloud.onPatch=()=>{cloud.metadata.otherPreference=false;cloud.metadata.darsloop_onboarding="student-edited-now";};
  await seedDemo(owner);expect(cloud.metadata).toMatchObject({otherPreference:false,darsloop_onboarding:"student-edited-now",darsloop_example_revision:DEMO_SEED_REVISION});
 });
});
