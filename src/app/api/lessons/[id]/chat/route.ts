import { sourcePassages } from "@/lib/source-passages";
import { z } from "zod";
import { authenticate, body, fail, HttpError, json } from "@/lib/http";
import { authorizedLesson, takeBudget } from "@/lib/backend";
import { answerLesson, configured } from "@/lib/ai";
import { savedLessonAnswer } from "@/lib/chat-context";
import { excerptAnswer } from "@/lib/evidence";
import { ProviderError } from "@/lib/provider-error";
export const runtime="nodejs";
export async function POST(req:Request,c:{params:Promise<{id:string}>}){try{
  const user=await authenticate(req),l=await authorizedLesson(user,(await c.params).id);if(!l)throw new HttpError(404,"Lesson not found.");
  const parsed=z.object({question:z.string().trim().min(2).max(1000),version:z.number().int(),context:z.object({question:z.string().trim().min(2).max(1000),passageIds:z.array(z.string().min(1).max(100)).max(12)}).optional()}).safeParse(await body(req));if(!parsed.success)throw new HttpError(400,"Write a question of 2–1,000 characters.");
  if(parsed.data.version!==l.version)throw new HttpError(409,"This lesson changed. Reload before asking.");
  if(!sourcePassages(l).length)throw new HttpError(409,"Wait for the transcript before asking about this lesson.");
  if(!await takeBudget(user,"chat",6))throw new HttpError(429,"Please wait a moment before trying again.");
  let answer;
  try{answer=!l.demo&&configured().generation?await answerLesson(parsed.data.question,l,parsed.data.context):(savedLessonAnswer(parsed.data.question,l,parsed.data.context)||excerptAnswer(parsed.data.question,sourcePassages(l),l.version,l.artifacts?.notes));}catch(error){
    // Diagnostic code only: never questions, source text or provider responses.
    console.warn(JSON.stringify({event:"chat-generation-error",code:error instanceof ProviderError?error.code:"internal"}));
    // Retain a clearly labelled, exact-passage path when generation is down.
    // This still runs the ruling/injection gates and excludes flagged speech.
    const excerpts=savedLessonAnswer(parsed.data.question,l,parsed.data.context)||excerptAnswer(parsed.data.question,sourcePassages(l),l.version,l.artifacts?.notes);
    const retryable=excerpts.status==="answered"||excerpts.status==="partial";
    answer={...excerpts,...(retryable?{retryable:true}:{}),message:`An explanation is temporarily unavailable. ${excerpts.message}`};
  }
  // Recheck membership and version after asynchronous provider work.
  const current=await authorizedLesson(user,l.id);if(!current)throw new HttpError(404,"Lesson access ended.");if(current.version!==l.version)throw new HttpError(409,"The lesson changed. Ask again using its current version.");
  return json(answer);
}catch(e){return fail(e);}}
