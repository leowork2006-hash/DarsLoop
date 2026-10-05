import { boundedQuestion, evidenceValid, instructionLike, needsPersonalReferral, normalise, noteAnchors, tokens } from './evidence';
import { sourcePassages } from './source-passages';
import { capturedMaterialLanguage, textUsesRequestedScript } from './study-material-language';
import type { Answer, Lesson, StudyPassage } from './types';

export type ChatContext={question:string;passageIds:string[]};
export function questionLanguage(question:string){
  const explicit=/\b(?:answer|reply|respond|explain|write|translate).{0,60}\bin (English|Arabic|Urdu)\b/iu.exec(question)?.[1]?.toLowerCase();
  if(explicit)return explicit==='arabic'?'ar':explicit==='urdu'?'ur':'en';
  // A quoted Arabic/Urdu topic is source wording, not the question's language.
  const prose=question.replace(/“[^”]{0,500}”|"[^"]{0,500}"/gu,'');
  if(/^\s*(?:what|where|when|why|how|explain|summari[sz]e|describe|give me|tell me|please|can you|could you)\b/iu.test(prose))return 'en';
  return capturedMaterialLanguage([{text:prose||question}]);
}
const overview=/\b(?:what (?:is|was) (?:this |the )?(?:lesson|class|lecture) about|(?:explain|summari[sz]e|recap)(?: to me| me)? (?:this |the |whole |entire |full )?(?:lesson|class|lecture)\b|(?:overview|summary|recap|main topics|main points|key topics|key points) (?:of |for )?(?:this |the |whole |entire )?(?:lesson|class|lecture)\b|(?:lesson|class|lecture) (?:overview|summary|in detail))|^(?:give me (?:a )?)?(?:short overview|main topics|key points)$|(?:اشرح|لخص)(?: لي)? (?:هذا |هذه )?(?:الدرس|المحاضرة)|(?:سبق|لیکچر) (?:کا )?(?:خلاصہ|وضاحت)/iu;
const elaboration=/\b(?:explain|elaborate|expand|detail|detailed|more|simpler|shorter|brief|example|again|it|that|this|mean|ore)\b|مزید|تفصیل|وضاحت|اشرح|بالتفصيل|وضح/u;
const commandWords=new Set('explain explaination explanation elaborate expand detail detailed more much ore me in please it that this again simpler shorter brief example give make can you mean why how understand اشرح اكثر أكثر بالتفصيل وضح وضاحت مزید تفصیل کریں کرو دوبارہ مختصر بتائیں سمجھائیں چاہتا ہوں'.split(' '));
function requestIntent(question:string){return normalise(question).replace(/\b(?:explian|explane)\b/g,'explain').replace(/\b(?:detial|dedail|detials)\b/g,'detail').replace(/\b(?:ovewview|overveiw)\b/g,'overview').replace(/\b(?:sumarise|sumarize)\b/g,'summarize').replace(/\b(?:mroe|mor)\b/g,'more');}
export function isLessonOverview(question:string){return overview.test(requestIntent(question));}
export function isDetailQuestion(question:string){return /\b(?:detail|detailed|elaborate|expand|thorough)\b|تفصیل|بالتفصيل/u.test(requestIntent(question));}
export function chatQuestion(question:string,lesson:Lesson,previous?:ChatContext){
  const safe=previous&&!boundedQuestion(previous.question,sourcePassages(lesson),lesson.version,'ai')&&!needsPersonalReferral(previous.question);
  const topical=tokens(requestIntent(question)).filter(t=>!commandWords.has(t));
  const followup=!!safe&&elaboration.test(requestIntent(question))&&topical.length===0;
  return {question,scopeQuestion:followup?previous!.question:question,followup,previous:followup?previous:undefined,overview:isLessonOverview(followup?previous!.question:question),detail:isDetailQuestion(question)};
}
function distributed<T>(items:T[],limit:number):T[]{return items.length<=limit?items:Array.from({length:limit},(_,i)=>items[Math.round(i*(items.length-1)/(limit-1))]);}
// Source-only chronological coverage. Notes point to passages; they are never
// substituted for source evidence, and omitted source sections stay disclosed.
export function overviewPassages(lesson:Lesson){
  const source=sourcePassages(lesson),clear=source.filter(p=>!p.flags.length&&!instructionLike(p.text));
  if(clear.reduce((n,p)=>n+p.text.length,0)<=40_000)return {passages:clear,complete:clear.length===source.length};
  const notes=distributed((lesson.artifacts?.notes||[]).filter(n=>evidenceValid(n.evidence,source)),12);
  const anchorIds=new Set(notes.flatMap(n=>n.evidence.map(c=>c.segmentId)));
  const indices=new Set<number>();
  for(const p of clear)if(anchorIds.has(p.id)){
    const i=source.indexOf(p);for(let j=Math.max(0,i-1);j<=Math.min(source.length-1,i+1);j++)indices.add(j);
  }
  for(const p of distributed(clear,18))indices.add(source.indexOf(p));
  const selected:StudyPassage[]=[];let size=0;
  for(const i of [...indices].sort((a,b)=>a-b)){const p=source[i];if(p.flags.length||instructionLike(p.text)||size+p.text.length>40_000)continue;selected.push(p);size+=p.text.length;}
  return {passages:selected,complete:selected.length===source.length};
}
export function contextPassages(lesson:Lesson,previous:ChatContext){
  const source=sourcePassages(lesson),ids=new Set(previous.passageIds.slice(0,12)),indices=new Set<number>();
  for(let i=0;i<source.length;i++)if(ids.has(source[i].id))for(let j=Math.max(0,i-1);j<=Math.min(source.length-1,i+1);j++)indices.add(j);
  let size=0;return [...indices].sort((a,b)=>a-b).map(i=>source[i]).filter(p=>{if(p.flags.length||instructionLike(p.text)||size+p.text.length>30_000)return false;size+=p.text.length;return true;});
}
// Useful, already prepared explanations when the provider is unavailable. No
// improvised translation: citations stay literal and explanation script must fit.
export function savedLessonAnswer(question:string,lesson:Lesson,previous?:ChatContext):Answer|null{
  const passages=sourcePassages(lesson),bounded=boundedQuestion(question,passages,lesson.version,'notes');if(bounded)return bounded;
  if(needsPersonalReferral(question))return null;
  const plan=chatQuestion(question,lesson,previous),language=questionLanguage(question);
  const anchors=noteAnchors(plan.scopeQuestion,passages,lesson.artifacts?.notes);
  const ids=new Set(anchors.map(p=>p.id));if(plan.followup)plan.previous?.passageIds.forEach(id=>ids.add(id));
  if(!plan.overview&&!ids.size)return null;
  const notes=(lesson.artifacts?.notes||[]).filter(n=>evidenceValid(n.evidence,passages)&&textUsesRequestedScript(n.text,language)&&(plan.overview||n.evidence.some(c=>ids.has(c.segmentId))));
  const selected=distributed(notes,6);if(!selected.length)return null;
  return {status:notes.length>selected.length||!!lesson.artifacts?.preparation?.uncoveredSections.length?'partial':'answered',blocks:selected.map(n=>({text:`${n.heading}\n\n${n.text}`,evidence:n.evidence})),message:'From the prepared lesson notes. Check the cited source for the original wording; unclear or unprepared sections are not explained here.',mode:'notes',version:lesson.version,retrieval:plan.overview?'whole_lesson':'note_anchor'};
}
