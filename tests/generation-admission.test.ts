import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { GenerationAdmission } from "../src/lib/generation-admission";

const cleanups:(()=>void)[]=[];
afterEach(()=>{while(cleanups.length)cleanups.pop()!();});
function pair(){
  const dir=mkdtempSync(path.join(os.tmpdir(),"darsloop-permits-")),file=path.join(dir,"permits.sqlite");
  const a=new GenerationAdmission(file),b=new GenerationAdmission(file);
  cleanups.push(()=>{a.close();b.close();rmSync(dir,{recursive:true,force:true});});return [a,b];
}
describe("shared generation admission",()=>{
  it("coordinates two independent database connections and releases only its own lease",()=>{
    const [a,b]=pair(),first=a.tryAcquire("fictional-model",1000),second=b.tryAcquire("fictional-model",1000);
    expect("release" in first).toBe(true);expect("release" in second).toBe(true);expect(a.tryAcquire("fictional-model",1000)).toEqual({retryAt:91000});
    if("release" in first){first.release();first.release();}
    expect("release" in b.tryAcquire("fictional-model",1001)).toBe(true);expect("retryAt" in a.tryAcquire("fictional-model",1001)).toBe(true);
  });
  it("counts released and failed calls in a rolling minute without quota-reset bursts",()=>{
    const [a,b]=pair();for(let i=0;i<12;i++){const p=(i%2?a:b).tryAcquire("fictional-model",1000+i);expect("release" in p).toBe(true);if("release" in p)p.release();}
    expect(a.tryAcquire("fictional-model",59999)).toEqual({retryAt:61000});expect("release" in b.tryAcquire("fictional-model",61000)).toBe(true);
  });
  it("persists recent quota across restarts and expires abandoned work",()=>{
    const dir=mkdtempSync(path.join(os.tmpdir(),"darsloop-permits-")),file=path.join(dir,"permits.sqlite");
    let a=new GenerationAdmission(file);a.tryAcquire("fictional-model",1000);a.tryAcquire("fictional-model",1000);a.close();a=new GenerationAdmission(file);
    cleanups.push(()=>{a.close();rmSync(dir,{recursive:true,force:true});});expect("retryAt" in a.tryAcquire("fictional-model",1001)).toBe(true);expect("release" in a.tryAcquire("fictional-model",91000)).toBe(true);
  });
  it("keeps model minute quotas independent",()=>{
    const [a,b]=pair();a.tryAcquire("model-a",1000);a.tryAcquire("model-a",1000);expect("release" in b.tryAcquire("model-b",1000)).toBe(true);
  });
});
