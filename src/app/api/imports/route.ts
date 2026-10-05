import { spokenLanguages } from "@/lib/spoken-language";
import { z } from "zod";
import { authenticate,body,fail,HttpError,json } from "@/lib/http";
import { cloudMode } from "@/lib/supabase/config";
import { countLessons,takeBudget,rawLesson,queueLesson,publicLesson } from "@/lib/backend";
import { createImport,signImportParts,completedImport,ImportFailure } from "@/lib/supabase/imports";
import { MAX_IMPORT_BYTES } from "@/lib/upload-options";
import { studyNoteOptionsSchema } from "@/lib/note-options";
import { MAX_PDF_BYTES } from "@/lib/pdf-options";
import type { Lesson } from "@/lib/types";
export const runtime="nodejs";
const create=z.object({action:z.literal("start"),bytes:z.number().int().min(1).max(MAX_IMPORT_BYTES),title:z.string().trim().min(1).max(160),course:z.string().trim().max(100),permitted:z.literal(true),synthetic:z.literal(true),sourceKind:z.enum(["audio","pdf"]).default("audio"),spokenLanguage:z.enum(spokenLanguages).default("auto"),noteOptions:studyNoteOptionsSchema}).refine(input=>input.sourceKind!=="pdf"||input.bytes<=MAX_PDF_BYTES);
const command=z.object({action:z.enum(["parts","finish"]),id:z.uuid(),start:z.number().int().min(0).optional()});
export async function POST(req:Request){try{
  const user=await authenticate(req);if(!cloudMode())return json({mode:"local"});const input=await body(req);
  if(input.action==="start"){
    const parsed=create.safeParse(input);if(!parsed.success)throw new HttpError(400,"Choose valid study settings and permitted audio, or a selectable-text PDF up to 8 MB.");
    if(await countLessons(user)>=30)throw new HttpError(429,"Delete a lesson before adding another.");
    if(!await takeBudget(user,"import-start",3))throw new HttpError(429,"Please wait before starting another upload.");
    const {action,permitted,synthetic,...values}=parsed.data;void action;void permitted;void synthetic;
    const m=await createImport(user,{...values,course:values.course||"My lessons"});return json({mode:"cloud",id:m.id,parts:m.parts});
  }
  const parsed=command.safeParse(input);if(!parsed.success)throw new HttpError(400,"Choose a valid upload action.");
  const b=parsed.data;if(!await takeBudget(user,"import-action",60))throw new HttpError(429,"Please wait before resuming this upload.");
  if(b.action==="parts")return json(await signImportParts(user,b.id,b.start??0));
  const existing=await rawLesson(b.id);if(existing){if(existing.ownerId!==user)throw new HttpError(404,"Import not found.");return json(publicLesson(existing));}
  const m=await completedImport(user,b.id);
  const pdf=m.sourceKind==="pdf";
  const l:Lesson={id:m.id,ownerId:user,title:m.title,course:m.course,createdAt:new Date().toISOString(),duration:0,version:1,status:"queued",stage:pdf?"Extracting PDF pages":"Preparing your recording",error:null,demo:false,segments:[],artifacts:null,audioPath:`${user}/${m.id}${pdf?".pdf":""}`,mime:pdf?"application/pdf":"application/octet-stream",sourceKind:pdf?"pdf":"audio",noteOptions:m.noteOptions,spokenLanguage:m.spokenLanguage||"auto",sourceImport:{bytes:m.bytes,parts:m.parts}};
  try{await queueLesson(l,true);}catch(e){const raced=await rawLesson(b.id);if(raced?.ownerId===user)return json(publicLesson(raced));throw e;}
  return json(publicLesson(l),201);
}catch(e){return fail(e instanceof ImportFailure?new HttpError(e.status,e.message):e);}}
