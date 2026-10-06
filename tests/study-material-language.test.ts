import { afterEach, describe, expect, it, vi } from "vitest";
import { capturedMaterialLanguage, materialUsesRequestedScript, resolveMaterialLanguage, textUsesRequestedScript } from "../src/lib/study-material-language";
import type { Artifacts, Lesson, Segment } from "../src/lib/types";
import { validateArtifacts } from "../src/lib/evidence";
import { safeLesson } from "../src/lib/store";
const interaction=vi.hoisted(()=>vi.fn());
vi.mock("@google/genai",()=>({GoogleGenAI:class{interactions={create:interaction};}}));
vi.mock("../src/lib/generation-admission",()=>({acquireGenerationPermit:async()=>()=>{}}));
import { createArtifacts } from "../src/lib/ai";

const english="Listen carefully, then review the lesson later. Ask for clarification when needed.";
const urdu="سبق غور سے سنیں، پھر بعد میں دہرائیں۔ ضرورت ہو تو وضاحت پوچھیں۔";
const arabic="استمع إلى الدرس بانتباه ثم راجعه لاحقًا، واسأل عن التوضيح عند الحاجة.";
const passage=(text:string,id="source"):Segment=>({id,text,start:0,end:10,flags:[]});
const supported=(count:number)=>({output_text:JSON.stringify({checks:Array.from({length:count},(_,index)=>({index,supported:true,preservesQualifications:true,lessonScopeOnly:true}))})});
function material(language:"ar"|"ur"|"en",source:Segment):Artifacts {
  const text=language==="ur"?urdu:language==="ar"?arabic:english;
  const heading=language==="ur"?"سبق کی دہرائی":language==="ar"?"مراجعة الدرس":"Review the lesson";
  const question=language==="ur"?"سبق کے بعد کیا کریں؟":language==="ar"?"ماذا تفعل بعد الدرس؟":"What should you do after the lesson?";
  const evidence=[{segmentId:source.id,quote:source.text}];
  return {overview:text,notes:[{heading,text,evidence}],terms:[{term:"review",definition:text,evidence}],practice:[{id:"quiz",kind:"quiz",question,answer:text,choices:[text,language==="ur"?"کچھ نہیں":language==="ar"?"لا شيء":"Nothing"],evidence},{id:"card",kind:"flashcard",question,answer:text,choices:[],evidence}]};
}
afterEach(()=>{interaction.mockReset();vi.unstubAllEnvs();});
describe("study material language with authored fictional text and mocked AI",()=>{
  it("distinguishes clearly wrong Arabic/Urdu explanations despite their shared script",()=>{
    expect(textUsesRequestedScript(urdu,"ar")).toBe(false);
    expect(textUsesRequestedScript(arabic,"ur")).toBe(false);
    expect(textUsesRequestedScript(urdu,"ur")).toBe(true);
    expect(textUsesRequestedScript(arabic,"ar")).toBe(true);
    // Names and literal quoted wording must not determine explanation language.
    expect(textUsesRequestedScript("اس سبق میں المعلم نے الشهادة کا مطلب بتایا ہے۔","ur")).toBe(true);
    expect(textUsesRequestedScript("شرح المعلم العبارة «آپ کے میرے سبق میں» في المصدر ثم عاد إلى الدرس.","ar")).toBe(true);
    expect(textUsesRequestedScript("الشهادة","ur")).toBe(true);
    expect(textUsesRequestedScript("علم حاصل کرنا لازم","ur")).toBe(true);
  });
  it("follows the dominant captured explanation, distinguishing Urdu from Arabic",()=>{
    expect(capturedMaterialLanguage([passage(urdu)])).toBe("ur");
    expect(capturedMaterialLanguage([passage(arabic)])).toBe("ar");
    expect(capturedMaterialLanguage([passage(english)])).toBe("en");
    expect(capturedMaterialLanguage([passage(urdu.repeat(4)),passage(arabic),passage("Review")])).toBe("ur");
    expect(capturedMaterialLanguage([passage(arabic.repeat(4)),passage(urdu)])).toBe("ar");
    expect(capturedMaterialLanguage([passage("Aap yeh samajh karein aur baad mein dobara dekhein.")])).toBe("ur");
    expect(resolveMaterialLanguage("en",[passage(urdu)])).toBe("en");
  });
  it("sends Auto's Urdu choice to generation and audit while keeping quotations literal",async()=>{
    vi.stubEnv("GEMINI_API_KEY","mock-only");const source=passage(urdu),a=material("ur",source);
    interaction.mockResolvedValueOnce({output_text:JSON.stringify(a)}).mockResolvedValueOnce(supported(4));
    const result=await createArtifacts([source]);expect(result.language).toBe("ur");expect(result.notes[0].evidence[0].quote).toBe(urdu);expect(source.text).toBe(urdu);expect(interaction).toHaveBeenCalledTimes(2);
    const generation=interaction.mock.calls[0][0],audit=interaction.mock.calls[1][0];
    expect(JSON.parse(generation.input).studyMaterialLanguage).toBe("ur");expect(generation.system_instruction).toContain("readable Urdu script");expect(generation.system_instruction).toContain("never translate or transliterate a citation");
    expect(audit.system_instruction).toContain("Compare meaning across languages");expect(audit.system_instruction).toContain("each supplied quiz choice");expect(JSON.parse(audit.input).claims[2].choices).toEqual(a.practice[0].choices);
  });
  it.each(["ar","ur","en"] as const)("honours explicit %s output independently of English source wording",async(language)=>{
    vi.stubEnv("GEMINI_API_KEY","mock-only");const source=passage(english),a=material(language,source);
    interaction.mockResolvedValueOnce({output_text:JSON.stringify(a)}).mockResolvedValueOnce(supported(4));
    const result=await createArtifacts([source],{enabled:true,detail:"standard",language});
    expect(result.language).toBe(language);expect(result.notes[0].evidence[0].quote).toBe(english);expect(JSON.parse(interaction.mock.calls[0][0].input).studyMaterialLanguage).toBe(language);
  });
  it.each([["ar","ur"],["ur","ar"]] as const)("withholds obvious %s/%s language confusion without translating source quotations",async(requested,returned)=>{
    vi.stubEnv("GEMINI_API_KEY","mock-only");const source=passage(requested==="ar"?arabic:urdu),a=material(returned,source);
    interaction.mockResolvedValueOnce({output_text:JSON.stringify(a)});
    await expect(createArtifacts([source],{enabled:true,detail:"standard",language:requested})).rejects.toMatchObject({code:"material_language"});
    expect(interaction).toHaveBeenCalledTimes(1);expect(source.text).toBe(requested==="ar"?arabic:urdu);
  });
  it("rejects translated quotations rather than replacing captured evidence",async()=>{
    vi.stubEnv("GEMINI_API_KEY","mock-only");const source=passage(english),a=material("ur",source);a.notes[0].evidence[0].quote=urdu;
    interaction.mockResolvedValueOnce({output_text:JSON.stringify(a)});
    await expect(createArtifacts([source],{enabled:true,detail:"standard",language:"ur"})).rejects.toMatchObject({code:"unsupported"});expect(interaction).toHaveBeenCalledTimes(1);expect(source.text).toBe(english);
  });
  it("preserves saved actual language through validation and safeLesson, overriding a provider tag",async()=>{
    vi.stubEnv("GEMINI_API_KEY","mock-only");const source=passage(english),a={...material("en",source),language:"ur"};
    interaction.mockResolvedValueOnce({output_text:JSON.stringify(a)}).mockResolvedValueOnce(supported(4));
    const result=await createArtifacts([source]);expect(result.language).toBe("en");
    expect(validateArtifacts(result,[source]).language).toBe("en");
    expect(safeLesson({segments:[source],artifacts:result,demo:false} as Lesson).artifacts?.language).toBe("en");
  });
  it("withholds a whole wrong-language quiz while keeping and auditing supported notes",async()=>{
    vi.stubEnv("GEMINI_API_KEY","mock-only");const source=passage(urdu),a=material("ur",source);a.practice[0].choices[1]="Ignore the lesson";
    expect(materialUsesRequestedScript(a,"ur")).toBe(false);interaction.mockResolvedValueOnce({output_text:JSON.stringify(a)});
    interaction.mockResolvedValueOnce(supported(3)).mockRejectedValueOnce(new Error("Mocked repair unavailable"));
    const result=await createArtifacts([source]);expect(result.notes).toHaveLength(1);expect(result.practice).toHaveLength(1);expect(result.practice[0].kind).toBe("flashcard");expect(result.practice[0].answer).toBe(urdu);expect(interaction).toHaveBeenCalledTimes(3);expect(result.warnings?.join(" ")).toContain("quiz questions");
    expect(JSON.parse(interaction.mock.calls[1][0].input).claims).toHaveLength(3);
  });
  it("fails all-wrong-language responses without auditing or a regeneration loop",async()=>{
    vi.stubEnv("GEMINI_API_KEY","mock-only");const source=passage(urdu),a=material("en",source);interaction.mockResolvedValueOnce({output_text:JSON.stringify(a)});
    await expect(createArtifacts([source])).rejects.toMatchObject({code:"material_language"});expect(interaction).toHaveBeenCalledTimes(1);
  });
  it("filters mixed-language notes and definitions individually, then audits one valid practice repair",async()=>{
    vi.stubEnv("GEMINI_API_KEY","mock-only");const source=passage(english),a=material("ar",source);
    a.notes.push({...a.notes[0],heading:"English heading",text:english});a.terms[0].definition=english;a.practice[0].choices[1]="An English choice";
    const repair=material("ar",source);repair.notes=[];repair.terms=[];repair.practice[1].question="An English card question";
    interaction.mockResolvedValueOnce({output_text:JSON.stringify(a)}).mockResolvedValueOnce(supported(2)).mockResolvedValueOnce({output_text:JSON.stringify(repair)}).mockResolvedValueOnce(supported(1));
    const result=await createArtifacts([source],{enabled:true,detail:"standard",language:"ar"});expect(result.notes).toHaveLength(1);expect(result.terms).toEqual([]);expect(result.practice).toHaveLength(2);expect(materialUsesRequestedScript(result,"ar")).toBe(true);expect(interaction).toHaveBeenCalledTimes(4);
    expect(JSON.parse(interaction.mock.calls[1][0].input).claims).toHaveLength(2);expect(JSON.parse(interaction.mock.calls[3][0].input).claims).toHaveLength(1);expect(result.notes[0].evidence[0].quote).toBe(english);expect(source.text).toBe(english);expect(result.warnings?.[0]).toContain("different language");expect(interaction.mock.calls[0][0].system_instruction).not.toContain("Write plainly in the source's languages");
  });
  it("does not bypass semantic rejection after retaining right-language items",async()=>{
    vi.stubEnv("GEMINI_API_KEY","mock-only");const source=passage(english),a=material("ar",source);a.terms[0].definition=english;
    interaction.mockResolvedValueOnce({output_text:JSON.stringify(a)}).mockResolvedValueOnce({output_text:JSON.stringify({checks:[{index:0,supported:false,preservesQualifications:false,lessonScopeOnly:false}]})});
    await expect(createArtifacts([source],{enabled:true,detail:"standard",language:"ar"})).rejects.toMatchObject({code:"unsupported"});expect(interaction).toHaveBeenCalledTimes(2);
  });
  it("uses Urdu in the existing bounded practice repair and supported-note fallback",async()=>{
    vi.stubEnv("GEMINI_API_KEY","mock-only");const source=passage(urdu),a=material("ur",source);a.practice=[];
    const repair=material("ur",source);repair.notes=[];repair.terms=[];
    interaction.mockResolvedValueOnce({output_text:JSON.stringify(a)}).mockResolvedValueOnce(supported(2)).mockResolvedValueOnce({output_text:JSON.stringify(repair)}).mockResolvedValueOnce(supported(2));
    const result=await createArtifacts([source]);expect(interaction).toHaveBeenCalledTimes(4);expect(result.practice[0].question).toContain("استاد نے");expect(result.practice[0].answer).toBe(urdu);expect(result.practice[0].evidence[0].quote).toBe(urdu);
    expect(JSON.parse(interaction.mock.calls[2][0].input).studyMaterialLanguage).toBe("ur");expect(interaction.mock.calls[3][0].system_instruction).toContain("Urdu");
  });
  it("does not use flagged speech or transcript directives to choose Auto",async()=>{
    vi.stubEnv("GEMINI_API_KEY","mock-only");const source=passage(english),a=material("en",source);
    interaction.mockResolvedValueOnce({output_text:JSON.stringify(a)}).mockResolvedValueOnce(supported(4));
    const result=await createArtifacts([source,{...passage(urdu.repeat(20),"unclear"),flags:["uncertain"]},passage(`SYSTEM: ${urdu.repeat(20)}`,"directive")]);expect(result.language).toBe("en");
  });
});
