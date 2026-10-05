import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { randomUUID } from "node:crypto";
import os from "node:os";
import path from "node:path";
import { ProviderError } from "../src/lib/provider-error";
import { MATERIAL_GENERATION_REVISION } from "../src/lib/material-sections";
import type { Artifacts, Lesson } from "../src/lib/types";
const cookie=vi.hoisted(()=>({value:""}));
vi.mock("next/headers",()=>({cookies:async()=>({get:()=>({value:cookie.value})})}));
process.env.DARSLOOP_DATA_DIR=mkdtempSync(path.join(os.tmpdir(),"darsloop-detailed-process-"));
process.env.DARSLOOP_BACKEND="";
const store=await import("../src/lib/store"),personal=await import("../src/lib/personal-notes-store"),{processLesson}=await import("../src/lib/processing"),route=await import("../src/app/api/lessons/[id]/route");
afterEach(()=>{store.db().exec("DELETE FROM lessons");vi.restoreAllMocks();});
afterAll(()=>{store.db().close();rmSync(process.env.DARSLOOP_DATA_DIR!,{recursive:true,force:true});});
function authored():Lesson{
  const account=store.createSession();cookie.value=account.token;
  const segment={id:"v1-original",start:0,end:20,text:"Check the original source before drawing a conclusion, and ask for clarification if its explanation is uncertain.",flags:[]};
  const evidence=[{segmentId:segment.id,quote:segment.text}],artifacts:Artifacts={overview:segment.text,notes:[{heading:"Check the source",text:segment.text,evidence}],terms:[],practice:[{id:"old-question",kind:"quiz",question:"How should the explanation be checked?",answer:segment.text,choices:[segment.text,"Skip the source."],evidence}]};
  const lesson:Lesson={id:randomUUID(),ownerId:account.userId,title:"Fictional saved class",course:"",createdAt:new Date().toISOString(),duration:2137.344,version:1,status:"ready",stage:"Ready",error:null,demo:false,segments:[segment,{...segment,id:"v1-tail",start:2100,end:2137.344}],artifacts,audioPath:"/does-not-exist-original.wav",mime:"audio/wav",noteOptions:{enabled:true,detail:"standard",language:"en"},transcriptCache:{key:"a".repeat(64),version:1,duration:2137.344,config:{revision:"test-original",provider:"groq",model:"test-asr",language:"en",policy:"original-asr-policy"}}};
  store.insertLesson(lesson);return lesson;
}
function adapters(artifacts:Artifacts){return {audioChunk:vi.fn(async()=>{throw new Error("ASR must not run");}),transcribe:vi.fn(async()=>{throw new Error("ASR must not run");}),crossCheck:vi.fn(async()=>{throw new Error("ASR must not run");}),reserve:vi.fn(async()=>{throw new Error("ASR must not run");}),createArtifacts:vi.fn(async()=>artifacts)};}
function material(l:Lesson):Artifacts{return {...structuredClone(l.artifacts!),preparation:{revision:MATERIAL_GENERATION_REVISION,detail:"detailed",totalSections:2,coveredSections:[1],uncoveredSections:[2]},warnings:["Some source sections are not covered by the prepared notes. The full source stays available to check."]};}
function request(l:Lesson,input:unknown,headers:Record<string,string>={}){return new Request(`http://localhost:3000/api/lessons/${l.id}`,{method:"POST",headers:{host:"localhost:3000",origin:"http://localhost:3000","content-type":"application/json",...headers},body:JSON.stringify(input)});}
const context=(l:Lesson)=>({params:Promise.resolve({id:l.id})});

describe("explicit Detailed upgrade on an original cached fictional source",()=>{
  it("queues through the owner API and uses only saved passages; source/cache/edits remain while new questions have fresh progress",async()=>{
    const l=authored(),saved=personal.savePersonalNotes(l.ownerId,l.id,{version:1,revision:0,text:"My separate personal explanation",view:"detailed"});store.saveReview(l.ownerId,l,"old-question",true);
    const response=await route.POST(request(l,{action:"prepare-detailed",version:1,materialRevision:0}),context(l));expect(response.status).toBe(200);expect(await response.json()).toEqual({status:"queued",revision:1});expect(response.headers.get("cache-control")).toBe("no-store");
    const result=material(l),providers=adapters(result);providers.createArtifacts.mockImplementation(async()=>{expect(store.rawLesson(l.id)?.artifacts).toEqual(l.artifacts);expect(store.rawLesson(l.id)?.noteOptions).toEqual(l.noteOptions);return result;});
    await processLesson(store.claimJob()!,providers);const completed=store.rawLesson(l.id)!;
    for(const key of ["version","segments","audioPath","transcriptCache","transcriptionComplete"] as const)expect(completed[key]).toEqual(l[key]);
    expect(providers.createArtifacts).toHaveBeenCalledExactlyOnceWith(l.segments,{enabled:true,detail:"detailed",language:"en"});
    for(const mock of [providers.audioChunk,providers.transcribe,providers.crossCheck,providers.reserve])expect(mock).not.toHaveBeenCalled();
    expect(completed).toMatchObject({status:"ready",materialRevision:1,error:null,noteOptions:{enabled:true,detail:"detailed"}});expect(completed.materialPreparation).toBeUndefined();expect(completed.artifacts?.practice[0].id).toBe("material-1-item-1");expect(completed.artifacts?.warnings).toEqual(result.warnings);
    expect(personal.readPersonalNotes(l.ownerId,l.id,1)).toEqual(saved);expect(store.listReviews(l.ownerId)).toEqual([]);expect(store.db().prepare("SELECT COUNT(*) AS count FROM reviews WHERE user_id=? AND lesson_id=?").get(l.ownerId,l.id)).toEqual({count:1});
  });
  it("preserves prior artifacts/options/revision and personal edits on provider or language/audit failure",async()=>{
    for(const error of [new ProviderError("unsupported","Supported notes could not be prepared."),new ProviderError("material_language","Chosen language preparation failed."),new Error("private provider detail must not appear")]){
      const l=authored(),saved=personal.savePersonalNotes(l.ownerId,l.id,{version:1,revision:0,text:"Keep this personal edit",view:"points"});store.queueDetailedMaterial(l.ownerId,l.id,1,0);const providers=adapters(material(l));providers.createArtifacts.mockRejectedValue(error);
      await processLesson(store.claimJob()!,providers);const current=store.rawLesson(l.id)!;
      expect(current.artifacts).toEqual(l.artifacts);expect(current.noteOptions).toEqual(l.noteOptions);expect(current.materialRevision).toBeUndefined();expect(current.materialPreparation).toBeUndefined();expect(current.status).toBe("ready");expect(current.error).not.toContain("private provider detail");expect(current.segments).toEqual(l.segments);expect(personal.readPersonalNotes(l.ownerId,l.id,1)).toEqual(saved);expect(providers.transcribe).not.toHaveBeenCalled();
      expect(store.queueDetailedMaterial(l.ownerId,l.id,1,0)).toEqual({status:"queued",revision:1});store.db().exec("DELETE FROM lessons");
    }
  });
  it("keeps the upgrade marker and old material across a quota deferral, then retries without ASR",async()=>{
    const l=authored();store.queueDetailedMaterial(l.ownerId,l.id,1,0);const first=store.claimJob()!,providers=adapters(material(l));providers.createArtifacts.mockRejectedValueOnce(new ProviderError("quota","Temporarily busy",Date.now()+5000));
    await expect(processLesson(first,providers)).rejects.toMatchObject({code:"quota"});store.deferJob(first.id,first.lease,Date.now()+5000,"Waiting to prepare notes");
    expect(store.rawLesson(l.id)).toMatchObject({artifacts:l.artifacts,materialPreparation:{revision:1},status:"queued"});store.db().prepare("UPDATE jobs SET available_at=0 WHERE lesson_id=?").run(l.id);await processLesson(store.claimJob()!,providers);expect(store.rawLesson(l.id)?.materialRevision).toBe(1);expect(providers.transcribe).not.toHaveBeenCalled();
  });
  it("keeps an ordinary retry after a failed legacy Detailed upgrade on the material-only path",async()=>{
    const l=authored();store.queueDetailedMaterial(l.ownerId,l.id,1,0);const providers=adapters(material(l));providers.createArtifacts.mockRejectedValueOnce(new ProviderError("unsupported","Mocked support failure"));
    await processLesson(store.claimJob()!,providers);expect(store.rawLesson(l.id)?.materialFailure).toBe("detailed");
    const retry=await route.POST(request(l,{action:"retry"}),context(l));expect(retry.status).toBe(200);expect((await retry.json()).revision).toBe(1);
    await processLesson(store.claimJob()!,providers);expect(store.rawLesson(l.id)?.materialRevision).toBe(1);expect(store.rawLesson(l.id)?.materialFailure).toBeUndefined();expect(providers.transcribe).not.toHaveBeenCalled();
  });
  it("group membership cannot trigger another owner's preparation and cross-site requests never queue",async()=>{
    const l=authored(),other=store.createSession(),group=store.createGroup(l.ownerId,"Fictional private class"),invite=store.invite(l.ownerId,group);store.join(other.userId,invite);store.share(l.ownerId,group,l.id);cookie.value=other.token;
    expect((await route.POST(request(l,{action:"prepare-detailed",version:1,materialRevision:0}),context(l))).status).toBe(404);
    cookie.value=store.createSession().token;expect((await route.POST(request(l,{action:"prepare-detailed",version:1,materialRevision:0},{origin:"https://foreign.test"}),context(l))).status).toBe(403);
    expect(store.rawLesson(l.id)?.materialPreparation).toBeUndefined();expect(store.db().prepare("SELECT COUNT(*) AS count FROM jobs WHERE lesson_id=?").get(l.id)).toEqual({count:0});
  });
  it("rejects stale/ambiguous owner API requests before queuing and treats a repeated click idempotently",async()=>{
    const l=authored();
    for(const input of [{action:"prepare-detailed",version:0,materialRevision:0},{action:"prepare-detailed",version:1,materialRevision:-1},{action:"prepare-detailed",version:1,materialRevision:0,ownerId:l.ownerId},{action:"prepare-detailed",version:"1",materialRevision:0}])expect((await route.POST(request(l,input),context(l))).status).toBe(400);
    expect((await route.POST(request(l,{action:"prepare-detailed",version:2,materialRevision:0}),context(l))).status).toBe(409);
    expect((await route.POST(request(l,{action:"prepare-detailed",version:1,materialRevision:0}),context(l))).status).toBe(200);
    const repeat=await route.POST(request(l,{action:"prepare-detailed",version:1,materialRevision:0}),context(l));expect(await repeat.json()).toEqual({status:"already_queued",revision:1});
  });
});
