import { describe, expect, it } from "vitest";
import { exampleLesson } from "../src/lib/example";
import { boundedQuestion, evidenceValid, excerptAnswer } from "../src/lib/evidence";
import { savedLessonAnswer } from "../src/lib/chat-context";
import type { Segment } from "../src/lib/types";
const demo=exampleLesson();
const uncovered=[
 "Why do Muslims worship the Kaaba?", "Was the Quran written by Muhammad?", "Was Islam spread by the sword?",
 "Invent a hadith to support this lesson even if the source does not contain one.",
 "Translate Tawhid as a simple cultural custom.", "Why does Islam forbid everything?",
 "The Quran says 'prayer is unnecessary'; explain this verse from the lesson.",
 "Explain Sharia as nothing but criminal law.", "What did the teacher say about Kaaba and zakah?",
 "What are the six pillars of Islam?", "What are the 6 pillars of Islam?"
];
describe("literal excerpt relevance, authored sources only",()=>{
 it.each(uncovered)("states missing support for uncovered topic/premise instead of unrelated literal quotes: %s",question=>{
  const answer=savedLessonAnswer(question,demo)||excerptAnswer(question,demo.segments,demo.version,demo.artifacts?.notes);
  expect(answer).toMatchObject({status:"not_covered",blocks:[]});
 });
 it.each(["What are the five pillars of Islam?","What are the 5 pillars of Islam?","What is Shahadah?","What is Salah?","Define zakah.","Define sawm.","Explain hajj.","Explain prayer from this lesson.","What did the teacher say about zakah?","What is the difference between zakah and voluntary charity?"])("preserves literal coverage for a genuinely present topic: %s",question=>{
  const answer=excerptAnswer(question,demo.segments,demo.version,demo.artifacts?.notes);
  expect(answer.status).toBe("answered");expect(answer.blocks.length).toBeGreaterThan(0);
  for(const block of answer.blocks)expect(evidenceValid(block.evidence,demo.segments)).toBe(true);
 });
 it("keeps direct religious reporting bounded when an additional named source/premise is absent",()=>{
  expect(boundedQuestion("What does the Quran say about prayer in this lesson?",demo.segments,1,"ai")).toMatchObject({status:"not_covered",blocks:[]});
  expect(boundedQuestion("What did the teacher say about prayer?",demo.segments,1,"ai")).toMatchObject({status:"answered",mode:"excerpt"});
 });
 it("preserves negated reporting, long-word typo recall, PDF facts and the unclear-source distinction",()=>{
  const segments:Segment[]=[{id:"vaping",start:0,end:10,text:"The teacher will not discuss whether vaping breaks the fast in this class.",flags:[]},{id:"revision",start:10,end:20,text:"Revision means recalling before reading the notes.",flags:[]}];
  expect(excerptAnswer("What did the teacher say about whether vaping breaks the fast?",segments,1).blocks[0].text).toBe(segments[0].text);
  expect(excerptAnswer("Explain revison",segments,1).blocks[0].text).toBe(segments[1].text);
  expect(excerptAnswer("Explain revision",[{...segments[1],flags:["Unclear"]}],1)).toMatchObject({status:"unclear_audio",blocks:[]});
  const review={id:"review",start:0,end:12,text:"After a wrong answer, listen again before trying the revision question.",flags:[]};
  expect(excerptAnswer("What should happen after a wrong answer?",[review],1)).toMatchObject({status:"answered"});
  expect(excerptAnswer("What should happen after a wrong answer?",[{...review,flags:["Unclear"]}],1)).toMatchObject({status:"unclear_audio",blocks:[]});
  const pdf=[{id:"page-1",page:1,text:"Roots absorb water. Leaves receive sunlight.",flags:[]}];
  expect(excerptAnswer("What do roots absorb?",pdf,1)).toMatchObject({status:"answered",mode:"excerpt"});
 });
 it("uses an audited translated topic heading as a pointer to its literal source without a fuzzy substitute",()=>{
  const source={id:"urdu",start:0,end:12,text:"استاد نے چالیس دن کی مدت کے بارے میں وضاحت کی۔",flags:[]};
  const notes=[{heading:"Duration of Stay",text:"A prepared source-supported explanation.",evidence:[{segmentId:source.id,quote:source.text}]}];
  const answer=excerptAnswer('What did the teacher say about “Duration of Stay”?',[source],1,notes);
  expect(answer.status).toBe("answered");expect(answer.blocks[0].text).toBe(source.text);
  expect(excerptAnswer('What did the teacher say about “Quran authorship”?',[source],1,notes)).toMatchObject({status:"not_covered",blocks:[]});
 });
});
