import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "../src/components/client-api";

afterEach(()=>vi.unstubAllGlobals());
describe("client API outage responses",()=>{
  it("preserves valid success data and actionable server error text",async()=>{
    const request=vi.fn().mockResolvedValueOnce(Response.json({id:"lesson"})).mockResolvedValueOnce(Response.json({error:"Some file parts are missing. Resume the upload before saving."},{status:409}));
    vi.stubGlobal("fetch",request);
    await expect(api("/api/imports")).resolves.toEqual({id:"lesson"});
    await expect(api("/api/imports")).rejects.toThrow("Resume the upload");
  });
  it("shows a useful temporary-outage message for non-JSON proxy errors",async()=>{
    vi.stubGlobal("fetch",vi.fn(async()=>new Response("<html>Bad Gateway: upstream unavailable</html>",{status:502,headers:{"content-type":"text/html"}})));
    await expect(api("/api/workspace")).rejects.toThrow("temporarily unavailable");
  });
  it("handles JSON null and empty rate-limit responses without a property-access error",async()=>{
    vi.stubGlobal("fetch",vi.fn().mockResolvedValueOnce(Response.json(null,{status:503})).mockResolvedValueOnce(new Response("",{status:429})));
    await expect(api("/api/workspace")).rejects.toThrow("temporarily unavailable");
    await expect(api("/api/imports")).rejects.toThrow("Please wait");
  });
  it("redirects an expired session even if the sign-in error body is not JSON",async()=>{
    const assign=vi.fn();vi.stubGlobal("window",{location:{search:"",assign}});
    vi.stubGlobal("fetch",vi.fn(async()=>new Response("Sign in",{status:401})));
    await expect(api("/api/workspace")).rejects.toThrow("Sign in");
    expect(assign).toHaveBeenCalledWith("/signin");
  });
  it("explains a malformed success response rather than exposing the JSON parser error",async()=>{
    vi.stubGlobal("fetch",vi.fn(async()=>new Response("<html>Unexpected proxy response</html>")));
    await expect(api("/api/workspace")).rejects.toThrow("response could not be read");
  });
  it("explains a network interruption but preserves intentional aborts",async()=>{
    vi.stubGlobal("fetch",vi.fn().mockRejectedValueOnce(new TypeError("Failed to fetch")).mockRejectedValueOnce(new DOMException("Cancelled","AbortError")));
    await expect(api("/api/workspace")).rejects.toThrow("connection was interrupted");
    await expect(api("/api/workspace")).rejects.toMatchObject({name:"AbortError"});
  });
});
