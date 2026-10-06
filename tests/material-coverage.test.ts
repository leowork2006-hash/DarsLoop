import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { materialCounts, materialQuotas, materialSections, mergeSectionMaterial, revisionPractice, MATERIAL_GENERATION_REVISION, detailedPrepared } from "../src/lib/material-sections";
import { supportedOverview } from "../src/lib/material-overview";
import type { Artifacts, Lesson, Segment } from "../src/lib/types";
const fixture=vi.hoisted(()=>({interaction:vi.fn(),permit:vi.fn(),release:vi.fn(),active:0,maximum:0,transform:undefined as undefined|((a:any,input:any)=>void),rejectIndex:-1,fail:false}));
vi.mock("@google/genai",()=>({GoogleGenAI:class{interactions={create:fixture.interaction};}}));
vi.mock("../src/lib/generation-admission",()=>({acquireGenerationPermit:(...args:unknown[])=>fixture.permit(...args)}));
const { createArtifacts, POLICY_VERSION }=await import("../src/lib/ai");
const source=(index:number,start=index*180):Segment=>({id:`fictional-${index}`,start,end:start+180,text:`The teacher explained step ${index}: check the original source before drawing a conclusion, and ask for clarification when the explanation is uncertain.`,flags:[]});
function generated(input:any):Artifacts {
  const passages=(input.passages as {id:string;text:string}[]).filter(p=>!input.assignedPassageIds||input.assignedPassageIds.includes(p.id)),quota=input.sectionLimits||{notes:0,terms:0,practice:4};
  const notes=passages.slice(0,quota.notes).map(p=>({heading:`Explanation ${p.id}`,text:p.text,evidence:[{segmentId:p.id,quote:p.text}]}));
  const first=passages[0],evidence=[{segmentId:first.id,quote:first.text}];
  const practice:Artifacts["practice"]=[{id:"same-provider-id",kind:"quiz",question:`What sequence was explained in ${first.id}?`,answer:first.text,choices:[first.text,"Skip checking the source completely."],evidence},{id:"card",kind:"flashcard",question:`How should uncertainty be handled in ${first.id}?`,answer:first.text,choices:[],evidence}];
  return {overview:"",notes,terms:quota.terms?[{term:"clarification",definition:first.text,evidence}]:[],practice:practice.slice(0,quota.practice)};
}
beforeEach(()=>{
  vi.stubEnv("GEMINI_API_KEY","mock-only");fixture.active=0;fixture.maximum=0;fixture.transform=undefined;fixture.rejectIndex=-1;fixture.fail=false;
  fixture.release.mockReset();fixture.permit.mockReset().mockResolvedValue(fixture.release);
  fixture.interaction.mockReset().mockImplementation(async(request:any)=>{
    fixture.active++;fixture.maximum=Math.max(fixture.maximum,fixture.active);
    try{
      await new Promise(resolve=>setTimeout(resolve,1));
      if(fixture.fail)throw new Error("Mocked service unavailable");
      const input=JSON.parse(request.input);
      if(input.claims)return {output_text:JSON.stringify({checks:input.claims.map((_:unknown,index:number)=>({index,supported:index!==fixture.rejectIndex,preservesQualifications:index!==fixture.rejectIndex,lessonScopeOnly:true}))})};
      const material=generated(input.originalTask||input);fixture.transform?.(material,input.originalTask||input);
      return {output_text:JSON.stringify(material)};
    }finally{fixture.active--;}
  });
  vi.spyOn(console,"log").mockImplementation(()=>{});
});
afterEach(()=>{vi.unstubAllEnvs();vi.restoreAllMocks();});

describe("bounded source coverage, fictional text and mocked generation",()=>{
  it("partitions the whole chronology without changing text, IDs, words or flags",()=>{
    const passages=Array.from({length:18},(_,index)=>source(index));passages[7].flags=["unclear"];passages[8].words=[{start:1440,end:1441,text:"captured"}];
    const before=structuredClone(passages),sections=materialSections([...passages].reverse());
    expect(sections).toHaveLength(6);expect(sections.flatMap(s=>s.passages)).toEqual(before);
    expect(sections.flatMap(s=>s.clear).map(s=>s.id)).not.toContain(passages[7].id);
    expect(passages).toEqual(before);expect(sections.at(-1)?.passages.at(-1)?.id).toBe(passages.at(-1)?.id);
  });
  it("bounds character-heavy sources and refuses oversized passages or a tail beyond the job bound",()=>{
    const sources=[source(0),source(1),source(2)].map(s=>({...s,text:"Fictional explanation. ".repeat(500)}));
    expect(materialSections(sources)).toHaveLength(3);
    expect(()=>materialSections([{...source(0),text:"x".repeat(20001)}])).toThrow();
    expect(()=>materialSections(Array.from({length:25},(_,index)=>source(index,index*601)))).toThrow();
    expect(()=>materialSections([source(0),source(0)])).toThrow();
  });
  it("distributes only upper caps through the final section for every detail level",()=>{
    const sections=materialSections(Array.from({length:12},(_,index)=>source(index,index*601)));
    for(const [detail,cap] of [["short",6],["standard",16],["detailed",40]] as const){
      const quotas=materialQuotas(sections,{enabled:true,detail});
      expect(quotas.reduce((n,q)=>n+q.notes,0)).toBe(cap);expect(quotas.reduce((n,q)=>n+q.practice,0)).toBe(40);expect(quotas.reduce((n,q)=>n+q.terms,0)).toBe(30);
      expect(quotas.at(-1)?.notes).toBeGreaterThan(0);expect(quotas.at(-1)?.practice).toBeGreaterThan(0);
    }
    expect(materialQuotas(sections,{enabled:false,detail:"detailed"}).every(q=>q.notes===0)).toBe(true);
  });
  it("prepares a >40-minute fictional source across its beginning, middle and tail, with global caps and at most two calls",async()=>{
    const passages=Array.from({length:18},(_,index)=>source(index));const before=structuredClone(passages);
    const result=await createArtifacts(passages,{enabled:true,detail:"detailed",language:"en"});
    expect(result.notes).toHaveLength(18);expect(result.notes.at(-1)?.evidence[0].segmentId).toBe(passages.at(-1)?.id);
    expect(result.preparation).toEqual({revision:MATERIAL_GENERATION_REVISION,detail:"detailed",totalSections:6,coveredSections:[1,2,3,4,5,6],uncoveredSections:[]});
    expect(result.notes.length).toBeLessThanOrEqual(40);expect(result.terms.length).toBeLessThanOrEqual(30);expect(result.practice.length).toBeLessThanOrEqual(40);expect(new Set(result.practice.map(p=>p.id)).size).toBe(result.practice.length);
    expect(passages).toEqual(before);expect(fixture.maximum).toBeLessThanOrEqual(2);expect(fixture.interaction).toHaveBeenCalledTimes(12);expect(fixture.permit).toHaveBeenCalledTimes(12);expect(fixture.release).toHaveBeenCalledTimes(12);expect(fixture.permit.mock.calls.every(call=>call[1]==="queued")).toBe(true);
    for(const [request] of fixture.interaction.mock.calls){expect(request.system_instruction).toContain("conditions");if(!JSON.parse(request.input).claims)expect(request.system_instruction).toContain("never targets or minimums");}
    expect(POLICY_VERSION).toBe("teacher-fidelity-v8");
  });
  it("records proposed/evidence/language/audit counts separately without source content in logs",async()=>{
    const passages=[source(0),source(1),source(2)];
    fixture.transform=(a)=>{a.notes.push({...a.notes[0],heading:"Unsupported",evidence:[{segmentId:"absent",quote:"This quotation never appears in the source."}]});a.notes[2]={...a.notes[2],heading:"شرح",text:"شرح باللغة العربية"};};fixture.rejectIndex=1;
    const result=await createArtifacts(passages,{enabled:true,detail:"detailed",language:"en"});expect(result.notes).toHaveLength(1);
    const logs=vi.mocked(console.log).mock.calls.map(call=>JSON.parse(String(call[0]))),section=logs.find(log=>log.event==="material-section-audit"),aggregate=logs.find(log=>log.event==="material-coverage");
    expect(section.proposed.notes).toBe(4);expect(section.evidenceValid.notes).toBe(3);expect(section.languageValid.notes).toBe(2);expect(section.independentAuditValid.notes).toBe(1);expect(aggregate.proposed.notes).toBe(4);
    const serialized=JSON.stringify(logs);expect(serialized).not.toContain(passages[0].text);expect(serialized).not.toContain(passages[0].id);expect(serialized).not.toContain("quotation");expect(serialized).not.toContain("mock-only");
  });
  it("excludes fully flagged sections, reports uncovered chronology and never fills it with made-up notes",async()=>{
    const first=source(0),flagged={...source(1,700),flags:["unclear"]},last=source(2,1400);
    const result=await createArtifacts([first,flagged,last],{enabled:true,detail:"detailed"});
    expect(result.preparation?.coveredSections).toEqual([1,3]);expect(result.preparation?.uncoveredSections).toEqual([2]);expect(result.warnings?.join(" ")).toContain("not covered");
    for(const [request] of fixture.interaction.mock.calls)expect(JSON.parse(request.input).passages.map((p:any)=>p.id)).not.toContain(flagged.id);
    const log=vi.mocked(console.log).mock.calls.map(call=>JSON.parse(String(call[0]))).find(log=>log.event==="material-section-audit"&&log.section===2);expect(log.flaggedPassages).toBe(1);expect(log.proposed.notes).toBe(0);
  });
  it("keeps practice-only coverage diagnostics without warning about disabled notes",async()=>{
    const first=source(0),flagged={...source(1,700),flags:["unclear"]},last=source(2,1400);
    const result=await createArtifacts([first,flagged,last],{enabled:false,detail:"detailed"});
    expect(result.notes).toEqual([]);expect(result.practice.length).toBeGreaterThan(0);
    expect(result.preparation?.coveredSections).toEqual([1,3]);expect(result.preparation?.uncoveredSections).toEqual([2]);
    expect(result.warnings?.some(warning=>warning.includes("prepared notes"))??false).toBe(false);
    for(const [request] of fixture.interaction.mock.calls)expect(JSON.parse(request.input).passages.map((p:any)=>p.id)).not.toContain(flagged.id);
  });
  it("supplies neighboring qualifications to generation and audit, while withholding neighbor-only claims",async()=>{
    const first={...source(0),text:"The teacher demonstrated a faster revision method."},condition={...source(1,700),text:"Use this method only after checking the original passage; otherwise return to the full explanation."};
    fixture.transform=(a,input)=>{
      if(input.task!=="Make automatic study material")return;
      const neighbor=input.passages.find((p:any)=>!input.assignedPassageIds.includes(p.id));
      a.notes[0].text+=` ${neighbor.text}`;a.notes[0].evidence.push({segmentId:neighbor.id,quote:neighbor.text});
      a.notes.push({heading:"Neighbor-only output",text:neighbor.text,evidence:[{segmentId:neighbor.id,quote:neighbor.text}]});
    };
    const result=await createArtifacts([first,condition],{enabled:true,detail:"detailed"});
    expect(result.notes).toHaveLength(2);expect(result.notes.every(n=>n.evidence.length===2)).toBe(true);expect(result.notes.some(n=>n.heading==="Neighbor-only output")).toBe(false);
    for(const [request] of fixture.interaction.mock.calls)expect(JSON.parse(request.input).passages.map((p:any)=>p.text)).toContain(condition.text);
  });
  it("admits and releases the structural-repair request separately before the independent audit",async()=>{
    fixture.interaction.mockImplementationOnce(async()=>({output_text:"{"}));
    const result=await createArtifacts([source(0)],{enabled:true,detail:"detailed"});expect(result.notes).toHaveLength(1);
    expect(fixture.interaction).toHaveBeenCalledTimes(3);expect(fixture.permit).toHaveBeenCalledTimes(3);expect(fixture.release).toHaveBeenCalledTimes(3);expect(fixture.permit.mock.calls.every(call=>call[1]==="queued")).toBe(true);
  });
  it("keeps full Detailed explanations when the three-note overview would exceed1500 characters",async()=>{
    const text=(index:number)=>`Fictional point ${index}: `+"Keep the original qualification. ".repeat(28);
    const passages=[0,1,2].map(index=>({...source(index),text:text(index)}));
    fixture.transform=(a)=>{a.terms.forEach((term:Artifacts["terms"][number])=>{term.definition="Keep the original qualification.";});a.practice.forEach((item:Artifacts["practice"][number])=>{item.answer="Keep the original qualification.";if(item.kind==="quiz")item.choices=[item.answer,"Ignore qualifications."];});};
    const result=await createArtifacts(passages,{enabled:true,detail:"detailed"});
    expect(result.notes.map(n=>n.text)).toEqual(passages.map(p=>p.text));expect(result.overview.length).toBeLessThanOrEqual(1500);expect(result.overview).toBe(passages[0].text);
    const oversized="Fictional explanation. ".repeat(80);expect(supportedOverview([{text:oversized}])).toBe("");
  });
  it("runs at most one missing-practice repair for a whole long job and keeps audited notes if it fails",async()=>{
    fixture.transform=(a,input)=>{if(input.task==="Repair missing supported practice")throw new Error("Mocked repair unavailable");a.practice=a.practice.filter((p:Artifacts["practice"][number])=>p.kind==="flashcard");};
    const result=await createArtifacts(Array.from({length:12},(_,index)=>source(index)),{enabled:true,detail:"detailed"});
    const repairs=fixture.interaction.mock.calls.filter(([request])=>JSON.parse(request.input).task==="Repair missing supported practice");expect(repairs).toHaveLength(1);expect(JSON.parse(repairs[0][0].input).passages.length).toBeLessThanOrEqual(7);expect(result.notes).toHaveLength(12);expect(result.warnings?.join(" ")).toContain("quiz questions");
    expect(fixture.release).toHaveBeenCalledTimes(fixture.interaction.mock.calls.length);
  });
  it("fails without a partial replacement when a section provider fails and releases permits",async()=>{
    fixture.fail=true;await expect(createArtifacts([source(0),source(1,700)],{enabled:true,detail:"detailed"})).rejects.toMatchObject({code:"generation_failed"});
    expect(fixture.release).toHaveBeenCalledTimes(2);expect(fixture.maximum).toBeLessThanOrEqual(2);
  });
  it("merges exact repetitions with literal evidence and separates each committed material revision",()=>{
    const a=generated({passages:[{id:"first",text:source(0).text}],sectionLimits:{notes:1,terms:1,practice:2}}),b=structuredClone(a);b.notes[0].evidence[0].segmentId="tail";
    const merged=mergeSectionMaterial([a,b]);expect(materialCounts(merged)).toEqual({notes:1,terms:1,quizzes:1,cards:1});expect(merged.notes[0].evidence.map(c=>c.segmentId)).toEqual(["first","tail"]);expect(a.notes[0].evidence).toHaveLength(1);
    expect(revisionPractice(merged,1).practice[0].id).not.toBe(revisionPractice(merged,2).practice[0].id);
    const lesson={artifacts:{...merged,preparation:{revision:MATERIAL_GENERATION_REVISION,detail:"detailed",totalSections:1,coveredSections:[1],uncoveredSections:[]}},noteOptions:{enabled:false,detail:"detailed"}} as unknown as Lesson;
    expect(detailedPrepared(lesson)).toBe(false);lesson.noteOptions!.enabled=true;expect(detailedPrepared(lesson)).toBe(true);
  });
});
