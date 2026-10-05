import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile, stat, copyFile, unlink, open, chmod } from "node:fs/promises";
import { MAX_IMPORT_BYTES, MAX_STORED_AUDIO_BYTES } from "./upload-options";
const run=promisify(execFile);
export const MAX_UPLOAD=MAX_IMPORT_BYTES;
export const MAX_DURATION=60*60;
// Encoders can report a few extra frames of padding for an exactly one-hour
// recording. Keep its public timeline capped, without accepting extra minutes.
export class MediaError extends Error { constructor(public code:string,message:string){super(message);} }
export function boundedMediaDuration(value:number) {
  if(!Number.isFinite(value)||value<=0||value>MAX_DURATION+0.25)throw new MediaError("media_duration","Choose a valid audio recording of up to one hour.");
  return Math.min(value,MAX_DURATION);
}
export function mediaMime(bytes:Buffer) {
  if(bytes.subarray(0,4).toString()==="RIFF"&&bytes.subarray(8,12).toString()==="WAVE")return "audio/wav";
  if(bytes.subarray(4,8).toString()==="ftyp")return "audio/mp4";
  if(bytes.subarray(0,4).toString()==="OggS")return "audio/ogg";
  if(bytes.subarray(0,4).equals(Buffer.from([0x1a,0x45,0xdf,0xa3])))return "audio/webm";
  if(bytes.subarray(0,4).toString()==="fLaC")return "audio/flac";
  if(bytes[0]===0xff&&(bytes[1]&0xf6)===0xf0)return "audio/aac";
  if(bytes.subarray(0,3).toString()==="ID3"||(bytes[0]===0xff&&(bytes[1]&0xe0)===0xe0))return "audio/mpeg";
  return null;
}
export async function inspectMedia(file:string) {
  const {stdout}=await run(process.env.FFPROBE_BIN||"ffprobe",["-v","error","-protocol_whitelist","file,pipe","-show_entries","format=duration,format_name:stream=codec_type,codec_name","-of","json",file],{timeout:15_000,maxBuffer:100_000});
  const result=JSON.parse(stdout);let duration=Number(result.format?.duration);
  if(!result.streams?.some((s:{codec_type:string})=>s.codec_type==="audio"))throw new MediaError("media_no_audio","This file has no audio track. Choose an audio recording or a video with sound.");
  // Browser WebM recordings often have no duration header. Measure the decoded
  // stream rather than rejecting valid captured audio or trusting wall-clock time.
  if(!Number.isFinite(duration)||duration<=0||result.format?.format_name==="aac"){
    const scan=await run(process.env.FFMPEG_BIN||"ffmpeg",["-nostdin","-hide_banner","-loglevel","error","-nostats","-progress","pipe:1","-protocol_whitelist","file,pipe","-i",file,"-t",String(MAX_DURATION+1),"-vn","-f","null","-"],{timeout:60_000,maxBuffer:200_000});
    const values=[...scan.stdout.matchAll(/^out_time_us=(\d+)$/gm)];duration=values.length?Number(values[values.length-1][1])/1_000_000:NaN;
  }
  duration=boundedMediaDuration(duration);
  return {duration,hasVideo:result.streams.some((s:{codec_type:string})=>s.codec_type==="video"),codec:result.streams.find((s:{codec_type:string})=>s.codec_type==="audio").codec_name as string};
}
export async function inspectAudio(file:string) {return (await inspectMedia(file)).duration;}
export async function prepareImportedAudio(input:string,output:string) {
  const handle=await open(input,"r");const header=Buffer.alloc(16);try{await handle.read(header,0,16,0);}finally{await handle.close();}
  const mime=mediaMime(header);if(!mime)throw new Error("Unsupported media format.");
  const info=await inspectMedia(input),sourceSize=(await stat(input)).size;
  const source=info.hasVideo?"video" as const:"audio" as const;
  const native=["audio/mpeg","audio/mp4","audio/wav","audio/ogg","audio/webm"].includes(mime);
  if(native&&!info.hasVideo&&sourceSize<=MAX_STORED_AUDIO_BYTES){await copyFile(input,output);return {mime,duration:info.duration};}
  const temporary=output+".m4a";
  // AAC can be repackaged/extracted without re-encoding. Long or uncompressed
  // inputs use a compact audio copy; the timeline is neither trimmed nor sped up.
  if(info.codec==="aac"){
    try{
      await run(process.env.FFMPEG_BIN||"ffmpeg",["-nostdin","-hide_banner","-loglevel","error","-y","-protocol_whitelist","file,pipe","-threads","1","-i",input,"-map","0:a:0","-vn","-c:a","copy","-movflags","+faststart",temporary],{timeout:180_000,maxBuffer:100_000});
      if((await stat(temporary)).size<=MAX_STORED_AUDIO_BYTES){await copyFile(temporary,output);await chmod(output,0o600);return {mime:"audio/mp4",duration:await inspectAudio(output),importedMedia:{source,preparation:info.hasVideo?"extracted" as const:"repackaged" as const}};}
    }catch{/* A valid decoded input can still need a supported audio encoding. */}
    finally{await unlink(temporary).catch(()=>{});}
  }
  await run(process.env.FFMPEG_BIN||"ffmpeg",["-nostdin","-hide_banner","-loglevel","error","-y","-protocol_whitelist","file,pipe","-threads","1","-i",input,"-map","0:a:0","-vn","-ac","1","-ar","24000","-c:a","libmp3lame","-b:a","48k","-f","mp3",output],{timeout:180_000,maxBuffer:100_000});
  if((await stat(output)).size>MAX_STORED_AUDIO_BYTES)throw new Error("The prepared audio is too large.");
  await chmod(output,0o600);
  return {mime:"audio/mpeg",duration:await inspectAudio(output),importedMedia:{source,preparation:"compressed" as const}};
}
export async function audioChunk(original:string,output:string,start:number,duration:number) {
  await run(process.env.FFMPEG_BIN||"ffmpeg",["-nostdin","-hide_banner","-loglevel","error","-y","-protocol_whitelist","file,pipe","-ss",String(start),"-threads","1","-i",original,"-t",String(duration),"-vn","-ar","16000","-ac","1","-c:a","pcm_s16le",output],{timeout:60_000,maxBuffer:100_000});
  const bytes=await readFile(output);if(bytes.length>=25_000_000)throw new Error("Audio chunk exceeds the transcription limit.");return bytes;
}
export function parseRange(header:string|null,size:number):{start:number;end:number}|null {
  if(!header)return null;const m=/^bytes=(\d*)-(\d*)$/.exec(header);if(!m||(!m[1]&&!m[2]))throw new Error("Invalid range");
  const start=m[1]?Number(m[1]):Math.max(0,size-Number(m[2]));const end=m[1]?(m[2]?Math.min(size-1,Number(m[2])):size-1):size-1;
  if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||end<start||start>=size||(!m[1]&&Number(m[2])<=0))throw new Error("Invalid range");return {start,end};
}
