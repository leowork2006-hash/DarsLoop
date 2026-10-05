import {afterAll,describe,expect,it} from "vitest";
import {mkdtempSync,rmSync} from "node:fs";
import os from "node:os";
import path from "node:path";
import {randomUUID} from "node:crypto";
process.env.DARSLOOP_DATA_DIR=mkdtempSync(path.join(os.tmpdir(),"darsloop-queue-"));
const s=await import("../src/lib/store");
afterAll(()=>{s.db().close();rmSync(process.env.DARSLOOP_DATA_DIR!,{recursive:true,force:true});});
describe("durable quota queue",()=>{
 it("holds a saved partial lesson, fences stale workers, does not spend crash attempts, and resumes",()=>{
  const user=s.createSession();s.seedDemo(user.userId);const l={...s.listLessons(user.userId)[0],id:randomUUID(),demo:false,status:"queued" as const,artifacts:null,transcriptionComplete:false,processedChunks:1};s.queueLesson(l,true);const j=s.claimJob()!;
  expect(()=>s.deferJob(j.id,randomUUID(),Date.now()+60000,"waiting")).toThrow("lease");s.deferJob(j.id,j.lease,Date.now()+60000,"Waiting for capacity");
  expect(s.rawLesson(l.id)).toMatchObject({status:"queued",processedChunks:1,quotaDeferrals:1,transcriptionComplete:false});expect(s.claimJob()).toBeNull();
  expect(s.db().prepare("SELECT attempts FROM jobs WHERE id=?").get(j.id)).toEqual({attempts:0});expect(()=>s.jobCommit(j.id,j.lease,l)).toThrow("lease");
  s.db().prepare("UPDATE jobs SET available_at=0 WHERE id=?").run(j.id);const resumed=s.claimJob()!;expect(resumed.lease).not.toBe(j.lease);expect(resumed.lesson_id).toBe(l.id);s.jobCommit(resumed.id,resumed.lease,{...s.rawLesson(l.id)!,status:"ready"},true);
 });
 it("reserves both ASR models atomically and refuses overlapped two-hour bursts without leaking a partial reservation",()=>{
  const models=["whisper-large-v3","whisper-large-v3-turbo"];
  for(let i=0;i<11;i++)expect(s.reserveAudio(models,616)).toBeNull();const count=Number((s.db().prepare("SELECT COUNT(*) AS n FROM provider_audio").get() as {n:number}).n);
  const wait=s.reserveAudio(models,616);expect(wait).toBeGreaterThan(Date.now()+3500000);expect((s.db().prepare("SELECT COUNT(*) AS n FROM provider_audio").get() as {n:number}).n).toBe(count);
 });
});
