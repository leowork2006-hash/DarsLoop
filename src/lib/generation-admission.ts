import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { ProviderError } from "./provider-error";

// The worker and web server are separate Node processes on one container.
// Keep admission on their shared local disk; an in-memory semaphore alone cannot
// protect the project's minute quota across both processes. No user data is stored.
const WINDOW=60_000, LEASE=90_000, RPM=12, INFLIGHT=2;
export type GenerationMode="interactive"|"queued";
export class GenerationAdmission {
  private database:DatabaseSync;
  constructor(filename:string){
    if(filename!==":memory:")mkdirSync(path.dirname(filename),{recursive:true,mode:0o700});
    this.database=new DatabaseSync(filename);
    this.database.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=2500;
      CREATE TABLE IF NOT EXISTS generation_permits(id TEXT PRIMARY KEY,model TEXT NOT NULL,started INTEGER NOT NULL,lease_until INTEGER NOT NULL);
      CREATE INDEX IF NOT EXISTS generation_permits_window ON generation_permits(model,started);`);
  }
  tryAcquire(model:string,now=Date.now()):{release:()=>void}|{retryAt:number}{
    const db=this.database;
    db.exec("BEGIN IMMEDIATE");
    try{
      db.prepare("DELETE FROM generation_permits WHERE started <= ? AND lease_until <= ?").run(now-WINDOW,now);
      const active=db.prepare("SELECT lease_until FROM generation_permits WHERE model=? AND lease_until>? ORDER BY lease_until").all(model,now) as {lease_until:number}[];
      const recent=db.prepare("SELECT started FROM generation_permits WHERE model=? AND started>? ORDER BY started").all(model,now-WINDOW) as {started:number}[];
      if(active.length>=INFLIGHT||recent.length>=RPM){
        const retryAt=Math.max(now+50,active.length>=INFLIGHT?active[0].lease_until:0,recent.length>=RPM?recent[recent.length-RPM].started+WINDOW:0);
        db.exec("COMMIT");return {retryAt};
      }
      const id=randomUUID();db.prepare("INSERT INTO generation_permits VALUES(?,?,?,?)").run(id,model,now,now+LEASE);db.exec("COMMIT");
      let released=false;
      return {release:()=>{if(!released){released=true;db.prepare("UPDATE generation_permits SET lease_until=0 WHERE id=?").run(id);}}};
    }catch(error){db.exec("ROLLBACK");throw error;}
  }
  close(){this.database.close();}
}

let shared:GenerationAdmission|undefined;
function sharedAdmission(){
  if(!shared){
    const dir=path.resolve(/* turbopackIgnore: true */process.env.DARSLOOP_DATA_DIR||".data");
    shared=new GenerationAdmission(path.join(dir,"generation-admission.sqlite"));
  }
  return shared;
}
export async function acquireGenerationPermit(model:string,mode:GenerationMode="interactive"){
  const deadline=Date.now()+(mode==="queued"?180_000:750);
  for(;;){
    const permit=sharedAdmission().tryAcquire(model);
    if("release" in permit)return permit.release;
    if(Date.now()>=deadline)throw new ProviderError("quota","The AI service is busy. Your source is saved; queued study material will retry when capacity is available.",permit.retryAt);
    // Poll released leases without blocking Node. The rolling window remains
    // enforced, including failed requests; a restart doesn't forget recent calls.
    await new Promise(resolve=>setTimeout(resolve,Math.min(500,Math.max(50,permit.retryAt-Date.now()),deadline-Date.now())));
  }
}
