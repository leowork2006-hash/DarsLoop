import { publicConfig } from "./config";
import type { SocialProvider } from "../account-input";

// Public provider availability is not evidence that an OAuth consent flow was tested.
export async function enabledProviders():Promise<SocialProvider[]>{
 try{
  const {url,key}=publicConfig();
  const response=await fetch(`${url}/auth/v1/settings`,{headers:{apikey:key},cache:"no-store",signal:AbortSignal.timeout(8000)});
  if(!response.ok)return [];
  const settings=await response.json();
  return (["google","apple"] as const).filter(provider=>settings.external?.[provider]===true);
 }catch{return [];}
}
