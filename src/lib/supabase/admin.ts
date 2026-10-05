import { createClient } from "@supabase/supabase-js";
import { publicConfig } from "./config";
// Server/worker only. Never import this module into a Client Component.
export function adminClient(){
 const {url}=publicConfig(),key=process.env.SUPABASE_SECRET_KEY;
 if(!key)throw new Error("The private background worker key is not configured");
 return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(url,options)=>fetch(url,{...options,signal:options?.signal||AbortSignal.timeout(30_000),cache:"no-store"})}});
}
export async function rpc<T>(name:string,args:Record<string,unknown>={}):Promise<T>{const {data,error}=await adminClient().rpc(name,args);if(error)throw new Error("Private database action failed");return data as T;}
