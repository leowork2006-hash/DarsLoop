import { ProviderError } from "./provider-error";
type Job = { id: string; lesson_id: string; lease: string };
export type WorkerActions = {
  configured: () => { asr: boolean; generation: boolean };
  expire: () => Promise<void>;
  claim: (pdfOnly?:boolean) => Promise<Job | null>;
  process: (job: Job) => Promise<void>;
  fail: (id: string, lease: string, error: string) => Promise<unknown>;
  defer?: (id:string,lease:string,retryAt:number,message:string)=>Promise<unknown>;
  message: (error: unknown) => string;
  log: (message: string) => void;
};

export async function workerTick(actions: WorkerActions): Promise<"idle" | "setup" | "worked"> {
  await actions.expire();
  const config = actions.configured();
  if (!config.generation) return "setup";
  const job = await actions.claim(!config.asr);
  if (!job) return "idle";
  try {
    await actions.process(job);
    actions.log("A lesson finished processing.");
  } catch (e) {
    // If this write fails, retain the lease/checkpoints for normal expiry recovery.
    if(e instanceof ProviderError&&e.code==="quota"&&e.retryAt&&actions.defer){
      await actions.defer(job.id,job.lease,e.retryAt,"Waiting for AI capacity · resumes automatically");
    }else await actions.fail(job.id, job.lease, actions.message(e));
    actions.log("A lesson paused; details are visible to its owner.");
  }
  return "worked";
}

export async function runWorker(actions: WorkerActions, stopping: () => boolean, wait: (ms: number) => Promise<void>) {
  let failures = 0;
  while (!stopping()) {
    try {
      const result = await workerTick(actions);
      failures = 0;
      if (result !== "worked" && !stopping()) await wait(result === "setup" ? 2000 : 5000);
    } catch {
      // Queue/network failures must not silently kill the only consumer.
      failures++;
      actions.log("The job service is unavailable. Retrying; saved jobs remain queued.");
      if (!stopping()) await wait(Math.min(30_000, 1000 * 2 ** Math.min(failures, 5)));
    }
  }
}
