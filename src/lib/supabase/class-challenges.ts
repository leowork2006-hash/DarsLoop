import { adminClient } from "./admin";
import { rawLesson } from "./store";
import { challengeQuestions, ChallengeError, roundSnapshot, type ChallengeAction, type RoundDetail, type RoundSummary } from "../class-challenges";

async function call<T>(user:string,action:string,args:Record<string,unknown>):Promise<T> {
  const {data,error}=await adminClient().rpc("darsloop_class_quiz",{p_user:user,p_action:action,...args});
  if(error) {
    const reason=error.message.replace(/^quiz_/,"");
    if(["access","changed","owner","empty","optin","answers","submitted","alias","limit"].includes(reason))throw new ChallengeError(reason as ChallengeError["reason"]);
    throw new Error("The private quiz round could not be saved. Keep your answers open and try again.");
  }
  return data as T;
}
export function listClassRounds(user:string,groupId:string) {
  return call<RoundSummary[]>(user,"list",{p_group:groupId});
}
export function readClassRound(user:string,id:string) {
  return call<RoundDetail>(user,"read",{p_round:id});
}
export async function actOnClassRound(user:string,input:ChallengeAction) {
  if(input.action==="create") {
    const lesson=await rawLesson(input.lessonId);
    if(!lesson||lesson.status!=="ready")throw new ChallengeError("access");
    const items=challengeQuestions(lesson);if(!items.length)throw new ChallengeError("empty");
    return call<RoundDetail>(user,"create",{p_group:input.groupId,p_lesson:lesson.id,p_snapshot:roundSnapshot(lesson),p_items:items});
  }
  return call<RoundDetail>(user,input.action,{p_round:input.roundId,...(input.action==="join"?{p_alias:input.alias}:{}),...(input.action==="submit"?{p_choices:input.choices}:{})});
}
