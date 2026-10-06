"use client";
import { useEffect, useId, useRef, useState } from "react";
import { DownloadSimple as ArrowDownToLine, ArrowLeft, ArrowRight, ArrowUp, ArrowCounterClockwise, BookOpen, Check, CaretDown as ChevronDown, ArrowSquareOut as ExternalLink, Headphones, Cards as Layers, CircleNotch as LoaderCircle, ChatCircle as MessageCircle, Play, Plus, MagnifyingGlass as Search, ShieldCheck, Trash as Trash2, Users, X, ClipboardText, CheckCircle, FileAudio, FilePdf, WarningCircle } from "@phosphor-icons/react";
import { formatTime, type Answer, type Candidate, type Citation, type Lesson, type PracticeItem, type Review } from "@/lib/types";
import { StudyAvatar } from "./study-avatar";
import { api, message } from "./client-api";
import { localizeTrustAnswer, uncertaintyText, trustCopy } from "@/lib/trust-copy";
import { resolveMaterialLanguage } from "@/lib/study-material-language";
import { excerptAnswer } from "@/lib/evidence";
import { savedLessonAnswer } from "@/lib/chat-context";
import { lessonReadiness } from "@/lib/lesson-readiness";
import { exampleReview } from "@/lib/example-practice";
import Link from "next/link";
import { availablePractice } from "@/lib/insights";
import { CatchUp, TeacherCheck } from "./learning-tools";
import { PracticeSession } from "./practice-session";
import { sourcePassages, isPdfPage, sourceLabel, citedPassage, pdfSourceUrl } from "@/lib/source-passages";
import { SourceEvidence, SourceLink } from "./source-evidence";
import { PdfPages } from "./pdf-pages";
import { LessonNotes } from "./lesson-notes";
import chatStyles from "./lesson-chat.module.css";
import { ChatHeading, ChatStarters } from "./chat-starters";
import { SourceExcerpt, SourcePassagePicker } from "./source-excerpt";
import practiceStyles from "./practice-entry.module.css";
import { demoReferences, hasCurrentDemoScript } from "@/lib/demo-references";

export type LessonTab="notes"|"ask"|"practice"|"transcript"|"sources"|"catchup";
export const Evidence=SourceEvidence;

export function Notes({lesson,onPlay,preview=false}:{lesson:Lesson;onPlay:(time:number)=>void;preview?:boolean}) {
  return <LessonNotes lesson={lesson} onPlay={onPlay} preview={preview || !lesson.ownerId}/>;
}
type ChatTurn={question:string;answer?:Answer};
type SavedConversation={question:string;turns:ChatTurn[];sentDraft:number|null};
// Browser memory only: nothing is persisted to shared storage or sent as an
// answer history. Changing the viewer clears the preceding account's entries.
const conversations=new Map<string,SavedConversation>();
let conversationViewer:string|null=null;
function conversationKey(viewerId:string|undefined,lesson:Lesson){return viewerId?JSON.stringify([viewerId,lesson.id,lesson.version]):null;}
function readConversation(viewerId:string|undefined,key:string|null):SavedConversation{
  if(typeof window==="undefined"||!viewerId||!key)return {question:"",turns:[],sentDraft:null};
  if(conversationViewer!==viewerId){conversations.clear();conversationViewer=viewerId;}
  return conversations.get(key)||{question:"",turns:[],sentDraft:null};
}
export function chatSuggestions(lesson?:Lesson){
  const topics=[...new Set(lesson?.artifacts?.notes.map(n=>n.heading).filter(Boolean)||[])].slice(0,2);
  return [
    {label:"Explain this lesson in detail",description:"Walk through the captured explanations.",question:"Explain this lesson in detail"},
    {label:"Give me a short overview",description:"Start with the main supported ideas.",question:"Give me a short overview"},
    topics[0]?{label:topics[0],description:"Explain this topic using the saved source.",question:`Explain “${topics[0]}” using this lesson.`}:{label:"Find the main explanation",description:"Locate passages you can revisit.",question:"Where are the main ideas explained in this lesson?"},
    topics[1]?{label:topics[1],description:"Find the explanation and its original wording.",question:`Explain “${topics[1]}” using this lesson.`}:{label:"Explain the lesson's terms",description:"Use definitions captured in this lesson.",question:"Which terms are explained in this lesson?"},
  ];
}
function LessonChatMenu({lesson,onOpenNotes,onOpenSource}:{lesson:Lesson;onOpenNotes?:()=>void;onOpenSource?:()=>void}){
  const [open,setOpen]=useState(false),root=useRef<HTMLDivElement>(null),button=useRef<HTMLButtonElement>(null),id=useId();
  useEffect(()=>{if(!open)return;root.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus();const outside=(event:PointerEvent)=>{if(!root.current?.contains(event.target as Node))setOpen(false);};document.addEventListener("pointerdown",outside);return()=>document.removeEventListener("pointerdown",outside);},[open]);
  function choose(action:(()=>void)|undefined){setOpen(false);action?.();}
  return <div className={chatStyles.menuAnchor} ref={root} onKeyDown={event=>{const items=Array.from(root.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')||[]),index=items.indexOf(document.activeElement as HTMLButtonElement);if(event.key==="Escape"){event.preventDefault();setOpen(false);button.current?.focus();}else if(["ArrowUp","ArrowDown","Home","End"].includes(event.key)){event.preventDefault();items[event.key==="Home"?0:event.key==="End"?items.length-1:(index+(event.key==="ArrowUp"?items.length-1:1))%items.length]?.focus();}else if(event.key==="Tab")setOpen(false);}}>
    <button ref={button} type="button" className={chatStyles.plus} aria-label="Lesson chat actions" aria-haspopup="menu" aria-expanded={open} aria-controls={open?id:undefined} onClick={()=>setOpen(!open)}><Plus size={22}/></button>
    {open&&<div className={chatStyles.actionsMenu} role="menu" id={id} aria-label="Lesson chat actions"><button type="button" role="menuitem" disabled={!onOpenNotes} onClick={()=>choose(onOpenNotes)}><BookOpen size={18}/>Open saved notes</button><button type="button" role="menuitem" disabled={!onOpenSource} onClick={()=>choose(onOpenSource)}>{lesson.sourceKind==="pdf"?<FilePdf size={18}/>:<Headphones size={18}/>}Open {lesson.sourceKind==="pdf"?"PDF pages":"transcript"}</button></div>}
  </div>;
}
export function Chat({lesson,viewerId,onPlay,onError,configured,preview=false,home=false,tools,actions,composerActions,emptyState,draft,onOpenNotes,onOpenSource,onOpenQuiz,onOpenCards,onOpenPlan}:{lesson:Lesson;viewerId?:string;onPlay:(time:number)=>void;onError:(s:string)=>void;configured:boolean;preview?:boolean;home?:boolean;tools?:React.ReactNode;actions?:React.ReactNode;composerActions?:React.ReactNode;emptyState?:React.ReactNode;draft?:{text:string;nonce:number;submit?:boolean};onOpenNotes?:()=>void;onOpenSource?:()=>void;onOpenQuiz?:()=>void;onOpenCards?:()=>void;onOpenPlan?:()=>void}) {
  const key=conversationKey(viewerId,lesson),initial=useRef(readConversation(viewerId,key)),questionId=useId();
  const [question,setQuestion]=useState(initial.current.question),[turns,setTurns]=useState<ChatTurn[]>(initial.current.turns),[busy,setBusy]=useState(false),[error,setError]=useState(""),[showLatest,setShowLatest]=useState(false);
  const bottom=useRef<HTMLParagraphElement>(null),stream=useRef<HTMLDivElement>(null),editor=useRef<HTMLTextAreaElement>(null),controller=useRef<AbortController|null>(null),sentDraft=useRef<number|null>(initial.current.sentDraft),followLatest=useRef(true);
  useEffect(()=>()=>controller.current?.abort(),[]);
  useEffect(()=>{const node=editor.current;if(!home||!node)return;node.style.height="auto";node.style.height=`${Math.min(112,node.scrollHeight)}px`;},[question,home]);
  useEffect(()=>{if(!key||!viewerId||typeof window==="undefined")return;if(conversationViewer!==viewerId){conversations.clear();conversationViewer=viewerId;}const pending=turns.findLast(t=>!t.answer);conversations.delete(key);conversations.set(key,{question:question||pending?.question||"",turns:turns.filter(t=>t.answer).slice(-20),sentDraft:sentDraft.current});while(conversations.size>24)conversations.delete(conversations.keys().next().value!);},[key,viewerId,question,turns]);
  useEffect(()=>{
    if(!draft||sentDraft.current===draft.nonce)return;
    setQuestion(draft.text);requestAnimationFrame(()=>editor.current?.focus());
    if(!draft.submit)return;
    const timer=setTimeout(()=>{if(sentDraft.current!==draft.nonce){sentDraft.current=draft.nonce;void ask(draft.text);}},0);
    return ()=>clearTimeout(timer);
  },[draft]);
  function trackScroll(){const node=stream.current;if(!node)return;followLatest.current=node.scrollHeight-node.clientHeight-node.scrollTop<72;setShowLatest(!followLatest.current);}
  function jumpToLatest(){const node=stream.current;if(!node)return;node.scrollTop=node.scrollHeight;followLatest.current=true;setShowLatest(false);}
  useEffect(()=>{
    const node=stream.current;if(!node||!turns.length)return;
    const frame=requestAnimationFrame(()=>{
      if(followLatest.current){
        const latest=node.lastElementChild as HTMLElement|null;
        // Keep the start of a long answer readable instead of jumping past it.
        const top=latest?latest.getBoundingClientRect().top-node.getBoundingClientRect().top+node.scrollTop:node.scrollHeight;
        node.scrollTop=busy?node.scrollHeight:Math.min(top,Math.max(0,node.scrollHeight-node.clientHeight));
      }
      trackScroll();
    });return()=>cancelAnimationFrame(frame);
  },[turns,busy]);
  useEffect(()=>{const node=stream.current;if(!node)return;const observer=new ResizeObserver(()=>{if(followLatest.current)node.scrollTop=node.scrollHeight;trackScroll();});observer.observe(node);return()=>observer.disconnect();},[turns.length>0]);
  function clearChat(){controller.current?.abort();controller.current=null;setBusy(false);setQuestion("");setTurns([]);setError("");setShowLatest(false);followLatest.current=true;if(key)conversations.delete(key);editor.current?.focus();}
  async function ask(text:string){
    if(controller.current||text.trim().length<2)return;
    followLatest.current=true;setShowLatest(false);
    const q=text.trim(),requestController=new AbortController();controller.current=requestController;setQuestion("");setError("");setBusy(true);
    const previous=turns.findLast(t=>t.answer&&t.answer.blocks.length&&(t.answer.status==="answered"||t.answer.status==="partial"));
    const sourceIds=new Set(sourcePassages(lesson).map(p=>p.id));
    const passageIds=previous?[...new Set(previous.answer!.blocks.flatMap(b=>b.evidence.map(e=>e.segmentId)).filter(id=>sourceIds.has(id)))].slice(0,12):[];
    const context=previous&&passageIds.length?{question:previous.question.slice(0,1000),passageIds}:undefined;
    setTurns(t=>[...t.slice(-19),{question:q}]);
    try{
      const answer=preview?localizeTrustAnswer(savedLessonAnswer(q,lesson,context)||excerptAnswer(q,sourcePassages(lesson),lesson.version,lesson.artifacts?.notes),q):await api<Answer>(`/api/lessons/${lesson.id}/chat`,{method:"POST",body:JSON.stringify({question:q,version:lesson.version,...(context?{context}:{})}),signal:requestController.signal});
      if(requestController.signal.aborted||controller.current!==requestController)return;
      setTurns(t=>[...t.slice(0,-1),{question:q,answer}]);
    }catch(e){if(!requestController.signal.aborted&&controller.current===requestController){setTurns(t=>t.slice(0,-1));setQuestion(q);const description=message(e);setError(description);onError(description);}}
    finally{if(controller.current===requestController){controller.current=null;setBusy(false);}}
  }
  return <div className={`chat-workspace ${chatStyles.workspace} ${home?`home-chat-active ${chatStyles.homeWorkspace}`:""}`}>
    <div className={chatStyles.header}><div className="chat-scope" data-tour="chat-scope"><ShieldCheck size={15}/><span>Answers use this lesson only</span></div><button type="button" className={chatStyles.clear} disabled={!turns.length&&!question&&!busy} onClick={clearChat}><Trash2 size={15}/>Clear chat</button></div>
    {!turns.length?(emptyState||<div className="chat-empty"><StudyAvatar reference/><ChatHeading/><p>{configured?"Choose a starting point, or ask about this lesson.":lesson.sourceKind==="pdf"?"Search this PDF for a topic. Answers cite exact source excerpts.":"Search for a topic in this transcript. Answers include matching teacher passages."}</p>{actions}<ChatStarters lesson={lesson} onAsk={question=>void ask(question)} onNotes={onOpenNotes} onQuiz={onOpenQuiz} onCards={onOpenCards} onPlan={onOpenPlan}/></div>):<div className={chatStyles.threadRegion}><div ref={stream} className={`chat-messages ${chatStyles.messages}`} role="log" aria-label="Chat transcript" aria-live="polite" aria-relevant="additions text" onScroll={trackScroll}>{turns.map((t,i)=><article className="chat-turn" key={i}><div className="student-message" dir="auto"><span className="mini-label">YOU</span><p dir="auto">{t.question}</p></div><div className="assistant-message"><StudyAvatar small reference/><div><span className="mini-label">{t.answer?.status==="needs_teacher"?"ASK YOUR TEACHER":t.answer&&!["answered","partial"].includes(t.answer.status)?"SOURCE CHECK":t.answer?.mode==="notes"?"PREPARED LESSON NOTES":t.answer?.mode==="excerpt"?(lesson.sourceKind==="pdf"?"SOURCE EXCERPT":lesson.demo?"FICTIONAL SCRIPT WORDS":"TEACHER’S CAPTURED WORDS"):"AI ANSWER · THIS LESSON"}</span>{t.answer?<>{t.answer.blocks.map((b,j)=><div key={j} className="answer-block"><p dir="auto">{b.text}</p><Evidence evidence={b.evidence} lesson={lesson} onPlay={onPlay}/></div>)}{t.answer.message&&<p dir="auto" className={`answer-message ${t.answer.blocks.length?"muted":""}`} role={(t.answer.status==="temporarily_unavailable"||t.answer.retryable)?"alert":undefined}>{t.answer.message}</p>}{(t.answer.status==="temporarily_unavailable"||t.answer.retryable)&&<button type="button" className="button secondary" disabled={busy} onClick={()=>void ask(t.question)}><ArrowCounterClockwise size={16}/>Retry question</button>}</>:<p className="thinking"><LoaderCircle size={16} className="spin"/> Finding the lesson passage…</p>}</div></div></article>)}</div>{showLatest&&<button type="button" className={chatStyles.jumpLatest} onClick={jumpToLatest}><ArrowDownToLine size={14}/>Jump to latest</button>}</div>}
    {error&&<p className="lesson-inline-error chat-inline-error" role="alert"><WarningCircle size={16}/>{error}</p>}
    <form className={`chat-composer ${home?"home-composer":""}`} data-tour="home-composer" onSubmit={e=>{e.preventDefault();void ask(question);}}><label className="sr-only" htmlFor={questionId}>Ask about this lesson</label><textarea ref={editor} id={questionId} dir="auto" onFocus={()=>{if(!home)requestAnimationFrame(()=>bottom.current?.scrollIntoView({behavior:"auto",block:"end"}));}} rows={home?1:2} maxLength={1000} value={question} onChange={e=>setQuestion(e.target.value)} placeholder="Ask about this lesson…" onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();void ask(question);}}}/><div className="home-composer-footer">{tools||<LessonChatMenu lesson={lesson} onOpenNotes={onOpenNotes} onOpenSource={onOpenSource}/>}<div className="home-composer-actions">{composerActions}<button className="send-button" disabled={busy||question.trim().length<2} aria-label="Send question"><ArrowUp size={home?22:20}/></button></div></div></form>
    <p ref={bottom} className={`composer-caption ${chatStyles.caption}`}>{home?"Answers use your lesson. Ask a teacher for religious guidance.":"Answers use this lesson. Ask your teacher for religious guidance."}</p>
  </div>;
}
export function Practice({lesson,onPlay,onReviewed,onError,focusItemId,preview=false,scenePaused=false}:{lesson:Lesson;scenePaused?:boolean;onPlay:(time:number)=>void;onReviewed:(r:Review)=>void;onError:(s:string)=>void;focusItemId:string|null;preview?:boolean}) {
  const supported=availablePractice(lesson),quiz=supported.filter(p=>p.kind==="quiz"),cards=supported.filter(p=>p.kind==="flashcard");
  const focused=supported.find(p=>p.id===focusItemId);
  const [session,setSession]=useState<"quiz"|"flashcard"|"test"|null>(focused?.kind||null);
  const [target,setTarget]=useState<string|null>(focusItemId);
  const options=[{kind:"quiz" as const,title:"Quiz",text:"One question at a time. Find the explanation after each answer.",items:quiz,icon:<CheckCircle size={30}/>,tone:"mint",button:"Start quiz"},{kind:"flashcard" as const,title:"Flashcards",text:"Recall the idea, reveal the answer, then choose what to revisit.",items:cards,icon:<Layers size={30}/>,tone:"lilac",button:"Review cards"},{kind:"test" as const,title:"Mock exam",text:"Choose your length and timer. Review your marks and sources at the end.",items:supported,icon:<ClipboardText size={30}/>,tone:"blue",button:"Build mock exam"}];
  return <div className={practiceStyles.entry}>
    <div className="tab-intro"><p className="eyebrow">PRACTISE YOUR LESSON</p><h2>A little recall goes a long way.</h2><p>Study the clear points from this class. Every answer has a way back to the original explanation.</p></div>
    <div className={practiceStyles.grid} data-tour="lesson-practice">{options.map(option=><article className={practiceStyles.card} key={option.kind}>
      <div className={practiceStyles.art} data-tone={option.tone}>{option.icon}<span aria-hidden="true"/></div><h3>{option.title}</h3><p>{option.text}</p><span className={practiceStyles.count}>{option.items.length} {option.kind==="test"?option.items.length===1?"prepared item":"prepared items":option.kind==="flashcard"?option.items.length===1?"card":"cards":option.items.length===1?"question":"questions"} from this lesson</span>
      <button className="button primary" disabled={!option.items.length} onClick={()=>{setTarget(null);setSession(option.kind);}}>{option.items.length?option.button:"Not ready yet"}<ArrowRight size={16}/></button>
    </article>)}</div>
    {!supported.length&&<p className="muted">Practice will appear when supported questions are ready. Your transcript and recording are available in their tabs.</p>}
    {session&&<PracticeSession lesson={lesson} items={session==="test"?supported:session==="flashcard"?cards:quiz} mode={session==="test"?"test":"drill"} title={session==="test"?"Mock exam":session==="flashcard"?"Flashcards":"Quiz"} preview={preview} scenePaused={scenePaused} initialItemId={target} returnLabel="Back to lesson" onClose={()=>setSession(null)} onPlay={(_,time)=>onPlay(time)} onOpen={(_,id)=>{setSession(null);setTarget(id);}} onReviewed={onReviewed} onError={onError}/>}
  </div>;
}

function AudioTranscript({lesson,onPlay}:{lesson:Lesson;onPlay:(time:number)=>void}) {
  const [search,setSearch]=useState("");const shown=lesson.segments.filter(s=>s.text.toLowerCase().includes(search.toLowerCase()));
  return <div className="transcript-workspace"><div className="tab-intro"><p className="eyebrow">THE CAPTURED EXPLANATION</p><h2>Your class transcript.</h2><p>{lesson.demo?"Exact fictional script with timings from generated audio. This is not an ASR test.":"Machine transcript. Unclear passages are marked; other transcription errors may remain."}</p></div><label className="search-field" data-tour="source-search"><Search size={17}/><span className="sr-only">Search transcript</span><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Find a word in this lesson…"/>{search&&<button className="icon-button" aria-label="Clear transcript search" onClick={()=>setSearch("")}><X size={15}/></button>}</label><div className="transcript-list">{shown.length?shown.map(s=><article key={s.id} className={`transcript-passage ${s.flags.length?"uncertain-passage":""}`}><button type="button" className="timestamp" aria-label={`Play transcript at ${formatTime(s.start)}`} onClick={()=>onPlay(s.start)}><Play size={11} weight="fill"/><bdi>{formatTime(s.start)}</bdi></button><div><p dir="auto">{s.text}</p>{s.flags.length>0&&<div className="uncertainty-label"><Headphones size={14}/>{uncertaintyText(s.flags,resolveMaterialLanguage(lesson.artifacts?.language,lesson.segments))} — {trustCopy(resolveMaterialLanguage(lesson.artifacts?.language,lesson.segments),"replay")}</div>}</div></article>):<div className="empty-state"><Search/><h3>No matching words.</h3><p>Try another spelling or a shorter phrase.</p></div>}</div></div>;
}
function DemoSources({preview}:{preview:boolean}) {
  return <div className="sources-workspace">
    <div className="tab-intro"><p className="eyebrow">ABOUT THIS EXAMPLE</p><h2>Sources for this example.</h2><p>These published pages were used to check the basic definitions in our fictional lesson.</p></div>
    <div className="source-form">{demoReferences.map(source=><p key={source.url}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.label} <ExternalLink size={15}/></a></p>)}</div>
    <p className="quiet-note">The notes and practice come from the fictional script. These links do not mean the lesson has been reviewed by a scholar.</p>
    <div className="tab-intro"><h3>Looking up a hadith from class?</h3><p>In your own lesson, choose the captured words to find possible hadith sources. A match helps you check the published wording; it does not confirm what your teacher meant.</p><p>This example has no hadith quotation to look up.</p></div>
    {preview&&<Link className="button secondary" href="/signin">Start your own lesson<ArrowRight size={16}/></Link>}
  </div>;
}
function Sources({lesson,onPlay,onError}:{lesson:Lesson;onPlay:(time:number)=>void;onError:(s:string)=>void}) {
  const [segmentId,setSegmentId]=useState(sourcePassages(lesson).find(s=>/hadith|narration|حديث|حدیث/i.test(s.text))?.id||sourcePassages(lesson)[0]?.id||"");
  const [wording,setWording]=useState(""),[language,setLanguage]=useState("ar"),[busy,setBusy]=useState(false),[error,setError]=useState("");
  const [result,setResult]=useState<{status:string;message:string;candidates:Candidate[]}|null>(null);
  const busyRef=useRef(false),segment=sourcePassages(lesson).find(s=>s.id===segmentId);
  async function search(event:React.FormEvent){
    event.preventDefault();if(busyRef.current||!segment||segment.flags.length)return;
    busyRef.current=true;setBusy(true);setResult(null);setError("");
    try{setResult(await api(`/api/lessons/${lesson.id}/references`,{method:"POST",body:JSON.stringify({segmentId,wording,language,version:lesson.version})}));}
    catch(failure){const text=message(failure);setError(text);onError(text);}
    finally{busyRef.current=false;setBusy(false);}
  }
  return <div className="sources-workspace">
    <div className="tab-intro"><p className="eyebrow">SEPARATE REFERENCE LOOKUP</p><h2>Possible hadith sources.</h2><p>{lesson.sourceKind==="pdf"?"Search HadeethEnc for a possible wording match from a cited PDF page. A match does not establish the author’s intended source or give a religious ruling.":"Search HadeethEnc for a wording match. A match does not confirm which narration your teacher meant or give a religious ruling."}</p></div>
    <form className="source-form" onSubmit={search}>
      <SourcePassagePicker lesson={lesson} value={segmentId} disabled={busy} onChange={id=>{setSegmentId(id);setWording("");setResult(null);setError("");}}/>
      {segment&&<SourceExcerpt key={segment.id} text={segment.text} label={lesson.sourceKind==="pdf"?"Source excerpt · check the PDF":"Captured words · check the audio"} actions={<SourceLink lesson={lesson} citation={{segmentId:segment.id,quote:segment.text}} onPlay={onPlay}/>}/>}
      {!!segment?.flags.length&&<p className="source-uncertain"><Headphones size={17}/><span>{lesson.sourceKind==="pdf"?"This page is flagged. Check the original PDF and use a clear passage.":"This passage has unclear wording. Replay it and choose a clear passage before looking up a source."}</span></p>}
      {segment&&<button type="button" disabled={busy||!!segment.flags.length} className="text-link source-copy" onClick={()=>setWording(segment.text.slice(0,400))}>Use these captured words<ArrowRight size={15}/></button>}
      <label className="field">Words to look up<textarea disabled={busy} rows={3} required minLength={12} maxLength={400} value={wording} onChange={event=>setWording(event.target.value)} placeholder="Use at least three words from the passage above…" dir="auto"/></label>
      <label className="field source-language">Source language<select disabled={busy} value={language} onChange={event=>setLanguage(event.target.value)}><option value="ar">Arabic</option><option value="en">English</option><option value="ur">Urdu</option></select></label>
      {error&&<p className="lesson-inline-error" role="alert"><WarningCircle size={17}/>{error}</p>}
      <button className="button primary" disabled={busy||!wording.trim()||!segment||!!segment.flags.length}>{busy?<><LoaderCircle className="spin" size={17}/>Looking for source records…</>:<><Search size={17}/>Find possible sources</>}</button>
      <p className="source-privacy-note">Only these captured words are sent to the public reference provider. Source matches stay separate from your class answers and practice.</p>
    </form>
    {result&&<div aria-live="polite" className="source-results"><p className="source-result-message">{result.message}</p>{result.candidates.map(candidate=><article className="source-card" key={candidate.id}>
      <span className="mini-label">POSSIBLE WORDING MATCH · {candidate.gradePublisher}</span><h3 dir="auto">{candidate.title}</h3><blockquote dir="auto">{candidate.text}</blockquote>
      <dl><div><dt>Published grade from {candidate.gradePublisher}</dt><dd dir="auto">{candidate.grade}</dd></div>{candidate.collectionAttribution&&<div><dt>Source’s collection attribution</dt><dd dir="auto">{candidate.collectionAttribution}</dd></div>}<div><dt>Provider record ID (not a collection number)</dt><dd>{candidate.id}</dd></div></dl>
      <a href={candidate.url} target="_blank" rel="noreferrer" className="text-link arrow-link">Open the publisher’s record<ExternalLink size={15}/></a><p className="source-record-note">Retrieved {new Date(candidate.retrievedAt).toLocaleDateString()}. Ask your teacher about the intended source and its meaning.</p>
    </article>)}</div>}
  </div>;
}
export function LessonView({lesson,viewerId,tab,setTab,onBack,onPlay,onError,onShare,onDelete,onReviewed,configured,focusItemId,onOpenPlan,preview=false}:{lesson:Lesson;viewerId?:string;preview?:boolean;tab:LessonTab;setTab:(t:LessonTab)=>void;onBack:()=>void;onPlay:(time:number)=>void;onError:(s:string)=>void;onShare:()=>void;onDelete:()=>void;onReviewed:(r:Review)=>void;configured:boolean;focusItemId:string|null;onOpenPlan?:()=>void}) {
  const [teacherCheck,setTeacherCheck]=useState(false);
  const [starterItem,setStarterItem]=useState<string|null>(null);
  function openStarterPractice(kind:"quiz"|"flashcard"){const item=availablePractice(lesson).find(p=>p.kind===kind);if(!item){onError(`No supported ${kind==="quiz"?"quiz questions":"flashcards"} are available yet. Try Detailed preparation in Notes.`);return;}setStarterItem(item.id);setTab("practice");}
  const [retrying,setRetrying]=useState(false);const retryRef=useRef(false);
  const readiness=lessonReadiness(lesson);
  const tabs:[LessonTab,string,React.ReactNode][]=[["catchup","Catch me up",<Headphones key="c" size={16}/>],["notes","Notes",<BookOpen key="n" size={16}/>],["ask","Ask this lesson",<MessageCircle key="a" size={16}/>],["practice","Practice",<Layers key="p" size={16}/>],["transcript",lesson.sourceKind==="pdf"?"PDF pages":"Transcript",<Headphones key="t" size={16}/>],["sources","References",<Search key="s" size={16}/>]];
  function exportNotes(){if(!lesson.artifacts||lesson.noteOptions?.enabled===false)return;const a=lesson.artifacts;const text=`# ${lesson.title}\n\n${lesson.demo?"Prepared fictional example":"AI-generated lesson notes"}\n\n`+a.notes.map(n=>`## ${n.heading}\n\n${n.text}\n\n`+n.evidence.map(c=>{const s=citedPassage(lesson,c);return `> ${c.quote}\n\n${lesson.sourceKind==="pdf"?"PDF page":"Audio time"}: ${sourceLabel(s)} · source v${lesson.version}\n`;}).join("\n")).join("\n");const url=URL.createObjectURL(new Blob([text],{type:"text/markdown"}));const link=document.createElement("a");link.href=url;link.download="DarsLoop-lesson-notes.md";link.click();URL.revokeObjectURL(url);}
  async function retry(){if(retryRef.current||lesson.shared||lesson.demo||preview)return;retryRef.current=true;setRetrying(true);try{await api(`/api/lessons/${lesson.id}`,{method:"POST",body:JSON.stringify({action:"retry"})});window.dispatchEvent(new Event("darsloop-refresh"));}catch(failure){onError(message(failure));}finally{retryRef.current=false;setRetrying(false);}}
  return <div className="lesson-view"><button type="button" className="back-link" onClick={onBack}><ArrowLeft size={16}/> {preview?"Back to DarsLoop":"All lessons"}</button><div className="lesson-heading" data-tour="lesson-heading"><div className="lesson-title-group"><span className="lesson-title-icon" aria-hidden="true">{lesson.sourceKind==="pdf"?<FilePdf size={32}/>:<FileAudio size={32}/>}</span><div><h1 dir="auto">{lesson.title}</h1><div className="lesson-meta"><span className="course-label">{lesson.course}</span><span>{lesson.sourceKind==="pdf"?<><FilePdf size={14}/>{lesson.sourcePageCount??0} PDF pages</>:<><Headphones size={14}/><bdi>{formatTime(lesson.duration)}</bdi> audio</>}</span>{lesson.shared&&<span><Users size={14}/>Shared with you</span>}</div></div></div><div className="lesson-actions">{!!sourcePassages(lesson).length&&<button className="button secondary small" onClick={()=>setTeacherCheck(true)}><Headphones size={16}/>Question for my teacher</button>}<button type="button" className="icon-button" onClick={exportNotes} disabled={!lesson.artifacts?.notes.length||lesson.noteOptions?.enabled===false} aria-label="Download notes"><ArrowDownToLine size={19}/></button>{!preview&&!lesson.shared&&<><button type="button" className="button secondary small" onClick={onShare} disabled={lesson.status!=="ready"}><Users size={16}/>Share</button><button type="button" className="icon-button" onClick={onDelete} aria-label="Delete lesson"><Trash2 size={19}/></button></>}</div></div>
  {lesson.providers?.checkMode==="single-pass"&&<div className="example-banner"><span>SINGLE-PASS TRANSCRIPT</span><p>This recording used {lesson.providers.provider}. It has no second transcription comparison. Replay important wording and ask your teacher about uncertain passages.</p></div>}
  {(lesson.status!=="ready"||readiness.needsAttention)&&<div className={`processing-banner ${lesson.status==="failed"?"processing-failed":""}`} role="status"><div>{lesson.status==="failed"?<WarningCircle size={23}/>:<BookOpen size={23}/>}</div><div><strong>{lesson.sourceKind==="pdf"&&lesson.pdfPages?.length?"Your PDF pages are ready.":lesson.transcriptionComplete?"Your transcript is ready.":lesson.status==="failed"?"Your lesson needs another try.":lesson.stage||"Preparing your lesson…"}</strong><p>{lesson.nextAttemptAt?`${lesson.sourceKind==="pdf"?"Your PDF and extracted pages":"Your audio and completed sections"} are saved. The queue will check capacity again after ${new Date(lesson.nextAttemptAt).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}. You can leave this page.`:(lesson.error||(lesson.status==="ready"?readiness.description:null))||(lesson.sourceKind==="pdf"?"Your private PDF is saved. Open it while study material is prepared.":"Your audio is saved. Listen while your study material is prepared.")}</p></div>{(lesson.status==="failed"||lesson.status==="ready"&&!!lesson.error)&&!lesson.shared&&!lesson.demo&&!preview&&<button type="button" className="button secondary small" disabled={retrying} onClick={()=>void retry()}>{retrying?"Retrying…":lesson.transcriptionComplete?"Retry study material":"Try again"}<ArrowCounterClockwise size={16}/></button>}</div>}
  {lesson.status==="ready"&&!readiness.needsAttention&&(readiness.state==="partial"||!!lesson.artifacts?.warnings?.length)&&<div className="processing-banner" role="status"><BookOpen size={23}/><div><strong>{readiness.state==="partial"?readiness.label:"Your study material is ready."}</strong>{readiness.coverageText&&<p>{readiness.coverageText}</p>}<p>{lesson.artifacts?.warnings?.join(" ")}</p>{readiness.state==="partial"&&<button type="button" className="text-link" onClick={()=>setTab("transcript")}>Check the {lesson.sourceKind==="pdf"?"PDF pages":"full transcript"}<ArrowRight size={15}/></button>}{(!lesson.artifacts?.practice.some(p=>p.kind==="quiz")||!lesson.artifacts?.practice.some(p=>p.kind==="flashcard"))&&!lesson.shared&&!lesson.demo&&!preview&&<p>You can request a fuller preparation in Notes → Detailed.</p>}</div>{tab!=="notes"&&(!lesson.artifacts?.practice.some(p=>p.kind==="quiz")||!lesson.artifacts?.practice.some(p=>p.kind==="flashcard"))&&!lesson.shared&&!lesson.demo&&!preview&&<button type="button" className="button secondary small" onClick={()=>setTab("notes")}>Open note options<ArrowRight size={16}/></button>}</div>}
  <div className="lesson-tabs" data-tour="lesson-tabs" role="tablist" aria-label="Lesson views">{tabs.map(([key,label,icon])=><button role="tab" id={`tab-${key}`} aria-controls={`panel-${key}`} aria-selected={tab===key} tabIndex={tab===key?0:-1} key={key} onClick={()=>setTab(key)} onKeyDown={e=>{if(e.key==="ArrowRight"||e.key==="ArrowLeft"){e.preventDefault();const i=tabs.findIndex(t=>t[0]===key);const next=tabs[(i+(e.key==="ArrowRight"?1:tabs.length-1))%tabs.length][0];setTab(next);document.getElementById(`tab-${next}`)?.focus();}}}>{icon}{label}</button>)}</div>
  <section className="lesson-panel" role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>{!sourcePassages(lesson).length?<div className="empty-state">{lesson.sourceKind==="pdf"?<FilePdf size={32}/>:<FileAudio size={32}/>}<h3>{lesson.sourceKind==="pdf"?"Your PDF is saved.":lesson.status==="failed"?"Your audio is still saved.":"Your recording is here."}</h3><p>{lesson.sourceKind==="pdf"?"PDF pages and study material appear after processing. Scans and locked files are not supported.":lesson.status==="failed"?"Study material couldn’t be prepared. You can still listen to the original recording below.":"Your transcript and study material will appear when processing finishes. You can listen below."}</p></div>:<>{tab==="catchup"&&<CatchUp lesson={lesson} onPlay={onPlay}/>} <div hidden={tab!=="notes"}><Notes key={`${lesson.id}:${lesson.version}`} lesson={lesson} onPlay={onPlay} preview={preview}/></div> <div hidden={tab!=="ask"}><Chat key={`${viewerId||"preview"}:${lesson.id}:${lesson.version}`} viewerId={viewerId} lesson={lesson} onPlay={onPlay} onError={onError} configured={configured} preview={preview} onOpenNotes={()=>setTab("notes")} onOpenSource={()=>setTab("transcript")} onOpenQuiz={()=>openStarterPractice("quiz")} onOpenCards={()=>openStarterPractice("flashcard")} onOpenPlan={onOpenPlan}/></div> {tab==="practice"&&<Practice lesson={lesson} onPlay={onPlay} onReviewed={onReviewed} onError={onError} focusItemId={starterItem||focusItemId} preview={preview}/>} {tab==="transcript"&&(lesson.sourceKind==="pdf"?<PdfPages lesson={lesson}/>:<AudioTranscript lesson={lesson} onPlay={onPlay}/>)} {tab==="sources"&&(hasCurrentDemoScript(lesson)?<DemoSources preview={preview}/>:preview?<div className="tab-intro"><p className="eyebrow">SEPARATE SOURCE LOOKUP</p><h2>A source needs actual wording.</h2><p>This fictional lesson has no hadith quotation to look up. In your own lesson, choose captured words to find possible publisher records. These matches stay separate from class answers.</p><Link className="button secondary" href="/signin">Start your own lesson<ArrowRight size={16}/></Link></div>:<Sources lesson={lesson} onPlay={onPlay} onError={onError}/>)}</>}</section>{teacherCheck&&<TeacherCheck lesson={lesson} onClose={()=>setTeacherCheck(false)}/>}</div>;
}
