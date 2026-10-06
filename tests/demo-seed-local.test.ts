import { afterAll, describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { randomUUID } from "node:crypto";
import os from "node:os";
import path from "node:path";
import { studySkillsArtifacts, studySkillsLesson } from "./fixtures/study-skills";
import { DEMO_SEED_REVISION, needsDemoSeed, systemDemoFixture, validatedDemoSegments } from "../src/lib/demo-seed";
import { demoScript, demoTitle } from "../src/lib/demo";
import type { Lesson } from "../src/lib/types";

process.env.DARSLOOP_DATA_DIR=mkdtempSync(path.join(os.tmpdir(),"darsloop-demo-upgrade-"));
const store=await import("../src/lib/store");
const legacy=(ownerId:string):Lesson=>{const segments=JSON.parse(readFileSync("fixtures/demo-timing.json","utf8"));return {...studySkillsLesson(),id:randomUUID(),ownerId,title:"Demo lesson · Listening, catch-up & revision",course:"Adab of learning",stage:"Prepared example",segments,artifacts:studySkillsArtifacts(segments),audioPath:"/old/app/fixtures/demo.mp3"};};
const markOld=(owner:string)=>store.db().prepare("INSERT INTO workspace_flags VALUES(?,1)").run(owner);
afterAll(()=>{store.db().close();rmSync(process.env.DARSLOOP_DATA_DIR!,{recursive:true,force:true});});

describe("bounded system-demo refresh in local workspaces",()=>{
 it("upgrades the known legacy source once, retains identity/review storage and leaves personal lessons unchanged",()=>{
  const owner=randomUUID(),old=legacy(owner),personal={...old,id:randomUUID(),demo:false,title:"My own recording",audioPath:"/private/student.mp3"};
  store.insertLesson(old);store.insertLesson(personal);markOld(owner);
  const review=store.saveReview(owner,old,"quiz-listening",true);
  store.seedDemo(owner);const updated=store.rawLesson(old.id)!;
  expect(updated).toMatchObject({id:old.id,ownerId:owner,createdAt:old.createdAt,version:2,title:`Demo lesson · ${demoTitle}`,status:"ready"});
  expect(updated.segments.map(s=>s.text)).toEqual(demoScript);expect(updated.audioPath).toBe(path.join(process.cwd(),"fixtures/demo-five-pillars.mp3"));
  expect(updated.artifacts?.practice.map(p=>p.id)).toContain("quiz-testimony");expect(store.rawLesson(personal.id)).toEqual(personal);
  expect(store.db().prepare("SELECT payload FROM reviews WHERE lesson_id=?").get(old.id)).toEqual({payload:JSON.stringify(review)});
  expect(store.listReviews(owner)).toEqual([]);
  store.seedDemo(owner);expect(store.rawLesson(old.id)).toEqual(updated);expect(store.listLessons(owner)).toHaveLength(2);
 });
 it("does not recreate a previously deleted old demo or a deleted current demo",()=>{
  const oldOwner=randomUUID();markOld(oldOwner);store.seedDemo(oldOwner);store.seedDemo(oldOwner);expect(store.listLessons(oldOwner)).toEqual([]);
  const newOwner=randomUUID();store.seedDemo(newOwner);const first=store.listLessons(newOwner)[0];expect(first.version).toBe(1);
  store.deleteLesson(newOwner,first.id);store.seedDemo(newOwner);expect(store.listLessons(newOwner)).toEqual([]);
 });
 it("preserves customized/foreign demos, and upgrades an unmarked recognized old system seed",()=>{
  const owner=randomUUID(),custom={...legacy(owner),title:"My custom example"},foreign=legacy(randomUUID());
  store.insertLesson(custom);store.insertLesson(foreign);markOld(owner);store.seedDemo(owner);
  expect(store.rawLesson(custom.id)).toEqual(custom);expect(store.rawLesson(foreign.id)).toEqual(foreign);expect(store.listLessons(owner)).toHaveLength(1);
  const unmarked={...legacy(randomUUID()),title:"Listening, catch-up & revision"};store.insertLesson(unmarked);store.seedDemo(unmarked.ownerId);expect(store.rawLesson(unmarked.id)?.title).toBe(`Demo lesson · ${demoTitle}`);
 });
 it("recognizes only the exact owned fixture and rejects title-only or source-path lookalikes",()=>{
  const owner=randomUUID(),old=legacy(owner);expect(systemDemoFixture(old,owner)).toBe("legacy");expect(systemDemoFixture({...old,title:"Listening, catch-up & revision"},owner)).toBe("legacy");
  for(const changed of [{...old,demo:false},{...old,ownerId:randomUUID()},{...old,audioPath:"/private/demo.mp3"},{...old,sourceKind:"pdf" as const},{...old,segments:old.segments.map((s,i)=>i===0?{...s,text:"Personal source text"}:s)},{...old,segments:old.segments.map((s,i)=>i===0?{...s,flags:["Unclear"]}:s)}])expect(systemDemoFixture(changed,owner)).toBeNull();
 });
 it("uses a preference revision to bypass repeat upgrades without treating the old boolean as current",()=>{
  expect(needsDemoSeed({darsloop_example_added:true})).toBe(true);expect(needsDemoSeed(undefined)).toBe(true);
  expect(needsDemoSeed({darsloop_example_revision:DEMO_SEED_REVISION})).toBe(false);expect(needsDemoSeed({darsloop_example_revision:DEMO_SEED_REVISION+1})).toBe(false);
  expect(needsDemoSeed({darsloop_example_revision:"2"})).toBe(true);
  expect(()=>validatedDemoSegments([{text:demoScript[0],start:0,end:1,flags:[]}])).toThrow("manifest");
 });
});
