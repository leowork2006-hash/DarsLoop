import { afterAll, describe, expect, it, vi } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
process.env.DARSLOOP_DATA_DIR=mkdtempSync(path.join(os.tmpdir(),"darsloop-test-"));
const s=await import("../src/lib/store");
function fixtureSession(){const result=s.createSession();s.seedDemo(result.userId);return result;}
afterAll(()=>{s.db().close();rmSync(process.env.DARSLOOP_DATA_DIR!,{recursive:true,force:true});});
describe("private lessons and job durability",()=>{
  it("starts an actual new session with an empty library",()=>{const user=s.createSession();expect(s.listLessons(user.userId)).toEqual([]);});
  it("uses hashed sessions and isolates two students",()=>{
    const a=fixtureSession(),b=fixtureSession();
    expect(s.sessionUser(a.token)).toBe(a.userId);expect(s.sessionUser("wrong")).toBeNull();
    expect(s.authorizedLesson(b.userId,s.listLessons(a.userId)[0].id)).toBeNull();
    expect(JSON.stringify(s.db().prepare("SELECT * FROM sessions").all())).not.toContain(a.token);
    expect(s.publicLesson(s.listLessons(a.userId)[0]).audioPath).toBe("");
  });
  it("makes invites one-use and 24-hour; revocation removes access and keeps reviews private",()=>{
    const a=fixtureSession(),b=fixtureSession(),c=fixtureSession(),l=s.listLessons(a.userId)[0],g=s.createGroup(a.userId,"Saturday class");
    const token=s.invite(a.userId,g);
    const expiry=s.db().prepare("SELECT expires_at FROM invites ORDER BY rowid DESC LIMIT 1").get() as {expires_at:number};
    expect(expiry.expires_at-Date.now()).toBeGreaterThan(86_390_000);expect(expiry.expires_at-Date.now()).toBeLessThanOrEqual(86_400_000);
    s.join(b.userId,token);expect(()=>s.join(c.userId,token)).toThrow();
    s.share(a.userId,g,l.id);expect(s.authorizedLesson(b.userId,l.id)?.shared).toBe(true);
    expect(s.authorizedLesson(c.userId,l.id)).toBeNull();
    s.saveReview(b.userId,l,"quiz-listening",false);
    expect(s.listReviews(a.userId)).toEqual([]);expect(s.listReviews(b.userId)).toHaveLength(1);
    s.revokeShare(a.userId,g,l.id);expect(s.authorizedLesson(b.userId,l.id)).toBeNull();expect(s.listReviews(b.userId)).toEqual([]);
    const expired=s.invite(a.userId,g);s.db().prepare("UPDATE invites SET expires_at=? WHERE used=0").run(Date.now()-1);expect(()=>s.join(c.userId,expired)).toThrow();
  });
  it("fences abandoned jobs and cannot recreate deleted lessons",()=>{
    const a=fixtureSession(),base=s.listLessons(a.userId)[0],l={...base,id:randomUUID(),demo:false,status:"queued" as const};s.insertLesson(l);s.enqueue(l.id);s.enqueue(l.id);
    const first=s.claimJob()!;expect(first.lesson_id).toBe(l.id);expect(s.claimJob()).toBeNull();
    s.db().prepare("UPDATE jobs SET lease_until=? WHERE id=?").run(Date.now()-1,first.id);
    const second=s.claimJob()!;expect(second.lease).not.toBe(first.lease);expect(s.heartbeat(first.id,first.lease)).toBe(false);expect(()=>s.jobCommit(first.id,first.lease,l)).toThrow();
    s.jobCommit(second.id,second.lease,{...l,status:"ready"},true);expect(s.rawLesson(l.id)?.status).toBe("ready");
    s.enqueue(l.id);const third=s.claimJob()!;s.deleteLesson(a.userId,l.id);expect(()=>s.jobCommit(third.id,third.lease,l)).toThrow();expect(s.rawLesson(l.id)).toBeNull();
  });
  it("invalidates shared artifacts after a transcript version changes",()=>{
    const a=fixtureSession(),b=fixtureSession(),l=s.listLessons(a.userId)[0],g=s.createGroup(a.userId,"Versioned class");s.join(b.userId,s.invite(a.userId,g));s.share(a.userId,g,l.id);s.updateLesson({...l,version:2},1);
    expect(s.authorizedLesson(b.userId,l.id)).toBeNull();expect(()=>s.updateLesson(l)).toThrow();
  });
  it("persists repeated actual review events in the existing JSON payload without dating legacy attempts",()=>{
    const a=fixtureSession(),l=s.listLessons(a.userId)[0];vi.useFakeTimers();vi.setSystemTime(new Date("2026-10-05T01:00:00Z"));
    try {
      const first=s.saveReview(a.userId,l,"quiz-listening",false);
      s.db().prepare("UPDATE reviews SET payload=? WHERE user_id=? AND lesson_id=? AND item_id=?").run(JSON.stringify({...first,attempts:5,activity:undefined}),a.userId,l.id,"quiz-listening");
      s.saveReview(a.userId,l,"quiz-listening",true);const third=s.saveReview(a.userId,l,"quiz-listening",true);
      expect(third.attempts).toBe(7);expect(third.activity).toEqual([{day:"2026-10-05",attempts:2}]);expect(s.listReviews(a.userId)[0]).toEqual(third);
    } finally {vi.useRealTimers();}
  });
});
