// Exercise the built app with disposable local data, never an existing account.
import { spawn, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, rm, realpath } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import net from "node:net";

const probe=net.createServer();
probe.listen(0,"127.0.0.1");await once(probe,"listening");
const port=(probe.address() as net.AddressInfo).port;
await new Promise<void>((resolve,reject)=>probe.close(error=>error?reject(error):resolve()));
const directory=await mkdtemp(path.join(await realpath(tmpdir()),"darsloop-api-"));
const origin=`http://127.0.0.1:${port}`;
const env={...process.env,DARSLOOP_BACKEND:"local",DARSLOOP_DATA_DIR:directory,DARSLOOP_ORIGIN:origin,TEST_ORIGIN:origin,GROQ_API_KEY:"",GEMINI_API_KEY:"",NEXT_PUBLIC_SUPABASE_URL:"",NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:"",SUPABASE_SECRET_KEY:""};
let server:ChildProcess|undefined;
let startupOutput="";
async function stop(child:ChildProcess){
 if(child.exitCode!==null||child.signalCode!==null)return;
 const done=once(child,"exit");child.kill("SIGTERM");
 const timer=setTimeout(()=>child.kill("SIGKILL"),5000);
 try{await done;}finally{clearTimeout(timer);}
}
try{
 server=spawn(process.execPath,["node_modules/next/dist/bin/next","start","--hostname","127.0.0.1","--port",String(port)],{env,stdio:["ignore","pipe","pipe"]});
 for(const stream of [server.stdout,server.stderr])stream?.on("data",chunk=>{startupOutput=(startupOutput+String(chunk)).slice(-6000);});
 server.on("error",error=>{startupOutput+=String(error);});
 const deadline=Date.now()+20000;let ready=false;
 while(Date.now()<deadline){
  if(server.exitCode!==null)break;
  try{const r=await fetch(origin+"/api/health",{signal:AbortSignal.timeout(1000)});if(r.ok){ready=true;break;}}catch{}
  await new Promise(resolve=>setTimeout(resolve,200));
 }
 if(!ready)throw new Error(`Isolated server failed to start. Build the app first.\n${startupOutput}`);
 const check=spawn(process.execPath,["--import","tsx","scripts/check-local-api.ts"],{env,stdio:"inherit"});
 const [code]=await once(check,"exit");
 if(code!==0)throw new Error(`Local API checks failed (${code}).`);
}finally{
 if(server)await stop(server);
 await rm(directory,{recursive:true,force:true});
}
