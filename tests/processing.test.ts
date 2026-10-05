import { afterAll, describe, expect, it, vi } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { randomUUID } from "node:crypto";
import os from "node:os";
import path from "node:path";
process.env.DARSLOOP_DATA_DIR=mkdtempSync(path.join(os.tmpdir(),"darsloop-pipeline-"));
const s=await import("../src/lib/store");
const {chunkPlan,timedSegments,processLesson}=await import("../src/lib/processing");
import { demoArtifacts } from "../src/lib/demo";
afterAll(()=>{s.db().close();rmSync(process.env.DARSLOOP_DATA_DIR!,{recursive:true,force:true});});
describe("durable processing with injected mock providers",()=>{
  it("overlaps long chunks without double-owning an identical boundary passage",()=>{
    const chunks=chunkPlan(1200);expect(chunks[0].end).toBe(608);expect(chunks[1].start).toBe(592);
    const first=timedSegments({segments:[{start:597,end:605,text:"Boundary passage"}]},chunks[0],1200,1);
    const second=timedSegments({segments:[{start:5,end:13,text:"Boundary passage"}]},chunks[1],1200,1);
    expect(first).toHaveLength(0);expect(second).toHaveLength(1);expect(second[0].start).toBe(597);
    expect(()=>timedSegments({segments:[{start:0,end:9999,text:"Bad times"}]},chunks[0],1200,1)).toThrow("invalid times");
  });
  it("resumes generation from saved transcript without retranscribing after a provider failure",async()=>{
    const owner=s.createSession();s.seedDemo(owner.userId);const base=s.listLessons(owner.userId)[0],l={...base,id:randomUUID(),demo:false,status:"queued" as const,segments:[],artifacts:null,noteOptions:{enabled:false,detail:"detailed" as const}};s.insertLesson(l);s.enqueue(l.id);
    const transcript=base.segments.map(x=>({start:x.start,end:x.end,text:x.text}));
    const providers={audioChunk:vi.fn(async()=>Buffer.from("mock-wav")),transcribe:vi.fn(async()=>({segments:transcript})),createArtifacts:vi.fn(async()=>{throw new Error("Mock quota outage");})};
    const job=s.claimJob()!;await expect(processLesson(job,providers)).rejects.toThrow("Mock quota outage");s.failJob(job.id,job.lease,"Mock quota outage");
    expect(s.rawLesson(l.id)?.transcriptionComplete).toBe(true);expect(s.rawLesson(l.id)?.segments).toHaveLength(8);
    s.enqueue(l.id);const retry=s.claimJob()!;
    const successful={...providers,createArtifacts:vi.fn(async(segments)=>demoArtifacts(segments))};await processLesson(retry,successful);
    expect(providers.transcribe).toHaveBeenCalledTimes(1);expect(s.rawLesson(l.id)?.status).toBe("ready");expect(s.rawLesson(l.id)?.artifacts?.practice).toHaveLength(4);
    expect(successful.createArtifacts).toHaveBeenCalledWith(s.rawLesson(l.id)?.segments,l.noteOptions);
    expect(s.publicLesson(s.rawLesson(l.id)!).noteOptions).toEqual(l.noteOptions);
    expect(s.db().prepare("SELECT status FROM jobs WHERE id=?").get(job.id)).toEqual({status:"done"});
  });
});
