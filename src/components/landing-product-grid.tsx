"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, Cards, Check, Headphones, LockKey, Microphone, Pause, Play, UploadSimple, ChatCircle } from "@phosphor-icons/react";
import type { Lesson } from "@/lib/types";
import { formatTime } from "@/lib/types";
import { getStudyPlan } from "@/lib/study-plan";
import { LessonNotes } from "./lesson-notes";
import { SourceEvidence } from "./source-evidence";
import styles from "./landing-product-grid.module.css";

/** These are current product components and authored lesson data, not generated UI images. */
export function LandingProductGrid({ lesson }: { lesson: Lesson }) {
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [notice, setNotice] = useState("");
  const [asked, setAsked] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [topic, setTopic] = useState<number | null>(null);
  const note = lesson.artifacts?.notes[1] ?? lesson.artifacts?.notes[0];
  const card = lesson.artifacts?.practice.find(item => item.kind === "flashcard");
  const topics = getStudyPlan([lesson], [], { includeDemo: true, now: 0 }).units[0]?.topics ?? [];
  const play = async (from?: number) => {
    if (!audio.current) return;
    if (playing && from === undefined) { audio.current.pause(); return; }
    if (from !== undefined) audio.current.currentTime = from;
    try { await audio.current.play(); setNotice(""); } catch { setNotice("Open the full example to listen to this passage."); }
  };
  useEffect(() => {
    const visibility = () => { if (document.hidden) audio.current?.pause(); };
    document.addEventListener("visibilitychange", visibility);
    return () => document.removeEventListener("visibilitychange", visibility);
  }, []);
  return <section id="features" className={styles.section} aria-labelledby="feature-grid-title" data-product-grid>
    <div className={styles.heading}><span className={styles.eyebrow}>YOUR CLASS, READY TO STUDY</span><h2 id="feature-grid-title">More than notes.<br/><em>A way to keep learning.</em></h2><p>Read the explanation. Ask about a point. Try it from memory.<br className={styles.desktopBreak}/> Your original lesson stays close.</p></div>
    <div className={styles.grid}>
      <article className={`${styles.card} ${styles.notesCard}`}>
        <div className={styles.window}><div className={styles.windowBar}><BookOpen size={15}/><span>Class notes</span><small>Fictional example</small></div><div className={styles.notesViewport}><LessonNotes lesson={lesson} preview onPlay={from => void play(from)}/></div></div>
        <div className={styles.copy}><h3>Notes you can come back to.</h3><p>A short summary with key points, or the fuller explanation. Each point has a link to its source.</p></div>
      </article>
      <article className={`${styles.card} ${styles.askCard}`}>
        <div className={styles.chatPreview}><span className={styles.miniLabel}><ChatCircle size={15}/> Ask this lesson</span><div className={styles.question}>How should I study after class?</div><div className={styles.answer}><img src="/art/hoopoe-guide-v10.png" alt="" width={32} height={32}/><div><small>From the lesson · prepared example</small><p>{asked ? note?.text : "Try the question to see a point from this class."}</p>{asked && note && <SourceEvidence lesson={lesson} evidence={note.evidence} onPlay={from => void play(from)}/>}</div></div><button className={styles.action} onClick={() => setAsked(value => !value)}>{asked ? "Reset example" : "Try this question"}<ArrowRight size={15}/></button></div>
        <div className={styles.copy}><h3>Keep the question in context.</h3><p>Ask about your selected lesson and open the passage behind the answer.</p></div>
      </article>
      <article className={`${styles.card} ${styles.audioCard}`}>
        <div className={styles.audioPreview}><span className={styles.audioBadge}><Microphone size={24}/></span><strong>Listening, catch-up &amp; revision</strong><span>Fictional class audio</span><div className={styles.wave} aria-hidden="true">{Array.from({length:29},(_,i) => <i key={i} style={{height:Math.round(8+Math.abs(Math.sin(i*1.8))*30)}}/>)}</div><div className={styles.transport}><button aria-label={playing ? "Pause grid example audio" : "Play grid example audio"} onClick={() => void play()}>{playing ? <Pause size={17}/> : <Play size={17} weight="fill"/>}</button><span>{formatTime(time)} / {formatTime(lesson.duration)}</span><Headphones size={15}/></div></div>
        <div className={styles.copy}><h3>Go back to the moment.</h3><p>Replay the original words when a summary needs more context.</p></div>
      </article>
      <article className={`${styles.card} ${styles.recallCard}`}>
        <div className={styles.flashcard}><span className={styles.miniLabel}><Cards size={15}/> Flashcards</span><small>{revealed ? "THE CLASS EXPLANATION" : "TRY TO RECALL"}</small><p>{revealed ? card?.answer : card?.question}</p><button className={styles.action} aria-pressed={revealed} onClick={() => setRevealed(value => !value)}>{revealed ? "Try again" : "Reveal answer"}<ArrowRight size={15}/></button></div>
        <div className={styles.copy}><h3>Give the idea a try.</h3><p>Quiz yourself and turn over a card. Check your answer against what the class covered.</p></div>
      </article>
      <article className={`${styles.card} ${styles.planCard}`}>
        <div className={styles.planPreview}><span className={styles.miniLabel}><BookOpen size={15}/> Study plan</span>{topics.slice(0,3).map((item,index) => <button key={item.id} aria-expanded={topic===index} onClick={() => setTopic(value => value===index ? null : index)}><i/><span>{item.title}<small>{topic===index ? "Open the class notes" : "Ready to try"}</small></span><ArrowRight size={14}/></button>)}{topic!==null && <Link className={styles.topicLink} href="/example">Open this lesson<ArrowRight size={14}/></Link>}</div>
        <div className={styles.copy}><h3>Find your next study step.</h3><p>See the lesson’s topics and return to the points you want to practise.</p></div>
      </article>
    </div>
    <p className={styles.exampleNote}>Actual product notes and lesson data · fictional example · practice here isn’t saved</p>
    {notice && <p role="status" className={styles.exampleNote}>{notice}</p>}
    <audio ref={audio} src="/example/audio" preload="none" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} onTimeUpdate={() => setTime(audio.current?.currentTime ?? 0)}/>
  </section>;
}

const journey = [
  { title: "Keep the original.", copy: "Record with permission, or upload audio, video or a selectable-text PDF.", icon: UploadSimple },
  { title: "Prepare the clear parts.", copy: "The lesson becomes a transcript or page text, with unclear passages flagged.", icon: Headphones },
  { title: "Make it study material.", copy: "Supported passages become notes, questions and flashcards.", icon: BookOpen },
  { title: "Come back to the source.", copy: "Open the explanation behind a point, then choose what to practise next.", icon: Cards },
] as const;
const tools = [{id:"notes",label:"Notes",icon:BookOpen},{id:"ask",label:"Ask",icon:ChatCircle},{id:"quiz",label:"Quiz",icon:Check},{id:"cards",label:"Cards",icon:Cards}] as const;
type Tool = typeof tools[number]["id"];

export function LandingLessonJourney({lesson}:{lesson:Lesson}) {
  const [selected,setSelected]=useState<Tool>("notes");
  const note=lesson.artifacts?.notes[0];
  const item=lesson.artifacts?.practice.find(item=>item.kind===(selected==="cards"?"flashcard":"quiz"));
  const passage=(selected==="notes"||selected==="ask"?note:item)?.evidence[0];
  const segment=lesson.segments.find(segment=>segment.id===passage?.segmentId);
  return <>
    <section id="how-it-works" className={styles.journey} aria-labelledby="journey-title" data-lesson-journey>
      <div className={styles.heading}><span className={styles.eyebrow}>FROM CLASS TO STUDY TIME</span><h2 id="journey-title">What happens after<br/><em>you add a lesson?</em></h2><p>Your material becomes a place to read, ask and practise.</p></div>
      <div className={styles.steps}>{journey.map(({title,copy,icon:Icon},index)=><article key={title}><div className={styles.stepArt}><span><Icon size={32}/></span><i aria-hidden="true">{String(index+1).padStart(2,"0")}</i></div><h3>{title}</h3><p>{copy}</p></article>)}</div>
      <p className={styles.journeyNote}>Long lessons can take longer to prepare. Your lesson shows progress, partial material and any action needed.</p>
    </section>
    <section className={styles.connected} aria-labelledby="connected-title" data-source-diagram>
      <div className={styles.heading}><span className={styles.eyebrow}>THE EXPLANATION STAYS CONNECTED</span><h2 id="connected-title">One lesson.<br/><em>Every study tool.</em></h2><p>Choose a tool below. The original source stays at the centre.</p></div>
      <div className={styles.diagram}>
        <div className={styles.sourceNode}><span><Headphones size={22}/></span><div><small>YOUR ORIGINAL LESSON</small><strong>{lesson.title}</strong><p>{lesson.course} · {formatTime(lesson.duration)} · Fictional example</p></div></div>
        <div className={styles.branches} role="group" aria-label="Tools connected to the lesson">{tools.map(({id,label,icon:Icon})=><button key={id} aria-pressed={selected===id} onClick={()=>setSelected(id)}><Icon size={21}/>{label}</button>)}</div>
        <div className={styles.diagramDetail} aria-live="polite"><span className={styles.diagramLabel}>{selected==="notes"?"PREPARED CLASS NOTE":selected==="ask"?"PREPARED CLASS ANSWER":selected==="quiz"?"A QUESTION FROM THIS CLASS":"A CARD FROM THIS CLASS"}</span><h3>{selected==="notes"?note?.heading:selected==="ask"?"What should I focus on while listening?":item?.question}</h3><p>{selected==="notes"||selected==="ask"?note?.text:"Open the full example to try the answer and check its original passage."}</p>{passage && <details className={styles.passage}><summary><Play size={12} weight="fill"/>{formatTime(segment?.start??0)}<span>Original passage</span><ArrowRight size={14}/></summary><blockquote>{passage.quote}</blockquote><Link href="/example">Listen in the full example<ArrowRight size={14}/></Link></details>}</div>
      </div>
      <div className={styles.sharing}><LockKey size={20}/><div><h3>Keep up with your study circle.</h3><p>Share a permitted lesson with invited classmates. Each person’s practice stays private.</p></div><Link href="/signin">Start a private class<ArrowRight size={17}/></Link></div>
    </section>
  </>;
}
