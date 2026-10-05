import { z } from "zod";
import { authenticate, body, fail, HttpError, json } from "@/lib/http";
import { authorizedLesson, saveReview } from "@/lib/backend";
export const runtime="nodejs";
export async function POST(req:Request,c:{params:Promise<{id:string}>}){try{
  const user=await authenticate(req),l=await authorizedLesson(user,(await c.params).id);if(!l)throw new HttpError(404,"Lesson not found.");
  const b=z.object({itemId:z.string().max(100),version:z.number().int(),answer:z.string().max(600).optional(),remembered:z.boolean().optional()}).safeParse(await body(req));if(!b.success)throw new HttpError(400,"Invalid practice result.");
  if(b.data.version!==l.version)throw new HttpError(409,"This practice belongs to an older lesson version.");
  const item=l.artifacts?.practice.find(p=>p.id===b.data.itemId);if(!item)throw new HttpError(404,"Practice item not found.");
  if(item.kind==="quiz"&&!item.choices.includes(b.data.answer||""))throw new HttpError(400,"Choose one of the answers.");
  if(item.kind==="flashcard"&&typeof b.data.remembered!=="boolean")throw new HttpError(400,"Mark whether you remembered the answer.");
  const correct=item.kind==="quiz"?item.answer===b.data.answer:b.data.remembered!;
  return json({correct,review:await saveReview(user,l,item.id,correct)});
}catch(e){return fail(e);}}
