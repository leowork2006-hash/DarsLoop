import { cookies } from "next/headers";
import { oauthInput, trustedOAuthUrl, accountProblem } from "@/lib/account-input";
import { accountClient } from "@/lib/supabase/server";
import { cloudMode, publicConfig } from "@/lib/supabase/config";
import { enabledProviders } from "@/lib/supabase/providers";
import { body, fail, HttpError, json, localRequest } from "@/lib/http";
export const runtime="nodejs";
export async function POST(req:Request){try{
 localRequest(req);
 if(!cloudMode())throw new HttpError(503,"Account sign-in is not connected yet.");
 const parsed=oauthInput.safeParse(await body(req));if(!parsed.success)throw new HttpError(400,"Choose a supported sign-in option.");
 const {provider,invite}=parsed.data;
 if(!(await enabledProviders()).includes(provider))throw new HttpError(503,"This sign-in option is not available yet.");
 const origin=process.env.DARSLOOP_ORIGIN!;
 const client=await accountClient();
 const {data,error}=await client.auth.signInWithOAuth({provider,options:{redirectTo:`${origin}/auth/callback`,skipBrowserRedirect:true}});
 if(error){const problem=accountProblem(error,"oauth");throw new HttpError(problem.status,problem.message);}
 if(!data.url||!trustedOAuthUrl(data.url,publicConfig().url,provider))throw new HttpError(503,"The sign-in link could not be created. Please try again.");
 (await cookies()).set("darsloop-auth-invite",invite||"",{httpOnly:true,sameSite:"lax",secure:origin.startsWith("https://"),path:"/",maxAge:invite?600:0});
 return json({url:data.url});
}catch(error){return fail(error);}}
