import { removePdf } from "@/lib/pdf-storage";
import { unlink } from "node:fs/promises";
import { authenticate, body, fail, HttpError, json } from "@/lib/http";
import { authorizedLesson, deleteLesson, publicLesson, queueLesson, removeCloudAudio } from "@/lib/backend";
import { cloudMode } from "@/lib/supabase/config";
import { configured } from "@/lib/ai";
export const runtime="nodejs";
type Context={params:Promise<{id:string}>};
export async function GET(req:Request,c:Context){try{const user=await authenticate(req),l=await authorizedLesson(user,(await c.params).id);if(!l)throw new HttpError(404,"Lesson not found.");return json(publicLesson(l));}catch(e){return fail(e);}}
export async function POST(req:Request,c:Context){try{
  const user=await authenticate(req),l=await authorizedLesson(user,(await c.params).id);if(!l||l.ownerId!==user)throw new HttpError(404,"Lesson not found.");
  const b=await body(req);if(b.action!=="retry"||l.demo||l.status==="ready"&&!l.error)throw new HttpError(400,"This lesson does not need processing.");
  if(l.status==="processing")throw new HttpError(409,"This lesson is already processing.");
  const cfg=configured();await queueLesson({...l,status:"queued",error:null,stage:(l.sourceKind==="pdf"?cfg.generation:cfg.asr&&cfg.generation)?"Waiting for the processing worker":l.sourceKind==="pdf"?"PDF saved · connect AI to process":"Audio saved · connect AI to process"});return json({ok:true});
}catch(e){return fail(e);}}
export async function DELETE(req:Request,c:Context){try{
  const user=await authenticate(req),l=await authorizedLesson(user,(await c.params).id);if(!l||l.ownerId!==user)throw new HttpError(404,"Lesson not found.");
  if(l.sourceKind==="pdf")await removePdf(l);else if(cloudMode())await removeCloudAudio(l);const deleted=await deleteLesson(user,l.id);if(!cloudMode()&&!deleted.demo&&deleted.sourceKind!=="pdf")await unlink(deleted.audioPath).catch(()=>{});return json({ok:true});
}catch(e){return fail(e);}}
