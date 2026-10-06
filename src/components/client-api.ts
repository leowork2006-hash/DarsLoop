export async function api<T>(url:string,options:RequestInit={}):Promise<T>{
  let r:Response;
  try{r=await fetch(url,{...options,headers:{...(options.body instanceof FormData?{}:{"Content-Type":"application/json"}),...options.headers}});}
  catch(error){if(error instanceof Error&&error.name==="AbortError")throw error;throw new Error("The connection was interrupted. Check your connection and try again.");}
  if(r.status===401&&typeof window!=="undefined"){const invite=new URLSearchParams(window.location.search).get("invite");window.location.assign(invite&&/^[a-f0-9]{48}$/.test(invite)?`/signin?invite=${invite}`:"/signin");}
  let result:unknown;
  try{result=await r.json();}catch{if(r.ok)throw new Error("The response could not be read. Please try again.");}
  if(!r.ok){
    const error=result&&typeof result==="object"&&"error" in result?result.error:undefined;
    const fallback=r.status===401?"Sign in to open your lessons.":r.status===429?"Please wait a moment before trying again.":r.status>=500?"DarsLoop is temporarily unavailable. Please try again shortly.":"Could not complete that action. Please try again.";
    throw new Error(typeof error==="string"&&error?error:fallback);
  }
  return result as T;
}
export function message(e:unknown){return e instanceof Error?e.message:"That didn’t work. Please try again.";}
