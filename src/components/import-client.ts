"use client";
import type { SpokenLanguage } from "@/lib/spoken-language";
import { api } from "./client-api";
import { IMPORT_PART_BYTES } from "@/lib/upload-options";
import type { Lesson,StudyNoteOptions } from "@/lib/types";
type Options={title:string;course:string;permitted:boolean;synthetic:boolean;noteOptions:StudyNoteOptions;spokenLanguage?:SpokenLanguage};
type Session={id:string;parts:number;options:string};
const sessions=new WeakMap<File,Session>();
function uploadPart(url:string,part:Blob,signal:AbortSignal,progress:(bytes:number)=>void){
  return new Promise<void>((resolve,reject)=>{
    const xhr=new XMLHttpRequest();const abort=()=>xhr.abort();signal.addEventListener("abort",abort,{once:true});
    const finish=(error?:Error)=>{signal.removeEventListener("abort",abort);error?reject(error):resolve();};
    xhr.open("PUT",url);xhr.timeout=120_000;xhr.setRequestHeader("Content-Type","application/octet-stream");
    xhr.upload.onprogress=e=>progress(Math.min(part.size,e.loaded));
    xhr.onerror=()=>finish(new Error("The connection dropped. Your file is still selected; try again to resume."));
    xhr.ontimeout=()=>finish(new Error("This file part took too long. Try a stronger connection; completed parts are saved."));
    xhr.onabort=()=>finish(new DOMException("Upload cancelled","AbortError"));
    xhr.onload=()=>xhr.status>=200&&xhr.status<300?finish():finish(new Error("A file part could not be saved. Try again to resume the upload."));
    if(signal.aborted){finish(new DOMException("Upload cancelled","AbortError"));return;}xhr.send(part);
  });
}
export async function uploadLesson(audio:File,options:Options,signal:AbortSignal,onProgress:(percent:number)=>void=()=>{}){
  const signature=JSON.stringify(options);let session=sessions.get(audio);
  if(!session||session.options!==signature){
    const started=await api<{mode:"local"|"cloud";id:string;parts:number}>("/api/imports",{method:"POST",body:JSON.stringify({action:"start",bytes:audio.size,...options}),signal});
    if(started.mode==="local"){
      const form=new FormData();form.set("audio",audio);form.set("title",options.title);form.set("course",options.course);
      form.set("permitted",String(options.permitted));form.set("synthetic",String(options.synthetic));form.set("notesEnabled",String(options.noteOptions.enabled));form.set("noteDetail",options.noteOptions.detail);form.set("spokenLanguage",options.spokenLanguage||"auto");
      const result=await api<Lesson>("/api/lessons",{method:"POST",body:form,signal});onProgress(100);return result;
    }
    session={id:started.id,parts:started.parts,options:signature};sessions.set(audio,session);
  }
  for(let start=0;start<session.parts;start+=12){
    const batch=await api<{parts:{index:number;complete:boolean;url:string|null}[]}>("/api/imports",{method:"POST",body:JSON.stringify({action:"parts",id:session.id,start}),signal});
    for(const part of batch.parts){
      const offset=part.index*IMPORT_PART_BYTES,blob=audio.slice(offset,offset+IMPORT_PART_BYTES);
      if(!part.complete){
        if(!part.url)throw new Error("The upload link is unavailable.");
        let error:unknown;
        for(let attempt=0;attempt<3;attempt++){
          try{await uploadPart(part.url,blob,signal,bytes=>onProgress(Math.min(99,Math.floor((offset+bytes)/audio.size*100))));error=undefined;break;}
          catch(e){error=e;if(signal.aborted)throw e;if(attempt<2)await new Promise(resolve=>setTimeout(resolve,1000*(attempt+1)));}
        }
        if(error)throw error;
      }
      onProgress(Math.min(99,Math.floor((offset+blob.size)/audio.size*100)));
    }
  }
  const lesson=await api<Lesson>("/api/imports",{method:"POST",body:JSON.stringify({action:"finish",id:session.id}),signal});
  sessions.delete(audio);onProgress(100);return lesson;
}
