import { z } from "zod";
import { authenticate, body, fail, HttpError, json } from "@/lib/http";
import { ChallengeError, challengeActionSchema } from "@/lib/class-challenges";
import { actOnClassRound, listClassRounds, readClassRound } from "@/lib/class-challenges-backend";
export const runtime="nodejs";
function failure(error:unknown) {
  return fail(error instanceof ChallengeError?new HttpError(error.reason==="access"?404:error.reason==="owner"||error.reason==="optin"?403:error.reason==="changed"||error.reason==="submitted"||error.reason==="alias"?409:400,error.message):error);
}
export async function GET(req:Request) {try {
  const user=await authenticate(req),url=new URL(req.url);
  const input=z.union([z.strictObject({groupId:z.string().uuid()}),z.strictObject({roundId:z.string().uuid()})]).safeParse(Object.fromEntries(url.searchParams));
  if(!input.success)throw new HttpError(400,"Choose a class or quiz round.");
  return json("groupId" in input.data?{rounds:await listClassRounds(user,input.data.groupId)}:{round:await readClassRound(user,input.data.roundId)});
} catch(error){return failure(error);}}
export async function POST(req:Request) {try {
  const user=await authenticate(req),input=challengeActionSchema.safeParse(await body(req,4000));
  if(!input.success)throw new HttpError(400,"Check the round, nickname and answer choices.");
  return json({round:await actOnClassRound(user,input.data)});
} catch(error){return failure(error);}}
