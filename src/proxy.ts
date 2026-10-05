import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { accountConfigured, publicConfig } from "./lib/supabase/config";
export async function proxy(request:NextRequest){
 if(!accountConfigured())return NextResponse.next({request});
 const {url,key}=publicConfig();let response=NextResponse.next({request});
 const client=createServerClient(url,key,{cookieOptions:{httpOnly:true,sameSite:"lax",secure:process.env.DARSLOOP_ORIGIN?.startsWith("https://")||false,path:"/"},cookies:{getAll:()=>request.cookies.getAll(),setAll:(items,headers)=>{
  items.forEach(({name,value})=>request.cookies.set(name,value));response=NextResponse.next({request});
  items.forEach(({name,value,options})=>response.cookies.set(name,value,options));Object.entries(headers).forEach(([k,v])=>response.headers.set(k,v));
 }}});
 await client.auth.getClaims();return response;
}
export const config={matcher:["/learn/:path*","/signin","/auth/:path*","/api/((?!lessons/?$|health/?$).*)"]};
