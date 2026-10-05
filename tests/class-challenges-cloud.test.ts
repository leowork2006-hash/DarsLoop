import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import type { Lesson } from "../src/lib/types";
const fixture=vi.hoisted(()=>({rpc:vi.fn(),raw:vi.fn()}));
vi.mock("../src/lib/supabase/admin",()=>({adminClient:()=>({rpc:fixture.rpc})}));
vi.mock("../src/lib/supabase/store",()=>({rawLesson:(...args:unknown[])=>fixture.raw(...args)}));
const cloud=await import("../src/lib/supabase/class-challenges");
beforeEach(()=>{fixture.rpc.mockReset().mockResolvedValue({data:{joined:false},error:null});fixture.raw.mockReset();});
describe("cloud challenge transport and private migration contract, not a hosted proof",()=>{
  it("uses a single service-only RPC with verified account identity for every operation",async()=>{
    const user=randomUUID(),group=randomUUID(),round=randomUUID();await cloud.listClassRounds(user,group);expect(fixture.rpc).toHaveBeenLastCalledWith("darsloop_class_quiz",{p_user:user,p_action:"list",p_group:group});
    await cloud.readClassRound(user,round);expect(fixture.rpc).toHaveBeenLastCalledWith("darsloop_class_quiz",{p_user:user,p_action:"read",p_round:round});
    await cloud.actOnClassRound(user,{action:"submit",roundId:round,choices:[0,1]});expect(fixture.rpc).toHaveBeenLastCalledWith("darsloop_class_quiz",{p_user:user,p_action:"submit",p_round:round,p_choices:[0,1]});
  });
  it("does not forward manufactured questions or a demo to round creation",async()=>{
    fixture.raw.mockResolvedValue({id:randomUUID(),status:"ready",demo:true} as Lesson);
    await expect(cloud.actOnClassRound(randomUUID(),{action:"create",groupId:randomUUID(),lessonId:randomUUID()})).rejects.toThrow("no supported");expect(fixture.rpc).not.toHaveBeenCalled();
  });
  it("maps immutable/access failures and does not expose database errors",async()=>{
    fixture.rpc.mockResolvedValue({error:{message:"quiz_submitted"},data:null});await expect(cloud.actOnClassRound(randomUUID(),{action:"submit",roundId:randomUUID(),choices:[0]})).rejects.toThrow("already saved");
    fixture.rpc.mockResolvedValue({error:{message:"secret SQL details"},data:null});await expect(cloud.readClassRound(randomUUID(),randomUUID())).rejects.toThrow("Keep your answers open");
  });
  it("declares RLS deny-client tables, service-only invoker RPC, revocation triggers and membership-filtered peers",()=>{
    const sql=readFileSync("supabase/migrations/20261005220424_class_quiz_rounds.sql","utf8");
    expect(sql).toContain("alter table public.class_quiz_rounds enable row level security");expect(sql).toContain("alter table public.class_quiz_participants enable row level security");expect(sql).toContain("from public,anon,authenticated");expect(sql).not.toContain("security definer");expect(sql).not.toContain("create policy");
    expect(sql).toContain("class_quiz_unshare after delete on public.shares");expect(sql).toContain("join public.memberships m on m.group_id=r.group_id and m.user_id=p.user_id");expect(sql).toContain("own.choices<>p_choices");expect(sql).not.toContain("insert into public.reviews");
  });
});
