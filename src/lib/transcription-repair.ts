import { sensitiveWords, transcriptionWords } from "./audio-guard";
import { segmentFlags } from "./evidence";
import type { ASRResult } from "./transcription";
import type { Segment } from "./types";

const disagreementFlags=new Set(["Key wording differs between two transcriptions. Replay this moment.","Wording differs between two transcriptions. Replay this moment."]);
const uncertainFlag="Short audio recheck differs from the original capture. Replay this moment.";
export type RecheckCandidate={index:number;reason:"disagreement"|"sparse_timing";start:number;end:number;span:number};
type RecheckAdapters={reserve:(span:number)=>Promise<number|null>;capture:(start:number,span:number)=>Promise<Buffer>;primary:(bytes:Buffer)=>Promise<ASRResult>;checker:(bytes:Buffer)=>Promise<ASRResult>};
export type RecheckResult={segments:Segment[];candidate?:RecheckCandidate;status:"not_needed"|"capacity"|"failed"|"unchanged"|"uncertain"|"recovered"};

export function recheckCandidate(segments:Segment[],bounds:{start:number;end:number}):RecheckCandidate|undefined {
  const candidates=segments.flatMap((segment,index)=>{
    const count=transcriptionWords(segment.text).length,span=segment.end-segment.start;
    // Existing low-confidence/silence/instruction exclusions cannot be erased
    // by this optional capture retry. Sparse timing alone is not an error flag.
    if(segment.flags.some(flag=>!disagreementFlags.has(flag))||!Number.isFinite(span)||span<=0||span>11.4||segment.start<bounds.start||segment.end>bounds.end)return [];
    const reason=segment.flags.some(flag=>disagreementFlags.has(flag))?"disagreement":count>=3&&count<=8&&span>=4&&count/span<1?"sparse_timing":null;
    if(!reason)return [];
    const start=Math.max(bounds.start,segments[index-1]?.end??bounds.start,segment.start-.3),end=Math.min(bounds.end,segments[index+1]?.start??bounds.end,segment.end+.3);
    return end>start&&end-start<=12?[{index,reason,start,end,span:end-start} as RecheckCandidate]:[];
  });
  // One candidate per existing ten-minute chunk; prefer observed disagreement.
  return candidates.find(candidate=>candidate.reason==="disagreement")||candidates[0];
}
function captureValid(result:ASRResult,span:number){
  let previous=-1;
  return !!result.segments.length&&result.segments.every(segment=>{
    const valid=!!segment.text.trim()&&Number.isFinite(segment.start)&&Number.isFinite(segment.end)&&segment.start>=0&&segment.end>segment.start&&segment.end<=span+.000001&&segment.start>=previous&&segmentFlags(segment,segment.text).length===0&&(!segment.words||segment.words.every(word=>Number.isFinite(word.start)&&Number.isFinite(word.end)&&word.start>=segment.start&&word.end>word.start&&word.end<=segment.end&&(word.confidence===undefined||word.confidence>=.65)));
    previous=segment.end;return valid;
  });
}
function inOrder(anchors:string[],words:string[]){let cursor=0;for(const word of words)if(word===anchors[cursor])cursor++;return cursor===anchors.length;}
function allowedScript(text:string){return !/[\p{L}\p{M}]/u.test(text.replace(/[\p{Script=Latin}\p{Script=Arabic}\p{Script=Common}\p{Script=Inherited}]/gu,""));}

export async function recheckTranscription(segments:Segment[],bounds:{start:number;end:number},adapters:RecheckAdapters):Promise<RecheckResult>{
  const candidate=recheckCandidate(segments,bounds);if(!candidate)return {segments,status:"not_needed"};
  const original=segments[candidate.index];
  let passes:PromiseSettledResult<ASRResult>[];
  try{
    // Reserve both recognizers atomically through the caller's existing ledger.
    // Capacity deferral or a failed optional retry never loses usable capture.
    if(await adapters.reserve(candidate.span))return {segments,candidate,status:"capacity"};
    const bytes=await adapters.capture(candidate.start,candidate.span);
    passes=await Promise.allSettled([adapters.primary(bytes),adapters.checker(bytes)]);
  }catch{return {segments,candidate,status:"failed"};}
  if(passes.some(pass=>pass.status==="rejected"))return {segments,candidate,status:"failed"};
  const primary=(passes[0] as PromiseFulfilledResult<ASRResult>).value,checker=(passes[1] as PromiseFulfilledResult<ASRResult>).value;
  const text=primary.segments.map(segment=>segment.text.trim()).join(" "),other=checker.segments.map(segment=>segment.text.trim()).join(" ");
  const anchors=transcriptionWords(original.text),words=transcriptionWords(text),checked=transcriptionWords(other);
  const coherent=JSON.stringify(words)===JSON.stringify(checked),unchanged=JSON.stringify(words)===JSON.stringify(anchors);
  if(coherent&&unchanged&&captureValid(primary,candidate.span)&&captureValid(checker,candidate.span))return {segments,candidate,status:"unchanged"};
  // Never infer missing words from the lesson/reference. Both recognizers must
  // capture the same ordered words from this exact original audio window, keep
  // every original anchor/negation/number, and add at least three words.
  const accepted=coherent&&words.length>=anchors.length+3&&inOrder(anchors,words)&&JSON.stringify(sensitiveWords(original.text))===JSON.stringify(sensitiveWords(text))&&allowedScript(text)&&captureValid(primary,candidate.span)&&captureValid(checker,candidate.span);
  if(!accepted)return {segments:segments.map((segment,index)=>index===candidate.index?{...segment,flags:[...new Set([...segment.flags,uncertainFlag])]}:segment),candidate,status:"uncertain"};
  const replacement=primary.segments.map((segment,index):Segment=>({id:`${original.id}-recheck-${index}`,start:candidate.start+segment.start,end:Math.min(candidate.end,candidate.start+segment.end),text:segment.text.trim(),flags:[],...(segment.words?{words:segment.words.map(word=>({...word,start:candidate.start+word.start,end:candidate.start+word.end}))}:{}),...(index===0?{captureOriginal:{start:original.start,end:original.end,text:original.text,flags:[...original.flags],...(original.words?{words:original.words.map(word=>({...word}))}:{})}}:{})}));
  return {segments:[...segments.slice(0,candidate.index),...replacement,...segments.slice(candidate.index+1)],candidate,status:"recovered"};
}
