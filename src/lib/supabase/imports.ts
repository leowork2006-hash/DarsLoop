import { open } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { adminClient } from "./admin";
import { IMPORT_PART_BYTES, MAX_IMPORT_BYTES, importPartSize } from "../upload-options";
import type { Lesson, StudyNoteOptions } from "../types";

export const IMPORT_BUCKET="lesson-imports";
export class ImportFailure extends Error {constructor(public status:number,message:string){super(message);}}
type Manifest={id:string;ownerId:string;createdAt:string;bytes:number;parts:number;title:string;course:string;noteOptions:StudyNoteOptions};
let bucketReady:Promise<void>|undefined;
async function ensureBucket(){
  bucketReady??=(async()=>{
    const storage=adminClient().storage,existing=await storage.getBucket(IMPORT_BUCKET);
    if(!existing.data){const r=await storage.createBucket(IMPORT_BUCKET,{public:false,fileSizeLimit:IMPORT_PART_BYTES,allowedMimeTypes:["application/octet-stream","application/json"]});if(r.error){const again=await storage.getBucket(IMPORT_BUCKET);if(!again.data)throw new Error("Private import storage is unavailable");}}
    const checked=await storage.getBucket(IMPORT_BUCKET);
    if(!checked.data||checked.data.public||Number(checked.data.file_size_limit)!==IMPORT_PART_BYTES)throw new Error("Private import storage settings are invalid");
  })().catch(e=>{bucketReady=undefined;throw e;});
  await bucketReady;
}
const prefix=(owner:string,id:string)=>`${owner}/${id}`;
function validId(id:string){if(!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id))throw new Error("Import not found");}
export async function createImport(ownerId:string,values:Omit<Manifest,"id"|"ownerId"|"createdAt"|"parts">){
  if(!Number.isSafeInteger(values.bytes)||values.bytes<1||values.bytes>MAX_IMPORT_BYTES)throw new Error("Invalid file size");
  await ensureBucket();
  const manifest:Manifest={...values,id:randomUUID(),ownerId,createdAt:new Date().toISOString(),parts:Math.ceil(values.bytes/IMPORT_PART_BYTES)};
  const r=await adminClient().storage.from(IMPORT_BUCKET).upload(`${prefix(ownerId,manifest.id)}/manifest`,Buffer.from(JSON.stringify(manifest)),{contentType:"application/json",upsert:false});
  if(r.error)throw new Error("The import could not be started");
  return manifest;
}
export async function readImport(owner:string,id:string){
  validId(id);const r=await adminClient().storage.from(IMPORT_BUCKET).download(`${prefix(owner,id)}/manifest`);
  if(r.error||!r.data||r.data.size>4096)throw new ImportFailure(404,"This upload was not found. Choose your file again.");
  const m=JSON.parse(await r.data.text()) as Manifest;
  if(m.id!==id||m.ownerId!==owner||!Number.isFinite(Date.parse(m.createdAt))||Date.now()-Date.parse(m.createdAt)>86400_000||m.parts!==Math.ceil(m.bytes/IMPORT_PART_BYTES))throw new ImportFailure(410,"This upload has expired. Choose your file again.");
  importPartSize(m.bytes,0);return m;
}
export async function signImportParts(owner:string,id:string,start:number){
  const m=await readImport(owner,id);
  if(!Number.isSafeInteger(start)||start<0||start>=m.parts)throw new Error("Invalid import part");
  const result=[];const storage=adminClient().storage.from(IMPORT_BUCKET);
  for(let i=start;i<Math.min(start+12,m.parts);i++){
    const key=`${prefix(owner,id)}/${i}`,found=await storage.info(key);
    if(found.data&&Number(found.data.size)===importPartSize(m.bytes,i)){result.push({index:i,complete:true,url:null});continue;}
    if(found.data)throw new Error("A saved part has the wrong size. Start this upload again.");
    const signed=await storage.createSignedUploadUrl(key,{upsert:false});if(signed.error||!signed.data)throw new Error("The upload link is unavailable");
    result.push({index:i,complete:false,url:signed.data.signedUrl});
  }
  return {parts:result,total:m.parts,partBytes:IMPORT_PART_BYTES};
}
export async function completedImport(owner:string,id:string){
  const m=await readImport(owner,id),storage=adminClient().storage.from(IMPORT_BUCKET);
  // Metadata checks are bounded; no original file is buffered by the web process.
  for(let start=0;start<m.parts;start+=8){
    const infos=await Promise.all(Array.from({length:Math.min(8,m.parts-start)},(_,i)=>storage.info(`${prefix(owner,id)}/${start+i}`)));
    if(infos.some((r,i)=>r.error||!r.data||Number(r.data.size)!==importPartSize(m.bytes,start+i)))throw new ImportFailure(409,"Some file parts are missing. Resume the upload before saving.");
  }
  return m;
}
export async function materializeImport(l:Lesson,file:string){
  const source=l.sourceImport;if(!source||source.parts!==Math.ceil(source.bytes/IMPORT_PART_BYTES))throw new Error("Import is unavailable");
  const handle=await open(file,"w",0o600);
  try{
    for(let i=0;i<source.parts;i++){
      const r=await adminClient().storage.from(IMPORT_BUCKET).download(`${prefix(l.ownerId,l.id)}/${i}`);
      if(r.error||!r.data||r.data.size!==importPartSize(source.bytes,i))throw new Error("A saved part is unavailable. Resume the upload.");
      const bytes=Buffer.from(await r.data.arrayBuffer());let offset=0;
      while(offset<bytes.length){const written=await handle.write(bytes,offset,bytes.length-offset);if(!written.bytesWritten)throw new Error("Import disk write failed");offset+=written.bytesWritten;}
    }
  }finally{await handle.close();}
}
export async function removeImport(owner:string,id:string,parts:number){
  validId(id);if(!Number.isSafeInteger(parts)||parts<1||parts>Math.ceil(MAX_IMPORT_BYTES/IMPORT_PART_BYTES))throw new Error("Invalid import");
  const keys=[`${prefix(owner,id)}/manifest`,...Array.from({length:parts},(_,i)=>`${prefix(owner,id)}/${i}`)];
  const r=await adminClient().storage.from(IMPORT_BUCKET).remove(keys);if(r.error)throw new Error("Private import cleanup failed");
}
let lastSweep=0;
export async function expireUnusedImports(){
  if(Date.now()-lastSweep<3600_000)return;lastSweep=Date.now();
  const storage=adminClient().storage.from(IMPORT_BUCKET),owners=await storage.list("",{limit:100});if(owners.error)return;
  for(const owner of owners.data||[]){
    const folders=await storage.list(owner.name,{limit:100});if(folders.error)continue;
    for(const folder of folders.data||[]){
      if(!/^[a-f0-9-]{36}$/i.test(folder.name))continue;
      const r=await storage.download(`${prefix(owner.name,folder.name)}/manifest`);if(!r.data||r.data.size>4096)continue;
      let m:Manifest;try{m=JSON.parse(await r.data.text());}catch{continue;}
      if(m.id!==folder.name||m.ownerId!==owner.name||Date.now()-Date.parse(m.createdAt)<86400_000)continue;
      const l=await adminClient().from("lessons").select("payload").eq("id",folder.name).maybeSingle();
      if(!l.error&&(!l.data||!l.data.payload.sourceImport))await removeImport(owner.name,folder.name,m.parts);
    }
  }
}
