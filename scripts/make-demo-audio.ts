import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";
import { demoScript } from "../src/lib/demo";
import type { Segment } from "../src/lib/types";
// eSpeak NG synthetic voice, original fictional script. No real classroom audio.
// Preserve published segment boundaries so existing prepared examples keep their timestamps.
const fixtures=path.join(process.cwd(),"fixtures");
const temp=path.join(process.cwd(),".data","demo-generation");
mkdirSync(fixtures,{recursive:true});mkdirSync(temp,{recursive:true});
const timing:Segment[]=JSON.parse(readFileSync(path.join(fixtures,"demo-timing.json"),"utf8"));
const segments:Segment[]=[];let offset=0;
for(let i=0;i<demoScript.length;i++) {
  const text=path.join(temp,`${i}.txt`),raw=path.join(temp,`${i}-raw.wav`),wav=path.join(temp,`${i}.wav`);
  writeFileSync(text,demoScript[i]);
  execFileSync(process.env.ESPEAK_BIN||"espeak-ng",["-v","en-us","-s","164","-f",text,"-w",raw]);
  const rawProbe=JSON.parse(execFileSync("ffprobe",["-v","error","-show_entries","format=duration","-of","json",raw],{encoding:"utf8"}));
  const target=timing[i].end-timing[i].start,ratio=Number(rawProbe.format.duration)/target;
  if(ratio<0.5||ratio>2)throw new Error("Example timing needs an explicit update");
  execFileSync("ffmpeg",["-nostdin","-hide_banner","-loglevel","error","-y","-i",raw,"-af",`atempo=${ratio},apad,atrim=duration=${target}`,"-ar","16000","-ac","1",wav]);
  const probe=JSON.parse(execFileSync("ffprobe",["-v","error","-show_entries","format=duration","-of","json",wav],{encoding:"utf8"}));
  const duration=Number(probe.format?.duration);
  if(!Number.isFinite(duration)||duration<=0)throw new Error("Example voice returned invalid duration");
  segments.push({id:`example-${i+1}`,start:offset,end:offset+duration,text:demoScript[i],flags:[]});offset+=duration;
}
const list=path.join(temp,"concat.txt");writeFileSync(list,demoScript.map((_,i)=>`file '${path.join(temp,`${i}.wav`)}'`).join("\n"));
execFileSync("ffmpeg",["-nostdin","-hide_banner","-loglevel","error","-y","-f","concat","-safe","0","-i",list,"-codec:a","libmp3lame","-b:a","64k",path.join(fixtures,"demo.mp3")]);
writeFileSync(path.join(fixtures,"demo-timing.json"),JSON.stringify(segments,null,2)+"\n");
writeFileSync(path.join(fixtures,"README.md"),"# Fictional lesson\n\nOriginal demonstration script generated locally with eSpeak NG 1.52.0 (en-us synthetic voice). Timing comes from each generated audio segment, not ASR. Notes, questions and cards are prepared example material. No model or student evaluation is implied. The fixture is not religious guidance. Regeneration requires eSpeak NG, FFmpeg and FFprobe. The tool is GPL-3.0; no speech-engine code or voice model is bundled. Its output license only applies if the output is itself a covered work; the original fictional script and rendered demonstration audio are project-created content. See https://espeak.sourceforge.net/license.html .\n");
rmSync(temp,{recursive:true});process.stdout.write(`Created fictional audio: ${offset.toFixed(1)} seconds, ${segments.length} timed passages.\n`);
