import { open, stat } from "node:fs/promises";
import { authenticate, fail, HttpError } from "@/lib/http";
import { authorizedLesson, cloudAudioBytes } from "@/lib/backend";
import { cloudMode } from "@/lib/supabase/config";
import { parseRange } from "@/lib/media";
export const runtime="nodejs";
export async function GET(req:Request,c:{params:Promise<{id:string}>}){try{
  const user=await authenticate(req),l=await authorizedLesson(user,(await c.params).id);if(!l)throw new HttpError(404,"Lesson not found.");
  if(cloudMode()){
    const bytes=await cloudAudioBytes(l),size=bytes.length;
    const current=await authorizedLesson(user,l.id);if(!current)throw new HttpError(404,"Lesson access ended.");if(current.version!==l.version)throw new HttpError(409,"This recording changed. Reload the lesson.");
    let range;try{range=parseRange(req.headers.get("range"),size);}catch{return new Response(null,{status:416,headers:{"Content-Range":`bytes */${size}`,"Cache-Control":"private, no-store"}});}
    const start=range?.start||0,end=range?.end??size-1;
    return new Response(new Uint8Array(bytes.subarray(start,end+1)),{status:range?206:200,headers:{"Content-Type":l.mime,"Content-Length":String(end-start+1),"Accept-Ranges":"bytes","Cache-Control":"private, no-store",...(range?{"Content-Range":`bytes ${start}-${end}/${size}`}:{})}});
  }
  const size=(await stat(l.audioPath)).size;let range;
  try{range=parseRange(req.headers.get("range"),size);}catch{return new Response(null,{status:416,headers:{"Content-Range":`bytes */${size}`}});}
  const start=range?.start||0,end=range?.end??size-1,handle=await open(l.audioPath,"r");
  let offset=start;
  const stream=new ReadableStream<Uint8Array>({async pull(controller){
    try{const bytes=Buffer.alloc(Math.min(64*1024,end-offset+1));const result=await handle.read(bytes,0,bytes.length,offset);offset+=result.bytesRead;
      if(result.bytesRead)controller.enqueue(new Uint8Array(bytes.subarray(0,result.bytesRead)));
      if(offset>end||!result.bytesRead){await handle.close();controller.close();}
    }catch(e){await handle.close().catch(()=>{});controller.error(e);}
  },async cancel(){await handle.close().catch(()=>{});}});
  return new Response(stream,{status:range?206:200,headers:{"Content-Type":l.mime,"Content-Length":String(end-start+1),"Accept-Ranges":"bytes","Cache-Control":"private, no-store",...(range?{"Content-Range":`bytes ${start}-${end}/${size}`}:{})}});
}catch(e){return fail(e);}}
