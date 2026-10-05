// These are used by the server, never by a browser Supabase client. Resolve
// dynamically so a secret-free Docker build can receive connections at runtime.
const runtimeValue=(name:string)=>process.env[name];
export function accountConfigured(){return !!(runtimeValue("NEXT_PUBLIC_SUPABASE_URL")&&runtimeValue("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"));}
export function cloudMode(){return process.env.DARSLOOP_BACKEND==="supabase";}
export function publicConfig(){
 const url=runtimeValue("NEXT_PUBLIC_SUPABASE_URL"),key=runtimeValue("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
 if(!url||!key)throw new Error("Supabase connection is not configured");return {url,key};
}
