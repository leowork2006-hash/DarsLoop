import { sourcePassages } from "./source-passages";
import { DatabaseSync } from "node:sqlite";
import { randomUUID, createHash, randomBytes } from "node:crypto";
import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { demoArtifacts, demoScript } from "./demo";
import { evidenceValid, instructionLike, safePractice } from "./evidence";
import { nextReview } from "./review-activity";
import type { ClassGroup, Lesson, Review, Segment } from "./types";
import { detailedQueueChange, MaterialQueueError, type DetailedQueueResult } from "./material-queue";
import { supportedOverview } from "./material-overview";

export const dataDir=path.resolve(/* turbopackIgnore: true */ process.env.DARSLOOP_DATA_DIR||".data");
let database:DatabaseSync|undefined;
export function db() {
  if(database)return database;
  mkdirSync(path.join(dataDir,"audio"),{recursive:true,mode:0o700});
  database=new DatabaseSync(path.join(dataDir,"darsloop.sqlite"));
  database.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; PRAGMA foreign_keys=ON;
    CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL,expires_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS lessons (id TEXT PRIMARY KEY,owner_id TEXT NOT NULL,version INTEGER NOT NULL,payload TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS jobs (id TEXT PRIMARY KEY,lesson_id TEXT UNIQUE NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,status TEXT NOT NULL,lease TEXT,lease_until INTEGER,attempts INTEGER NOT NULL DEFAULT 0,error TEXT);
    CREATE TABLE IF NOT EXISTS reviews (user_id TEXT NOT NULL,lesson_id TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,item_id TEXT NOT NULL,version INTEGER NOT NULL,payload TEXT NOT NULL,PRIMARY KEY(user_id,lesson_id,item_id,version));
    CREATE TABLE IF NOT EXISTS groups (id TEXT PRIMARY KEY,owner_id TEXT NOT NULL,name TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS memberships (group_id TEXT NOT NULL REFERENCES groups(id),user_id TEXT NOT NULL,PRIMARY KEY(group_id,user_id));
    CREATE TABLE IF NOT EXISTS invites (token_hash TEXT PRIMARY KEY,group_id TEXT NOT NULL REFERENCES groups(id),expires_at INTEGER NOT NULL,used INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS shares (group_id TEXT NOT NULL REFERENCES groups(id),lesson_id TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,version INTEGER NOT NULL,PRIMARY KEY(group_id,lesson_id));
    CREATE TABLE IF NOT EXISTS workspace_flags (user_id TEXT PRIMARY KEY, example_seeded INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY AUTOINCREMENT,user_id TEXT NOT NULL,event TEXT NOT NULL,created_at TEXT NOT NULL);
  `);
  const columns=database.prepare("PRAGMA table_info(jobs)").all() as {name:string}[];
  if(!columns.some(c=>c.name==="available_at"))database.exec("ALTER TABLE jobs ADD COLUMN available_at INTEGER NOT NULL DEFAULT 0");
  database.exec("CREATE TABLE IF NOT EXISTS provider_audio (model TEXT NOT NULL,seconds REAL NOT NULL,created_at INTEGER NOT NULL); CREATE INDEX IF NOT EXISTS provider_audio_time ON provider_audio(model,created_at)");
  return database;
}
const hash=(s:string)=>createHash("sha256").update(s).digest("hex");
export function createSession() {
  const token=randomBytes(32).toString("hex"), userId=randomUUID();
  db().prepare("INSERT INTO sessions VALUES(?,?,?)").run(hash(token),userId,Date.now()+30*86400_000);
  return {token,userId};
}
export function sessionUser(token:string|undefined) {
  if(!token||!(/^[a-f0-9]{64}$/.test(token)))return null;
  const row=db().prepare("SELECT user_id FROM sessions WHERE token_hash=? AND expires_at>?").get(hash(token),Date.now()) as {user_id:string}|undefined;
  return row?.user_id||null;
}
export function seedDemo(userId:string) {
  if(db().prepare("SELECT user_id FROM workspace_flags WHERE user_id=?").get(userId))return;
  const existing=db().prepare("SELECT id FROM lessons WHERE owner_id=? AND json_extract(payload,'$.demo')=1 LIMIT 1").get(userId);
  if(existing){db().prepare("INSERT OR IGNORE INTO workspace_flags VALUES(?,1)").run(userId);return;}
  let segments:Segment[];
  try {segments=JSON.parse(readFileSync(path.join(process.cwd(),"fixtures/demo-timing.json"),"utf8"));}
  catch {throw new Error("Run npm run demo:audio before starting the app.");}
  if(segments.length!==demoScript.length||segments.some((s,i)=>!Number.isFinite(s.start)||!Number.isFinite(s.end)||s.start<0||s.end<=s.start||s.text!==demoScript[i]))throw new Error("Example audio manifest does not match the script.");
  const lesson:Lesson={id:randomUUID(),ownerId:userId,title:"Demo lesson · Listening & revision",course:"Adab of learning",createdAt:new Date().toISOString(),duration:segments.at(-1)!.end,version:1,status:"ready",stage:"Prepared example",error:null,demo:true,segments,artifacts:demoArtifacts(segments),audioPath:path.join(process.cwd(),"fixtures/demo.mp3"),mime:"audio/mpeg"};
  db().exec("BEGIN IMMEDIATE");
  try{if(!db().prepare("SELECT user_id FROM workspace_flags WHERE user_id=?").get(userId)){insertLesson(lesson);db().prepare("INSERT INTO workspace_flags VALUES(?,1)").run(userId);}db().exec("COMMIT");}catch(e){db().exec("ROLLBACK");throw e;}
}
export function insertLesson(l:Lesson) {db().prepare("INSERT INTO lessons VALUES(?,?,?,?)").run(l.id,l.ownerId,l.version,JSON.stringify(l));}
export function rawLesson(id:string):Lesson|null {const row=db().prepare("SELECT payload FROM lessons WHERE id=?").get(id) as {payload:string}|undefined;return row?JSON.parse(row.payload):null;}
export function transcriptCandidates(owner:string,key:string,exclude:string):Lesson[] {
  if(!owner||!/^[a-f0-9]{64}$/.test(key))return [];
  const rows=db().prepare("SELECT payload FROM lessons WHERE owner_id=? AND id<>? AND json_extract(payload,'$.transcriptCache.key')=? AND json_extract(payload,'$.status')='ready' AND json_extract(payload,'$.transcriptionComplete')=1 LIMIT 30").all(owner,exclude,key) as {payload:string}[];
  return rows.map(r=>JSON.parse(r.payload) as Lesson).filter(l=>l.ownerId===owner);
}
export function safeLesson(l:Lesson):Lesson {
  // Also guard older saved transcripts without rewriting their stored text/audio.
  const segments=l.segments.map(s=>instructionLike(s.text)?{...s,flags:[...new Set([...s.flags,"Instruction-like wording: excluded from AI study material; replay the audio"])]}:s);
  const pdfPages=l.pdfPages?.map(p=>instructionLike(p.text)?{...p,flags:[...new Set([...p.flags,"Instruction-like wording: excluded from AI study material; check the PDF"])]}:p);
  const passages=sourcePassages({...l,segments,pdfPages});
  if(!l.artifacts)return {...l,segments,pdfPages};
  const notes=l.artifacts.notes.filter(n=>evidenceValid(n.evidence,passages));
  const terms=l.artifacts.terms.filter(t=>evidenceValid(t.evidence,passages));
  const a={...l.artifacts,notes,terms,overview:supportedOverview(notes),practice:l.artifacts.practice.filter(p=>evidenceValid(p.evidence,passages))};
  return {...l,segments,pdfPages,artifacts:{...a,practice:l.demo?a.practice:safePractice(a)}};
}
export function authorizedLesson(user:string,id:string):Lesson|null {
  const l=rawLesson(id); if(!l)return null;
  if(l.ownerId===user)return safeLesson(l);
  const shared=db().prepare("SELECT s.version FROM shares s JOIN memberships m ON m.group_id=s.group_id WHERE m.user_id=? AND s.lesson_id=? AND s.version=? LIMIT 1").get(user,id,l.version);
  return shared?safeLesson({...l,shared:true}):null;
}
export function listLessons(user:string):Lesson[] {
  const rows=db().prepare("SELECT DISTINCT l.payload FROM lessons l LEFT JOIN shares s ON s.lesson_id=l.id AND s.version=l.version LEFT JOIN memberships m ON m.group_id=s.group_id WHERE l.owner_id=? OR m.user_id=?").all(user,user) as {payload:string}[];
  return rows.map(r=>JSON.parse(r.payload) as Lesson).map(l=>({...l,shared:l.ownerId!==user})).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
}
export function publicLesson(l:Lesson) { const {sourceImport,transcriptCache,...visible}=safeLesson(l);void sourceImport;void transcriptCache;return {...visible,audioPath:"",...(l.sourceKind==="pdf"?{pdfUrl:`/api/lessons/${l.id}/pdf?v=${l.version}`}:{audioUrl:`/api/lessons/${l.id}/audio?v=${l.version}`})}; }
export function updateLesson(l:Lesson,expectedVersion=l.version) {
  const result=db().prepare("UPDATE lessons SET version=?,payload=? WHERE id=? AND owner_id=? AND version=?").run(l.version,JSON.stringify(l),l.id,l.ownerId,expectedVersion);
  if(result.changes!==1)throw new Error("The lesson changed. Reload before trying again.");
}
export function enqueue(id:string) {db().prepare("INSERT INTO jobs(id,lesson_id,status) VALUES(?,?,'queued') ON CONFLICT(lesson_id) DO UPDATE SET status='queued',lease=NULL,lease_until=NULL,error=NULL,attempts=0,available_at=0 WHERE status IN ('failed','done')").run(randomUUID(),id);}
export function queueLesson(l:Lesson,isNew=false) {
  db().exec("BEGIN IMMEDIATE");
  try{
    if(isNew)insertLesson(l);
    else{
      const active=db().prepare("SELECT status FROM jobs WHERE lesson_id=? AND status IN ('queued','running')").get(l.id);
      if(active)throw new MaterialQueueError("busy");
      const current=rawLesson(l.id);if(current&&(current.materialRevision??0)!==(l.materialRevision??0))throw new MaterialQueueError("conflict");
      updateLesson(l);
    }
    enqueue(l.id);db().exec("COMMIT");
  }
  catch(e){db().exec("ROLLBACK");throw e;}
}
export function queueDetailedMaterial(user:string,id:string,version:number,materialRevision:number):DetailedQueueResult {
  db().exec("BEGIN IMMEDIATE");
  try{
    const current=rawLesson(id),job=db().prepare("SELECT status FROM jobs WHERE lesson_id=?").get(id) as {status:string}|undefined;
    const change=detailedQueueChange(current,user,version,materialRevision,job?.status);
    if(change.lesson){
      updateLesson(change.lesson,version);
      const queued=db().prepare("INSERT INTO jobs(id,lesson_id,status) VALUES(?,?,'queued') ON CONFLICT(lesson_id) DO UPDATE SET status='queued',lease=NULL,lease_until=NULL,error=NULL,attempts=0,available_at=0 WHERE jobs.status IN ('failed','done') RETURNING id").get(randomUUID(),id);
      if(!queued)throw new MaterialQueueError("busy");
    }
    db().exec("COMMIT");return change.result;
  }catch(error){db().exec("ROLLBACK");throw error;}
}
export function claimJob(pdfOnly=false) {
  const lease=randomUUID();
  // Single atomic statement provides a fencing token across worker processes.
  const row=db().prepare("UPDATE jobs SET status='running',lease=?,lease_until=?,attempts=attempts+1 WHERE id=(SELECT id FROM jobs WHERE (?=0 OR lesson_id IN (SELECT id FROM lessons WHERE json_extract(payload,'$.sourceKind')='pdf')) AND available_at<=? AND attempts<3 AND (status='queued' OR (status='running' AND lease_until<?)) ORDER BY rowid LIMIT 1) RETURNING id,lesson_id,lease,attempts").get(lease,Date.now()+90_000,pdfOnly?1:0,Date.now(),Date.now()) as {id:string;lesson_id:string;lease:string;attempts:number}|undefined;
  return row||null;
}
export function heartbeat(jobId:string,lease:string) {const now=Date.now();return db().prepare("UPDATE jobs SET lease_until=? WHERE id=? AND lease=? AND status='running' AND lease_until>?").run(now+90_000,jobId,lease,now).changes===1;}
export function jobCommit(jobId:string,lease:string,l:Lesson,done=false) {
  db().exec("BEGIN IMMEDIATE");
  try {
    const held=db().prepare("SELECT id FROM jobs WHERE id=? AND lease=? AND status='running' AND lease_until>?").get(jobId,lease,Date.now());
    if(!held)throw new Error("Job lease expired");
    updateLesson(l);
    if(done)db().prepare("UPDATE jobs SET status='done',lease=NULL,lease_until=NULL WHERE id=? AND lease=?").run(jobId,lease);
    db().exec("COMMIT");
  }catch(e){db().exec("ROLLBACK");throw e;}
}
export function failJob(jobId:string,lease:string,error:string) {
  db().exec("BEGIN IMMEDIATE");
  try {
    const row=db().prepare("UPDATE jobs SET status='failed',error=?,lease=NULL,lease_until=NULL WHERE id=? AND lease=? RETURNING lesson_id").get(error,jobId,lease) as {lesson_id:string}|undefined;
    if(row){const l=rawLesson(row.lesson_id);if(l)updateLesson({...l,status:"failed",stage:"Processing paused",error});}
    db().exec("COMMIT");
  }catch(e){db().exec("ROLLBACK");throw e;}
}
export function deferJob(jobId:string,lease:string,retryAt:number,message:string){
  const database=db();database.exec("BEGIN IMMEDIATE");
  try{
    const row=database.prepare("SELECT lesson_id FROM jobs WHERE id=? AND lease=? AND status='running' AND lease_until>?").get(jobId,lease,Date.now()) as {lesson_id:string}|undefined;
    if(!row)throw new Error("Job lease expired");
    const l=rawLesson(row.lesson_id);if(!l)throw new Error("Lesson not found");
    const count=(l.quotaDeferrals||0)+1;
    if(count>48){failJobUnwrapped(jobId,lease,"The provider limit has persisted. Your audio is saved; ask the app owner to check capacity.");}
    else{
      const until=Math.max(Date.now()+5000,Math.min(retryAt,Date.now()+86400_000));
      updateLesson({...l,status:"queued",stage:message,error:null,nextAttemptAt:new Date(until).toISOString(),quotaDeferrals:count});
      database.prepare("UPDATE jobs SET status='queued',available_at=?,lease=NULL,lease_until=NULL,attempts=max(0,attempts-1) WHERE id=? AND lease=?").run(until,jobId,lease);
    }
    database.exec("COMMIT");
  }catch(e){database.exec("ROLLBACK");throw e;}
}
function failJobUnwrapped(jobId:string,lease:string,error:string){
  const row=db().prepare("UPDATE jobs SET status='failed',error=?,lease=NULL,lease_until=NULL WHERE id=? AND lease=? RETURNING lesson_id").get(error,jobId,lease) as {lesson_id:string}|undefined;
  if(row){const l=rawLesson(row.lesson_id);if(l)updateLesson({...l,status:"failed",stage:"Processing paused",error,nextAttemptAt:undefined});}
}
export function reserveAudio(models:string[],seconds:number){
  if(!Number.isFinite(seconds)||seconds<=0||seconds>700)throw new Error("Invalid audio reservation");
  const database=db(),now=Date.now();database.exec("BEGIN IMMEDIATE");
  try{
    database.prepare("DELETE FROM provider_audio WHERE created_at<=?").run(now-86400_000);
    let retryAt=now;
    for(const model of new Set(models))for(const [window,limit] of [[3600_000,7100],[86400_000,28000]]){
      const rows=database.prepare("SELECT seconds,created_at FROM provider_audio WHERE model=? AND created_at>? ORDER BY created_at").all(model,now-window) as {seconds:number;created_at:number}[];
      let total=rows.reduce((n,r)=>n+r.seconds,seconds);
      for(const r of rows){if(total<=limit)break;retryAt=Math.max(retryAt,r.created_at+window+1000);total-=r.seconds;}
    }
    if(retryAt===now)for(const model of new Set(models))database.prepare("INSERT INTO provider_audio VALUES(?,?,?)").run(model,seconds,now);
    database.exec("COMMIT");return retryAt>now?retryAt:null;
  }catch(e){database.exec("ROLLBACK");throw e;}
}
export function deleteLesson(user:string,id:string) {const l=rawLesson(id);if(!l||l.ownerId!==user)throw new Error("Lesson not found");db().prepare("DELETE FROM lessons WHERE id=? AND owner_id=?").run(id,user);return l;}
export function listReviews(user:string):Review[] {return (db().prepare("SELECT r.payload FROM reviews r JOIN lessons l ON l.id=r.lesson_id AND l.version=r.version WHERE r.user_id=?").all(user) as {payload:string}[]).map(r=>JSON.parse(r.payload) as Review).filter(r=>authorizedLesson(user,r.lessonId)?.artifacts?.practice.some(p=>p.id===r.itemId));}
export function saveReview(user:string,l:Lesson,itemId:string,correct:boolean):Review {
  db().exec("BEGIN IMMEDIATE");
  try {
    const current=authorizedLesson(user,l.id);
    if(!current||current.version!==l.version)throw new Error("Lesson access ended or the lesson changed");
    if(!current.artifacts?.practice.some(i=>i.id===itemId))throw new Error("Practice item not found");
    const row=db().prepare("SELECT payload FROM reviews WHERE user_id=? AND lesson_id=? AND item_id=? AND version=?").get(user,l.id,itemId,l.version) as {payload:string}|undefined;
    const old:Review|undefined=row?JSON.parse(row.payload):undefined;
    const review=nextReview(l.id,l.version,itemId,correct,old);
    db().prepare("INSERT INTO reviews VALUES(?,?,?,?,?) ON CONFLICT(user_id,lesson_id,item_id,version) DO UPDATE SET payload=excluded.payload").run(user,l.id,itemId,l.version,JSON.stringify(review));
    db().exec("COMMIT");return review;
  } catch(error) {db().exec("ROLLBACK");throw error;}
}
export function createGroup(user:string,name:string) {
  const id=randomUUID();db().exec("BEGIN IMMEDIATE");
  try{db().prepare("INSERT INTO groups VALUES(?,?,?)").run(id,user,name);db().prepare("INSERT INTO memberships VALUES(?,?)").run(id,user);db().exec("COMMIT");}catch(e){db().exec("ROLLBACK");throw e;}return id;
}
export function groupOwner(user:string,id:string) {return !!db().prepare("SELECT id FROM groups WHERE id=? AND owner_id=?").get(id,user);}
export function invite(user:string,id:string) {if(!groupOwner(user,id))throw new Error("Class not found");const token=randomBytes(24).toString("hex");db().prepare("INSERT INTO invites VALUES(?,?,?,0)").run(hash(token),id,Date.now()+86400_000);return token;}
export function join(user:string,token:string) {
  db().exec("BEGIN IMMEDIATE");try{
    const row=db().prepare("UPDATE invites SET used=1 WHERE token_hash=? AND expires_at>? AND used=0 RETURNING group_id").get(hash(token),Date.now()) as {group_id:string}|undefined;
    if(!row)throw new Error("This invitation was used or expired. Ask for a new link.");
    db().prepare("INSERT OR IGNORE INTO memberships VALUES(?,?)").run(row.group_id,user);db().exec("COMMIT");return row.group_id;
  }catch(e){db().exec("ROLLBACK");throw e;}
}
export function share(user:string,groupId:string,lessonId:string) {
  const l=rawLesson(lessonId);if(!l||l.ownerId!==user||l.status!=="ready")throw new Error("Only your ready lessons can be shared.");
  if(!db().prepare("SELECT group_id FROM memberships WHERE group_id=? AND user_id=?").get(groupId,user))throw new Error("Class not found");
  db().prepare("INSERT INTO shares VALUES(?,?,?) ON CONFLICT(group_id,lesson_id) DO UPDATE SET version=excluded.version").run(groupId,lessonId,l.version);
}
export function revokeShare(user:string,groupId:string,lessonId:string) {
  const l=rawLesson(lessonId);if(l?.ownerId!==user&&!groupOwner(user,groupId))throw new Error("Class not found");
  db().prepare("DELETE FROM shares WHERE group_id=? AND lesson_id=?").run(groupId,lessonId);
}
export function listGroups(user:string):ClassGroup[] {
  const rows=db().prepare("SELECT g.* FROM groups g JOIN memberships m ON m.group_id=g.id WHERE m.user_id=?").all(user) as {id:string;name:string;owner_id:string}[];
  return rows.map(g=>({id:g.id,name:g.name,owner:g.owner_id===user,memberCount:Number((db().prepare("SELECT COUNT(*) AS n FROM memberships WHERE group_id=?").get(g.id) as {n:number}).n),lessons:(db().prepare("SELECT l.payload FROM lessons l JOIN shares s ON s.lesson_id=l.id AND s.version=l.version WHERE s.group_id=?").all(g.id) as {payload:string}[]).map(r=>{const l=JSON.parse(r.payload) as Lesson;return{id:l.id,title:l.title,course:l.course,demo:l.demo};})}));
}
