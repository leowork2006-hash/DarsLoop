import { readFile, stat } from "node:fs/promises";
import { queueLesson } from "./backend";
import { configured } from "./ai";
import { MAX_PDF_BYTES, PdfError } from "./pdf-options";
import { extractPdf } from "./pdf";
import { storePdf, removePdf } from "./pdf-storage";
import type { Lesson, StudyNoteOptions } from "./types";
export async function createPdfLesson(input:{userId:string;id:string;title:string;course:string;noteOptions:StudyNoteOptions;sourcePath:string}){
  if((await stat(input.sourcePath)).size>MAX_PDF_BYTES)throw new PdfError("size","Choose a PDF of 8 MB or smaller.");
  const bytes=await readFile(input.sourcePath),extracted=await extractPdf(bytes);
  let lesson:Lesson={id:input.id,ownerId:input.userId,title:input.title,course:input.course,createdAt:new Date().toISOString(),duration:0,version:1,status:"queued",stage:configured().generation?"Waiting for the processing worker":"PDF saved · connect AI to prepare study material",error:null,demo:false,segments:[],pdfPages:extracted.pages,sourcePageCount:extracted.totalPages,sourceKind:"pdf",artifacts:null,audioPath:"",mime:"application/pdf",noteOptions:input.noteOptions};
  lesson=await storePdf(lesson,bytes);try{await queueLesson(lesson,true);return lesson;}catch(error){await removePdf(lesson).catch(()=>{});throw error;}
}
