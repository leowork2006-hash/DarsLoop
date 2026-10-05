import { beforeEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { ChallengeError } from "../src/lib/class-challenges";
const fixture=vi.hoisted(()=>({user:"verified-student",list:vi.fn(),read:vi.fn(),act:vi.fn()}));
vi.mock("next/headers",()=>({cookies:async()=>({get:()=>({value:"fictional-session"})})}));
vi.mock("../src/lib/store",()=>({sessionUser:()=>fixture.user}));
vi.mock("../src/lib/supabase/config",()=>({cloudMode:()=>false}));
vi.mock("../src/lib/class-challenges-backend",()=>({listClassRounds:(...args:unknown[])=>fixture.list(...args),readClassRound:(...args:unknown[])=>fixture.read(...args),actOnClassRound:(...args:unknown[])=>fixture.act(...args)}));
const route=await import("../src/app/api/class-challenges/route");
const groupId=randomUUID(),roundId=randomUUID();
function request(query="",method="GET",payload?:unknown,headers:Record<string,string>={}) {return new Request(`http://localhost:3037/api/class-challenges${query}`,{method,headers:{host:"localhost:3037",origin:"http://localhost:3037",...headers},...(payload!==undefined?{body:JSON.stringify(payload)}:{})});}
beforeEach(()=>{fixture.user="verified-student";fixture.list.mockReset().mockResolvedValue([]);fixture.read.mockReset().mockResolvedValue({id:roundId,joined:false});fixture.act.mockReset().mockResolvedValue({id:roundId,joined:true});});
describe("private quiz HTTP boundary with mocked session and stores",()=>{
  it("uses verified identity, uncached projections and current group/round IDs",async()=>{
    const response=await route.GET(request(`?groupId=${groupId}`));expect(response.status).toBe(200);expect(response.headers.get("cache-control")).toBe("no-store");expect(fixture.list).toHaveBeenCalledWith("verified-student",groupId);
    expect((await route.GET(request(`?roundId=${roundId}`))).status).toBe(200);expect(fixture.read).toHaveBeenCalledWith("verified-student",roundId);
    const input={action:"join",roundId,alias:"Cedar",consent:true};expect((await route.POST(request("","POST",input))).status).toBe(200);expect(fixture.act).toHaveBeenCalledWith("verified-student",input);
  });
  it("denies signed-out and cross-site reads/writes before data access",async()=>{
    expect((await route.GET(request(`?groupId=${groupId}`,"GET",undefined,{"sec-fetch-site":"cross-site"}))).status).toBe(403);
    expect((await route.POST(request("","POST",{action:"withdraw",roundId},{origin:"https://foreign.invalid"}))).status).toBe(403);
    fixture.user="";expect((await route.GET(request(`?roundId=${roundId}`))).status).toBe(401);expect(fixture.read).not.toHaveBeenCalled();expect(fixture.act).not.toHaveBeenCalled();
  });
  it("rejects forged identity/score, no consent, extra actions and unsafe counts",async()=>{
    for(const payload of [{action:"join",roundId,alias:"Cedar",consent:true,userId:"foreign"},{action:"join",roundId,alias:"Cedar",consent:false},{action:"submit",roundId,choices:[0],score:1},{action:"submit",roundId,choices:Array(11).fill(0)},{action:"delete",roundId}])expect((await route.POST(request("","POST",payload))).status).toBe(400);
    for(const query of ["",`?groupId=${groupId}&roundId=${roundId}`,"?roundId=foreign","?groupId=not-uuid"])expect((await route.GET(request(query))).status).toBe(400);
    expect(fixture.act).not.toHaveBeenCalled();
  });
  it("returns useful stale/access/opt-in/first-attempt failures without private database details",async()=>{
    for(const [reason,status] of [["access",404],["changed",409],["optin",403],["submitted",409]] as const){fixture.act.mockRejectedValue(new ChallengeError(reason));expect((await route.POST(request("","POST",{action:"submit",roundId,choices:[0]}))).status).toBe(status);}
    fixture.read.mockRejectedValue(new Error("secret participant details"));const failed=await route.GET(request(`?roundId=${roundId}`));expect(failed.status).toBe(500);expect(await failed.text()).not.toContain("secret");
  });
});
