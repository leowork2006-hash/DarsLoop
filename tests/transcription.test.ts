import { afterEach, describe, expect, it, vi } from "vitest";
import { selectedProvider, speechmaticsSegments, transcribeDeepgram, transcribeGroq, transcribeSpeechmatics, wordsToSegments } from "../src/lib/transcription";
import { retryTime } from "../src/lib/provider-error";
const json=(value:unknown,status=200,headers?:Record<string,string>)=>new Response(JSON.stringify(value),{status,headers});
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();});
describe("manual ASR adapter contracts with mocked HTTP",()=>{
 it("rejects an unknown provider instead of silently selecting another",()=>{vi.stubEnv("TRANSCRIPTION_PROVIDER","anything");expect(selectedProvider).toThrow("Choose groq");});
 it("keeps native word times and language labels without guessed speech",()=>{
  const result=speechmaticsSegments({results:[{type:"word",start_time:1,end_time:1.4,alternatives:[{content:"Today",language:"en"}]},{type:"word",start_time:1.5,end_time:2.2,alternatives:[{content:"فاعل",language:"ar"}]},{type:"punctuation",start_time:2.2,end_time:2.2,attaches_to:"previous",alternatives:[{content:"."}]}]});
  expect(result.segments[0]).toMatchObject({start:1,end:2.2,text:"Today فاعل."});expect(result.segments[0].words?.map(w=>w.language)).toEqual(["en","ar"]);
 });
 it("fails invalid word timing rather than clamping it",()=>{expect(()=>wordsToSegments([{start:-1,end:1,text:"bad"}])).toThrow();expect(()=>wordsToSegments([{start:1,end:1,text:"bad"}])).toThrow();});
 it("Deepgram requires a main language, opts out of model improvement and uses Token auth/binary audio, never multi",async()=>{
  vi.stubEnv("DEEPGRAM_API_KEY","test-private-key");const fetcher=vi.fn(async(_url:string,_init:{headers:Record<string,string>})=>json({results:{channels:[{alternatives:[{words:[{start:0.2,end:1,word:"لفظ",punctuated_word:"لفظ۔"}]}]}]}}));vi.stubGlobal("fetch",fetcher);
  await expect(transcribeDeepgram(Buffer.from("mock"),undefined,"auto")).rejects.toThrow("main spoken language");expect(fetcher).not.toHaveBeenCalled();
  const result=await transcribeDeepgram(Buffer.from("fLaC mock"),undefined,"ur");expect(fetcher.mock.calls[0][0]).toContain("language=ur");expect(new URL(fetcher.mock.calls[0][0]).searchParams.get("mip_opt_out")).toBe("true");expect(fetcher.mock.calls[0][1].headers.Authorization).toBe("Token test-private-key");expect(result.segments[0].words?.[0].language).toBe("ur");
 });
 it("Groq carries a real Retry-After into a durable delay",async()=>{vi.stubEnv("GROQ_API_KEY","fake");vi.stubGlobal("fetch",vi.fn(async()=>json({},429,{"retry-after":"3600"})));const before=Date.now();await expect(transcribeGroq(Buffer.from("mock"))).rejects.toMatchObject({code:"quota",retryAt:expect.any(Number)});try{await transcribeGroq(Buffer.from("mock"));}catch(e){expect((e as {retryAt:number}).retryAt-before).toBeGreaterThanOrEqual(3600000);}});
 it("Speechmatics submits a Melia multilingual batch, polls, reads JSON, deletes only its job",async()=>{
  vi.stubEnv("SPEECHMATICS_API_KEY","test-key");const fetcher=vi.fn().mockResolvedValueOnce(json({id:"test-job"})).mockResolvedValueOnce(json({job:{status:"done"}})).mockResolvedValueOnce(json({results:[{type:"word",start_time:1,end_time:2,alternatives:[{content:"علم",language:"ur"}]}]})).mockResolvedValueOnce(json({}));vi.stubGlobal("fetch",fetcher);
  const r=await transcribeSpeechmatics(Buffer.from("mock"),undefined,"ar");expect(r.segments[0].text).toBe("علم");const body=fetcher.mock.calls[0][1].body as FormData;
  expect(JSON.parse(String(body.get("config")))).toEqual({type:"transcription",transcription_config:{model:"melia-1",language:"multi"}});expect(fetcher.mock.calls[0][1].headers.Authorization).toBe("Bearer test-key");expect(fetcher.mock.calls.at(-1)?.[1].method).toBe("DELETE");
 });
 it("a rejected async job fails loudly and is cleaned up",async()=>{vi.stubEnv("SPEECHMATICS_API_KEY","test-key");const f=vi.fn().mockResolvedValueOnce(json({id:"only-created-job"})).mockResolvedValueOnce(json({job:{status:"rejected"}})).mockResolvedValueOnce(json({}));vi.stubGlobal("fetch",f);await expect(transcribeSpeechmatics(Buffer.from("mock"),undefined,"ar")).rejects.toThrow("did not complete");expect(f.mock.calls.at(-1)?.[1].method).toBe("DELETE");});
 it("withholds Speechmatics Urdu/unknown-language jobs after failed actual fidelity probes",async()=>{const f=vi.fn();vi.stubGlobal("fetch",f);await expect(transcribeSpeechmatics(Buffer.from("mock"),undefined,"ur")).rejects.toThrow("limited");await expect(transcribeSpeechmatics(Buffer.from("mock"))).rejects.toThrow("limited");expect(f).not.toHaveBeenCalled();});
 it("Retry-After accepts dates and bounds malformed values",()=>{expect(retryTime("10",100000)).toBe(110000);expect(retryTime("bad",100000)).toBe(160000);expect(retryTime("999999999",100000)).toBe(86500000);});
});
