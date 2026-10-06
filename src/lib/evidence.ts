import { z } from "zod";
import type { Answer, Artifacts, Citation, Note, StudyPassage, StudyNoteOptions } from "./types";
import { isPdfPage, sourceCitations, validSourcePassage } from "./source-passages";
import { resolveNoteOptions } from "./note-options";
import { supportedOverview } from "./material-overview";
import { localizeTrustAnswer } from "./trust-copy";
const citation=z.object({segmentId:z.string().max(100),quote:z.string().min(1).max(5000),page:z.number().int().positive().optional()});
const citations=z.array(citation).min(1).max(6);
const supported=z.object({heading:z.string().min(1).max(160),text:z.string().min(1).max(1800),evidence:citations});
export const artifactSchema=z.object({language:z.enum(["ar","ur","en"]).optional(),overview:z.string().max(1500),notes:z.array(supported).max(40),terms:z.array(z.object({term:z.string().max(100),definition:z.string().max(600),evidence:citations})).max(30),practice:z.array(z.object({id:z.string().min(1).max(100),kind:z.enum(["quiz","flashcard"]),question:z.string().min(1).max(600),answer:z.string().min(1).max(1200),choices:z.array(z.string().max(600)).max(4),evidence:citations})).max(40)});
export const answerSchema=z.object({status:z.enum(["answered","partial","not_covered","unclear_audio","needs_teacher"]),blocks:z.array(z.object({text:z.string().min(1).max(1800),evidence:citations})).max(6),message:z.string().max(800)});
export function evidenceValid(evidence:Citation[],segments:StudyPassage[]) {
  return evidence.length>0&&evidence.every(c=>{
    const s=segments.find(s=>s.id===c.segmentId);
    return !!s&&!s.flags.length&&!instructionLike(s.text)&&c.quote.trim().length>=12&&s.text.includes(c.quote)&&validSourcePassage(s)&&(isPdfPage(s)?c.page===undefined||c.page===s.page:c.page===undefined);
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
export function validateArtifacts(input:unknown,segments:StudyPassage[],options?:StudyNoteOptions,settings:{allowEmptyNotes?:boolean}={}):Artifacts {
  const a=artifactSchema.parse(input);
  for(const collection of [a.notes,a.terms,a.practice])for(const item of collection)if(evidenceValid(item.evidence,segments))item.evidence=sourceCitations(item.evidence,segments);
  const noteOptions=resolveNoteOptions(options);
  const notes=noteOptions.enabled?a.notes.filter(n=>evidenceValid(n.evidence,segments)):[];
  const terms=a.terms.filter(t=>evidenceValid(t.evidence,segments));
  const ids=new Set<string>();
  const practice=a.practice.filter(p=>{
    if(ids.has(p.id)||!evidenceValid(p.evidence,segments))return false;ids.add(p.id);
    if(p.kind==="quiz")return p.choices.length>=2&&new Set(p.choices).size===p.choices.length&&p.choices.includes(p.answer);
    return p.choices.length===0;
  });
  if(noteOptions.enabled&&!notes.length&&!settings.allowEmptyNotes)throw new Error("No supported notes were returned. The transcript is still available.");
  // Overview must be derived from validated notes rather than an uncited model paragraph.
  return {...a,overview:supportedOverview(notes),notes,terms,practice:safePractice({...a,notes,terms,practice})};
}
export function validateAnswer(input:unknown,segments:StudyPassage[],version:number):Answer {
  const a=answerSchema.parse(input);
  const blocks=a.blocks.filter(b=>evidenceValid(b.evidence,segments)).map(b=>({...b,evidence:sourceCitations(b.evidence,segments)}));
  if(a.status==="answered"||a.status==="partial"){
    if(blocks.length!==a.blocks.length||!blocks.length)return {status:"unclear_audio",blocks:[],message:"I couldn’t support that answer with clear passages from this lesson. Try the transcript or ask your teacher.",mode:"ai",version};
    return {...a,blocks,message:a.status==="partial"?"This lesson supports only the passages shown. Ask your teacher about anything further.":"Answered from this lesson",mode:"ai",version};
  }
  // Free-form model refusal explanations could themselves contain outside guidance.
  const messages={not_covered:"That isn’t covered in this lesson. You can ask your teacher for more information.",unclear_audio:"The relevant audio is unclear. Replay the passage or ask your teacher.",needs_teacher:"For religious interpretation or advice about your own situation, please ask a qualified teacher."};
  return {status:a.status,blocks:[],message:a.status==="unclear_audio"&&segments.some(isPdfPage)?"The source text does not clearly support an answer. Check the PDF page or ask your teacher.":messages[a.status],mode:"ai",version};
}
export function normalise(text:string){return text.normalize("NFKC").toLowerCase().replace(/[\u064B-\u065F\u0670]/g,"").replace(/[أإآ]/g,"ا").replace(/ى/g,"ي").replace(/[^\p{L}\p{N}\s]/gu," ");}
const stops=new Set("the a an is of to for in on what where did does do teacher lesson this that how can i you explain please my me with and about said tell from it was we are should class".split(" "));
const arabicStops=new Set("كيف ماذا لماذا متى اين هل ما من هو هي هذا هذه ذلك تلك هنا هناك في عن على الى ان انه ثم الذي التي كان كانت يمكن ينبغي لي لنا طالب درس معلم مثال يقول قال اشرح وضح شرح يشرح حول بحسب".split(" "));
function arabicRetrievalForm(word:string) {
  if(!/^[ء-ي]+$/u.test(word))return word;
  // Strip definite articles/clitics only; never apply a broad Arabic root stemmer.
  const plain=word.replace(/^(?:و|ف)?(?:ال|بال|كال|لل)(?=.{3,}$)/u,"");
  return arabicReviewForms.has(plain)?"مراجعة":plain;
}
// A bounded inflection family for مراجعة/راجع, not invented synonyms. These
// forms affect candidate retrieval only; source text and quoted evidence stay literal.
const arabicReviewForms=new Set("مراجعة راجع يراجع تراجع اراجع نراجع راجعي راجعوا يراجعون تراجعون تراجعين يراجعن تراجعن".split(" "));
export function tokens(text:string){return [...new Set(normalise(text).split(/\s+/).filter(t=>t.length>1&&!stops.has(t)&&!arabicStops.has(arabicRetrievalForm(t))))];}
function isArabicRetrievalQuestion(question:string){return /[ء-ي]/u.test(question)&&!/[پچژگکںھہۂےٹڈڑ]/u.test(question);}
// Conservative typo tolerance for retrieval only. Original speech, quotations
// and safety routing are unchanged; a fuzzy match is a candidate, never proof.
export function queryTokenMatches(query:string,word:string){
  if(query===word)return true;
  if(/^[ء-ي]+$/u.test(query)&&/^[ء-ي]+$/u.test(word)&&arabicRetrievalForm(query)===arabicRetrievalForm(word))return true;
  const a=Array.from(query),b=Array.from(word),max=a.length>=8&&b.length>=8?2:1;
  if(a.length<4||b.length<4||Math.abs(a.length-b.length)>max)return false;
  if(/\p{Script=Latin}/u.test(query)!==/\p{Script=Latin}/u.test(word))return false;
  let row=Array.from({length:b.length+1},(_,i)=>i);
  for(let i=1;i<=a.length;i++){
    const next=[i];for(let j=1;j<=b.length;j++)next[j]=Math.min(next[j-1]+1,row[j]+1,row[j-1]+(a[i-1]===b[j-1]?0:1));
    row=next;if(Math.min(...row)>max)return false;
  }
  return row[b.length]<=max;
}
/** Conservative routing aid, not a complete injection detector. Keep source audio/text intact. */
export function instructionLike(text:string) {
  const t=normalise(text).replace(/\s+/g," ");
  return /\b(?:ignore|disregard|override|bypass)\b.{0,60}\b(?:instructions?|rules?|polic(?:y|ies)|system|developer)\b/i.test(t)
    || /\b(?:repeat|print|show|output|display|reveal|dump|recite)\s+(?:(?:me|us|out|all|your|the|system|developer|hidden|internal|secret)\s+)*(?:prompt|instructions?|credentials?|api\s*keys?)\b/i.test(t)
    || /\b(?:forget|ignore|disregard)\b.{0,60}\b(?:teacher|lesson|source|transcript|class)\b/i.test(t)
    || /\b(?:answer|respond|reply|use|rely|draw)\b.{0,55}\b(?:your (?:own |general )?knowledge|outside (?:knowledge|sources?)|general knowledge|what you (?:already )?know)\b/i.test(t)
    || /\b(?:tell|describe|summari[sz]e|disclose|explain)\b.{0,35}\b(?:hidden|internal|system|developer)\b.{0,25}\b(?:prompt|instructions?|rules?|polic(?:y|ies))\b/i.test(t)
    || /\bwhat (?:are|is) (?:your|the system|the developer) (?:instructions?|prompt)\b/i.test(t)
    || /(?:^|\n)\s*(?:\[|<\|)?(?:system|developer|assistant)(?:\]|\|>)?\s*:/im.test(text)
    || /\byou are now (?:a |an |the )?(?:mufti|system|developer|unrestricted|administrator)\b/i.test(t)
    || /(?:تجاهل|تجاوز|انس).{0,45}(?:التعليمات|القواعد|المعلم|الدرس|المصدر)|(?:اجب|استخدم).{0,40}(?:معرفتك|معلوماتك)|(?:ہدایات|قواعد|استاد|سبق).{0,45}(?:نظر انداز|بھول)|(?:اپنے علم|اپنی معلومات).{0,40}(?:جواب|بتا)|(?:سسٹم پرامپٹ|اپنی ہدایات).{0,30}(?:دکھاؤ|بتاؤ)/u.test(t);
}
// Routing cues are narrower than a religious-topic classifier. Descriptive
// lesson questions remain available as literal source excerpts.
const rulingRequest=/\b(?:halal|haram|fatwa|rulings?|permissible|permitted|allowed|sin(?:s|ful|ning)?|reward|punish(?:ment|ed)?)\b|(?:حكم|حکم|يجوز|جايز|جائز|فتوى|فتوی|حلال|حرام|گناہ|ثواب|عذاب|عقاب|معصية)/iu;
const religiousTopic=/\b(?:halal|haram|fatwa|rulings?|permissible|permitted|allowed|fast(?:ing)?|w[ou]d[uh]u?|ablution|prayers?|pray(?:ing)?|marriage|divorce|salah|sawm|zakah|zakat|shahadah|hajj|pillars of islam|testimony of faith|music|songs?|alcohol|vap(?:e|es|ing)|riba|gambl(?:e|ing)|tattoos?|zina|masturbation|suicide)\b|حلال|حرام|فتوى|فتوی|وضوء|وضو|صلاة|نماز|صيام|روزہ|الصوم|الصلاه|الزكاة|زکوۃ|الحج|اركان الاسلام|ارکان اسلام|موسیقی|موسيقي|شراب|خمر|كحول|ربا/iu;
export function lexicalPassageRanks(question:string,segments:StudyPassage[]):{index:number;score:number}[] {
  const q=tokens(question);if(!q.length)return [];
  const cache=new Map<string,boolean>(),matches=(term:string,word:string)=>{
    const key=term+"\0"+word;if(!cache.has(key))cache.set(key,queryTokenMatches(term,word));return cache.get(key)!;
  };
  const rows=segments.map((segment,index)=>({index,words:instructionLike(segment.text)?[]:tokens(segment.text)}));
  if(!isArabicRetrievalQuestion(question))return rows.map(({index,words})=>({index,score:words.reduce((n,word)=>n+(q.some(term=>matches(term,word))?1:0),0)})).filter(row=>row.score>0).sort((a,b)=>b.score-a.score);
  // Common words repeated throughout a long class cannot outweigh a rare topic.
  // Score each query term once per passage, rather than its many spelling forms.
  const matched=rows.map(row=>q.map(term=>row.words.some(word=>matches(term,word))));
  const weights=q.map((_,i)=>1+Math.log((segments.length+1)/(matched.filter(row=>row[i]).length+1)));
  return rows.map((row,i)=>({index:row.index,score:matched[i].reduce((score,found,j)=>score+(found?weights[j]:0),0)})).filter(row=>row.score>0).sort((a,b)=>b.score-a.score);
}
export function retrievalContext<T extends StudyPassage>(segments:T[],anchors:number[],limit:number):T[] {
  const maximum=Math.max(0,Math.min(18,Math.floor(limit))),chosen=new Set<number>();let characters=0;
  const add=(index:number)=>{const source=segments[index];if(!source||chosen.has(index)||chosen.size>=maximum||instructionLike(source.text)||characters+source.text.length>30_000)return;chosen.add(index);characters+=source.text.length;};
  // Keep the ranked anchors before spending the finite context on neighbors.
  anchors.forEach(add);for(const index of anchors){add(index-1);add(index+1);}
  return [...chosen].sort((a,b)=>a-b).map(index=>segments[index]);
}
export function retrieve(question:string,segments:StudyPassage[],limit=8):StudyPassage[] {
  segments=segments.filter(s=>!instructionLike(s.text));
  const ranked=lexicalPassageRanks(question,segments),arabic=isArabicRetrievalQuestion(question),seen=new Set<string>();
  const anchors=ranked.filter(row=>{
    if(!arabic)return true;
    const text=normalise(segments[row.index].text).trim();
    if(row.score<ranked[0].score*.6||seen.has(text))return false;seen.add(text);return true;
  }).slice(0,3).map(row=>row.index);
  return retrievalContext(segments,anchors,limit);
}
// Retrieval overlap is only a candidate. A literal answer must also contain
// every specific query anchor, rather than matching a reporting word or an
// unrelated name. This does not infer religious facts or rewrite source text.
const excerptStops=new Set(("as at by or but if then than so any all some everything nothing " +
  "according whether given using use used says say said saying state states stated tell tells told " +
  "teach teaches taught teaching teacher teachers source sources passage passages text texts " +
  "lesson lessons class classes lecture lectures pdf book books example examples student students " +
  "define definition definitions describe description list name named names meaning means mean " +
  "understand focus happen happens happened point points topic topics question questions answer answers " +
  "translate translation english arabic urdu between difference different about from " +
  "what which who whom whose when where why how did does doing do was were been being " +
  "could would will shall have has had after before while during also still just only " +
  "ruling explain explained explaining explanation explanation s " +
  "معلم المعلم استاد سبق درس الدرس طالب الطالب مثال المثال يقول قال شرح اشرح وضح " +
  "وضاحت کریں کیا کیسے کیوں کب کہاں کون کس کے کی کا کو سے نے میں اور پر ہے ہیں تھا تھی تھے یہ اس " +
  "بارے بتایا بتائیں بتا کہا کہتے").split(/\s+/));
const smallNumbers=["zero","one","two","three","four","five","six","seven","eight","nine","ten"];
function excerptWord(word:string):string {
  if(/^(?:[0-9]|10)$/.test(word))return smallNumbers[Number(word)];
  if(/^[ء-ي]+$/u.test(word))return arabicRetrievalForm(word);
  // Ordinary plurals only. Never use fuzzy religious names as topic proof.
  return /^[a-z]+s$/u.test(word)&&word.length>3&&!word.endsWith("ss")?word.slice(0,-1):word;
}
function excerptWords(text:string):string[] {
  return [...new Set(normalise(text).split(/\s+/).filter(w=>(w.length>1||/^\d+$/u.test(w))&&!stops.has(w)&&!arabicStops.has(arabicRetrievalForm(w))&&!excerptStops.has(w)).map(excerptWord))];
}
function relevantExcerpts(question:string,passages:StudyPassage[]):StudyPassage[] {
  const anchors=excerptWords(question);if(!anchors.length)return [];
  const words=passages.map(p=>new Set(excerptWords(p.text))),vocabulary=new Set(words.flatMap(w=>[...w]));
  const resolved:string[]=[];
  for(const anchor of anchors){
    if(vocabulary.has(anchor)){resolved.push(anchor);continue;}
    // Preserve an unambiguous long-word spelling correction (e.g. revison).
    // Short terms/names such as Kaaba, zakah or Quran require literal support.
    const typos=/^[a-z]{6,}$/u.test(anchor)?[...vocabulary].filter(w=>/^[a-z]{6,}$/u.test(w)&&queryTokenMatches(anchor,w)):[];
    if(typos.length!==1)return [];
    resolved.push(typos[0]);
  }
  // A broad introduction can name a topic before the actual explanation.
  // Rank distinct supported query anchors before taking the bounded excerpt
  // count, so that an early mention cannot crowd out the requested comparison.
  // Rare anchors carry more weight; repeats in a passage add no extra score.
  const weights=resolved.map(anchor=>1+Math.log((passages.length+1)/(words.filter(w=>w.has(anchor)).length+1)));
  return passages.map((passage,i)=>({passage,index:i,score:resolved.reduce((n,anchor,j)=>n+(words[i].has(anchor)?weights[j]:0),0)}))
    .filter(row=>row.score>0).sort((a,b)=>b.score-a.score||a.index-b.index).map(row=>row.passage);
}
export function needsPersonalReferral(question:string) {
  const q=normalise(question);
  // Arabic expresses “my/our prayer, fast, ablution or zakah” with a suffix.
  // These explicit validity requests are personal application even when a
  // question also mentions the teacher. This is routing, not a ruling.
  const personalWorship=/(?:^|\s)(?:صلاتي|صلاتنا|صومي|صومنا|وضوئي|وضوؤي|وضوئنا|زكاتي|زكاتنا)(?=\s|$)/u.test(q);
  const worshipValidity=/(?:^|\s)(?:صحيح(?:ة)?|يصح|تصح|باطل(?:ة)?|فاسد(?:ة)?|مقبول(?:ة)?)(?=\s|$)/u.test(q);
  // Urdu میں is both “I” and a locative postposition. These explicit source-
  // reporting phrases are not personal pronouns; other first-person cues stay.
  const personalContext=q.replace(/(?:^|\s)(?:کے بارے|سبق|کلاس|درس|کتاب|متن|عبارت|مثال)\s+میں(?=\s|$)/gu,' ');
  const personal=/\b(?:i|my|me|mine|our|we)\b|(?:^|\s)(?:انا|لي|صلاتي|صومي|زوجي|زوجتي|میری|میرا|میرے|میں|ہم)(?=\s|$)/u.test(personalContext);
  return personalWorship&&worshipValidity
    || /\b(?:give|issue) (?:me |a )?fatwa|fatwa for (?:me|my)|is it (?:halal|haram) for me|am i (?:allowed|permitted)|what should i do about my|should i (?:divorce|marry)/iu.test(q)
    || /افتني|فتوى لي|میرے لیے فتوی/u.test(q)
    || personal&&(religiousTopic.test(q)||rulingRequest.test(q))&&/\b(?:valid|invalid|allowed|permitted|halal|haram|sin|invalidate)\b|\b(?:can|may|should|must|need) (?:i|we) (?:pray|fast|marry|divorce|do|make|give|pay|listen|drink|smoke|vape|accept|gamble|tattoo|commit|start)\b|حكم|يجوز|جائز|درست|صحیح|گناہ|کیا|هل|يصح|باطل/u.test(q);
}
export function boundedQuestion(question:string,segments:StudyPassage[],version:number,mode:Answer["mode"]):Answer|null {
  const q=normalise(question),finish=(answer:Answer)=>localizeTrustAnswer(answer,question);
  if(instructionLike(question))return finish({status:"not_covered",blocks:[],message:"I can only help with this lesson. Instructions in a question cannot change that.",mode,version});
  const religious=religiousTopic.test(q)||rulingRequest.test(q);
  const authenticity=(/(?:\b(?:hadith|hadeeth|hadees|narration|isnad|matn)\b|حديث|حدیث)/iu.test(q)&&/(?:\b(?:authentic(?:ity|at(?:e|ed|ing|ion))?|grad(?:e|ing)|sahih|saheeh|hasan|hassan|weak|strong|genuine|real|sound|valid|verif(?:y|ied|ication)|classif(?:y|ication)|rat(?:e|ing)|scor(?:e|ing)|judg(?:e|ing|ement|ment)|daif|fabricated|fake|reliable|true|isnad|matn)\b|صحيح|صحیح|صحة|صحت|درجة|درجہ|موثوق|معتبر|حسن|ضعيف|ضعیف|قوي|اصلي|مستند|سند)/iu.test(q))
    || /\b(?:did|does) (?:the )?(?:prophet|messenger)(?: muhammad)? (?:really|actually) say\b/iu.test(q)
    || /(?:هل|کیا).{0,35}(?:النبي|الرسول|نبی|رسول).{0,35}(?:حقا|واقعی|قال|فرمایا)/u.test(q);
  if(authenticity)return finish({status:"needs_teacher",blocks:[],message:"I cannot grade a hadith. A source lookup can show a possible match; verify with your teacher. The publisher’s record stays separate from this lesson.",mode,version});
  if(!religious&&!needsPersonalReferral(question))return null;
  const reporting=/\b(?:(?:what|where|how) (?:did|does) (?:our |my |the |this )?teacher|did (?:our |my |the )?teacher|according to (?:our |my |the )?teacher|teacher (?:say|said|teach|explain)|(?:in|from|using) (?:this |the )?(?:class|lesson))\b|استاد نے|(?:اس|یہ) سبق|معلم|المعلم|(?:هذا|في) الدرس/iu.test(q);
  const pdfReporting=segments.some(isPdfPage)&&/according to (?:this |the )?(?:pdf|source|book)|what does (?:this |the )?(?:pdf|source|book) (?:say|state)|in (?:this |the )?(?:pdf|source|book)/iu.test(q);
  const descriptive=!rulingRequest.test(q)&&/^(?:what (?:is|are)|define|describe|explain|list|name)\b|^(?:ما (?:هو|هي)|اشرح|عرف)|^(?:کیا ہے|وضاحت کریں)/iu.test(q);
  if(!(reporting||pdfReporting||descriptive)||needsPersonalReferral(question))return finish({status:"needs_teacher",blocks:[],message:"Please ask a qualified teacher for religious guidance. I cannot give a halal/haram ruling or advice about your own situation.",mode,version});
  const matches=relevantExcerpts(question,segments.filter(s=>evidenceValid([{segmentId:s.id,quote:s.text}],segments))).slice(0,2);
  if(!matches.length)return finish({status:"not_covered",blocks:[],message:"That is not covered by a clear passage in this lesson. Ask your teacher.",mode,version});
  return finish({status:"answered",blocks:matches.map(s=>({text:s.text,evidence:sourceCitations([{segmentId:s.id,quote:s.text}],segments)})),message:segments.some(isPdfPage)?"This is a source excerpt. DarsLoop does not give religious rulings; ask a qualified teacher about interpretation.":"These are captured source words, not a ruling from DarsLoop. Check the original and ask your teacher about interpretation or your situation.",mode:"excerpt",version});
}
/** A saved topic suggestion is a pointer to audited quotes, never extra evidence. */
export function noteAnchors(question:string,segments:StudyPassage[],notes:Note[]=[]) {
  const topic=(/^(?:What did the teacher say|What does the source say) about [“"](.{1,160})[”"]\?$/u.exec(question.trim())||/^Explain [“"](.{1,160})[”"] using this lesson\.$/u.exec(question.trim()))?.[1];
  if(!topic||instructionLike(question))return [];
  const note=notes.find(n=>normalise(n.heading).trim()===normalise(topic).trim()&&evidenceValid(n.evidence,segments));
  if(!note)return [];
  return segments.filter(s=>note.evidence.some(c=>c.segmentId===s.id));
}
export function excerptAnswer(question:string,segments:StudyPassage[],version:number,notes:Note[]=[]):Answer {
  const bounded=boundedQuestion(question,segments,version,"excerpt");if(bounded)return bounded;
  if(needsPersonalReferral(question))return {status:"needs_teacher",blocks:[],message:"Please ask a qualified teacher about applying religious teachings to your own situation.",mode:"excerpt",version};
  const anchors=noteAnchors(question,segments,notes);
  // An audited note heading can anchor another source language without lexical
  // translation. Otherwise candidate retrieval must pass the shared topic gate.
  const related=(anchors.length?anchors:relevantExcerpts(question,retrieve(question,segments))).slice(0,2);
  if(!related.length)return {status:"not_covered",blocks:[],message:"I couldn’t find a supporting passage in this lesson. Try a more specific question or ask your teacher.",mode:"excerpt",version};
  const clear=related.filter(s=>!s.flags.length);
  if(!clear.length)return {status:"unclear_audio",blocks:[],message:segments.some(isPdfPage)?"The matching page is flagged. Check the original PDF.":"The matching passage is marked unclear. Please replay it.",mode:"excerpt",version};
  return {status:"answered",blocks:clear.map(s=>({text:s.text,evidence:sourceCitations([{segmentId:s.id,quote:s.text}],segments)})),message:segments.some(isPdfPage)?"These are exact extracted source excerpts. Open the cited PDF page to check the wording and layout.":"These are captured source words, not a ruling from DarsLoop. Replay the audio and ask your teacher about interpretation or your situation.",mode:"excerpt",version};
}
export function segmentFlags(d:{avg_logprob?:number;no_speech_prob?:number;compression_ratio?:number},text:string) {
  const flags:string[]=[];
  if(instructionLike(text))flags.push("Instruction-like wording: excluded from AI study material; replay the audio");
  // Whisper's no-speech score describes a decoding window and can stay high
  // despite confident speech. Its reference decoder pairs it with logprob;
  // never treat that score alone as proof that every returned line is silence.
  // Missing confidence remains conservative; independent exclusions stay.
  if(typeof d.no_speech_prob==="number"&&d.no_speech_prob>0.6&&!(typeof d.avg_logprob==="number"&&Number.isFinite(d.avg_logprob)&&d.avg_logprob> -1))flags.push("Possible silence or unclear speech");
  if(typeof d.avg_logprob==="number"&&d.avg_logprob< -1)flags.push("Low transcription confidence");
  if(typeof d.compression_ratio==="number"&&d.compression_ratio>2.4)flags.push("Possible repeated transcription");
  if(/\b(not|unless|except)\b|\d|لا|ليس|إلا|نہیں|مگر/u.test(text)&&flags.length)flags.push("Meaning-sensitive words: replay this passage");
  return flags;
}
