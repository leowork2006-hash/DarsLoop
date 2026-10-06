import { afterAll, describe, expect, it, vi } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { randomUUID, createHash } from "node:crypto";
import os from "node:os";
import path from "node:path";
import type { Artifacts, Lesson, StudyNoteOptions } from "../src/lib/types";
import { ProviderError } from "../src/lib/provider-error";
process.env.DARSLOOP_DATA_DIR=mkdtempSync(path.join(os.tmpdir(),"darsloop-cache-pipeline-"));
const s=await import("../src/lib/store"),{processLesson}=await import("../src/lib/processing"),{completeCheckpoint}=await import("../src/lib/transcript-cache");
afterAll(()=>{s.db().close();rmSync(process.env.DARSLOOP_DATA_DIR!,{recursive:true,force:true});});
const options:StudyNoteOptions={enabled:true,detail:"short",language:"en"};
const material:Artifacts={overview:"",notes:[],terms:[],practice:[],language:"en"};
function lesson(owner:string=randomUUID(),bytes="same prepared bytes",patch:Partial<Lesson>={}):Lesson{
  const id=randomUUID(),audioPath=path.join(process.env.DARSLOOP_DATA_DIR!,id);writeFileSync(audioPath,bytes);
  return {id,ownerId:owner,title:"Authored test capture",course:"",createdAt:new Date().toISOString(),duration:30,version:1,status:"queued",stage:"Queued",error:null,demo:false,segments:[],transcriptionComplete:false,artifacts:null,audioPath,mime:"audio/wav",spokenLanguage:"en",transcriptionProvider:"groq",noteOptions:options,...patch};
}
const clearCapture={start:6,end:10,text:"Check the explanation against the original source."};
function adapters(){return {provider:"groq" as const,model:"mock-primary",checkerModel:"mock-checker",cacheRevision:"mock-cache-pipeline-v1",cacheSecret:"fictional-stable-test-secret",concurrency:1,reserve:vi.fn(async()=>null),audioChunk:vi.fn(async()=>Buffer.from("mock chunk")),transcribe:vi.fn(async()=>({segments:[{start:1,end:5,text:"Do not skip the original wording.",avg_logprob:-2,words:[{start:1,end:5,text:"Do not skip the original wording.",confidence:.5}]},clearCapture]})),crossCheck:vi.fn(async()=>({segments:[{start:1,end:5,text:"Do skip the original wording."},clearCapture]})),createArtifacts:vi.fn(async()=>material)};}
async function run(l:Lesson,p=adapters()){s.queueLesson(l,true);await processLesson(s.claimJob()!,p);return s.rawLesson(l.id)!;}
describe("duplicate audio worker reuse with entirely mocked providers",()=>{
  it("skips all ASR/reservation work, preserves flags/provenance and generates fresh material with the target preferences",async()=>{
    const first=adapters(),source=await run(lesson(),first);expect(first.transcribe).toHaveBeenCalledTimes(1);expect(source.transcriptCache?.complete).toBeTruthy();
    const target=lesson(source.ownerId,"same prepared bytes",{version:2,noteOptions:{enabled:false,detail:"detailed",language:"ar"}}),second=adapters();
    second.createArtifacts.mockResolvedValue({...material,language:"ar"});const reused=await run(target,second);
    expect(second.transcribe).not.toHaveBeenCalled();expect(second.crossCheck).not.toHaveBeenCalled();expect(second.audioChunk).not.toHaveBeenCalled();expect(second.reserve).not.toHaveBeenCalled();
    expect(second.createArtifacts).toHaveBeenCalledExactlyOnceWith(reused.segments,target.noteOptions);expect(reused.artifacts?.language).toBe("ar");
    expect(reused.segments[0]).toEqual({...source.segments[0],id:"v2-cached-s0"});expect(reused.segments[0].flags.length).toBeGreaterThan(2);
    expect(reused.segments[1].flags).toEqual([]);
    expect(reused.transcriptCache?.complete?.capturedAt).toBe(source.transcriptCache?.complete?.capturedAt);expect(reused.transcriptCache?.complete?.reused).toBe(true);
    expect(reused.providers).toMatchObject({provider:"groq",asr:"mock-primary",checker:"mock-checker",checkMode:"dual-pass"});
    expect(s.publicLesson(reused)).not.toHaveProperty("transcriptCache");expect(s.publicLesson({...reused,shared:true})).not.toHaveProperty("transcriptCache");
    const directPayload=JSON.parse((s.db().prepare("SELECT payload FROM lessons WHERE id=?").get(reused.id) as {payload:string}).payload);
    expect(directPayload.transcriptCache).not.toHaveProperty("audioHash");expect(directPayload.transcriptCache.complete).not.toHaveProperty("origin");expect(directPayload.transcriptCache.complete).not.toHaveProperty("reusedFrom");expect(JSON.stringify(directPayload)).not.toContain(source.id);expect(JSON.stringify(directPayload)).not.toContain(second.cacheSecret);expect(JSON.stringify(directPayload)).not.toContain(createHash("sha256").update("same prepared bytes").digest("hex"));
  });
  it("rejects entirely excluded legacy cache hits without ASR or material and preserves their literal checkpoint",async()=>{
    for(const silence of [true,false]){
      const source=await run(lesson());
      const excluded={...source,segments:source.segments.map(segment=>({...segment,flags:[...segment.flags,...(silence?["Possible silence or unclear speech"]:["Low transcription confidence"])]}))};
      excluded.transcriptCache=completeCheckpoint(excluded,source.transcriptCache!);s.updateLesson(excluded);
      const target=lesson(source.ownerId),providers=adapters();s.queueLesson(target,true);const job=s.claimJob()!;
      await expect(processLesson(job,providers)).rejects.toMatchObject({code:silence?"no_speech":"unclear_audio"});
      const current=s.rawLesson(target.id)!;expect(current.transcriptionComplete).toBe(false);expect(current.segments).toEqual(excluded.segments.map((segment,index)=>({...segment,id:`v1-cached-s${index}`})));expect(current.transcriptCache?.complete?.reused).toBe(true);expect(current.audioPath).toBe(target.audioPath);expect(current.artifacts).toBeNull();
      for(const mock of [providers.reserve,providers.audioChunk,providers.transcribe,providers.crossCheck,providers.createArtifacts])expect(mock).not.toHaveBeenCalled();
      expect(s.rawLesson(source.id)?.segments).toEqual(excluded.segments);s.failJob(job.id,job.lease,current.error!);
      // A retry checks the retained capture again, not another provider pass.
      s.enqueue(target.id);await expect(processLesson(s.claimJob()!,providers)).rejects.toMatchObject({code:silence?"no_speech":"unclear_audio"});expect(providers.transcribe).not.toHaveBeenCalled();
      const retryJob=s.db().prepare("SELECT id,lease FROM jobs WHERE lesson_id=?").get(target.id) as {id:string;lease:string};s.failJob(retryJob.id,retryJob.lease,current.error!);
    }
  });
  it("excludes another owner's shared lesson and invalidates changed bytes/spoken language/model",async()=>{
    const source=await run(lesson());
    const other=randomUUID(),group=s.createGroup(source.ownerId,"Authored private group");s.db().prepare("INSERT INTO memberships VALUES(?,?)").run(group,other);s.share(source.ownerId,group,source.id);
    expect(s.listLessons(other).some(l=>l.id===source.id)).toBe(true);expect(s.transcriptCandidates(other,source.transcriptCache!.key,"none")).toEqual([]);
    const inputs=[lesson(other),lesson(source.ownerId,"changed bytes"),lesson(source.ownerId,"same prepared bytes",{spokenLanguage:"ar"})];
    for(const l of inputs){const p=adapters();const completed=await run(l,p);expect(p.transcribe).toHaveBeenCalledTimes(1);expect(completed.transcriptCache?.complete?.reused).toBeUndefined();}
    const changedModel=adapters();changedModel.model="different-primary";await run(lesson(source.ownerId),changedModel);expect(changedModel.transcribe).toHaveBeenCalledTimes(1);
  });
  it("never reuses failed/incomplete/corrupted ASR, while a reused transcript survives fresh generation failure and retry",async()=>{
    const source=await run(lesson());
    s.updateLesson({...source,status:"failed"});const notFailed=adapters();await run(lesson(source.ownerId),notFailed);expect(notFailed.transcribe).toHaveBeenCalledTimes(1);
    // A separate owner keeps the invalid snapshot cases independent of other valid copies.
    const corrupt=await run(lesson());s.updateLesson({...corrupt,segments:[{...corrupt.segments[0],text:"Edited wording outside the captured ASR"}]});
    const miss=adapters();await run(lesson(corrupt.ownerId),miss);expect(miss.transcribe).toHaveBeenCalledTimes(1);
    const partial=await run(lesson());s.updateLesson({...partial,transcriptionComplete:false,processedChunks:0});const incomplete=adapters();await run(lesson(partial.ownerId),incomplete);expect(incomplete.transcribe).toHaveBeenCalledTimes(1);
    const target=lesson(source.ownerId),failedGeneration=adapters();failedGeneration.createArtifacts.mockRejectedValue(new ProviderError("generation_failed","Authored generation outage"));
    const saved=await run(target,failedGeneration);expect(failedGeneration.transcribe).not.toHaveBeenCalled();expect(failedGeneration.createArtifacts).toHaveBeenCalledTimes(1);expect(saved).toMatchObject({status:"ready",error:"Authored generation outage",artifacts:null,transcriptionComplete:true});
    s.queueLesson({...saved,status:"queued",error:null});const retry=adapters();await processLesson(s.claimJob()!,retry);expect(retry.transcribe).not.toHaveBeenCalled();expect(retry.createArtifacts).toHaveBeenCalledTimes(1);expect(s.rawLesson(target.id)?.transcriptCache?.complete?.capturedAt).toBe(saved.transcriptCache?.complete?.capturedAt);
  });
  it("promotes a durable partial capture only after its remaining chunks succeed and invalidates changed checkpoint config",async()=>{
    const l=lesson(undefined,"long prepared bytes",{duration:1200}),p=adapters();let calls=0;
    p.transcribe.mockImplementation(async()=>{if(++calls===2)throw new ProviderError("transcription_failed","Authored second chunk failure");return {segments:[{start:1,end:5,text:"Do not skip the original wording.",avg_logprob:-2,words:[{start:1,end:5,text:"Do not skip the original wording.",confidence:.5}]},clearCapture]};});
    s.queueLesson(l,true);const first=s.claimJob()!;await expect(processLesson(first,p)).rejects.toMatchObject({code:"transcription_failed"});s.failJob(first.id,first.lease,"Authored failure");
    expect(s.rawLesson(l.id)).toMatchObject({processedChunks:1,transcriptionComplete:false});expect(s.rawLesson(l.id)?.transcriptCache?.complete).toBeUndefined();
    s.enqueue(l.id);const finish=adapters();finish.transcribe.mockResolvedValue({segments:[{start:20,end:24,text:"Do not skip the original wording.",avg_logprob:-2,words:[{start:20,end:24,text:"Do not skip the original wording.",confidence:.5}]},{...clearCapture,start:25,end:29}]});await processLesson(s.claimJob()!,finish);expect(finish.transcribe).toHaveBeenCalledTimes(1);const ready=s.rawLesson(l.id)!;expect(ready.transcriptCache?.complete?.chunks).toBe(2);expect(ready.segments.map(x=>x.start)).toEqual([1,6,612,617]);
    // Reprocessing the same saved lesson after a real ASR config change is not a hit.
    s.queueLesson({...ready,status:"queued"});const changed=adapters();changed.model="new-primary";await processLesson(s.claimJob()!,changed);expect(changed.transcribe).toHaveBeenCalledTimes(2);expect(s.rawLesson(l.id)?.providers?.asr).toBe("new-primary");
  });
  it("disables reuse without a server secret and safely misses after rotation",async()=>{
    const source=await run(lesson()),missing=adapters();missing.cacheSecret="";
    const completed=await run(lesson(source.ownerId),missing);expect(missing.transcribe).toHaveBeenCalledTimes(1);expect(completed.transcriptCache).toBeUndefined();
    const rotated=adapters();rotated.cacheSecret="new-fictional-private-secret";
    const miss=await run(lesson(source.ownerId),rotated);expect(rotated.transcribe).toHaveBeenCalledTimes(1);expect(miss.transcriptCache?.key).not.toBe(source.transcriptCache?.key);
  });
});
