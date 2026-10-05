import { adminClient } from './admin';
import { parseRange } from '../media';
import type { Lesson } from '../types';

// Called only after lesson authorization. The short-lived storage URL stays on
// the server; browser playback remains subject to membership on every request.
export async function cloudAudioStream(req:Request,l:Lesson):Promise<Response> {
  if(l.audioPath!==`${l.ownerId}/${l.id}`)throw new Error('Invalid private audio path');
  const storage=adminClient().storage.from('lesson-audio'),info=await storage.info(l.audioPath);
  const size=info.data?.size??info.data?.metadata?.size;
  if(info.error||!Number.isSafeInteger(size)||!size||size>24*1024*1024)throw new Error('Audio is unavailable');
  let range;
  try{range=parseRange(req.headers.get('range'),size);}catch{return new Response(null,{status:416,headers:{'Content-Range':`bytes */${size}`,'Cache-Control':'private, no-store'}});}
  const signed=await storage.createSignedUrl(l.audioPath,60);
  if(signed.error||!signed.data?.signedUrl)throw new Error('Audio is unavailable');
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),30_000);
  let upstream:Response;
  try{upstream=await fetch(signed.data.signedUrl,{headers:range?{Range:`bytes=${range.start}-${range.end}`}:{},signal:AbortSignal.any([req.signal,controller.signal]),cache:'no-store',redirect:'error'});}finally{clearTimeout(timer);}
  const start=range?.start??0,end=range?.end??size-1;
  if(!upstream.body||upstream.status!==(range?206:200)||(range&&upstream.headers.get('content-range')!==`bytes ${start}-${end}/${size}`)){
    await upstream.body?.cancel();throw new Error('Audio is unavailable');
  }
  const length=end-start+1,reader=upstream.body.getReader();
  const read=async()=>{
    let timeout:ReturnType<typeof setTimeout>|undefined;
    try{return await Promise.race([reader.read(),new Promise<never>((_,reject)=>{timeout=setTimeout(()=>{controller.abort();reject(new Error('Audio is unavailable'));},30_000);})]);}
    finally{clearTimeout(timeout);}
  };
  // Obtain actual audio before committing response headers. Tiny seeks are
  // materialized only within a 64 KiB bound; larger playback remains streamed.
  // This also detects empty/truncated storage responses at the small boundary.
  const first=await read();
  if(first.done||!first.value.length||first.value.length>length){await reader.cancel();throw new Error('Audio is unavailable');}
  let output:BodyInit;
  if(length<=64*1024){
    const bytes=new Uint8Array(length);let offset=0,part:Awaited<ReturnType<typeof read>>=first;
    try{while(!part.done){
      if(offset+part.value.length>length)throw new Error('Audio is unavailable');
      bytes.set(part.value,offset);offset+=part.value.length;
      if(offset===length)break;
      part=await read();
    }
    if(offset!==length)throw new Error('Audio is unavailable');output=bytes;
    }finally{await reader.cancel();}
  }else{
    let delivered=0,pending:Uint8Array|undefined=first.value;
    output=new ReadableStream<Uint8Array>({async pull(destination){
      try{
        const part=pending?{done:false as const,value:pending}:await read();pending=undefined;
        if(part.done){if(delivered!==length)throw new Error('Audio is unavailable');destination.close();return;}
        if(delivered+part.value.length>length)throw new Error('Audio is unavailable');
        delivered+=part.value.length;destination.enqueue(part.value);
        if(delivered===length){await reader.cancel();destination.close();}
      }catch(error){await reader.cancel().catch(()=>{});destination.error(error);}
    },async cancel(){await reader.cancel();}});
  }
  return new Response(output,{status:range?206:200,headers:{'Content-Type':l.mime,'Content-Length':String(length),'Accept-Ranges':'bytes','Cache-Control':'private, no-store',...(range?{'Content-Range':`bytes ${start}-${end}/${size}`}:{})}});
}
