import { NextResponse, type NextRequest } from "next/server";
import { accountClient } from "@/lib/supabase/server";
import { accountConfigured } from "@/lib/supabase/config";
import { accountDestination } from "@/lib/account-input";
export async function GET(req:NextRequest){
 const origin=process.env.DARSLOOP_ORIGIN||"http://127.0.0.1:3000";
 const cancelled=req.nextUrl.searchParams.get("error")==="access_denied";
 const result=new URL(cancelled?"/signin?auth_error=cancelled":"/signin?auth_error=callback",origin),code=req.nextUrl.searchParams.get("code");
 const invite=req.cookies.get("darsloop-auth-invite")?.value;
 if(invite&&accountDestination(invite)!=="/learn")result.searchParams.set("invite",invite);
 try{
  if(accountConfigured()&&code&&code.length<=4096){const client=await accountClient();const {error}=await client.auth.exchangeCodeForSession(code);if(!error){result.pathname="/learn";result.search=new URL(accountDestination(invite),origin).search;}}
 }catch{/* Show a fixed actionable message; never reflect provider error descriptions. */}
 const response=NextResponse.redirect(result);response.cookies.set("darsloop-auth-invite","",{httpOnly:true,sameSite:"lax",secure:origin.startsWith("https://"),path:"/",maxAge:0});response.headers.set("Cache-Control","private, no-store");return response;
}
