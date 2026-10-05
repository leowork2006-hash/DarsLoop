import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { publicConfig } from "./config";
export async function accountClient(){
 const {url,key}=publicConfig(),jar=await cookies();
 return createServerClient(url,key,{cookieOptions:{httpOnly:true,sameSite:"lax",secure:process.env.DARSLOOP_ORIGIN?.startsWith("https://")||false,path:"/"},cookies:{
  getAll:()=>jar.getAll(),
  setAll:items=>{try{items.forEach(({name,value,options})=>jar.set(name,value,options));}catch{/* Read-only Server Component; proxy handles renewal. */}}
 }});
}
export class AccountServiceUnavailable extends Error {}
export async function accountUser(){const client=await accountClient();const {data,error}=await client.auth.getUser();if(error&&((error.status||0)>=500||error.status===429||error.name==="AuthRetryableFetchError"))throw new AccountServiceUnavailable("Sign-in is temporarily unavailable. Your saved lessons remain private; try again shortly.");return error?null:data.user;}
