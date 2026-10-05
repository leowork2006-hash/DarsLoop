import { claimJob, expireJobs, failJob } from "../src/lib/backend";
import { configured, ProviderError } from "../src/lib/ai";
import { processLesson } from "../src/lib/processing";
import { runWorker } from "../src/lib/worker-loop";
const wait=(ms:number)=>new Promise<void>(r=>setTimeout(r,ms));
let stopping=false;process.on("SIGINT",()=>{stopping=true;});process.on("SIGTERM",()=>{stopping=true;});
process.stdout.write("DarsLoop worker started. Audio is sent only when server credentials are configured.\n");
await runWorker({configured,expire:expireJobs,claim:claimJob,process:processLesson,fail:failJob,
  message:e=>e instanceof ProviderError?e.message:"Processing was interrupted. Your original audio is saved; please retry.",
  log:text=>process.stdout.write(`${text}\n`),
},()=>stopping,wait);
