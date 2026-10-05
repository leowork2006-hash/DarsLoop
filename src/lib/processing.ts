import { mkdir, rm, readFile } from "node:fs/promises";
import path from "node:path";
import { dataDir, heartbeat, jobCommit, rawLesson, prepareAudio, storeAudio, removeCloudAudio } from "./backend";
import { audioChunk, prepareImportedAudio } from "./media";
import { materializeImport, removeImport } from "./supabase/imports";
import { adminClient } from "./supabase/admin";
import { createArtifacts, POLICY_VERSION, ProviderError, transcribe } from "./ai";
import { segmentFlags } from "./evidence";
import { compareTranscriptions } from "./audio-guard";
import { resolveNoteOptions } from "./note-options";
import type { Segment } from "./types";
export function chunkPlan(duration:number) {
  if(!Number.isFinite(duration)||duration<=0||duration>5400)throw new Error("Invalid recording duration");
  return Array.from({length:Math.ceil(duration/600)},(_,index)=>{
    const coreStart=index*600,coreEnd=Math.min(duration,coreStart+600);
    const start=Math.max(0,coreStart-8),end=Math.min(duration,coreEnd+8);
    return {index,coreStart,coreEnd,start,end,span:end-start};
  });
}
export function timedSegments(result:Awaited<ReturnType<typeof transcribe>>,chunk:ReturnType<typeof chunkPlan>[number],duration:number,version:number):Segment[] {
  return result.segments.filter(s=>s.text.trim()).flatMap((s,j)=>{
    if(!Number.isFinite(s.start)||!Number.isFinite(s.end)||s.start<0||s.end<=s.start||s.end>chunk.span+0.1)throw new ProviderError("invalid_timing","The transcription returned invalid times. Your original audio is preserved.");
    const start=chunk.start+s.start,end=Math.min(duration,chunk.start+s.end),middle=(start+end)/2;
    // Each overlapped passage belongs to one core region. Speech boundaries remain uncertain.
    if(middle<chunk.coreStart||middle>=chunk.coreEnd)return [];
    return [{id:`v${version}-c${chunk.index}-s${j}`,start,end,text:s.text.trim(),flags:segmentFlags(s,s.text)}];
  });
}
export async function processLesson(job:{id:string;lesson_id:string;lease:string},providers:{transcribe:typeof transcribe;createArtifacts:typeof createArtifacts;audioChunk:typeof audioChunk;crossCheck?:(bytes:Buffer)=>ReturnType<typeof transcribe>}={transcribe,createArtifacts,audioChunk,crossCheck:bytes=>transcribe(bytes,"whisper-large-v3-turbo")}) {
  let lesson=await rawLesson(job.lesson_id);if(!lesson)return;
  const temp=path.join(dataDir,"jobs",job.id,job.lease);let held=true,importStored=false;
  const timer=setInterval(()=>{void heartbeat(job.id,job.lease).then(ok=>{held=ok;}).catch(()=>{held=false;});},20_000);
  try {
    await mkdir(temp,{recursive:true,mode:0o700});
    let original:string;
    if(lesson.sourceImport){
      const sourceImport=lesson.sourceImport;
      const existing=await adminClient().storage.from("lesson-audio").info(lesson.audioPath);
      if(existing.data&&lesson.duration>0){original=await prepareAudio(lesson,path.join(temp,"original"));}
      else{
        lesson={...lesson,status:"processing",stage:"Preparing your recording"};await jobCommit(job.id,job.lease,lesson);
        const source=path.join(temp,"source");await materializeImport(lesson,source);original=path.join(temp,"original");
        const prepared=await prepareImportedAudio(source,original);
        await rm(source,{force:true});
        lesson={...lesson,...prepared,status:"processing",stage:"Saving the prepared audio"};await jobCommit(job.id,job.lease,lesson);
        if(!held||!await heartbeat(job.id,job.lease))throw new Error("Lease lost");
        lesson=await storeAudio(lesson,await readFile(original));importStored=true;
      }
      lesson={...lesson,sourceImport:undefined};await jobCommit(job.id,job.lease,lesson);
      // The durable prepared recording now replaces temporary source pieces.
      await removeImport(lesson.ownerId,lesson.id,sourceImport.parts);
    }else{original=await prepareAudio(lesson,path.join(temp,"original"));}
    lesson={...lesson,status:"processing",error:null,stage:"Transcribing your lesson"};await jobCommit(job.id,job.lease,lesson);
    if(!lesson.transcriptionComplete){
      const chunks=chunkPlan(lesson.duration);
      for(const chunk of chunks.slice(lesson.processedChunks||0)){
        if(!held)throw new Error("Lease lost");
        const bytes=await providers.audioChunk(original,path.join(temp,`${chunk.index}.wav`),chunk.start,chunk.span);
        lesson={...lesson,stage:`Transcribing section ${chunk.index+1} of ${chunks.length}`};await jobCommit(job.id,job.lease,lesson);
        // Independent ASR requests run together; keep a single bounded audio buffer.
        // Await both so a failed request cannot leak into the next job.
        const heard=await Promise.allSettled([providers.transcribe(bytes),...(providers.crossCheck?[providers.crossCheck(bytes)]:[])]);
        const rejected=heard.find(r=>r.status==="rejected");if(rejected?.status==="rejected")throw rejected.reason;
        const result=(heard[0] as PromiseFulfilledResult<Awaited<ReturnType<typeof transcribe>>>).value;
        let segments=timedSegments(result,chunk,lesson.duration,lesson.version);
        if(providers.crossCheck){const secondary=(heard[1] as PromiseFulfilledResult<Awaited<ReturnType<typeof transcribe>>>).value;segments=compareTranscriptions(segments,secondary.segments,chunk.start);}
        lesson={...lesson,segments:[...lesson.segments,...segments],processedChunks:chunk.index+1,stage:`Transcribed section ${chunk.index+1} of ${chunks.length}`};await jobCommit(job.id,job.lease,lesson);
      }
      if(!lesson.segments.length)throw new ProviderError("no_speech","No usable speech was found. Try a clearer recording.");
      lesson={...lesson,transcriptionComplete:true};await jobCommit(job.id,job.lease,lesson);
    }
    const noteOptions=resolveNoteOptions(lesson.noteOptions);
    lesson={...lesson,noteOptions,stage:noteOptions.enabled?"Making notes, quizzes & flashcards":"Making quizzes & flashcards"};await jobCommit(job.id,job.lease,lesson);
    let artifacts;
    try{artifacts=await providers.createArtifacts(lesson.segments,noteOptions);}
    catch(error){
      if(!(error instanceof ProviderError))throw error;
      await jobCommit(job.id,job.lease,{...lesson,status:"ready",stage:"Transcript ready · study material paused",error:error.message},true);
      return;
    }
    await jobCommit(job.id,job.lease,{...lesson,artifacts,status:"ready",stage:"Ready to study",error:artifacts.warnings?.join(" ")||null,providers:{asr:process.env.ASR_MODEL||"whisper-large-v3",generation:process.env.GENERATION_MODEL||"gemini-3.5-flash-lite",policy:POLICY_VERSION,...(providers.crossCheck?{checker:"whisper-large-v3-turbo"}:{})}},true);
  }finally{clearInterval(timer);await rm(temp,{recursive:true,force:true});if(importStored){try{if(!await rawLesson(job.lesson_id))await removeCloudAudio(lesson);}catch{/* Deletion can retry cleanup when the storage service recovers. */}}}
}
