import { sourcePassages } from "@/lib/source-passages";
import { z } from "zod";
import { authenticate, body, fail, HttpError, json } from "@/lib/http";
import { authorizedLesson, takeBudget } from "@/lib/backend";
import { answerLesson, configured } from "@/lib/ai";
import { excerptAnswer } from "@/lib/evidence";
export const runtime="nodejs";
export async function POST(req:Request,c:{params:Promise<{id:string}>}){try{
  const user=await authenticate(req),l=await authorizedLesson(user,(await c.params).id);if(!l)throw new HttpError(404,"Lesson not found.");
  const parsed=z.object({question:z.string().trim().min(2).max(1000),version:z.number().int()}).safeParse(await body(req));if(!parsed.success)throw new HttpError(400,"Write a question of 2–1,000 characters.");
  if(parsed.data.version!==l.version)throw new HttpError(409,"This lesson changed. Reload before asking.");
  if(!sourcePassages(l).length)throw new HttpError(409,"Wait for the transcript before asking about this lesson.");
  if(!await takeBudget(user,"chat",6))throw new HttpError(429,"Please wait a moment before trying again.");
  let answer;
  try{answer=!l.demo&&configured().generation?await answerLesson(parsed.data.question,l):excerptAnswer(parsed.data.question,sourcePassages(l),l.version,l.artifacts?.notes);}catch{
    // Retain a clearly labelled, exact-passage path when generation is down.
    // This still runs the ruling/injection gates and excludes flagged speech.
    const excerpts=excerptAnswer(parsed.data.question,sourcePassages(l),l.version,l.artifacts?.notes);
    answer={...excerpts,message:`An explanation is temporarily unavailable. ${excerpts.message}`};
  }
  // Recheck membership and version after asynchronous provider work.
  const current=await authorizedLesson(user,l.id);if(!current)throw new HttpError(404,"Lesson access ended.");if(current.version!==l.version)throw new HttpError(409,"The lesson changed. Ask again using its current version.");
  return json(answer);
}catch(e){return fail(e);}}
