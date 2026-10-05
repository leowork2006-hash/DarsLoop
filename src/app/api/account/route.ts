import { accountClient } from "@/lib/supabase/server";
import { accountConfigured } from "@/lib/supabase/config";
import { accountDestination, accountInput, accountProblem } from "@/lib/account-input";
import { body, fail, HttpError, json, localRequest } from "@/lib/http";
import { cookies } from "next/headers";
import { signupEmailRedirect } from "@/lib/auth-confirmation";
export const runtime="nodejs";
export async function POST(req:Request){try{
 localRequest(req);
 if(!accountConfigured())throw new HttpError(503,"Account sign-in is not connected yet.");
 const raw=await body(req),parsed=accountInput.safeParse(raw);if(!parsed.success)throw new HttpError(400,"Enter a valid email and password. New accounts need at least 12 characters.");
 const client=await accountClient(),input=parsed.data;
 if(input.action==="signout"){const {error}=await client.auth.signOut({scope:"local"});if(error)throw new HttpError(503,"Sign-out could not finish. Please try again.");return json({ok:true});}
 if(input.action==="signin"){
  const {error}=await client.auth.signInWithPassword({email:input.email,password:input.password});
  if(error){const problem=accountProblem(error,"signin");throw new HttpError(problem.status,problem.message);}
  return json({ok:true,next:accountDestination(raw.invite)});
 }
 const origin=process.env.DARSLOOP_ORIGIN||new URL(req.url).origin;
 const {error}=await client.auth.signUp({email:input.email,password:input.password,options:{emailRedirectTo:signupEmailRedirect(origin,raw.invite)}});
 if(error){const problem=accountProblem(error,"signup");throw new HttpError(problem.status,problem.message);}
 const invite=accountDestination(raw.invite)!=="/learn"?raw.invite as string:"";
 (await cookies()).set("darsloop-auth-invite",invite,{httpOnly:true,sameSite:"lax",secure:origin.startsWith("https://"),path:"/",maxAge:invite?86400:0});
 return json({ok:true,message:"Check your email to confirm your account, then sign in. If you already have an account, use Sign in."});
}catch(e){return fail(e);}}
