import { afterEach, describe, expect, it, vi } from "vitest";
import { demoArtifacts } from "../src/lib/demo";
import type { Lesson, Segment } from "../src/lib/types";
const interaction=vi.hoisted(()=>vi.fn());
vi.mock("@google/genai",()=>({GoogleGenAI:class{interactions={create:interaction};}}));
import { answerLesson, createArtifacts, generationFailure, generationSchema, transcribe } from "../src/lib/ai";
import { artifactSchema } from "../src/lib/evidence";
import { z } from "zod";
const segments:Segment[]=Array.from({length:8},(_,i)=>({id:`s${i}`,start:i*12,end:(i+1)*12,text:`This teacher explains listening and revision in passage number ${i}.`,flags:[]}));
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();interaction.mockReset();});
const checks=(count:number)=>({output_text:JSON.stringify({checks:Array.from({length:count},(_,index)=>({index,supported:true,preservesQualifications:true,lessonScopeOnly:true}))})});
describe("provider contracts using mocks, not live AI",()=>{
  it("fails clearly when keys are missing",async()=>{
    vi.stubEnv("GEMINI_API_KEY","");vi.stubEnv("GROQ_API_KEY","");
    await expect(createArtifacts(segments)).rejects.toThrow("Connect Google");await expect(transcribe(Buffer.alloc(5))).rejects.toThrow("Connect Groq");
  });
  it("enforces structured outputs and audits generated notes and practice",async()=>{
    vi.stubEnv("GEMINI_API_KEY","test-only");
    const a=demoArtifacts(segments);interaction.mockResolvedValueOnce({output_text:JSON.stringify(a)}).mockResolvedValueOnce(checks(10));
    const result=await createArtifacts(segments);
    expect(result.practice.some(p=>p.kind==="quiz")).toBe(true);expect(result.practice.some(p=>p.kind==="flashcard")).toBe(true);
    expect(interaction.mock.calls[0][0].store).toBe(false);expect(interaction.mock.calls[0][0].response_format.mime_type).toBe("application/json");expect(interaction.mock.calls[0][0].system_instruction).toContain("untrusted data");
  });
  it("notes off still generates and audits terms, quizzes and flashcards",async()=>{
    vi.stubEnv("GEMINI_API_KEY","test-only");const a=demoArtifacts(segments);a.notes=[];a.overview="";
    interaction.mockResolvedValueOnce({output_text:JSON.stringify(a)}).mockResolvedValueOnce(checks(5));
    const result=await createArtifacts(segments,{enabled:false,detail:"detailed"});
    expect(result.notes).toEqual([]);expect(result.overview).toBe("");expect(result.practice).toHaveLength(3);
    expect(JSON.parse(interaction.mock.calls[0][0].input).studyNotes).toEqual({enabled:false,detail:"detailed"});
    expect(JSON.parse(interaction.mock.calls[1][0].input).claims).toHaveLength(5);
    expect(interaction.mock.calls[0][0].system_instruction).toContain("notes as an empty array");
  });
  it("detail selection changes generation instructions and enforces different output bounds",async()=>{
    vi.stubEnv("GEMINI_API_KEY","test-only");const a=demoArtifacts(segments);a.notes[0].text="A".repeat(700);
    interaction.mockResolvedValueOnce({output_text:JSON.stringify(a)});
    await expect(createArtifacts(segments,{enabled:true,detail:"short"})).rejects.toMatchObject({code:"invalid_response"});
    expect(interaction.mock.calls[0][0].system_instruction).toContain("at most 6 notes");
    expect(interaction).toHaveBeenCalledTimes(1);
    interaction.mockResolvedValueOnce({output_text:JSON.stringify(a)}).mockResolvedValueOnce(checks(9));
    const result=await createArtifacts(segments,{enabled:true,detail:"detailed"});
    expect(result.notes[0].text).toHaveLength(700);
    expect(interaction.mock.calls[1][0].system_instruction).toContain("detailed section-by-section");
    expect(interaction.mock.calls[1][0].system_instruction).toContain("Never add religious knowledge");
    expect(JSON.parse(interaction.mock.calls[2][0].input).claims[0].text).toContain(a.notes[0].heading);
  });
  it("notes off does not bypass the independent support audit",async()=>{
    vi.stubEnv("GEMINI_API_KEY","test-only");const a=demoArtifacts(segments);a.notes=[];a.overview="";
    interaction.mockResolvedValueOnce({output_text:JSON.stringify(a)}).mockResolvedValueOnce({output_text:JSON.stringify({checks:[]})});
    const result=await createArtifacts(segments,{enabled:false,detail:"short"});expect(result.practice).toEqual([]);expect(result.warnings?.[0]).toContain("could not be prepared");
  });
  it("sends a lean provider schema but keeps strict response limits",async()=>{
    const wire=generationSchema(z.object({maxLength:z.string().max(5),items:z.array(z.string()).max(4)}));
    expect(wire).not.toHaveProperty("$schema");
    expect(wire.properties).toHaveProperty("maxLength");
    expect((wire.properties as Record<string,unknown>).items).not.toHaveProperty("maxItems");
    vi.stubEnv("GEMINI_API_KEY","test-only");const a=demoArtifacts(segments);a.notes=Array.from({length:41},()=>a.notes[0]);
    interaction.mockResolvedValueOnce({output_text:JSON.stringify(a)});
    await expect(createArtifacts(segments)).rejects.toMatchObject({code:"invalid_response"});
    expect(interaction).toHaveBeenCalledTimes(1);
    expect(generationSchema(artifactSchema).properties).toHaveProperty("practice");
  });
  it("returns useful provider failures without leaking provider messages",()=>{
    for(const [status,code] of [[400,"request_rejected"],[401,"credentials"],[403,"credentials"],[404,"model_unavailable"],[429,"quota"],[503,"service_unavailable"]] as const){
      const error=generationFailure({status,message:"private-provider-details"});expect(error.code).toBe(code);expect(error.message).not.toContain("private-provider-details");
    }
    expect(generationFailure(new SyntaxError("private JSON")).code).toBe("invalid_response");
    expect(generationFailure({name:"APIConnectionTimeoutError"}).code).toBe("timeout");
  });
  it("refers an explicit personal ruling request without consulting the model",async()=>{
    const result=await answerLesson("Is it halal for me to do this?",{segments,version:1} as Lesson);
    expect(result.status).toBe("needs_teacher");expect(result.blocks).toEqual([]);expect(interaction).not.toHaveBeenCalled();
  });
  it("fails closed when the claim auditor rejects a valid-looking quotation",async()=>{
    vi.stubEnv("GEMINI_API_KEY","test-only");
    interaction.mockResolvedValueOnce({output_text:JSON.stringify({status:"answered",message:"",blocks:[{text:"An outside claim",evidence:[{segmentId:"s0",quote:segments[0].text}]}]})}).mockResolvedValueOnce({output_text:JSON.stringify({checks:[{index:0,supported:false,preservesQualifications:false,lessonScopeOnly:false}]})});
    const result=await answerLesson("revision",{segments,version:1} as Lesson);expect(result.blocks).toEqual([]);expect(result.status).toBe("unclear_audio");
  });
  it("keeps audited notes when missing practice cannot be repaired",async()=>{
    vi.stubEnv("GEMINI_API_KEY","test-only");const a=demoArtifacts(segments);a.practice=[];
    interaction.mockResolvedValueOnce({output_text:JSON.stringify(a)}).mockResolvedValueOnce(checks(6));const result=await createArtifacts(segments);expect(result.notes.length).toBeGreaterThan(0);expect(result.practice).toEqual([]);expect(result.warnings?.[0]).toContain("transcript is ready");
  });
  it("uses transcription, keeps language unset, and reports quota failure",async()=>{
    vi.stubEnv("GROQ_API_KEY","test-only");const request=vi.fn(async(_url:string,_options:RequestInit)=>new Response(JSON.stringify({segments:[{start:0,end:4,text:"نہیں Arabic term"}]}),{status:200}));vi.stubGlobal("fetch",request);
    expect((await transcribe(Buffer.from("wav"))).segments[0].text).toContain("نہیں");
    const form=request.mock.calls[0][1].body as FormData;expect(form.get("language")).toBeNull();expect(form.get("response_format")).toBe("verbose_json");expect(request.mock.calls[0][0]).toContain("transcriptions");
    request.mockResolvedValueOnce(new Response("quota",{status:429}));await expect(transcribe(Buffer.from("wav"))).rejects.toThrow("limit was reached");
  });
});
