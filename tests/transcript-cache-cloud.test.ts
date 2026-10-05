import { beforeEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
const network=vi.hoisted(()=>({fetch:vi.fn()}));
vi.mock("../src/lib/supabase/admin",async()=>{
  const {createClient}=await import("@supabase/supabase-js");
  return {adminClient:()=>createClient("https://offline-cache.invalid","fictional-test-key",{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:network.fetch}}),rpc:vi.fn()};
});
const {transcriptCandidates}=await import("../src/lib/supabase/store");
beforeEach(()=>network.fetch.mockReset());
describe("owner-only Supabase cache query contract with mocked transport",()=>{
  it("uses the real SDK JSON filters, a bounded result and independent payload ownership verification",async()=>{
    const owner=randomUUID(),exclude=randomUUID(),key="a".repeat(64),owned={ownerId:owner,id:randomUUID()},foreign={ownerId:randomUUID(),id:randomUUID()};
    network.fetch.mockResolvedValue(new Response(JSON.stringify([{payload:owned},{payload:foreign}]),{headers:{"content-type":"application/json"}}));
    expect(await transcriptCandidates(owner,key,exclude)).toEqual([owned]);expect(network.fetch).toHaveBeenCalledTimes(1);
    const request=new URL(String(network.fetch.mock.calls[0][0]));
    expect(request.origin).toBe("https://offline-cache.invalid");expect(request.searchParams.get("select")).toBe("payload");expect(request.searchParams.get("owner_id")).toBe(`eq.${owner}`);expect(request.searchParams.get("id")).toBe(`neq.${exclude}`);expect(request.searchParams.get("payload->transcriptCache->>key")).toBe(`eq.${key}`);expect(request.searchParams.get("payload->>status")).toBe("eq.ready");expect(request.searchParams.get("payload->>transcriptionComplete")).toBe("eq.true");expect(request.searchParams.get("limit")).toBe("30");
  });
  it("rejects an absent owner or untrusted hash before requesting any rows",async()=>{
    expect(await transcriptCandidates("","a".repeat(64),"id")).toEqual([]);expect(await transcriptCandidates(randomUUID(),"eq.arbitrary", "id")).toEqual([]);expect(network.fetch).not.toHaveBeenCalled();
  });
});
