import { cookies } from "next/headers";
import { createSession, sessionUser } from "@/lib/store";
import { listGroups, listLessons, listReviews, publicLesson, seedDemo } from "@/lib/backend";
import { configured } from "@/lib/ai";
import { fail, HttpError, json, localRequest } from "@/lib/http";
import { cloudMode } from "@/lib/supabase/config";
import { accountUser } from "@/lib/supabase/server";
import { readOnboardingPreference } from "@/lib/onboarding";
export const runtime="nodejs";
export async function GET(req:Request) {try{
 localRequest(req);let user:string;let onboarding=readOnboardingPreference(null),shouldSeed=true;
 if(cloudMode()){const account=await accountUser();if(!account)throw new HttpError(401,"Sign in to open your lessons.");user=account.id;onboarding=readOnboardingPreference(account.user_metadata?.darsloop_onboarding);shouldSeed=account.user_metadata?.darsloop_example_added!==true;}
 else{const jar=await cookies();let local=sessionUser(jar.get("darsloop-session")?.value);if(!local){const s=createSession();local=s.userId;jar.set("darsloop-session",s.token,{httpOnly:true,sameSite:"strict",secure:false,path:"/",maxAge:30*86400});}user=local;}
 if(shouldSeed)await seedDemo(user);
 const [lessons,reviews,groups]=await Promise.all([listLessons(user),listReviews(user),listGroups(user)]);
 return json({userId:user,lessons:lessons.map(publicLesson),reviews:reviews,groups:groups.map(g=>({...g,lessons:g.lessons.filter(l=>!l.demo)})),configured:configured(),accountMode:cloudMode()?"supabase":"local",onboarding});
}catch(e){return fail(e);}}
