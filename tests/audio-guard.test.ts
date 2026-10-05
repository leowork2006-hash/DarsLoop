import { describe, expect, it } from "vitest";
import { compareTranscriptions } from "../src/lib/audio-guard";
import { safePractice } from "../src/lib/evidence";
import type { Segment, Artifacts } from "../src/lib/types";
const passage=(text:string):Segment=>({id:"p",start:20,end:25,text,flags:[]});
const second=(text:string)=>[{start:0,end:5,text}];
describe("audio disagreement boundary",()=>{
  it("flags changed negation, numbers and named terms while preserving original text",()=>{
    for(const [original,other] of [["Do not apply it here.","Do apply it here."],["There are 5 parts.","There are 6 parts."],["The Arabic word adab is explained.","The Arabic word adapt is explained."]]){
      const checked=compareTranscriptions([passage(original)],second(other),20)[0];
      expect(checked.text).toBe(original);expect(checked.flags).toHaveLength(1);
    }
  });
  it("does not treat agreement as proof of correctness",()=>{
    const wrong="The Arabic word adapt is explained.";
    expect(compareTranscriptions([passage(wrong)],second(wrong),20)[0].flags).toEqual([]);
  });
  it("retains existing uncertainty and uses original chunk offsets",()=>{
    const p={...passage("Do not apply it."),flags:["Low confidence"]};
    expect(compareTranscriptions([p],second("Do not apply it."),20)[0].flags).toEqual(["Low confidence"]);
    expect(compareTranscriptions([p],second("Do apply it."),20)[0].flags).toHaveLength(2);
  });
  it("keeps concept practice while withholding unreviewed literal term spellings",()=>{
    const base={id:"a",kind:"flashcard" as const,question:"What helps revision?",answer:"Return to the explanation.",choices:[],evidence:[]};
    const a:Artifacts={overview:"",notes:[],terms:[{term:"adapt",definition:"As transcribed",evidence:[]}],practice:[base,{...base,id:"b",question:"What is the word adapt?"}]};
    expect(safePractice(a).map(p=>p.id)).toEqual(["a"]);
  });
});
