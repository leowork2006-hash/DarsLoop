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
  // Pass the readable stream through. A 100-byte seek never buffers a 24 MiB
  // recording in Next's heap or downloads bytes the student didn't request.
  return new Response(upstream.body,{status:range?206:200,headers:{'Content-Type':l.mime,'Content-Length':String(end-start+1),'Accept-Ranges':'bytes','Cache-Control':'private, no-store',...(range?{'Content-Range':`bytes ${start}-${end}/${size}`}:{})}});
}
