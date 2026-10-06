import { randomUUID } from "node:crypto";
import { readFile, unlink, mkdir, mkdtemp, rm } from "node:fs/promises";
import path from "node:path";
import { authenticate, fail, HttpError, json } from "@/lib/http";
import { dataDir, countLessons, queueLesson, publicLesson, storeAudio, removeCloudAudio } from "@/lib/backend";
import { prepareImportedAudio, MediaError } from "@/lib/media";
import { readImportForm, ImportError } from "@/lib/import-form";
import { configured } from "@/lib/ai";
import { readSpokenLanguage } from "@/lib/spoken-language";
import { parseNoteOptions } from "@/lib/note-options";
import { createPdfLesson } from "@/lib/pdf-lessons";
import { PdfError } from "@/lib/pdf-options";
import { cloudMode } from "@/lib/supabase/config";
import type { Lesson } from "@/lib/types";
export const runtime="nodejs";
export async function POST(req:Request){let filePath:string|undefined,temporary:string|undefined,stored:Lesson|undefined;try{
  const user=await authenticate(req);
  const active=await countLessons(user);
  if(active>=30)throw new HttpError(429,"Your workspace has 30 lessons. Delete a lesson before adding another.");
  await mkdir(path.join(dataDir,"imports"),{recursive:true,mode:0o700});
  temporary=await mkdtemp(path.join(dataDir,"imports","upload-"));
  const source=path.join(temporary,"source");
  const form=await readImportForm(req,source);
  // The legacy "synthetic" key attests eligible data: synthetic OR irreversibly
  // anonymised material. It does not classify the source as a fictional lesson.
  if(form.get("permitted")!=="true"||form.get("synthetic")!=="true")throw new HttpError(400,"Confirm permission to use synthetic or irreversibly anonymised material, with no identifiable or sensitive personal information.");
  const sourceKind=form.get("sourceKind")||"audio";if(sourceKind!=="audio"&&sourceKind!=="pdf")throw new HttpError(400,"Choose audio or a selectable-text PDF.");
  let spokenLanguage;try{spokenLanguage=readSpokenLanguage(form.get("spokenLanguage"));}catch{throw new HttpError(400,"Choose a valid spoken language.");}
  let noteOptions;try{noteOptions=parseNoteOptions(form);}catch{throw new HttpError(400,"Choose a valid note option.");}
  const title=String(form.get("title")||"").trim().slice(0,160),course=String(form.get("course")||"My lessons").trim().slice(0,100);
  if(!title)throw new HttpError(400,"Give the lesson a title.");
  const id=randomUUID();
  if(sourceKind==="pdf"){const pdf=await createPdfLesson({userId:user,id,title,course,noteOptions,sourcePath:source});return json(publicLesson(pdf),201);}
  await mkdir(path.join(dataDir,"audio"),{recursive:true,mode:0o700});filePath=path.join(dataDir,"audio",id);
  let prepared;try{prepared=await prepareImportedAudio(source,filePath);}catch(error){throw new HttpError(400,error instanceof MediaError?error.message:"Choose readable MP3, M4A, AAC, WAV, MP4, Ogg, WebM or FLAC, up to two hours. Video must contain audio.");}
  const {duration,mime,importedMedia}=prepared;const bytes=await readFile(/*turbopackIgnore: true*/ filePath);
  const c=configured();const lesson:Lesson={id,ownerId:user,title,course,createdAt:new Date().toISOString(),duration,version:1,status:"queued",stage:c.asr&&c.generation?"Waiting for the processing worker":"Audio saved · connect AI to process",error:null,demo:false,segments:[],artifacts:null,audioPath:filePath,mime,noteOptions,spokenLanguage,importedMedia};
  stored=await storeAudio(lesson,bytes);await queueLesson(stored,true);if(cloudMode())await unlink(filePath).catch(()=>{});filePath=undefined;return json(publicLesson(stored),201);
}catch(e){if(filePath){await unlink(filePath).catch(()=>{});if(cloudMode()&&stored)await removeCloudAudio(stored).catch(()=>{});}return fail(e instanceof ImportError?new HttpError(e.status,e.message):e instanceof PdfError?new HttpError(400,e.message):e);}finally{if(temporary)await rm(temporary,{recursive:true,force:true});}}
