// Integration checks against the actual local server. All created data is disposable and fictional.
import assert from "node:assert/strict";
import { readFile, copyFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { realpathSync } from "node:fs";
import { dataDir, db, seedDemo, listLessons, updateLesson } from "../src/lib/store";
import { demoTitle } from "../src/lib/demo";
if(process.env.DARSLOOP_BACKEND!=="local"||path.dirname(dataDir)!==realpathSync(tmpdir())||!path.basename(dataDir).startsWith("darsloop-api-"))throw new Error("Run npm run test:api to create an isolated temporary server.");
const checks:string[]=[],errors:string[]=[];
const origin=process.env.TEST_ORIGIN||"http://127.0.0.1:3000";
let passed=0;
function check(value:unknown,label:string){assert.ok(value,label);passed++;checks.push(label);process.stdout.write(`PASS ${label}\n`);}
async function session(){const r=await fetch(origin+"/api/workspace");assert.equal(r.status,200);return {cookie:r.headers.get("set-cookie")!.split(";")[0],workspace:await r.json()};}
async function request(cookie:string,url:string,method="GET",data?:unknown,extra:Record<string,string>={}){return fetch(origin+url,{method,headers:{Cookie:cookie,Origin:origin,...(data?{"Content-Type":"application/json"}:{}),...extra},...(data?{body:JSON.stringify(data)}:{})});}
const a=await session(),b=await session();
try {
check([a.workspace,b.workspace].every(workspace=>workspace.lessons.length===1&&workspace.lessons[0].demo===true&&workspace.lessons[0].title===`Demo lesson · ${demoTitle}`&&workspace.lessons[0].stage==="Prepared example"),"new workspaces contain only the clearly labelled current prepared example");
seedDemo(a.workspace.userId);
const prepared=listLessons(a.workspace.userId)[0];
const fixturePath=path.join(dataDir,"audio",prepared.id+".mp3");
await copyFile(prepared.audioPath,fixturePath);
updateLesson({...prepared,demo:false,title:"Disposable API fixture",audioPath:fixturePath});
const lesson=(await (await request(a.cookie,"/api/workspace")).json()).lessons[0];
check(!lesson.demo&&lesson.audioPath===""&&lesson.artifacts.practice.some((p:{kind:string})=>p.kind==="quiz")&&lesson.artifacts.practice.some((p:{kind:string})=>p.kind==="flashcard"),"explicit test fixture is visible and private paths stay hidden");
const quiz=lesson.artifacts.practice.find((item:{kind:string})=>item.kind==="quiz"),card=lesson.artifacts.practice.find((item:{kind:string})=>item.kind==="flashcard");
check((await request(b.cookie,`/api/lessons/${lesson.id}`)).status===404,"another browser cannot read private lesson");
check((await request(a.cookie,"/api/classes","POST",{action:"create",name:"X"},{Origin:"https://evil.invalid"})).status===403,"cross-origin mutation denied");
const audio=await request(a.cookie,`/api/lessons/${lesson.id}/audio`,"GET",undefined,{Range:"bytes=0-99"});check(audio.status===206&&(await audio.arrayBuffer()).byteLength===100,"original audio supports partial playback");
check((await request(a.cookie,`/api/lessons/${lesson.id}/audio`,"GET",undefined,{Range:"bytes=999999999-"})).status===416,"invalid playback range rejected");
if(a.workspace.configured.generation){check(a.workspace.configured.generation===true,"generation configuration is visible without exposing the key; live answers checked separately");}
else{const chat=await (await request(a.cookie,`/api/lessons/${lesson.id}/chat`,"POST",{question:"What are the five pillars named in this lesson?",version:lesson.version})).json();check(chat.mode==="excerpt"&&chat.blocks.length>0,"unconfigured chat searches the current saved transcript and labels excerpt mode");}
const personal=await (await request(a.cookie,`/api/lessons/${lesson.id}/chat`,"POST",{question:"Is it halal for me to do this?",version:1})).json();check(personal.status==="needs_teacher","personal religious request refers to teacher");
check((await request(a.cookie,`/api/lessons/${lesson.id}/review`,"POST",{itemId:quiz.id,version:lesson.version+1,answer:quiz.answer})).status===409,"old practice version rejected");
const review=await (await request(a.cookie,`/api/lessons/${lesson.id}/review`,"POST",{itemId:quiz.id,version:lesson.version,answer:quiz.answer})).json();check(review.correct===true&&review.review.intervalDays===1,"quiz checked server-side and review scheduled");
const flash=await (await request(a.cookie,`/api/lessons/${lesson.id}/review`,"POST",{itemId:card.id,version:lesson.version,remembered:false})).json();check(!flash.correct&&flash.review.intervalDays===0,"flashcard repeat scheduled privately");
const made=await (await request(a.cookie,"/api/classes","POST",{action:"create",name:"Disposable API test"})).json(),group=made.groups[0];
const invited=await (await request(a.cookie,"/api/classes","POST",{action:"invite",groupId:group.id})).json();await request(b.cookie,"/api/classes","POST",{action:"join",token:invited.token});
await request(a.cookie,"/api/classes","POST",{action:"share",groupId:group.id,lessonId:lesson.id,permitted:true});check((await request(b.cookie,`/api/lessons/${lesson.id}`)).status===200,"invited classmate can access explicitly shared lesson");
const bspace=await (await request(b.cookie,"/api/workspace")).json();check(bspace.reviews.length===0,"classmate cannot see owner's answers");
await request(a.cookie,"/api/classes","POST",{action:"revoke",groupId:group.id,lessonId:lesson.id});check((await request(b.cookie,`/api/lessons/${lesson.id}/audio`)).status===404,"revocation blocks future audio reads");
const upload=new FormData();upload.set("audio",new Blob([new Uint8Array(await readFile("fixtures/demo.mp3"))],{type:"audio/mpeg"}),"fictional.mp3");upload.set("title","Disposable fictional upload");upload.set("course","Testing");upload.set("permitted","true");upload.set("synthetic","true");
const saved=await fetch(origin+"/api/lessons",{method:"POST",headers:{Cookie:a.cookie,Origin:origin},body:upload});const fresh=await saved.json();check(saved.status===201&&fresh.status==="queued"&&fresh.segments.length===0,"fresh audio is saved to a durable job without fake AI results");
check((await request(b.cookie,`/api/lessons/${fresh.id}/audio`)).status===404,"uploaded audio is private");
upload.set("synthetic","false");check((await fetch(origin+"/api/lessons",{method:"POST",headers:{Cookie:a.cookie,Origin:origin},body:upload})).status===400,"contest upload rejects non-fictional confirmation");
await request(a.cookie,`/api/lessons/${fresh.id}`,"DELETE");check((await request(a.cookie,`/api/lessons/${fresh.id}`)).status===404,"deleting disposable test upload removes lesson");
process.stdout.write(`${passed} integration checks passed. No authenticated ASR or generation requests were performed.\n`);
}catch(error){errors.push(String(error));process.stderr.write(`${String(error)}\n`);process.exitCode=1;}finally{
 for(const user of [a.workspace.userId,b.workspace.userId]){
  for(const l of listLessons(user))await request(user===a.workspace.userId?a.cookie:b.cookie,`/api/lessons/${l.id}`,"DELETE");
  const groups=db().prepare("SELECT id FROM groups WHERE owner_id=?").all(user) as {id:string}[];
  for(const group of groups){for(const table of ["shares","invites","memberships"])db().prepare(`DELETE FROM ${table} WHERE group_id=?`).run(group.id);db().prepare("DELETE FROM groups WHERE id=?").run(group.id);}
  db().prepare("DELETE FROM sessions WHERE user_id=?").run(user);db().prepare("DELETE FROM events WHERE user_id=?").run(user);
 }
 const remaining=Number((db().prepare("SELECT COUNT(*) AS n FROM lessons WHERE owner_id IN (?,?)").get(a.workspace.userId,b.workspace.userId) as {n:number}).n);
 if(remaining)errors.push("Temporary lessons remain");
 await mkdir("verification",{recursive:true});
 await writeFile("verification/local-api.json",JSON.stringify({checkedAt:new Date().toISOString(),scope:"Actual isolated local HTTP/SQLite/private playback/review/class-sharing endpoints. Fictional prepared fixture explicitly inserted only into this test session. Worker stopped; no cloud Auth or provider requests. Exact test session/lesson/class cleanup completed.",passed,checks,errors,remainingLessons:remaining},null,2));
}
