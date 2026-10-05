import { mkdir, readFile, writeFile, rm, stat } from "node:fs/promises";
import path from "node:path";
import { dataDir } from "./store";
import { adminClient } from "./supabase/admin";
import { cloudMode } from "./supabase/config";
import { removeImport } from "./supabase/imports";
import { MAX_PDF_BYTES } from "./pdf-options";
import type { Lesson } from "./types";
export const PDF_BUCKET="lesson-documents";
let ready:Promise<void>|undefined;
async function ensureBucket(){
  ready??=(async()=>{const storage=adminClient().storage,existing=await storage.getBucket(PDF_BUCKET);
    if(!existing.data){const r=await storage.createBucket(PDF_BUCKET,{public:false,fileSizeLimit:MAX_PDF_BYTES,allowedMimeTypes:["application/pdf"]});if(r.error&&! (await storage.getBucket(PDF_BUCKET)).data)throw new Error("Private PDF storage is unavailable");}
    const checked=await storage.getBucket(PDF_BUCKET);if(!checked.data||checked.data.public||Number(checked.data.file_size_limit)!==MAX_PDF_BYTES)throw new Error("Private PDF storage settings are invalid");
  })().catch(e=>{ready=undefined;throw e;});await ready;
}
function sourcePath(l:Lesson){if(l.sourceKind!=="pdf"||! /^[a-f0-9-]{36}$/i.test(l.id))throw new Error("Invalid private PDF");const expected=cloudMode()?`${l.ownerId}/${l.id}.pdf`:path.join(dataDir,"pdf",l.id);if(l.audioPath!==expected)throw new Error("Invalid private PDF path");return expected;}
export async function storePdf(l:Lesson,bytes:Buffer):Promise<Lesson>{if(bytes.length<1||bytes.length>MAX_PDF_BYTES)throw new Error("Invalid PDF size");
  const audioPath=cloudMode()?`${l.ownerId}/${l.id}.pdf`:path.join(dataDir,"pdf",l.id);
  if(cloudMode()){await ensureBucket();const r=await adminClient().storage.from(PDF_BUCKET).upload(audioPath,bytes,{contentType:"application/pdf",upsert:false});if(r.error)throw new Error("The private PDF could not be saved");}
  else{await mkdir(path.dirname(audioPath),{recursive:true,mode:0o700});await writeFile(audioPath,bytes,{mode:0o600,flag:"wx"});}return {...l,audioPath};
}
export async function pdfBytes(l:Lesson){const key=sourcePath(l);if(cloudMode()){const r=await adminClient().storage.from(PDF_BUCKET).download(key);if(r.error||!r.data||r.data.size>MAX_PDF_BYTES)throw new Error("The private PDF is unavailable");return Buffer.from(await r.data.arrayBuffer());}if((await stat(key)).size>MAX_PDF_BYTES)throw new Error("Invalid PDF size");return readFile(key);}
export async function pdfExists(l:Lesson){const key=sourcePath(l);if(cloudMode()){const r=await adminClient().storage.from(PDF_BUCKET).info(key);return !!r.data;}return !!await stat(key).catch(()=>null);}
export async function removePdf(l:Lesson){const key=sourcePath(l);if(l.sourceImport)await removeImport(l.ownerId,l.id,l.sourceImport.parts);if(cloudMode()){const existing=await adminClient().storage.getBucket(PDF_BUCKET);if(existing.error&&String(existing.error.statusCode)==="404")return;if(existing.error)throw new Error("Private PDF cleanup failed");const r=await adminClient().storage.from(PDF_BUCKET).remove([key]);if(r.error)throw new Error("Private PDF cleanup failed");}else await rm(key,{force:true});}
