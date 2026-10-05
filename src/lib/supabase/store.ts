import { createHash, randomBytes } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { adminClient, rpc } from "./admin";
import { removeImport } from "./imports";
import { safeLesson } from "../store";
import { nextReview } from "../review-activity";
import { demoArtifacts, demoScript } from "../demo";
import type { ClassGroup, Lesson, Review, Segment } from "../types";
function checked<T>(r:{data:T;error:unknown}){if(r.error)throw new Error("Private database action failed");return r.data;}
const hash=(s:string)=>createHash("sha256").update(s).digest("hex");
const row=(l:Lesson)=>({id:l.id,owner_id:l.ownerId,version:l.version,payload:l});
export async function rawLesson(id:string):Promise<Lesson|null>{if(!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id))return null;const r=await adminClient().from("lessons").select("payload").eq("id",id).maybeSingle();return checked(r)?.payload||null;}
async function memberGroups(user:string):Promise<string[]>{return checked(await adminClient().from("memberships").select("group_id").eq("user_id",user))!.map(m=>m.group_id);}
export async function authorizedLesson(user:string,id:string):Promise<Lesson|null>{
 const l=await rawLesson(id);if(!l)return null;if(l.ownerId===user)return safeLesson(l);
 const groups=await memberGroups(user);if(!groups.length)return null;
 const shares=checked(await adminClient().from("shares").select("group_id").eq("lesson_id",id).eq("version",l.version).in("group_id",groups));return shares?.length?safeLesson({...l,shared:true}):null;
}
export async function listLessons(user:string):Promise<Lesson[]>{
 const client=adminClient(),own=checked(await client.from("lessons").select("payload").eq("owner_id",user))!.map(r=>r.payload as Lesson),groups=await memberGroups(user);
 if(!groups.length)return own;
 const shares=checked(await client.from("shares").select("lesson_id,version").in("group_id",groups))!;if(!shares.length)return own;
 const shared=checked(await client.from("lessons").select("payload").in("id",shares.map(s=>s.lesson_id)))!.map(r=>r.payload as Lesson).filter(l=>shares.some(s=>s.lesson_id===l.id&&s.version===l.version));
 return [...new Map([...own,...shared].map(l=>[l.id,{...l,shared:l.ownerId!==user}])).values()].sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
}
export async function seedDemo(user:string){
 const client=adminClient(),account=await client.auth.admin.getUserById(user);
 if(account.error||!account.data.user)throw new Error("Account unavailable");
 if(account.data.user.user_metadata?.darsloop_example_added)return;
 const segments:Segment[]=JSON.parse(await readFile(path.join(process.cwd(),"fixtures/demo-timing.json"),"utf8"));if(segments.length!==demoScript.length||segments.some((s,i)=>s.text!==demoScript[i]||!Number.isFinite(s.start)||!Number.isFinite(s.end)||s.end<=s.start))throw new Error("Example audio manifest is invalid");
 const h=hash(`darsloop-demo:${user}`),id=`${h.slice(0,8)}-${h.slice(8,12)}-5${h.slice(13,16)}-8${h.slice(17,20)}-${h.slice(20,32)}`;
 const l:Lesson={id,ownerId:user,title:"Demo lesson · Listening & revision",course:"Adab of learning",createdAt:new Date().toISOString(),duration:segments.at(-1)!.end,version:1,status:"ready",stage:"Prepared example",error:null,demo:true,segments,artifacts:demoArtifacts(segments),audioPath:"fixtures/demo.mp3",mime:"audio/mpeg"};
 checked(await client.from("lessons").upsert(row(l),{onConflict:"id",ignoreDuplicates:true}));
 const updated=await client.auth.admin.updateUserById(user,{user_metadata:{...account.data.user.user_metadata,darsloop_example_added:true}});
 if(updated.error)throw new Error("Example preference could not be saved");
}
export async function countLessons(user:string){const r=await adminClient().from("lessons").select("id",{head:true,count:"exact"}).eq("owner_id",user);checked(r);return r.count||0;}
export async function queueLesson(l:Lesson,isNew=false){await rpc("darsloop_queue",{p_payload:l,p_new:isNew});}
export async function claimJob(pdfOnly=false){const rows=await rpc<{id:string;lesson_id:string;lease:string;attempts:number}[]>(pdfOnly?"darsloop_claim_pdf":"darsloop_claim");return rows[0]||null;}
export async function heartbeat(id:string,lease:string){return rpc<boolean>("darsloop_heartbeat",{p_job:id,p_lease:lease});}
export async function jobCommit(id:string,lease:string,l:Lesson,done=false){await rpc("darsloop_commit",{p_job:id,p_lease:lease,p_payload:l,p_done:done});}
export async function failJob(id:string,lease:string,error:string){await rpc("darsloop_fail",{p_job:id,p_lease:lease,p_error:error});}
export async function deleteLesson(user:string,id:string){const l=await rawLesson(id);if(!l||l.ownerId!==user)throw new Error("Lesson not found");checked(await adminClient().from("lessons").delete().eq("id",id).eq("owner_id",user));return l;}
export async function listReviews(user:string):Promise<Review[]>{
 const available=await listLessons(user),rows=checked(await adminClient().from("reviews").select("payload").eq("user_id",user))!;
 return rows.map(r=>r.payload as Review).filter(r=>available.some(l=>l.id===r.lessonId&&l.version===r.version&&safeLesson(l).artifacts?.practice.some(p=>p.id===r.itemId)));
}
export async function saveReview(user:string,l:Lesson,itemId:string,correct:boolean):Promise<Review>{
 const client=adminClient();
 // Compare the whole stored JSON so concurrent requests cannot overwrite attempts/activity.
 // The existing JSON payload carries the bounded log; no schema or remote RPC change is needed.
 for(let attempt=0;attempt<4;attempt++){
  const current=await authorizedLesson(user,l.id);
  if(!current||current.version!==l.version)throw new Error("Lesson access ended or the lesson changed");
  if(!current.artifacts?.practice.some(p=>p.id===itemId))throw new Error("Practice item not found");
  const previous=checked(await client.from("reviews").select("payload").eq("user_id",user).eq("lesson_id",l.id).eq("item_id",itemId).eq("version",l.version).maybeSingle());
  const review=nextReview(l.id,l.version,itemId,correct,previous?.payload as Review|undefined);
  if(previous){
   const saved=checked(await client.from("reviews").update({payload:review}).eq("user_id",user).eq("lesson_id",l.id).eq("item_id",itemId).eq("version",l.version).eq("payload",JSON.stringify(previous.payload)).select("payload").maybeSingle());
   if(saved)return saved.payload as Review;
  }else{
   const saved=await client.from("reviews").insert({user_id:user,lesson_id:l.id,item_id:itemId,version:l.version,payload:review}).select("payload").single();
   if(saved.error?.code==="23505")continue;
   return checked(saved)!.payload as Review;
  }
 }
 throw new Error("Another review was saved at the same time. Try this answer again.");
}
export async function groupOwner(user:string,id:string){return !!checked(await adminClient().from("groups").select("id").eq("id",id).eq("owner_id",user).maybeSingle());}
export async function createGroup(user:string,name:string){return rpc<string>("darsloop_group",{p_user:user,p_name:name});}
export async function invite(user:string,id:string){if(!await groupOwner(user,id))throw new Error("Class not found");const token=randomBytes(24).toString("hex");checked(await adminClient().from("invites").insert({token_hash:hash(token),group_id:id,expires_at:new Date(Date.now()+86400_000).toISOString()}));return token;}
export async function join(user:string,token:string){try{return await rpc<string>("darsloop_join",{p_user:user,p_hash:hash(token)});}catch{throw new Error("This invitation was used or expired. Ask for a new link.");}}
export async function share(user:string,groupId:string,lessonId:string){const l=await rawLesson(lessonId);if(!l||l.ownerId!==user||l.status!=="ready")throw new Error("Only your ready lessons can be shared.");if(!(await memberGroups(user)).includes(groupId))throw new Error("Class not found");checked(await adminClient().from("shares").upsert({group_id:groupId,lesson_id:lessonId,version:l.version}));}
export async function revokeShare(user:string,groupId:string,lessonId:string){const l=await rawLesson(lessonId);if(l?.ownerId!==user&&!await groupOwner(user,groupId))throw new Error("Class not found");checked(await adminClient().from("shares").delete().eq("group_id",groupId).eq("lesson_id",lessonId));}
export async function listGroups(user:string):Promise<ClassGroup[]>{
 const client=adminClient(),ids=await memberGroups(user);if(!ids.length)return [];
 const groups=checked(await client.from("groups").select("*").in("id",ids))!,members=checked(await client.from("memberships").select("group_id").in("group_id",ids))!,shares=checked(await client.from("shares").select("group_id,lesson_id,version").in("group_id",ids))!,lessons=shares.length?checked(await client.from("lessons").select("payload").in("id",shares.map(s=>s.lesson_id)))!.map(r=>r.payload as Lesson):[];
 return groups.map(g=>({id:g.id,name:g.name,owner:g.owner_id===user,memberCount:members.filter(m=>m.group_id===g.id).length,lessons:lessons.filter(l=>shares.some(s=>s.group_id===g.id&&s.lesson_id===l.id&&s.version===l.version)).map(l=>({id:l.id,title:l.title,course:l.course,demo:l.demo}))}));
}
export async function takeBudget(user:string,event:string,limit:number){return rpc<boolean>("darsloop_budget",{p_user:user,p_event:event,p_limit:limit});}
export async function storeAudio(l:Lesson,bytes:Buffer){const audioPath=`${l.ownerId}/${l.id}`;checked(await adminClient().storage.from("lesson-audio").upload(audioPath,bytes,{contentType:l.mime,upsert:false}));return {...l,audioPath};}
export async function audioBytes(l:Lesson){
 if(l.demo)return readFile(path.join(process.cwd(),"fixtures/demo.mp3"));
 if(l.audioPath!==`${l.ownerId}/${l.id}`)throw new Error("Invalid private audio path");
 const blob=checked(await adminClient().storage.from("lesson-audio").download(l.audioPath));if(!blob||blob.size>24*1024*1024)throw new Error("Audio is unavailable");return Buffer.from(await blob.arrayBuffer());
}
export async function prepareAudio(l:Lesson,file:string){const bytes=await audioBytes(l);await writeFile(file,bytes,{mode:0o600});return file;}
export async function removeAudio(l:Lesson){if(l.demo)return;if(l.audioPath!==`${l.ownerId}/${l.id}`)throw new Error("Invalid private audio path");if(l.sourceImport)await removeImport(l.ownerId,l.id,l.sourceImport.parts);checked(await adminClient().storage.from("lesson-audio").remove([l.audioPath]));}
export async function savedVectors(id:string,version:number,model:string,dimensions:number){return checked(await adminClient().from("search_vectors").select("chunk_hash,vector").eq("lesson_id",id).eq("version",version).eq("model",model).eq("dimensions",dimensions))!;}
export async function saveVectors(id:string,version:number,model:string,dimensions:number,batch:{hash:string;vector:number[]}[],segments:Segment[]){await rpc("darsloop_vectors",{p_lesson:id,p_version:version,p_model:model,p_dimensions:dimensions,p_batch:batch,p_segments:segments});}

export async function deferJob(id:string,lease:string,retryAt:number,message:string){await rpc("darsloop_defer",{p_job:id,p_lease:lease,p_until:new Date(retryAt).toISOString(),p_message:message});}
export async function reserveAudio(models:string[],seconds:number){const result=await rpc<string|null>("darsloop_reserve_audio",{p_models:models,p_seconds:seconds});return result?Date.parse(result):null;}
