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

const segments:Segment[]=[];let offset=0;
for(let i=0;i<demoScript.length;i++) {
  const text=path.join(temp,`${i}.txt`),raw=path.join(temp,`${i}-raw.wav`),wav=path.join(temp,`${i}.wav`);
  writeFileSync(text,demoScript[i]);
  execFileSync(process.env.ESPEAK_BIN||"espeak-ng",["-v","en-us","-s","164","-f",text,"-w",raw]);
  const rawProbe=JSON.parse(execFileSync("ffprobe",["-v","error","-show_entries","format=duration","-of","json",raw],{encoding:"utf8"}));
  const target=Number(rawProbe.format.duration);
  if(!Number.isFinite(target)||target<=0)throw new Error("Example voice returned invalid duration");
  execFileSync("ffmpeg",["-nostdin","-hide_banner","-loglevel","error","-y","-i",raw,"-ar","16000","-ac","1",wav]);
  const probe=JSON.parse(execFileSync("ffprobe",["-v","error","-show_entries","format=duration","-of","json",wav],{encoding:"utf8"}));
  const duration=Number(probe.format?.duration);
  if(!Number.isFinite(duration)||duration<=0)throw new Error("Example voice returned invalid duration");
  segments.push({id:`example-${i+1}`,start:offset,end:offset+duration,text:demoScript[i],flags:[]});offset+=duration;
}
const list=path.join(temp,"concat.txt");writeFileSync(list,demoScript.map((_,i)=>`file '${path.join(temp,`${i}.wav`)}'`).join("\n"));
execFileSync("ffmpeg",["-nostdin","-hide_banner","-loglevel","error","-y","-f","concat","-safe","0","-i",list,"-codec:a","libmp3lame","-b:a","64k",path.join(fixtures,"demo-five-pillars.mp3")]);
writeFileSync(path.join(fixtures,"demo-five-pillars-timing.json"),JSON.stringify(segments,null,2)+"\n");
writeFileSync(path.join(fixtures,"demo-five-pillars-script.txt"),demoScript.join("\n\n")+"\n");
rmSync(temp,{recursive:true});process.stdout.write(`Created fictional audio: ${offset.toFixed(1)} seconds, ${segments.length} timed passages.\n`);
