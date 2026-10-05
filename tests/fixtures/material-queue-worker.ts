import { parentPort, workerData } from "node:worker_threads";
process.env.DARSLOOP_DATA_DIR=workerData.directory;
const store=await import("../../src/lib/store");
store.db();
parentPort!.once("message",()=>{
  try{
    if(workerData.action==="ordinary"){store.queueLesson({...workerData.payload,status:"queued",error:null});parentPort!.postMessage({result:{status:"queued",revision:0}});}
    else parentPort!.postMessage({result:store.queueDetailedMaterial(workerData.owner,workerData.id,workerData.version,workerData.revision)});
  }
  catch(error){parentPort!.postMessage({error:error instanceof Error&&"code" in error?error.code:"internal"});}
  finally{store.db().close();parentPort!.close();}
});
parentPort!.postMessage({ready:true});
