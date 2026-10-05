import type { SpokenLanguage } from "./spoken-language";
import { mkdir, rm, readFile } from "node:fs/promises";
import path from "node:path";
import { dataDir, heartbeat, jobCommit, rawLesson, prepareAudio, storeAudio, removeCloudAudio, reserveAudio, transcriptCandidates } from "./backend";
import { audioChunk, prepareImportedAudio, MediaError, MAX_DURATION } from "./media";
import { materializeImport, removeImport } from "./supabase/imports";
import { adminClient } from "./supabase/admin";
import { createArtifacts, POLICY_VERSION, ProviderError, transcribe } from "./ai";
import { selectedProvider, transcribeDeepgram, transcribeSpeechmatics, type TranscriptionProvider } from "./transcription";
import { extractPdf } from "./pdf";
import { PdfError } from "./pdf-options";
import { pdfBytes, pdfExists, storePdf, removePdf } from "./pdf-storage";
import { sourcePassages } from "./source-passages";
import { segmentFlags } from "./evidence";
import { compareTranscriptions } from "./audio-guard";
import { resolveNoteOptions } from "./note-options";
import { cloudMode } from "./supabase/config";
import { TRANSCRIPT_CACHE_REVISION, transcriptContext, checkpointMatches, captureCheckpoint, completeCheckpoint, validCompleteCheckpoint, validCaptureProgress, reusableTranscript, type TranscriptContext } from "./transcript-cache";
import type { Segment } from "./types";
import { revisionPractice, sourceReadyForMaterial } from "./material-sections";
export function chunkPlan(duration:number) {
  if(!Number.isFinite(duration)||duration<=0||duration>MAX_DURATION)throw new Error("Invalid recording duration");
  return Array.from({length:Math.ceil(duration/600)},(_,index)=>{
    const coreStart=index*600,coreEnd=Math.min(duration,coreStart+600);
    const start=Math.max(0,coreStart-8),end=Math.min(duration,coreEnd+8);
    return {index,coreStart,coreEnd,start,end,span:end-start};
  });
}
export function timedSegments(result:Awaited<ReturnType<typeof transcribe>>,chunk:ReturnType<typeof chunkPlan>[number],duration:number,version:number):Segment[] {
  return result.segments.filter(s=>s.text.trim()).flatMap((s,j)=>{
    if(!Number.isFinite(s.start)||!Number.isFinite(s.end)||s.start<0||s.end<=s.start||s.end>chunk.span+0.1||s.words?.some(w=>!Number.isFinite(w.start)||!Number.isFinite(w.end)||w.start<0||w.end<=w.start||w.end>chunk.span+0.1))throw new ProviderError("invalid_timing","The transcription returned invalid times. Your original audio is preserved.");
    const start=chunk.start+s.start,end=Math.min(duration,chunk.start+s.end),middle=(start+end)/2;
    // Each overlapped passage belongs to one core region. Speech boundaries remain uncertain.
    if(middle<chunk.coreStart||middle>=chunk.coreEnd)return [];
    return [{id:`v${version}-c${chunk.index}-s${j}`,start,end,text:s.text.trim(),flags:[...segmentFlags(s,s.text),...(s.words?.some(w=>w.confidence!==undefined&&w.confidence<0.65)?["Low word confidence: replay this passage"]:[])],...(s.words?{words:s.words.map(w=>({...w,start:chunk.start+w.start,end:chunk.start+w.end}))}:{})}];
  });
}
type ProcessingProviders={transcribe:typeof transcribe;createArtifacts:typeof createArtifacts;audioChunk:typeof audioChunk;crossCheck?:(bytes:Buffer,language?:SpokenLanguage)=>ReturnType<typeof transcribe>;reserve?:(span:number)=>Promise<number|null>;provider?:TranscriptionProvider;model?:string;concurrency?:number;cacheRevision?:string;cacheSecret?:string;checkerModel?:string;region?:string};
export function productionProviders(provider:TranscriptionProvider):ProcessingProviders {
  const model=provider==="groq"?(process.env.ASR_MODEL||"whisper-large-v3"):provider==="deepgram"?"nova-3":"melia-1";
  const width=Number(process.env.TRANSCRIPTION_CONCURRENCY||2);
  return {audioChunk,createArtifacts,provider,model,cacheRevision:TRANSCRIPT_CACHE_REVISION,...(provider==="speechmatics"?{region:process.env.SPEECHMATICS_REGION||"eu1"}:{}),concurrency:Number.isInteger(width)?Math.max(1,Math.min(2,width)):2,
    transcribe:provider==="groq"?(b,_m,l)=>transcribe(b,model,l):provider==="deepgram"?transcribeDeepgram:transcribeSpeechmatics,
    ...(provider==="groq"?{checkerModel:"whisper-large-v3-turbo",crossCheck:(bytes:Buffer,language?:SpokenLanguage)=>transcribe(bytes,"whisper-large-v3-turbo",language),reserve:(span:number)=>reserveAudio([...new Set([model,"whisper-large-v3-turbo"])],span)}:{})};
}
export async function processLesson(job:{id:string;lesson_id:string;lease:string},injected?:ProcessingProviders) {
  let lesson=await rawLesson(job.lesson_id);if(!lesson)return;
  const provider=lesson.transcriptionProvider||(lesson.materialPreparation?"groq":selectedProvider()),providers=injected||productionProviders(provider);
  const temp=path.join(dataDir,"jobs",job.id,job.lease);let held=true,importStored=false;
  const timer=setInterval(()=>{void heartbeat(job.id,job.lease).then(ok=>{held=ok;}).catch(()=>{held=false;});},20_000);
  try {
    await mkdir(temp,{recursive:true,mode:0o700});
    if(lesson.materialPreparation){
      const preparation=lesson.materialPreparation;
      if(preparation.kind!=="detailed"||preparation.revision!==(lesson.materialRevision||0)+1||!sourceReadyForMaterial(lesson))throw new ProviderError("invalid_material_request","Detailed notes need a saved, completed source. Your existing notes are preserved.");
      const options=resolveNoteOptions(preparation.noteOptions);
      if(!options.enabled||options.detail!=="detailed")throw new ProviderError("invalid_material_request","Choose a valid detailed-note request. Your existing notes are preserved.");
      lesson={...lesson,status:"processing",stage:"Preparing detailed notes from your saved source",error:null,materialFailure:undefined,nextAttemptAt:undefined};await jobCommit(job.id,job.lease,lesson);
      try{
        const artifacts=revisionPractice(await providers.createArtifacts(sourcePassages(lesson),options),preparation.revision);
        if(!held)throw new Error("Lease lost");
        await jobCommit(job.id,job.lease,{...lesson,artifacts,noteOptions:options,materialRevision:preparation.revision,materialPreparation:undefined,materialFailure:undefined,status:"ready",stage:"Ready to study",error:null,nextAttemptAt:undefined},true);
      }catch(error){
        if(error instanceof ProviderError&&error.code==="quota")throw error;
        if(!held)throw error;
        const description=error instanceof ProviderError?error.message:"Detailed notes could not be prepared. Your existing notes and original source are preserved; try again later.";
        await jobCommit(job.id,job.lease,{...lesson,materialPreparation:undefined,materialFailure:"detailed",status:"ready",stage:"Existing study material preserved",error:description,nextAttemptAt:undefined},true);
      }
      return;
    }
    if(lesson.sourceKind==="pdf"){
      if(lesson.sourceImport){
        const parts=lesson.sourceImport.parts;
        if(!await pdfExists(lesson)){
          const source=path.join(temp,"source.pdf");await materializeImport(lesson,source);
          const bytes=await readFile(source),parsed=await extractPdf(bytes,lesson.version);
          if(!held||!await heartbeat(job.id,job.lease))throw new Error("Lease lost");
          lesson=await storePdf({...lesson,pdfPages:parsed.pages,sourcePageCount:parsed.totalPages},bytes);importStored=true;
          await jobCommit(job.id,job.lease,lesson);
        }
        lesson={...lesson,sourceImport:undefined};await jobCommit(job.id,job.lease,lesson);await removeImport(lesson.ownerId,lesson.id,parts);
      }
      if(!lesson.pdfPages?.length){const parsed=await extractPdf(await pdfBytes(lesson),lesson.version);lesson={...lesson,pdfPages:parsed.pages,sourcePageCount:parsed.totalPages};await jobCommit(job.id,job.lease,lesson);}
      const noteOptions=resolveNoteOptions(lesson.noteOptions);
      lesson={...lesson,noteOptions,status:"processing",nextAttemptAt:undefined,error:null,stage:noteOptions.enabled?"Making source-grounded notes & practice":"Making source-grounded practice"};await jobCommit(job.id,job.lease,lesson);
      let artifacts;
      try{artifacts=await providers.createArtifacts(sourcePassages(lesson),noteOptions);}
      catch(error){if(!(error instanceof ProviderError)||error.code==="quota")throw error;await jobCommit(job.id,job.lease,{...lesson,status:"ready",stage:"PDF ready · study material paused",error:error.message},true);return;}
      if(!held)throw new Error("Lease lost");
      await jobCommit(job.id,job.lease,{...lesson,artifacts,status:"ready",stage:"Ready to study",error:null},true);return;
    }
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
    let context:TranscriptContext|undefined;
    // Test adapters opt in with their own revision; unknown/legacy configurations
    // cannot accidentally become production cache entries.
    const cacheSecret=injected?providers.cacheSecret:cloudMode()?process.env.SUPABASE_SECRET_KEY:process.env.DARSLOOP_TRANSCRIPT_CACHE_SECRET;
    if(cacheSecret&&providers.cacheRevision&&providers.model&&providers.provider===provider&&(!providers.crossCheck||providers.checkerModel)&&(!lesson.transcriptionComplete||lesson.transcriptCache)){
      context=await transcriptContext(lesson.ownerId,original,{revision:providers.cacheRevision,provider,model:providers.model,language:lesson.spokenLanguage||"auto",policy:POLICY_VERSION,...(providers.crossCheck?{checker:providers.checkerModel}:{}),...(providers.region?{region:providers.region}:{})},cacheSecret);
      if(lesson.transcriptCache&&(!checkpointMatches(lesson,context)||!validCaptureProgress(lesson,context)||lesson.transcriptionComplete&&!validCompleteCheckpoint(lesson,context))){
        lesson={...lesson,segments:[],processedChunks:0,transcriptionComplete:false,transcriptCache:undefined,artifacts:null};
      }
      if(!lesson.transcriptionComplete&&!lesson.segments.length&&!lesson.processedChunks){
        let candidates:Awaited<ReturnType<typeof transcriptCandidates>>=[];
        try{candidates=await transcriptCandidates(lesson.ownerId,context.key,lesson.id);}catch{console.log(JSON.stringify({event:"transcript-cache-miss",code:"lookup_unavailable"}));}
        for(const source of candidates){const reused=reusableTranscript(source,lesson,context);if(reused){lesson={...lesson,...reused,artifacts:null};break;}}
        if(!lesson.transcriptionComplete)lesson={...lesson,transcriptCache:captureCheckpoint(lesson,context)};
      }
    }
    const asrProvenance=lesson.transcriptionComplete&&lesson.providers?lesson.providers:{provider,asr:providers.model||"test-provider",checkMode:providers.crossCheck?"dual-pass" as const:"single-pass" as const,...(providers.crossCheck?{checker:providers.checkerModel||"whisper-large-v3-turbo"}:{})};
    lesson={...lesson,transcriptionProvider:provider,nextAttemptAt:undefined,status:"processing",error:null,stage:lesson.transcriptionComplete?"Transcript saved · preparing study material":"Transcribing your lesson",providers:{...asrProvenance,generation:process.env.GENERATION_MODEL||"gemini-3.5-flash-lite",policy:POLICY_VERSION}};await jobCommit(job.id,job.lease,lesson);
    if(!lesson.transcriptionComplete){
      const chunks=chunkPlan(lesson.duration);
      const remaining=chunks.slice(lesson.processedChunks||0),width=providers.concurrency||1;
      for(let offset=0;offset<remaining.length;offset+=width){
        if(!held)throw new Error("Lease lost");
        global.gc?.();
        const batch=remaining.slice(offset,offset+width),duration=lesson.duration,version=lesson.version,language=lesson.spokenLanguage||"auto";
        lesson={...lesson,stage:`Transcribing sections ${batch[0].index+1}${batch.length>1?`–${batch.at(-1)!.index+1}`:""} of ${chunks.length}`};await jobCommit(job.id,job.lease,lesson);
        // Drain the entire bounded batch before committing or throwing. Only a
        // contiguous prefix is checkpointed, never a complete partial class.
        const results=await Promise.allSettled(batch.map(async chunk=>{
          const until=await providers.reserve?.(chunk.span);if(until)throw new ProviderError("quota","Waiting for transcription capacity. Your audio is saved.",until);
          const bytes=await providers.audioChunk(original,path.join(temp,`${chunk.index}.flac`),chunk.start,chunk.span);
          const heard=await Promise.allSettled([providers.transcribe(bytes,undefined,language),...(providers.crossCheck?[providers.crossCheck(bytes,language)]:[])]);
          const rejected=heard.find(r=>r.status==="rejected");if(rejected?.status==="rejected")throw rejected.reason;
          let segments=timedSegments((heard[0] as PromiseFulfilledResult<Awaited<ReturnType<typeof transcribe>>>).value,chunk,duration,version);
          if(providers.crossCheck){const secondary=(heard[1] as PromiseFulfilledResult<Awaited<ReturnType<typeof transcribe>>>).value;timedSegments(secondary,chunk,duration,version);segments=compareTranscriptions(segments,secondary.segments,chunk.start);}
          return segments;
        }));
        for(let i=0;i<results.length;i++){
          const result=results[i];if(result.status==="rejected")throw result.reason;
          if(!held)throw new Error("Lease lost");
          lesson={...lesson,segments:[...lesson.segments,...result.value],processedChunks:batch[i].index+1,stage:`Transcribed section ${batch[i].index+1} of ${chunks.length}`};await jobCommit(job.id,job.lease,lesson);
        }
      }
      if(!lesson.segments.length)throw new ProviderError("no_speech","No usable speech was found. Try a clearer recording.");
      lesson={...lesson,transcriptionComplete:true};
      if(context&&checkpointMatches(lesson,context))lesson={...lesson,transcriptCache:completeCheckpoint(lesson,context)};
      await jobCommit(job.id,job.lease,lesson);
    }
    const noteOptions=resolveNoteOptions(lesson.noteOptions);
    lesson={...lesson,noteOptions,stage:noteOptions.enabled?"Making notes, quizzes & flashcards":"Making quizzes & flashcards"};await jobCommit(job.id,job.lease,lesson);
    let artifacts;
    try{artifacts=await providers.createArtifacts(lesson.segments,noteOptions);}
    catch(error){
      if(!(error instanceof ProviderError)||error.code==="quota")throw error;
      await jobCommit(job.id,job.lease,{...lesson,status:"ready",stage:"Transcript ready · study material paused",error:error.message},true);
      return;
    }
    await jobCommit(job.id,job.lease,{...lesson,artifacts,status:"ready",stage:"Ready to study",error:null,providers:lesson.providers},true);
  }catch(error){
    // Diagnostic codes only: never log transcript text, file names or credentials.
    const rawCode=error instanceof Error&&"code" in error?String(error.code):"";
    console.log(JSON.stringify({event:"lesson-processing-error",stage:lesson.stage,code:error instanceof ProviderError||error instanceof MediaError||error instanceof PdfError?error.code:/^[A-Z_0-9]+$/.test(rawCode)?rawCode:"internal",kind:error instanceof Error?error.constructor.name:"unknown"}));
    throw error;
  }finally{clearInterval(timer);await rm(temp,{recursive:true,force:true});if(importStored){try{if(!await rawLesson(job.lesson_id))await (lesson.sourceKind==="pdf"?removePdf(lesson):removeCloudAudio(lesson));}catch{/* Deletion can retry cleanup when the storage service recovers. */}}}
}
