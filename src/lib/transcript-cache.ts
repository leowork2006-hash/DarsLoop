import { createHash, createHmac } from "node:crypto";
import { createReadStream } from "node:fs";
import { instructionLike } from "./evidence";
import type { SpokenLanguage } from "./spoken-language";
import type { TranscriptionProvider } from "./transcription";
import type { Lesson, Segment } from "./types";

// Bump when request parameters, chunking, timing, word grouping or flag rules change.
export const TRANSCRIPT_CACHE_REVISION="original-asr-v4-600s-8s-flac-one-12s-recheck-paired-silence-confidence";
export type TranscriptConfig={revision:string;provider:TranscriptionProvider;model:string;checker?:string;language:SpokenLanguage;policy:string;region?:string};
export type TranscriptContext={key:string;config:TranscriptConfig};
export type TranscriptCache=TranscriptContext&{version:number;duration:number;complete?:{transcriptHash:string;chunks:number;capturedAt:string;reused?:true}};
const digest=(value:unknown)=>createHash("sha256").update(JSON.stringify(value)).digest("hex");
const configFields=(c:TranscriptConfig|undefined)=>c?[c.revision,c.provider,c.model,c.checker||null,c.language,c.policy,c.region||null]:[];
export async function transcriptContext(owner:string,file:string,config:TranscriptConfig,secret:string):Promise<TranscriptContext>{
  if(!secret)throw new Error("A private transcript cache key is required");
  const hash=createHash("sha256");
  // Hash the exact prepared playback bytes without loading another full recording.
  for await(const bytes of createReadStream(file))hash.update(bytes);
  const audioHash=hash.digest("hex");
  // Shared lesson rows are directly readable through the Data API. Persist only
  // an owner-bound HMAC, never a raw audio digest or another private lesson's ID.
  const key=createHmac("sha256",secret).update("DarsLoop original ASR cache v1\0").update(JSON.stringify([owner,audioHash,configFields(config)])).digest("hex");
  return {config,key};
}
export function checkpointMatches(l:Lesson,context:TranscriptContext){
  const c=l.transcriptCache;
  return !!c&&c.version===l.version&&c.duration===l.duration&&c.key===context.key&&digest(configFields(c.config))===digest(configFields(context.config));
}
function segmentsValid(segments:Segment[],duration:number){
  if(!Number.isFinite(duration)||duration<=0||!Array.isArray(segments)||segments.length>60_000)return false;
  const ids=new Set<string>();let previous=-1;
  for(const s of segments){
    if(!s||typeof s.id!=="string"||!s.id||ids.has(s.id)||!Number.isFinite(s.start)||!Number.isFinite(s.end)||s.start<0||s.end<=s.start||s.end>duration||s.start<previous||typeof s.text!=="string"||!s.text.trim()||!Array.isArray(s.flags)||s.flags.some(f=>typeof f!=="string"||!f))return false;
    ids.add(s.id);previous=s.start;
    // A cache must retain the exclusions recorded by the original ASR guard.
    if(instructionLike(s.text)&&!s.flags.some(f=>f.startsWith("Instruction-like wording:")))return false;
    if(s.words!==undefined){
      if(!Array.isArray(s.words)||s.words.length>10_000)return false;
      let last=-1;
      for(const w of s.words){
        if(!w||!Number.isFinite(w.start)||!Number.isFinite(w.end)||w.start<s.start||w.end<=w.start||w.end>s.end||w.start<last||typeof w.text!=="string"||w.text.length>1000||w.language!==undefined&&(typeof w.language!=="string"||w.language.length>20)||w.confidence!==undefined&&(!Number.isFinite(w.confidence)||w.confidence<0||w.confidence>1))return false;
        if(w.confidence!==undefined&&w.confidence<.65&&!s.flags.includes("Low word confidence: replay this passage"))return false;
        last=w.start;
      }
    }
    if(s.captureOriginal!==undefined){
      const original=s.captureOriginal;
      if(!original||typeof original!=="object"||"captureOriginal" in original||!segmentsValid([{...original,id:"original-capture"}],duration))return false;
    }
  }
  return true;
}
const transcriptDigest=(segments:Segment[])=>digest(segments.map(s=>[s.id,s.start,s.end,s.text,s.flags,s.words?.map(w=>[w.start,w.end,w.text,w.language||null,w.confidence??null])||null,...(s.captureOriginal?[s.captureOriginal]:[])]));
export function captureCheckpoint(l:Lesson,context:TranscriptContext):TranscriptCache{
  return {...context,version:l.version,duration:l.duration};
}
export function validCaptureProgress(l:Lesson,context:TranscriptContext){
  const chunks=l.processedChunks??0;
  return checkpointMatches(l,context)&&Number.isInteger(chunks)&&chunks>=0&&chunks<=Math.ceil(l.duration/600)&&segmentsValid(l.segments,l.duration)&&(chunks>0||l.segments.length===0);
}
export function completeCheckpoint(l:Lesson,context:TranscriptContext):TranscriptCache|undefined{
  if(!l.transcriptionComplete||!Array.isArray(l.segments)||!l.segments.length||!segmentsValid(l.segments,l.duration)||l.processedChunks!==Math.ceil(l.duration/600))return undefined;
  return {...captureCheckpoint(l,context),complete:{transcriptHash:transcriptDigest(l.segments),chunks:l.processedChunks,capturedAt:new Date().toISOString()}};
}
export function validCompleteCheckpoint(l:Lesson,context:TranscriptContext){
  const complete=l.transcriptCache?.complete,p=l.providers,c=context.config;
  if(!checkpointMatches(l,context)||!complete||l.transcriptionComplete!==true||l.processedChunks!==complete.chunks||complete.chunks!==Math.ceil(l.duration/600)||!Array.isArray(l.segments)||!l.segments.length||!segmentsValid(l.segments,l.duration)||complete.transcriptHash!==transcriptDigest(l.segments))return false;
  if(typeof complete.capturedAt!=="string"||!Number.isFinite(Date.parse(complete.capturedAt))||complete.reused!==undefined&&complete.reused!==true)return false;
  return (l.spokenLanguage||"auto")===c.language&&l.transcriptionProvider===c.provider&&p?.provider===c.provider&&p.asr===c.model&&p.policy===c.policy&&p.checkMode===(c.checker?"dual-pass":"single-pass")&&p.checker===c.checker;
}
export function reusableTranscript(source:Lesson,target:Lesson,context:TranscriptContext):Pick<Lesson,"segments"|"processedChunks"|"transcriptionComplete"|"transcriptCache"|"providers">|null{
  if(!target.ownerId||!Number.isInteger(target.version)||target.version<1||target.demo||target.shared||target.transcriptionComplete||!Array.isArray(target.segments)||target.segments.length||target.processedChunks||source.ownerId!==target.ownerId||source.id===target.id||source.demo||source.shared||source.sourceKind==="pdf"||target.sourceKind==="pdf"||source.status!=="ready"||source.error!==null||source.version<1||source.duration!==target.duration||!validCompleteCheckpoint(source,context))return null;
  // Rebase IDs to the target version. Text, timings, words and every flag stay literal.
  const segments=source.segments.map((s,index)=>({...s,id:`v${target.version}-cached-s${index}`,flags:[...s.flags],...(s.words?{words:s.words.map(w=>({...w}))}:{}),...(s.captureOriginal?{captureOriginal:{...s.captureOriginal,flags:[...s.captureOriginal.flags],...(s.captureOriginal.words?{words:s.captureOriginal.words.map(word=>({...word}))}:{})}}:{})}));
  const original=source.transcriptCache!.complete!;
  return {segments,processedChunks:original.chunks,transcriptionComplete:true,providers:{...source.providers!},transcriptCache:{...captureCheckpoint(target,context),complete:{transcriptHash:transcriptDigest(segments),chunks:original.chunks,capturedAt:original.capturedAt,reused:true}}};
}
