import { cloudMode } from "./supabase/config";
import * as local from "./class-challenges-store";
import * as cloud from "./supabase/class-challenges";
import type { ChallengeAction } from "./class-challenges";
export async function listClassRounds(user:string,groupId:string) {return cloudMode()?cloud.listClassRounds(user,groupId):local.listClassRounds(user,groupId);}
export async function readClassRound(user:string,id:string) {return cloudMode()?cloud.readClassRound(user,id):local.readClassRound(user,id);}
export async function actOnClassRound(user:string,input:ChallengeAction) {return cloudMode()?cloud.actOnClassRound(user,input):local.actOnClassRound(user,input);}
