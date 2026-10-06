import { describe, expect, it } from "vitest";
import { demoArtifacts } from "../src/lib/demo";
import { evidenceValid, excerptAnswer, needsPersonalReferral, segmentFlags, validateAnswer, validateArtifacts } from "../src/lib/evidence";
import type { Segment } from "../src/lib/types";
const segments:Segment[]=Array.from({length:8},(_,i)=>({id:`s${i}`,start:i*12,end:(i+1)*12,text:`This teacher explains listening and revision in passage number ${i}.`,flags:[]}));
describe("evidence boundary",()=>{
  it("requires a literal quote, clear segment and valid original time",()=>{
    const evidence=[{segmentId:"s0",quote:segments[0].text}];
    expect(evidenceValid(evidence,segments)).toBe(true);
    expect(evidenceValid([{...evidence[0],quote:"Invented teacher quotation"}],segments)).toBe(false);
    expect(evidenceValid([{...evidence[0],segmentId:"another-lesson"}],segments)).toBe(false);
    expect(evidenceValid(evidence,[{...segments[0],flags:["Unclear"]}])).toBe(false);
    expect(evidenceValid(evidence,[{...segments[0],start:-1}])).toBe(false);
    expect(evidenceValid(evidence,[{...segments[0],end:Infinity}])).toBe(false);
  });
  it("removes unsupported notes and malformed or duplicate practice",()=>{
    const a=demoArtifacts(segments);
    a.overview="Uncited outside claim";
    a.notes.push({...a.notes[0],text:"Unsupported",evidence:[{segmentId:"missing",quote:"Not in this lesson"}]});
    a.practice.push({...a.practice[0]}, {id:"literal-name",kind:"flashcard",question:"What is the term?",answer:"Shahadah",choices:[],evidence:a.terms[0].evidence}, {...a.practice[1],id:"bad-choice",answer:"Not a choice"});
    const valid=validateArtifacts(a,segments);
    expect(valid.notes).toHaveLength(4);expect(valid.practice).toHaveLength(4);
    expect(valid.practice.some(p=>p.id==="literal-name")).toBe(false);
    expect(valid.overview).not.toContain("Uncited");
  });
  it("rejects a generated answer with invalid evidence and sanitizes refusal prose",()=>{
    expect(validateAnswer({status:"answered",message:"Trust me",blocks:[{text:"Claim",evidence:[{segmentId:"wrong",quote:"Made up source quote"}]}]},segments,2).status).toBe("unclear_audio");
    const refused=validateAnswer({status:"not_covered",message:"Invented outside ruling",blocks:[]},segments,2);
    expect(refused.blocks).toEqual([]);expect(refused.message).not.toContain("Invented");
    const partial=validateAnswer({status:"partial",message:"Invented outside ruling",blocks:[{text:"Covered",evidence:[{segmentId:"s0",quote:segments[0].text}]}]},segments,2);
    expect(partial.message).not.toContain("Invented");expect(partial.version).toBe(2);
  });
  it("routes personal requests without rejecting a lesson question about a ruling",()=>{
    expect(needsPersonalReferral("Is it halal for me to do this?")).toBe(true);
    expect(needsPersonalReferral("Where did the teacher explain the ruling?")).toBe(false);
    expect(needsPersonalReferral("Where did the teacher explain a fatwa?")).toBe(false);
    expect(excerptAnswer("fatwa for me",segments,1).status).toBe("needs_teacher");
  });
  it("labels no-key search as excerpts and does not guess when audio is flagged",()=>{
    expect(excerptAnswer("revision",segments,1).mode).toBe("excerpt");
    expect(excerptAnswer("astronomy",segments,1).status).toBe("not_covered");
    expect(excerptAnswer("revision",segments.map(s=>({...s,flags:["Unclear"]})),1).status).toBe("unclear_audio");
    expect(segmentFlags({avg_logprob:-1.5},"Do not change the number 5")).toContain("Meaning-sensitive words: replay this passage");
    expect(segmentFlags({},"Do not change it")).toEqual([]);
  });
});
