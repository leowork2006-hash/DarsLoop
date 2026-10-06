import { z } from "zod";
import type { SpokenLanguage } from "./spoken-language";
import { ProviderError, quotaError } from "./provider-error";
export type TranscriptionProvider="groq"|"deepgram"|"speechmatics";
export function selectedProvider():TranscriptionProvider {
  const value=process.env.TRANSCRIPTION_PROVIDER||"groq";
  if(value!=="groq"&&value!=="deepgram"&&value!=="speechmatics")throw new ProviderError("provider_configuration","Choose groq, deepgram or speechmatics as the transcription provider.");
  return value;
}
export function transcriptionConfigured(){
  try{return !!process.env[{groq:"GROQ_API_KEY",deepgram:"DEEPGRAM_API_KEY",speechmatics:"SPEECHMATICS_API_KEY"}[selectedProvider()]];}catch{return false;}
}
const wordSchema=z.object({start:z.number().finite().nonnegative(),end:z.number().finite().nonnegative(),text:z.string().max(1000),language:z.string().max(20).optional(),confidence:z.number().min(0).max(1).optional()}).refine(w=>w.end>w.start,"Invalid word timing");
export const asrSchema=z.object({segments:z.array(z.object({start:z.number().finite(),end:z.number().finite(),text:z.string(),avg_logprob:z.number().optional(),no_speech_prob:z.number().optional(),compression_ratio:z.number().optional(),words:z.array(wordSchema).max(10000).optional()})).max(5000)});
export type ASRResult=z.infer<typeof asrSchema>;
type Word=z.infer<typeof wordSchema>;
export function wordsToSegments(input:Word[]):ASRResult {
  const words=z.array(wordSchema).max(10000).parse(input),segments:ASRResult["segments"]=[];
  let group:Word[]=[],previous:Word|undefined;
  const flush=()=>{if(group.length){segments.push({start:group[0].start,end:group.at(-1)!.end,text:group.map(w=>w.text).join(" "),words:group});group=[];}};
  for(const w of words){
    if(previous&&(w.start<previous.start||w.end<previous.end))throw new ProviderError("invalid_timing","The transcription returned invalid word times. Your original audio is preserved.");
    if(group.length&&(w.end-group[0].start>12||w.start-group.at(-1)!.end>1.5||group.length>=40))flush();
    previous=w;group.push(w);if(/[.!?۔؟]$/.test(w.text))flush();
  }
  flush();return asrSchema.parse({segments});
}
function media(bytes:Buffer){const flac=bytes.subarray(0,4).toString()==="fLaC";return {type:flac?"audio/flac":"audio/wav",name:flac?"lesson.flac":"lesson.wav"};}
function credentials(provider:string,key:string|undefined){if(!key)throw new ProviderError("not_configured",`Connect ${provider} privately before using this transcription provider. Your audio is saved.`);return key;}
async function requireOK(r:Response,provider:string){
  if(r.ok)return;
  if(r.status===429)throw quotaError(r);
  if(r.status===401||r.status===403)throw new ProviderError("credentials",`${provider} denied access. Check its private key, model permissions and account. Your audio is saved.`);
  throw new ProviderError("transcription_failed",`${provider} could not process this audio. Your original audio is saved; check this provider before retrying.`);
}
export async function transcribeGroq(bytes:Buffer,model=process.env.ASR_MODEL||"whisper-large-v3",language:SpokenLanguage="auto"):Promise<ASRResult> {
  const key=credentials("Groq",process.env.GROQ_API_KEY),m=media(bytes),form=new FormData();
  form.set("file",new Blob([new Uint8Array(bytes)],{type:m.type}),m.name);form.set("model",model);form.set("response_format","verbose_json");form.append("timestamp_granularities[]","segment");form.set("temperature","0");if(language!=="auto")form.set("language",language);
  const r=await fetch("https://api.groq.com/openai/v1/audio/transcriptions",{method:"POST",headers:{Authorization:`Bearer ${key}`},body:form,signal:AbortSignal.timeout(60_000)});
  if(r.status===403){const body=await r.clone().json().catch(()=>null) as {error?:{code?:string}}|null;if(body?.error?.code?.startsWith("model_permission_blocked"))throw new ProviderError("model_permissions","Groq has blocked a transcription model. Enable whisper-large-v3 and whisper-large-v3-turbo in Allowed Models. Your audio is saved.");}
  await requireOK(r,"Groq");return asrSchema.parse(await r.json());
}
const deepgramSchema=z.object({results:z.object({channels:z.array(z.object({alternatives:z.array(z.object({words:z.array(z.object({start:z.number(),end:z.number(),word:z.string(),punctuated_word:z.string().optional(),confidence:z.number().optional()})).max(10000)})).min(1)})).min(1)})});
export async function transcribeDeepgram(bytes:Buffer,_model?:string,language:SpokenLanguage="auto"):Promise<ASRResult> {
  // Nova-3's `multi` language set excludes Arabic and Urdu. Never silently send
  // mixed Islamic classes as English or claim automatic code-switch recognition.
  if(language==="auto")throw new ProviderError("language_required","For Deepgram, choose the lesson’s main spoken language (Urdu, Arabic or English), then retry. Mixed-language words may be missed.");
  // Exclude this prerecorded request from Deepgram's model-improvement program.
  // This does not change separate provider metadata/log retention policies.
  const key=credentials("Deepgram",process.env.DEEPGRAM_API_KEY),query=new URLSearchParams({model:"nova-3",language,punctuate:"true",mip_opt_out:"true"});
  const r=await fetch(`https://api.deepgram.com/v1/listen?${query}`,{method:"POST",headers:{Authorization:`Token ${key}`,"Content-Type":media(bytes).type},body:new Uint8Array(bytes),signal:AbortSignal.timeout(120_000)});
  await requireOK(r,"Deepgram");const result=deepgramSchema.parse(await r.json());
  return wordsToSegments(result.results.channels[0].alternatives[0].words.map(w=>({start:w.start,end:w.end,text:w.punctuated_word||w.word,confidence:w.confidence,language})));
}
const speechSchema=z.object({results:z.array(z.object({type:z.string(),start_time:z.number(),end_time:z.number(),attaches_to:z.string().optional(),alternatives:z.array(z.object({content:z.string(),language:z.string().optional(),confidence:z.number().optional()})).min(1)})).max(20000)});
export function speechmaticsSegments(value:unknown):ASRResult {
  const result=speechSchema.parse(value),words:Word[]=[];
  for(const entry of result.results){
    const a=entry.alternatives[0];
    if(entry.type==="word")words.push({start:entry.start_time,end:entry.end_time,text:a.content,language:a.language,confidence:a.confidence});
    else if(entry.type==="punctuation"&&entry.attaches_to!=="next"&&words.length)words.at(-1)!.text+=a.content;
  }
  return wordsToSegments(words);
}
export async function transcribeSpeechmatics(bytes:Buffer,_model?:string,language:SpokenLanguage="auto"):Promise<ASRResult> {
  if(language==="auto"||language==="ur")throw new ProviderError("language_coverage","Speechmatics is currently limited to Arabic/English lessons in DarsLoop. Choose the main language; use Groq or Deepgram for Urdu. Your audio is saved.");
  const key=credentials("Speechmatics",process.env.SPEECHMATICS_API_KEY),region=process.env.SPEECHMATICS_REGION||"eu1";
  if(region!=="eu1"&&region!=="us1")throw new ProviderError("provider_configuration","Speechmatics region must be eu1 or us1.");
  const origin=`https://${region}.asr.api.speechmatics.com/v2`,headers={Authorization:`Bearer ${key}`},m=media(bytes),form=new FormData();
  // Actual Urdu probes returned the wrong script; adding documented language
  // hints made that fixture worse. Keep this backup limited and single-pass.
  form.set("config",JSON.stringify({type:"transcription",transcription_config:{model:"melia-1",language:"multi"}}));form.set("data_file",new Blob([new Uint8Array(bytes)],{type:m.type}),m.name);
  let id:string|undefined;
  try{
    const submitted=await fetch(`${origin}/jobs`,{method:"POST",headers,body:form,signal:AbortSignal.timeout(60_000)});await requireOK(submitted,"Speechmatics");
    id=z.object({id:z.string().regex(/^[a-zA-Z0-9_-]{1,128}$/)}).parse(await submitted.json()).id;
    const deadline=Date.now()+240_000;
    while(Date.now()<deadline){
      const r=await fetch(`${origin}/jobs/${id}?wait=0`,{headers,signal:AbortSignal.timeout(30_000)});await requireOK(r,"Speechmatics");
      const status=z.object({job:z.object({status:z.string()})}).parse(await r.json()).job.status;
      if(status==="done"){
        const transcript=await fetch(`${origin}/jobs/${id}/transcript?format=json-v2`,{headers,signal:AbortSignal.timeout(30_000)});await requireOK(transcript,"Speechmatics");return speechmaticsSegments(await transcript.json());
      }
      if(status!=="running")throw new ProviderError("transcription_failed","Speechmatics did not complete this section. Your audio is saved.");
      await new Promise(r=>setTimeout(r,2000));
    }
    throw new ProviderError("timeout","Speechmatics took too long. Your audio is saved; retry this section later.");
  }finally{
    if(id){try{const r=await fetch(`${origin}/jobs/${id}`,{method:"DELETE",headers,signal:AbortSignal.timeout(10_000)});if(!r.ok&&r.status!==404)console.log(JSON.stringify({event:"backup-cleanup-pending",provider:"speechmatics",status:r.status}));}catch{console.log(JSON.stringify({event:"backup-cleanup-pending",provider:"speechmatics"}));}}
  }
}
