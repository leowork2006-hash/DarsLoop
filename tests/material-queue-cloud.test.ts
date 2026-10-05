import { beforeEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { MATERIAL_GENERATION_REVISION } from "../src/lib/material-sections";
import { materialSourceSnapshot } from "../src/lib/material-queue";
import type { Lesson } from "../src/lib/types";
const calls=vi.hoisted(()=>({fetch:vi.fn(),rpc:vi.fn()}));
vi.mock("../src/lib/supabase/admin",async()=>{
 const {createClient}=await import("@supabase/supabase-js");
 return {adminClient:()=>createClient("https://offline-material.invalid","fictional-test-key",{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:calls.fetch}}),rpc:calls.rpc};
});
const {queueDetailedMaterial,queueLesson}=await import("../src/lib/supabase/store");
const source=():Lesson=>({id:randomUUID(),ownerId:randomUUID(),title:"Authored stored source",course:"",createdAt:new Date().toISOString(),duration:10,version:2,status:"ready",stage:"Ready",error:null,demo:false,segments:[{id:"v2-s0",start:0,end:10,text:"An authored original clear passage remains saved.",flags:[]}],artifacts:null,audioPath:"/fake/saved-audio",mime:"audio/wav",noteOptions:{enabled:false,detail:"short",language:"ur"}});
beforeEach(()=>{calls.fetch.mockReset();calls.rpc.mockReset();});
describe("material queue cloud boundary without production calls",()=>{
 it("sends an exact server source snapshot/options to the atomic RPC and maps its revision/busy result",async()=>{
  const l=source();calls.fetch.mockImplementation(async()=>new Response(JSON.stringify({payload:l}),{headers:{"content-type":"application/json"}}));calls.rpc.mockResolvedValue({status:"queued",revision:1});
  expect(await queueDetailedMaterial(l.ownerId,l.id,2,0)).toEqual({status:"queued",revision:1});expect(calls.rpc).toHaveBeenCalledExactlyOnceWith("darsloop_queue_detailed_material",{p_owner:l.ownerId,p_lesson:l.id,p_source_version:2,p_material_revision:0,p_source_snapshot:materialSourceSnapshot(l),p_source_ready:true,p_note_options:{enabled:true,detail:"detailed",language:"ur"},p_prepared_revision:MATERIAL_GENERATION_REVISION});
  calls.rpc.mockResolvedValue({error:"busy"});await expect(queueDetailedMaterial(l.ownerId,l.id,2,0)).rejects.toMatchObject({name:"MaterialQueueError",code:"busy"});
 });
 it("rejects foreign owner or invalid input before any privileged mutation",async()=>{
  const l=source();calls.fetch.mockResolvedValue(new Response(JSON.stringify({payload:l}),{headers:{"content-type":"application/json"}}));
  await expect(queueDetailedMaterial(randomUUID(),l.id,2,0)).rejects.toMatchObject({code:"not_found"});expect(calls.rpc).not.toHaveBeenCalled();
  await expect(queueDetailedMaterial(l.ownerId,l.id,0,-1)).rejects.toMatchObject({code:"conflict"});expect(calls.fetch).toHaveBeenCalledTimes(1);
 });
 it("maps atomic ordinary-queue busy/material conflict SQL codes without exposing database messages",async()=>{
  const l=source();
  for(const [code,expected] of [["55P03","busy"],["40001","conflict"]]){
   calls.fetch.mockResolvedValue(new Response(JSON.stringify({code,message:"Internal database diagnostic",details:null,hint:null}),{status:409,headers:{"content-type":"application/json"}}));
   await expect(queueLesson(l)).rejects.toMatchObject({name:"MaterialQueueError",code:expected});
  }
 });
 it("the unapplied migration uses a fixed search path/server-only ACL, source snapshot fence and conditional terminal-job reset",()=>{
  const sql=readFileSync("supabase/migrations/20261005220213_detailed_material_queue.sql","utf8");
  expect(sql).toContain("security invoker set search_path=''");expect(sql).toContain("from public,anon,authenticated");expect(sql).toContain("to service_role");expect(sql).toContain("source_snapshot<>p_source_snapshot");expect(sql).toContain("where jobs.status in ('failed','done')");expect(sql).toContain("for update");expect(sql).not.toMatch(/create\s+table|grant\s+.*to\s+(?:anon|authenticated)/i);
 });
});
