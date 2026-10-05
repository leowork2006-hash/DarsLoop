import { z } from "zod";
import type { Answer, Artifacts, Citation, Segment, StudyNoteOptions } from "./types";
import { resolveNoteOptions } from "./note-options";
const citation=z.object({segmentId:z.string().max(100),quote:z.string().min(1).max(5000)});
const citations=z.array(citation).min(1).max(6);
const supported=z.object({heading:z.string().min(1).max(160),text:z.string().min(1).max(1800),evidence:citations});
export const artifactSchema=z.object({overview:z.string().max(1500),notes:z.array(supported).max(40),terms:z.array(z.object({term:z.string().max(100),definition:z.string().max(600),evidence:citations})).max(30),practice:z.array(z.object({id:z.string().min(1).max(100),kind:z.enum(["quiz","flashcard"]),question:z.string().min(1).max(600),answer:z.string().min(1).max(1200),choices:z.array(z.string().max(600)).max(4),evidence:citations})).max(40)});
export const answerSchema=z.object({status:z.enum(["answered","partial","not_covered","unclear_audio","needs_teacher"]),blocks:z.array(z.object({text:z.string().min(1).max(1800),evidence:citations})).max(6),message:z.string().max(800)});
export function evidenceValid(evidence:Citation[],segments:Segment[]) {
  return evidence.length>0&&evidence.every(c=>{
    const s=segments.find(s=>s.id===c.segmentId);
    return !!s&&!s.flags.length&&!instructionLike(s.text)&&c.quote.trim().length>=12&&s.text.includes(c.quote)&&Number.isFinite(s.start)&&Number.isFinite(s.end)&&s.start>=0&&s.end>s.start;
  });
}
export function safePractice(artifacts:Artifacts) {
  // A concept can mention a term without testing its spelling. Withhold literal
  // name/word questions and answers whose entire content is an unchecked term.
  const terms=artifacts.terms.map(t=>normalise(t.term).trim()).filter(Boolean);
  return artifacts.practice.filter(p=>{
    const answer=normalise(p.answer).trim();
    if(terms.includes(answer))return false;
    const literal=/\b(?:spell(?:ing)?|what is (?:the |this )?(?:word|term|name)|which (?:word|term|name)|what (?:word|term|name)|(?:use|define|explain) (?:the |this )?(?:word|term)|name the term)\b|ہجے|کون سا لفظ|لفظ کیا|تهجئة|ما (?:هو )?(?:اللفظ|المصطلح)/iu.test(p.question);
    return !literal;
  });
}
export function validateArtifacts(input:unknown,segments:Segment[],options?:StudyNoteOptions):Artifacts {
  const a=artifactSchema.parse(input);
  const noteOptions=resolveNoteOptions(options);
  const notes=noteOptions.enabled?a.notes.filter(n=>evidenceValid(n.evidence,segments)):[];
  const terms=a.terms.filter(t=>evidenceValid(t.evidence,segments));
  const ids=new Set<string>();
  const practice=a.practice.filter(p=>{
    if(ids.has(p.id)||!evidenceValid(p.evidence,segments))return false;ids.add(p.id);
    if(p.kind==="quiz")return p.choices.length>=2&&new Set(p.choices).size===p.choices.length&&p.choices.includes(p.answer);
    return p.choices.length===0;
  });
  if(noteOptions.enabled&&!notes.length)throw new Error("No supported notes were returned. The transcript is still available.");
  // Overview must be derived from validated notes rather than an uncited model paragraph.
  return {...a,overview:notes.slice(0,3).map(n=>n.text).join(" "),notes,terms,practice:safePractice({...a,notes,terms,practice})};
}
export function validateAnswer(input:unknown,segments:Segment[],version:number):Answer {
  const a=answerSchema.parse(input);
  const blocks=a.blocks.filter(b=>evidenceValid(b.evidence,segments));
  if(a.status==="answered"||a.status==="partial"){
    if(blocks.length!==a.blocks.length||!blocks.length)return {status:"unclear_audio",blocks:[],message:"I couldn’t support that answer with clear passages from this lesson. Try the transcript or ask your teacher.",mode:"ai",version};
    return {...a,blocks,message:a.status==="partial"?"This lesson supports only the passages shown. Ask your teacher about anything further.":"Answered from this lesson",mode:"ai",version};
  }
  // Free-form model refusal explanations could themselves contain outside guidance.
  const messages={not_covered:"That isn’t covered in this lesson. You can ask your teacher for more information.",unclear_audio:"The relevant audio is unclear. Replay the passage or ask your teacher.",needs_teacher:"For religious interpretation or advice about your own situation, please ask a qualified teacher."};
  return {status:a.status,blocks:[],message:messages[a.status],mode:"ai",version};
}
export function normalise(text:string){return text.normalize("NFKC").toLowerCase().replace(/[\u064B-\u065F\u0670]/g,"").replace(/[أإآ]/g,"ا").replace(/ى/g,"ي").replace(/[^\p{L}\p{N}\s]/gu," ");}
const stops=new Set("the a an is of to for in on what where did does do teacher lesson this that how can i you explain please my me with and about said tell from it was we are should class".split(" "));
export function tokens(text:string){return [...new Set(normalise(text).split(/\s+/).filter(t=>t.length>1&&!stops.has(t)))];}
/** Conservative routing aid, not a complete injection detector. Keep source audio/text intact. */
export function instructionLike(text:string) {
  const t=text.normalize("NFKC").replace(/\s+/g," ");
  return /\b(?:ignore|disregard|override|bypass)\b.{0,60}\b(?:instructions?|rules?|polic(?:y|ies)|system|developer)\b/i.test(t)
    || /\b(?:repeat|print|show|output|display|reveal|dump|recite)\s+(?:(?:me|us|out|all|your|the|system|developer|hidden|internal|secret)\s+)*(?:prompt|instructions?|credentials?|api\s*keys?)\b/i.test(t)
    || /\bwhat (?:are|is) (?:your|the system|the developer) (?:instructions?|prompt)\b/i.test(t)
    || /(?:^|\n)\s*(?:\[|<\|)?(?:system|developer|assistant)(?:\]|\|>)?\s*:/im.test(text)
    || /\byou are now (?:a |an |the )?(?:mufti|system|developer|unrestricted|administrator)\b/i.test(t)
    || /(?:تجاهل|تجاوز).{0,30}(?:التعليمات|القواعد)|(?:ہدایات|قواعد).{0,30}(?:نظر انداز|بھول)|(?:سسٹم پرامپٹ|اپنی ہدایات).{0,30}(?:دکھاؤ|بتاؤ)/u.test(t);
}
const religiousTopic=/\b(?:halal|haram|fatwa|rulings?|permissible|permitted|allowed|fast(?:ing)?|w[ou]d[uh]u?|ablution|prayers?|pray(?:ing)?|marriage|divorce)\b|حلال|حرام|فتوى|فتوی|وضوء|وضو|صلاة|نماز|صيام|روزہ/iu;
export function retrieve(question:string,segments:Segment[],limit=8):Segment[] {
  segments=segments.filter(s=>!instructionLike(s.text));
  const q=tokens(question);if(!q.length)return [];
  const ranked=segments.map((s,i)=>({i,score:tokens(s.text).reduce((n,t)=>n+(q.includes(t)?1:0),0)})).filter(r=>r.score>0).sort((a,b)=>b.score-a.score).slice(0,3);
  const selected=new Set<number>();ranked.forEach(r=>{for(let i=Math.max(0,r.i-1);i<=Math.min(segments.length-1,r.i+1);i++)selected.add(i);});
  return [...selected].sort((a,b)=>a-b).slice(0,limit).map(i=>segments[i]);
}
export function needsPersonalReferral(question:string) {
  return /\b((give|issue) (me |a )?fatwa|fatwa for (me|my)|is it (halal|haram) for me|am i (allowed|permitted)|what should i do about my|should i (divorce|marry)|(is )?my (divorce|marriage|prayer|fast) (is )?(valid|invalid)|(?:can|may|should) i (?:pray|fast|marry|divorce)|(?:do|must) i (?:need |have to )?(?:make |do )?(?:w[ou]d[uh]u?|ablution))\b/i.test(question)||/أفتني|افتني|فتوى لي|میرے لیے فتوی|میری نماز درست|کیا میری طلاق|کیا میں.{0,30}نماز/.test(question);
}
export function boundedQuestion(question:string,segments:Segment[],version:number,mode:Answer["mode"]):Answer|null {
  if(instructionLike(question))return {status:"not_covered",blocks:[],message:"I can only help with this lesson. Instructions in a question cannot change that.",mode,version};
  const religious=religiousTopic.test(question);
  const authenticity=/(?:\b(?:hadith|hadeeth|narration|isnad|matn)\b|حديث|حدیث)/iu.test(question)&&/(?:\b(?:authentic(?:ity)?|grad(?:e|ing)|sahih|saheeh|hasan|hassan|weak|daif|fabricated|reliable|true|isnad|matn)\b|صحيح|صحیح|حسن|ضعيف|ضعیف|سند)/iu.test(question);
  if(authenticity)return {status:"needs_teacher",blocks:[],message:"I cannot grade a hadith. A source lookup can show a possible match; verify with your teacher. The publisher’s record stays separate from this lesson.",mode,version};
  if(!religious&&!needsPersonalReferral(question))return null;
  const reporting=/\b(?:(?:what|where|how) (?:did|does) (?:our |my |the |this )?teacher|did (?:our |my |the )?teacher|according to (?:our |my |the )?teacher|teacher (?:say|said|teach|explain)|in (?:this |the )?(?:class|lesson))\b|استاد نے|معلم|المعلم/iu.test(question);
  if(!reporting||needsPersonalReferral(question))return {status:"needs_teacher",blocks:[],message:"Please ask a qualified teacher for religious guidance. I cannot give a halal/haram ruling or advice about your own situation.",mode,version};
  const meaningful=tokens(question).filter(t=>!["whether","ruling","teach","say","according"].includes(t));
  const matches=segments.filter(s=>evidenceValid([{segmentId:s.id,quote:s.text}],segments)&&meaningful.some(t=>tokens(s.text).includes(t))&&religiousTopic.test(s.text)).slice(0,2);
  if(!matches.length)return {status:"not_covered",blocks:[],message:"That is not covered by a clear passage in this lesson. Ask your teacher.",mode,version};
  return {status:"answered",blocks:matches.map(s=>({text:s.text,evidence:[{segmentId:s.id,quote:s.text}]})),message:"These are your teacher’s captured words, not a ruling from DarsLoop. Ask your teacher about interpretation or your situation.",mode:"excerpt",version};
}
export function excerptAnswer(question:string,segments:Segment[],version:number):Answer {
  const bounded=boundedQuestion(question,segments,version,"excerpt");if(bounded)return bounded;
  if(needsPersonalReferral(question))return {status:"needs_teacher",blocks:[],message:"Please ask a qualified teacher about applying religious teachings to your own situation.",mode:"excerpt",version};
  const related=retrieve(question,segments).filter(s=>tokens(question).some(t=>tokens(s.text).includes(t))).slice(0,2);
  if(!related.length)return {status:"not_covered",blocks:[],message:"I couldn’t find a matching passage. Live AI chat isn’t connected yet; try a word from the transcript.",mode:"excerpt",version};
  const clear=related.filter(s=>!s.flags.length);
  if(!clear.length)return {status:"unclear_audio",blocks:[],message:"The matching passage is marked unclear. Please replay it.",mode:"excerpt",version};
  return {status:"answered",blocks:clear.map(s=>({text:s.text,evidence:[{segmentId:s.id,quote:s.text}]})),message:"Matching teacher passages · text search, not an AI answer",mode:"excerpt",version};
}
export function segmentFlags(d:{avg_logprob?:number;no_speech_prob?:number;compression_ratio?:number},text:string) {
  const flags:string[]=[];
  if(instructionLike(text))flags.push("Instruction-like wording: excluded from AI study material; replay the audio");
  if(typeof d.no_speech_prob==="number"&&d.no_speech_prob>0.6)flags.push("Possible silence or unclear speech");
  if(typeof d.avg_logprob==="number"&&d.avg_logprob< -1)flags.push("Low transcription confidence");
  if(typeof d.compression_ratio==="number"&&d.compression_ratio>2.4)flags.push("Possible repeated transcription");
  if(/\b(not|unless|except)\b|\d|لا|ليس|إلا|نہیں|مگر/u.test(text)&&flags.length)flags.push("Meaning-sensitive words: replay this passage");
  return flags;
}
