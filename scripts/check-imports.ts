// Disposable fictional media only. Real private storage/auth plus the worker.
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, readFile, rm, stat, readdir, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { adminClient } from "../src/lib/supabase/admin";
import { evidenceValid } from "../src/lib/evidence";
import type { Lesson } from "../src/lib/types";
const origin=process.env.TEST_ORIGIN||"http://127.0.0.1:3000",admin=adminClient(),run=promisify(execFile);
if(!["localhost","127.0.0.1","[::1]"].includes(new URL(origin).hostname))throw new Error("Run this cloud-backed import check against a local server sharing DARSLOOP_DATA_DIR.");
const directory=await mkdtemp(path.join(tmpdir(),"darsloop-import-check-")),checks:string[]=[],ids:string[]=[];
let userId="";const jar=new Map<string,string>();
const cookie=()=>[...jar].map(([key,value])=>`${key}=${value}`).join("; ");
function check(value:unknown,label:string){assert.ok(value,label);checks.push(label);process.stdout.write(`PASS ${label}\n`);}
async function request(url:string,method="GET",data?:unknown,headers:Record<string,string>={}){const result=await fetch(origin+url,{method,headers:{Cookie:cookie(),Origin:origin,...(data?{"Content-Type":"application/json"}:{}),...headers},...(data?{body:JSON.stringify(data)}:{})});for(const line of result.headers.getSetCookie()){const pair=line.split(";")[0],at=pair.indexOf("=");jar.set(pair.slice(0,at),pair.slice(at+1));}return result;}
try{
  const email=`darsloop-import-${randomBytes(8).toString("hex")}@example.invalid`,password=randomBytes(32).toString("hex");
  const {data,error}=await admin.auth.admin.createUser({email,password,email_confirm:true});assert.equal(error,null);userId=data.user!.id;
  assert.equal((await request("/api/account","POST",{action:"signin",email,password})).status,200);
  for(const [name,args] of [["large.wav",["-ar","192000","-ac","2","-c:a","pcm_s16le"]],["raw.aac",["-c:a","aac","-f","adts"]]] as [string,string[]][]){await run("ffmpeg",["-nostdin","-loglevel","error","-i","fixtures/demo.mp3",...args,path.join(directory,name)]);}
  await run("ffmpeg",["-nostdin","-loglevel","error","-f","lavfi","-i","color=c=white:s=160x100:r=1","-i","fixtures/demo.mp3","-shortest","-c:v","libx264","-c:a","aac",path.join(directory,"video.mp4")]);
  let liveId="";
  for(const [name,preparation] of [["large.wav","compressed"],["raw.aac","repackaged"],["video.mp4","extracted"]]){
    const bytes=await readFile(path.join(directory,name));
    if(name==="large.wav")check(bytes.length>24*1024*1024,"test source actually exceeds the former 24 MB cap");
    const form=new FormData();form.set("audio",new Blob([bytes]),name);form.set("title","Disposable import check");form.set("permitted","true");form.set("synthetic","true");form.set("notesEnabled","true");form.set("noteDetail","detailed");
    const response=await fetch(origin+"/api/lessons",{method:"POST",headers:{Cookie:cookie(),Origin:origin},body:form});
    assert.equal(response.status,201,await response.clone().text());const lesson:Lesson=await response.json();ids.push(lesson.id);
    check(lesson.importedMedia?.preparation===preparation&&lesson.noteOptions?.detail==="detailed",`${name} uploads and retains note detail plus preparation disclosure`);
    const stored=await admin.storage.from("lesson-audio").download(`${userId}/${lesson.id}`);assert.equal(stored.error,null);
    check(stored.data!.size>0&&stored.data!.size<24*1024*1024,`${name} fits the existing private storage bucket without changing its limit`);
    const range=await request(`/api/lessons/${lesson.id}/audio`,"GET",undefined,{Range:"bytes=0-99"});check(range.status===206&&(await range.arrayBuffer()).byteLength===100,`${name} prepared audio supports timestamp playback`);
    if(name==="raw.aac")liveId=lesson.id;
    else assert.equal((await request(`/api/lessons/${lesson.id}`,"DELETE")).status,200);
  }
  const deadline=Date.now()+180_000;let lesson:Lesson|undefined;
  while(Date.now()<deadline){lesson=await (await request(`/api/lessons/${liveId}`)).json();if(lesson!.status==="failed")throw new Error(lesson!.error||"Processing failed");if(lesson!.status==="ready")break;await new Promise(resolve=>setTimeout(resolve,1200));}
  check(lesson?.status==="ready"&&lesson.providers?.checker,"actual AAC import reaches ready through both ASR passes and study generation");
  check(lesson!.artifacts!.notes.length>0&&lesson!.artifacts!.notes.every(note=>evidenceValid(note.evidence,lesson!.segments)),"AAC notes keep source quotes and valid timestamps");
  check(["quiz","flashcard"].every(kind=>lesson!.artifacts!.practice.some(item=>item.kind===kind&&evidenceValid(item.evidence,lesson!.segments))),"AAC import generates both source-linked quizzes and flashcards");
  const entries=await readdir(path.join(process.env.DARSLOOP_DATA_DIR||".data","imports"));check(entries.length===0,"temporary source files are removed after all imports");
  await mkdir("verification",{recursive:true});
  await writeFile("verification/imports-v16.json",JSON.stringify({checkedAt:new Date().toISOString(),checks,sourceBytes:(await stat(path.join(directory,"large.wav"))).size,providers:lesson!.providers,scope:"Fictional speech; actual localhost HTTP, real Supabase auth/private storage and AAC live model pipeline. Not a hosted deployment or general speech benchmark."},null,2));
}finally{
  for(const id of ids)await request(`/api/lessons/${id}`,"DELETE");
  if(userId){const result=await admin.auth.admin.deleteUser(userId);assert.equal(result.error,null);}
  await rm(directory,{recursive:true,force:true});
}
