import { beforeEach, describe, expect, it, vi } from "vitest";
import { PersonalNotesError } from "../src/lib/personal-notes";

const fixture=vi.hoisted(()=>({user:"signed-in-student",read:vi.fn(),save:vi.fn(),budget:vi.fn()}));
vi.mock("next/headers",()=>({cookies:async()=>({get:()=>({value:"fictional-test-session"})})}));
vi.mock("../src/lib/store",()=>({sessionUser:()=>fixture.user}));
vi.mock("../src/lib/supabase/config",()=>({cloudMode:()=>false}));
vi.mock("../src/lib/backend",()=>({takeBudget:(...args:unknown[])=>fixture.budget(...args)}));
vi.mock("../src/lib/personal-notes-backend",()=>({readPersonalNotes:(...args:unknown[])=>fixture.read(...args),savePersonalNotes:(...args:unknown[])=>fixture.save(...args)}));
const route=await import("../src/app/api/lessons/[id]/notes/route");
const context={params:Promise.resolve({id:"selected-lesson"})};
function request(query="?version=1",method="GET",body?:unknown,headers:Record<string,string>={}) {
 return new Request("http://localhost:3000/api/lessons/selected-lesson/notes"+query,{method,headers:{host:"localhost:3000",origin:"http://localhost:3000",...headers},...(body!==undefined?{body:JSON.stringify(body)}:{})});
}
beforeEach(()=>{fixture.user="signed-in-student";fixture.read.mockReset().mockResolvedValue(null);fixture.save.mockReset().mockResolvedValue({version:1,revision:1,text:"private",view:"points",updatedAt:"2026-10-06T00:00:00Z"});fixture.budget.mockReset().mockResolvedValue(true);});

describe("personal notes HTTP contract with mocked session/storage",()=>{
 it("uses verified session identity and returns private uncached content",async()=>{
  const get=await route.GET(request(),context);expect(get.status).toBe(200);expect(get.headers.get("cache-control")).toBe("no-store");expect(await get.json()).toEqual({notes:null});expect(fixture.read).toHaveBeenCalledWith("signed-in-student","selected-lesson",1);
  const input={version:1,revision:0,text:"private",view:"points"},put=await route.PUT(request("","PUT",input),context);expect(put.status).toBe(200);expect(fixture.save).toHaveBeenCalledWith("signed-in-student","selected-lesson",input);
 });
 it("rejects cross-site actions and signed-out access before reading or writing",async()=>{
  expect((await route.GET(request("?version=1","GET",undefined,{"sec-fetch-site":"cross-site"}),context)).status).toBe(403);
  expect((await route.PUT(request("","PUT",{version:1,revision:0,text:"private",view:"points"},{origin:"https://foreign.invalid"}),context)).status).toBe(403);
  fixture.user="";expect((await route.GET(request(),context)).status).toBe(401);expect(fixture.read).not.toHaveBeenCalled();expect(fixture.save).not.toHaveBeenCalled();
 });
 it("rejects owner injection, oversized text and invalid/repeated versions",async()=>{
  for(const query of ["","?version=0","?version=1&version=2","?version=2147483648","?version=1.5"]){expect((await route.GET(request(query),context)).status).toBe(400);}
  for(const input of [{version:1,revision:0,text:"private",view:"points",userId:"foreign"},{version:1,revision:0,text:"x".repeat(20_001),view:"points"},{version:1,revision:0,text:"private",view:"hallucinate"}])expect((await route.PUT(request("","PUT",input),context)).status).toBe(400);
  expect(fixture.save).not.toHaveBeenCalled();
 });
 it("maps access loss/version conflict safely and preserves errors without internal details",async()=>{
  fixture.read.mockRejectedValue(new PersonalNotesError("access"));expect((await route.GET(request(),context)).status).toBe(404);
  fixture.save.mockRejectedValue(new PersonalNotesError("conflict"));const response=await route.PUT(request("","PUT",{version:1,revision:0,text:"private",view:"points"}),context);expect(response.status).toBe(409);expect((await response.json()).error).toContain("saved elsewhere");
  fixture.save.mockRejectedValue(new Error("secret DB details"));const failed=await route.PUT(request("","PUT",{version:1,revision:0,text:"private",view:"points"}),context);expect(failed.status).toBe(500);expect(await failed.text()).not.toContain("secret");
 });
 it("limits repeated saves before storage mutation",async()=>{
  fixture.budget.mockResolvedValue(false);expect((await route.PUT(request("","PUT",{version:1,revision:0,text:"private",view:"points"}),context)).status).toBe(429);expect(fixture.save).not.toHaveBeenCalled();
 });
});
