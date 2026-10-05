import { describe, expect, it, vi } from "vitest";
import { runWorker, type WorkerActions } from "../src/lib/worker-loop";

describe("worker consumer outage recovery with injected services", () => {
  it("keeps polling after a queue outage and consumes a later job without logging the raw error", async () => {
    let stop = false;
    const actions: WorkerActions = {
      configured: () => ({ asr: true, generation: true }), expire: vi.fn(async () => {}),
      claim: vi.fn().mockRejectedValueOnce(new Error("private network detail")).mockResolvedValueOnce({ id: "job", lesson_id: "lesson", lease: "fence" }),
      process: vi.fn(async () => { stop = true; }), fail: vi.fn(), message: () => "safe error", log: vi.fn(),
    };
    const wait = vi.fn(async () => {});
    await runWorker(actions, () => stop, wait);
    expect(actions.claim).toHaveBeenCalledTimes(2);
    expect(actions.process).toHaveBeenCalledWith({ id: "job", lesson_id: "lesson", lease: "fence" });
    expect(wait).toHaveBeenCalledWith(2000);
    expect(JSON.stringify(vi.mocked(actions.log).mock.calls)).not.toContain("private network detail");
  });
  it("survives a failed error write, allowing a later lease recovery to finish", async () => {
    let stop = false;
    const job = { id: "job", lesson_id: "lesson", lease: "old-fence" }, recovered = { ...job, lease: "new-fence" };
    const actions: WorkerActions = {
      configured: () => ({ asr: true, generation: true }), expire: async () => {},
      claim: vi.fn().mockResolvedValueOnce(job).mockResolvedValueOnce(recovered),
      process: vi.fn().mockRejectedValueOnce(new Error("provider failure")).mockImplementationOnce(async () => { stop = true; }),
      fail: vi.fn().mockRejectedValueOnce(new Error("database offline")), message: () => "safe error", log: vi.fn(),
    };
    await runWorker(actions, () => stop, async () => {});
    expect(actions.fail).toHaveBeenCalledWith("job", "old-fence", "safe error");
    expect(actions.process).toHaveBeenLastCalledWith(recovered);
  });
});

it("defers a provider 429 instead of marking an upload failed",async()=>{
 const {ProviderError}=await import("../src/lib/provider-error");const {workerTick}=await import("../src/lib/worker-loop");
 const actions:WorkerActions={configured:()=>({asr:true,generation:true}),expire:async()=>{},claim:async()=>({id:"job",lesson_id:"lesson",lease:"current"}),process:async()=>{throw new ProviderError("quota","safe",1000000);},fail:vi.fn(),defer:vi.fn(async()=>{}),message:()=>"safe",log:vi.fn()};
 await workerTick(actions);expect(actions.fail).not.toHaveBeenCalled();expect(actions.defer).toHaveBeenCalledWith("job","current",1000000,"Waiting for AI capacity · resumes automatically");
});

it("claims only PDF jobs when generation is configured without ASR",async()=>{
 const {workerTick}=await import("../src/lib/worker-loop");const actions:WorkerActions={configured:()=>({asr:false,generation:true}),expire:async()=>{},claim:vi.fn(async()=>({id:"pdf",lesson_id:"pdf",lease:"fence"})),process:vi.fn(async()=>{}),fail:vi.fn(),message:()=>"safe",log:vi.fn()};expect(await workerTick(actions)).toBe("worked");expect(actions.claim).toHaveBeenCalledWith(true);expect(actions.process).toHaveBeenCalledTimes(1);
});
