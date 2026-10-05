export async function api<T>(url:string,options:RequestInit={}):Promise<T>{
  const r=await fetch(url,{...options,headers:{...(options.body instanceof FormData?{}:{"Content-Type":"application/json"}),...options.headers}});
  const result=await r.json();if(r.status===401&&typeof window!=="undefined"){const invite=new URLSearchParams(window.location.search).get("invite");window.location.assign(invite&&/^[a-f0-9]{48}$/.test(invite)?`/signin?invite=${invite}`:"/signin");}if(!r.ok)throw new Error(result.error||"Could not complete that action.");return result as T;
}
export function message(e:unknown){return e instanceof Error?e.message:"That didn’t work. Please try again.";}
