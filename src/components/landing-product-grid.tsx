"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, Cards, Check, Headphones, LockKey, Microphone, Pause, Play, ChatCircle } from "@phosphor-icons/react";
import type { Lesson } from "@/lib/types";
import { formatTime } from "@/lib/types";
import { getStudyPlan } from "@/lib/study-plan";
import { LessonNotes } from "./lesson-notes";
import { SourceEvidence } from "./source-evidence";
import { useLandingLoop } from "./use-landing-loop";
import product from "./product-tour.module.css";
import styles from "./landing-product-grid.module.css";

/** Compact views of the current product, with the public lesson's prepared data. */
export function LandingProductGrid({ lesson }: { lesson: Lesson }) {
  const loop = useLandingLoop();
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [notice, setNotice] = useState("");
  const [manualNotes, setManualNotes] = useState<{tick:number;value:"summary"|"detailed"}>();
  const [manualAsked, setManualAsked] = useState<{tick:number;value:boolean}>();
  const [manualCard, setManualCard] = useState<{tick:number;value:boolean}>();
  const [manualTopic, setManualTopic] = useState<{tick:number;value:number|null}>();
  const note = lesson.artifacts?.notes[1] ?? lesson.artifacts?.notes[0];
  const card = lesson.artifacts?.practice.find(item => item.kind === "flashcard");
  const topics = getStudyPlan([lesson], [], { includeDemo: true, now: 0 }).units[0]?.topics ?? [];
  const view = manualNotes?.tick===loop.tick ? manualNotes.value : loop.tick<24 ? "summary" : "detailed";
  const asked = manualAsked?.tick===loop.tick ? manualAsked.value : loop.tick>=14 && loop.tick<42;
  const revealed = manualCard?.tick===loop.tick ? manualCard.value : loop.tick>=22 && loop.tick<43;
  const topic = manualTopic?.tick===loop.tick ? manualTopic.value : Math.floor(loop.tick/16);
  const question = "How should I study after class?";
  const typed = asked ? question : question.slice(0, Math.min(question.length, loop.tick*3));
  const play = async (from?: number) => {
    loop.interact();
    if (!audio.current) return;
    if (playing && from === undefined) { audio.current.pause(); return; }
    if (from !== undefined) audio.current.currentTime = from;
    try { await audio.current.play(); setNotice(""); } catch { setNotice("Open the full example to listen to this passage."); }
  };
  useEffect(() => {
    const visibility = () => { if (document.hidden) audio.current?.pause(); };
    document.addEventListener("visibilitychange", visibility);
    return () => { document.removeEventListener("visibilitychange", visibility); };
  }, []);
  return <section ref={loop.root} id="features" className={styles.section} aria-labelledby="feature-grid-title" data-product-grid data-loop-tick={loop.tick} data-loop-running={loop.running} onPointerDown={loop.interact} onKeyDown={loop.interact}>
    <div className={styles.heading}><h2 id="feature-grid-title">Your lesson, ready<br/><em>for the way you study.</em></h2><p>Find a point, work through a question, or pick up where you left off.</p></div>
    <div className={styles.grid}>
      <article className={`${styles.card} ${styles.notesCard}`}>
        <div className={`${styles.art} ${styles.cream}`}><div className={styles.window}><div className={styles.windowBar}><BookOpen size={14}/><span>Class notes</span></div><div className={styles.notesViewport} data-note-view={view}><LessonNotes lesson={lesson} preview previewView={view} onPreviewViewChange={value=>setManualNotes({tick:loop.tick,value:value==="detailed"?"detailed":"summary"})} onPlay={from => void play(from)}/></div></div></div>
        <div className={styles.copy}><h3>Find the point. Keep the detail.</h3><p>Switch between a short summary and fuller notes. Open the source behind each point.</p></div>
      </article>
      <article className={`${styles.card} ${styles.askCard}`}>
        <div className={`${styles.art} ${styles.blue}`}><div className={styles.chatPreview}><span className={styles.miniLabel}><ChatCircle size={14}/> Ask this lesson</span><div className={styles.question}>{typed || "Ask about a point…"}<i aria-hidden="true"/></div>{asked && <div className={styles.answer}><img src="/art/hoopoe-guide-v10.png" alt="" width={25} height={25}/><div><small>From this lesson</small><p>{note?.text}</p>{note && <SourceEvidence lesson={lesson} evidence={note.evidence} onPlay={from => void play(from)}/>}</div></div>}<button className={styles.action} onClick={() => setManualAsked({tick:loop.tick,value:!asked})}>{asked ? "Try again" : "Ask this question"}<ArrowRight size={14}/></button></div></div>
        <div className={styles.copy}><h3>An answer with somewhere to look.</h3><p>Ask about your selected lesson and check the passage that supports the answer.</p></div>
      </article>
      <article className={`${styles.card} ${styles.recallCard}`}>
        <div className={`${styles.art} ${styles.sage}`}><div className={`${product.flashcard} ${styles.flashcard}`} data-card-revealed={revealed}><span className={styles.miniLabel}><Cards size={14}/> Flashcards</span><small>{revealed ? "THE CLASS EXPLANATION" : "TRY TO RECALL"}</small><h4>{revealed ? card?.answer : card?.question}</h4><button className={styles.action} aria-pressed={revealed} onClick={() => setManualCard({tick:loop.tick,value:!revealed})}>{revealed ? "Try again" : "Reveal answer"}<ArrowRight size={14}/></button></div></div>
        <div className={styles.copy}><h3>See what you can recall.</h3><p>Try a quiz or turn over a flashcard. Return to the explanation when you need it.</p></div>
      </article>
      <article className={`${styles.card} ${styles.audioCard}`}>
        <div className={`${styles.art} ${styles.sand}`}><div className={styles.audioPreview}><span className={styles.audioBadge}><Microphone size={22}/></span><strong>{lesson.title}</strong><span>Original lesson · fictional audio</span><div className={`${styles.wave} ${loop.running?styles.waveRunning:""}`} aria-hidden="true">{Array.from({length:29},(_,i) => <i key={i} style={{height:Math.round(8+Math.abs(Math.sin(i*1.8))*26),animationDelay:`${i*-.09}s`}}/>)}</div><div className={styles.transport}><button aria-label={playing ? "Pause grid example audio" : "Play grid example audio"} onClick={() => void play()}>{playing ? <Pause size={17}/> : <Play size={17} weight="fill"/>}</button><span>{formatTime(time)} / {formatTime(lesson.duration)}</span><Headphones size={15}/></div></div></div>
        <div className={styles.copy}><h3>Hear it in its own words.</h3><p>A timestamp takes you back to the original explanation. Audio plays when you choose it.</p></div>
      </article>
      <article className={`${styles.card} ${styles.planCard}`}>
        <div className={`${styles.art} ${styles.mist}`}><div className={styles.planPreview}><span className={styles.miniLabel}><BookOpen size={14}/> Study plan</span>{topics.slice(0,3).map((item,index) => <button key={item.id} aria-expanded={topic===index} onClick={() => setManualTopic({tick:loop.tick,value:topic===index?null:index})}><i/><span>{item.title}<small>{topic===index ? "Open the class notes" : "Ready to try"}</small></span><ArrowRight size={14}/></button>)}<Link className={styles.topicLink} href="/example">Open this lesson<ArrowRight size={14}/></Link></div></div>
        <div className={styles.copy}><h3>Pick up the next point.</h3><p>See your lesson’s topics together and choose what to practise next.</p></div>
      </article>
    </div>
    <p className={styles.exampleNote}>Product previews · fictional lesson · prepared answers · practice isn’t saved here</p>
    {notice && <p role="status" className={styles.exampleNote}>{notice}</p>}
    <audio ref={audio} src="/example/audio" preload="none" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} onTimeUpdate={() => setTime(audio.current?.currentTime ?? 0)}/>
  </section>;
}

const journey = [
  { title: "Keep the original.", copy: "Record with permission, or add audio, video or a selectable-text PDF.", art: "original" },
  { title: "Prepare the clear parts.", copy: "Available speech or page text is prepared. Unclear passages are flagged.", art: "clear" },
  { title: "Make room to practise.", copy: "Supported passages become notes, questions and flashcards.", art: "practice" },
  { title: "Check the explanation.", copy: "Return to the source behind a point, then choose your next study step.", art: "source" },
] as const;
const tools = [{id:"notes",label:"Notes",icon:BookOpen},{id:"ask",label:"Ask",icon:ChatCircle},{id:"quiz",label:"Quiz",icon:Check},{id:"cards",label:"Cards",icon:Cards}] as const;
type Tool = typeof tools[number]["id"];

export function LandingLessonJourney({lesson}:{lesson:Lesson}) {
  const loop=useLandingLoop();
  const [manual,setManual]=useState<{tick:number;tool:Tool}>();
  const [manualReveal,setManualReveal]=useState<{tick:number;value:boolean}>();
  const selected=manual?.tick===loop.tick?manual.tool:tools[Math.floor(loop.tick/12)].id;
  const revealed=manualReveal?.tick===loop.tick?manualReveal.value:loop.tick%12>=6;
  const note=lesson.artifacts?.notes[0];
  const item=lesson.artifacts?.practice.find(item=>item.kind===(selected==="cards"?"flashcard":"quiz"));
  const passage=(selected==="notes"||selected==="ask"?note:item)?.evidence[0];
  const segment=lesson.segments.find(segment=>segment.id===passage?.segmentId);
  return <>
    <section id="how-it-works" className={styles.journey} aria-labelledby="journey-title" data-lesson-journey>
      <img className={styles.journeyClouds} src="/art/hero-clouds-v40.webp" alt="" loading="lazy"/>
      <div className={styles.heading}><h2 id="journey-title">From a lesson<br/><em>to your next study session.</em></h2><p>One place for the material you bring and the practice that follows.</p></div>
      <div className={styles.steps}>{journey.map(({title,copy,art})=><article key={title}><div className={styles.stepArt}><img src={`/art/lesson-${art}-v45.webp`} alt="" width={140} height={140} loading="lazy"/></div><h3>{title}</h3><p>{copy}</p></article>)}</div>
      <p className={styles.journeyNote}>Long lessons can take longer to prepare. Your lesson shows progress and any action needed.</p>
    </section>
    <section ref={loop.root} className={styles.connected} aria-labelledby="connected-title" data-source-diagram data-loop-tick={loop.tick} data-loop-running={loop.running} data-tool={selected} onPointerDown={loop.interact} onKeyDown={loop.interact}>
      <div className={styles.heading}><h2 id="connected-title">Different ways to study.<br/><em>The same source to check.</em></h2><p>Your original lesson stays connected to every study tool.</p></div>
      <div className={styles.diagram}>
        <div className={styles.sourceNode}><Headphones size={19}/><div><strong>{lesson.title}</strong><span>{formatTime(lesson.duration)} · Fictional example</span></div></div>
        <div className={styles.connector} aria-hidden="true"><i/></div>
        <div className={styles.branches} role="group" aria-label="Tools connected to the lesson">{tools.map(({id,label,icon:Icon})=><button key={id} aria-pressed={selected===id} onClick={()=>setManual({tick:loop.tick,tool:id})}><Icon size={17}/>{label}</button>)}</div>
        <div className={styles.diagramDetail} key={selected}>
          {selected==="notes" && <div className={product.summary}><span className={styles.miniLabel}><BookOpen size={14}/> Class notes</span><h4>{note?.heading}</h4><p>{note?.text}</p></div>}
          {selected==="ask" && <div className={styles.connectedChat}><div className={styles.question}>What should I focus on while listening?</div><div className={styles.answer}><img src="/art/hoopoe-guide-v10.png" alt="" width={25} height={25}/><p>{note?.text}</p></div></div>}
          {selected==="quiz" && <div className={styles.quiz}><p className={product.question}>{item?.question}</p><div className={product.choices}>{item?.choices.map((choice,index)=><button className={revealed&&choice===item.answer?product.correct:""} key={choice} onClick={()=>setManualReveal({tick:loop.tick,value:true})}><span>{String.fromCharCode(65+index)}</span>{choice}{revealed&&choice===item.answer&&<Check size={15}/>}</button>)}</div><small>{revealed?"Prepared example answer shown":"A question from this lesson"}</small></div>}
          {selected==="cards" && <div className={`${product.flashcard} ${styles.connectedCard}`}><span className={styles.miniLabel}><Cards size={14}/> {revealed?"Answer":"Flashcard"}</span><h4>{revealed?item?.answer:item?.question}</h4><button className={styles.action} onClick={()=>setManualReveal({tick:loop.tick,value:!revealed})}>{revealed?"Try again":"Reveal answer"}<ArrowRight size={14}/></button></div>}
        </div>
        {passage && <details className={styles.passage}><summary><Play size={12} weight="fill"/>{formatTime(segment?.start??0)}<span>Original passage</span><ArrowRight size={14}/></summary><blockquote>{passage.quote}</blockquote><Link href="/example">Listen in the full example<ArrowRight size={14}/></Link></details>}
      </div>
      <div className={styles.sharing}><LockKey size={19}/><div><h3>Bring your study circle along.</h3><p>Share a permitted lesson with invited classmates. Personal practice stays private.</p></div><Link href="/signin">Start a private class<ArrowRight size={16}/></Link></div>
    </section>
  </>;
}
