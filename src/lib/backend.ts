import * as local from "./store";
import * as cloud from "./supabase/store";
import { cloudMode } from "./supabase/config";
import type { Lesson } from "./types";
import { expireUnusedImports } from "./supabase/imports";
export { publicLesson, dataDir } from "./store";
const backend=()=>cloudMode()?cloud:local;
export async function rawLesson(id:string){return backend().rawLesson(id);}
export async function authorizedLesson(user:string,id:string){return backend().authorizedLesson(user,id);}
export async function seedDemo(user:string){return backend().seedDemo(user);}
export async function listLessons(user:string){return backend().listLessons(user);}
export async function transcriptCandidates(owner:string,key:string,exclude:string){return backend().transcriptCandidates(owner,key,exclude);}
export async function listReviews(user:string){return backend().listReviews(user);}
export async function listGroups(user:string){return backend().listGroups(user);}
export async function queueLesson(l:Lesson,isNew=false){return backend().queueLesson(l,isNew);}
export async function queueDetailedMaterial(user:string,id:string,version:number,materialRevision:number){return backend().queueDetailedMaterial(user,id,version,materialRevision);}
export { MaterialQueueError } from "./material-queue";
export async function claimJob(pdfOnly=false){return backend().claimJob(pdfOnly);}
export async function heartbeat(id:string,lease:string){return backend().heartbeat(id,lease);}
export async function jobCommit(id:string,lease:string,l:Lesson,done=false){return backend().jobCommit(id,lease,l,done);}
export async function failJob(id:string,lease:string,error:string){return backend().failJob(id,lease,error);}
export async function deleteLesson(user:string,id:string){return backend().deleteLesson(user,id);}
export async function saveReview(user:string,l:Lesson,id:string,correct:boolean){return backend().saveReview(user,l,id,correct);}
export async function createGroup(user:string,name:string){return backend().createGroup(user,name);}
export async function invite(user:string,id:string){return backend().invite(user,id);}
export async function join(user:string,token:string){return backend().join(user,token);}
export async function share(user:string,group:string,id:string){return backend().share(user,group,id);}
export async function revokeShare(user:string,group:string,id:string){return backend().revokeShare(user,group,id);}
export async function countLessons(user:string){return cloudMode()?cloud.countLessons(user):Number((local.db().prepare("SELECT COUNT(*) AS n FROM lessons WHERE owner_id=?").get(user) as {n:number}).n);}
export async function takeBudget(user:string,event:string,limit:number){
 if(cloudMode())return cloud.takeBudget(user,event,limit);
 const database=local.db();database.exec("BEGIN IMMEDIATE");try{
  database.prepare("DELETE FROM events WHERE created_at<?").run(new Date(Date.now()-86400_000).toISOString());
  const count=Number((database.prepare("SELECT COUNT(*) AS n FROM events WHERE user_id=? AND event=? AND created_at>?").get(user,event,new Date(Date.now()-60_000).toISOString()) as {n:number}).n);
  if(count>=limit){database.exec("COMMIT");return false;}
  database.prepare("INSERT INTO events(user_id,event,created_at) VALUES(?,?,?)").run(user,event,new Date().toISOString());database.exec("COMMIT");return true;
 }catch(e){database.exec("ROLLBACK");throw e;}
}
export async function expireJobs(){if(cloudMode()){await expireUnusedImports();return;}const rows=local.db().prepare("SELECT id,lease FROM jobs WHERE status='running' AND attempts>=3 AND lease_until<?").all(Date.now()) as {id:string;lease:string}[];for(const r of rows)local.failJob(r.id,r.lease,"Processing was interrupted repeatedly. Your audio is saved; retry when the worker is stable.");}
export async function storeAudio(l:Lesson,bytes:Buffer){return cloudMode()?cloud.storeAudio(l,bytes):l;}
export async function prepareAudio(l:Lesson,file:string){return cloudMode()?cloud.prepareAudio(l,file):l.audioPath;}
export const cloudAudioBytes=cloud.audioBytes;
export const removeCloudAudio=cloud.removeAudio;

export async function deferJob(id:string,lease:string,retryAt:number,message:string){return backend().deferJob(id,lease,retryAt,message);}
export async function reserveAudio(models:string[],seconds:number){return backend().reserveAudio(models,seconds);}
