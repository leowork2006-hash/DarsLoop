import { z } from "zod";
import { authenticate, body, fail, HttpError, json } from "@/lib/http";
import { authorizedLesson, takeBudget } from "@/lib/backend";
import { findCandidates } from "@/lib/references";
export const runtime="nodejs";
export async function POST(req:Request,c:{params:Promise<{id:string}>}){try{
  const user=await authenticate(req),l=await authorizedLesson(user,(await c.params).id);if(!l)throw new HttpError(404,"Lesson not found.");
  const b=z.object({segmentId:z.string().max(100),wording:z.string().trim().min(12).max(400),language:z.enum(["ar","en","ur"]),version:z.number().int()}).safeParse(await body(req));if(!b.success)throw new HttpError(400,"Select a captured phrase of at least three words.");
  if(b.data.version!==l.version)throw new HttpError(409,"The lesson changed. Reload before searching.");
  const segment=l.segments.find(s=>s.id===b.data.segmentId);if(!segment||segment.flags.length||!segment.text.includes(b.data.wording))throw new HttpError(400,"Search using clear wording actually captured in this lesson.");
  if(!await takeBudget(user,"source",3))throw new HttpError(429,"Please wait a moment before trying again.");
  let candidates;try{candidates=await findCandidates(b.data.wording,b.data.language);}catch{return json({status:"unavailable",candidates:[],message:"The reference provider is unavailable. This does not mean the narration does not exist."});}
  const current=await authorizedLesson(user,l.id);if(!current)throw new HttpError(404,"Lesson access ended.");if(current.version!==l.version)throw new HttpError(409,"The lesson changed. Reload before searching.");
  return json({status:candidates.length?"candidates":"no_match",candidates,message:candidates.length?"Possible wording matches. Ask your teacher which source they intended.":"No clear wording match was found. Ask your teacher for the exact wording or reference."});
}catch(e){return fail(e);}}
