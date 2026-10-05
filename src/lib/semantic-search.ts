import { createHash } from "node:crypto";
import { GoogleGenAI } from "@google/genai";
import { db } from "./store";
import { rawLesson } from "./backend";
import { cloudMode } from "./supabase/config";
import { savedVectors, saveVectors } from "./supabase/store";
import { retrieve, tokens } from "./evidence";
import type { Lesson, Segment } from "./types";

export const EMBEDDING_MODEL="gemini-embedding-001",EMBEDDING_DIMENSIONS=768;
type Window={hash:string;indices:number[];text:string};
export type SearchMethod="whole_lesson"|"hybrid"|"lexical_fallback";
export function unitVector(values:number[],dimensions=EMBEDDING_DIMENSIONS) {
  if(values.length!==dimensions||values.some(v=>!Number.isFinite(v)))throw new Error("Invalid embedding dimensions or values");
  const norm=Math.hypot(...values);if(norm<1e-10)throw new Error("Empty embedding");
  return values.map(v=>v/norm);
}
export function searchWindows(segments:Segment[]):Window[] {
  const result:Window[]=[];let text="",indices:number[]=[];
  const flush=()=>{if(text){result.push({hash:createHash("sha256").update(JSON.stringify({indices,text,ids:indices.map(i=>segments[i].id)})).digest("hex"),indices:[...indices],text});text="";indices=[];}};
  segments.forEach((s,i)=>{
    // Split representation for the embedding endpoint only. Source passages are never rewritten.
    const parts=s.text.match(/[\s\S]{1,1400}/gu)||[];
    for(const part of parts){if(indices.length>=5||text.length+part.length+1>1400)flush();text+=(text?"\n":"")+part;if(!indices.includes(i))indices.push(i);}
  });flush();return result;
}
async function embed(texts:string[],task:"RETRIEVAL_DOCUMENT"|"RETRIEVAL_QUERY") {
  const key=process.env.GEMINI_API_KEY;if(!key)throw new Error("Embeddings not configured");
  const client=new GoogleGenAI({apiKey:key,httpOptions:{timeout:20_000}});
  const r=await client.models.embedContent({model:EMBEDDING_MODEL,contents:texts,config:{taskType:task,outputDimensionality:EMBEDDING_DIMENSIONS}});
  if(r.embeddings?.length!==texts.length)throw new Error("Incomplete embeddings");
  return r.embeddings.map(e=>unitVector(e.values||[]));
}
function cacheTable(){db().exec(`CREATE TABLE IF NOT EXISTS search_vectors (
  lesson_id TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  version INTEGER NOT NULL, model TEXT NOT NULL, dimensions INTEGER NOT NULL,
  chunk_hash TEXT NOT NULL, vector TEXT NOT NULL,
  PRIMARY KEY(lesson_id,version,model,dimensions,chunk_hash)
)`);}
const fingerprint=(segments:Segment[])=>createHash("sha256").update(JSON.stringify(segments)).digest("hex");
export async function indexedVectors(lesson:Lesson,windows:Window[],embedder=embed) {
  const original=await rawLesson(lesson.id);
  if(!original||original.version!==lesson.version||fingerprint(original.segments)!==fingerprint(lesson.segments))throw new Error("The lesson changed during indexing");
  if(!cloudMode())cacheTable();
  const saved=cloudMode()?await savedVectors(lesson.id,lesson.version,EMBEDDING_MODEL,EMBEDDING_DIMENSIONS):db().prepare("SELECT chunk_hash,vector FROM search_vectors WHERE lesson_id=? AND version=? AND model=? AND dimensions=?").all(lesson.id,lesson.version,EMBEDDING_MODEL,EMBEDDING_DIMENSIONS) as {chunk_hash:string;vector:string}[];
  const vectors=new Map<string,number[]>();
  for(const row of saved){try{vectors.set(row.chunk_hash,unitVector(typeof row.vector==="string"?JSON.parse(row.vector):row.vector));}catch{/* Rebuild invalid cached data. */}}
  const missing=windows.filter(w=>!vectors.has(w.hash)),sourceHash=fingerprint(lesson.segments);
  for(let i=0;i<missing.length;i+=32){
    const batch=missing.slice(i,i+32),encoded=await embedder(batch.map(w=>w.text),"RETRIEVAL_DOCUMENT");
    if(encoded.length!==batch.length)throw new Error("Incomplete embeddings");
    const normalized=encoded.map(v=>unitVector(v));
    // Recheck source existence/version/content before persisting asynchronous work.
    const current=await rawLesson(lesson.id);if(!current||current.version!==lesson.version||fingerprint(current.segments)!==sourceHash)throw new Error("The lesson changed during indexing");
    if(cloudMode()){
      await saveVectors(lesson.id,lesson.version,EMBEDDING_MODEL,EMBEDDING_DIMENSIONS,batch.map((w,j)=>({hash:w.hash,vector:normalized[j]})),lesson.segments);
      batch.forEach((w,j)=>vectors.set(w.hash,normalized[j]));continue;
    }
    db().exec("BEGIN IMMEDIATE");
    try {
      const write=db().prepare("INSERT INTO search_vectors VALUES(?,?,?,?,?,?) ON CONFLICT(lesson_id,version,model,dimensions,chunk_hash) DO UPDATE SET vector=excluded.vector");
      batch.forEach((w,j)=>{write.run(lesson.id,lesson.version,EMBEDDING_MODEL,EMBEDDING_DIMENSIONS,w.hash,JSON.stringify(normalized[j]));vectors.set(w.hash,normalized[j]);});db().exec("COMMIT");
    }catch(e){db().exec("ROLLBACK");throw e;}
  }
  return windows.map(w=>vectors.get(w.hash)!);
}
export function rankedPassages(question:string,segments:Segment[],windows:Window[],vectors:number[][],query:number[],limit=18) {
  if(windows.length!==vectors.length)throw new Error("Incomplete retrieval index");
  const q=unitVector(query),semantic=windows.map((w,i)=>({w,score:unitVector(vectors[i]).reduce((n,v,j)=>n+v*q[j],0)})).sort((a,b)=>b.score-a.score);
  const terms=tokens(question),lexical=segments.map((s,i)=>({i,score:tokens(s.text).filter(t=>terms.includes(t)).length})).filter(s=>s.score>0).sort((a,b)=>b.score-a.score);
  const scores=new Map<number,number>();
  const semanticSeen=new Set<number>();
  semantic.forEach(({w},rank)=>w.indices.forEach(i=>{if(!semanticSeen.has(i)){semanticSeen.add(i);scores.set(i,(scores.get(i)||0)+1/(60+rank+1));}}));
  lexical.forEach(({i},rank)=>scores.set(i,(scores.get(i)||0)+1/(60+rank+1)));
  const anchors=[...scores.entries()].sort((a,b)=>b[1]-a[1]).slice(0,Math.min(8,limit)).map(([i])=>i);
  const chosen=new Set(anchors);
  for(const i of anchors){for(const neighbor of [i-1,i+1]){if(neighbor>=0&&neighbor<segments.length&&chosen.size<limit)chosen.add(neighbor);}}
  return [...chosen].sort((a,b)=>a-b).map(i=>segments[i]);
}
export async function lessonPassages(question:string,lesson:Lesson):Promise<{segments:Segment[];method:SearchMethod}> {
  if(lesson.segments.length<=30)return {segments:lesson.segments,method:"whole_lesson"};
  try {
    const windows=searchWindows(lesson.segments),vectors=await indexedVectors(lesson,windows),[query]=await embed([question],"RETRIEVAL_QUERY");
    return {segments:rankedPassages(question,lesson.segments,windows,vectors,query),method:"hybrid"};
  }catch{
    // Provider failure never expands the corpus or enables an outside answer.
    return {segments:retrieve(question,lesson.segments,12),method:"lexical_fallback"};
  }
}
