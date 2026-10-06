"use client";
import { useEffect, useRef, useState } from "react";
import { Brain, BookOpen, Cards, MapTrifold, NotePencil, ListChecks } from "@phosphor-icons/react";
import type { Lesson } from "@/lib/types";
import styles from "./lesson-chat.module.css";

const headings = ["How can I help?", "What would you like to study?"];
export function ChatHeading() {
  const [phrase,setPhrase]=useState(0),[words,setWords]=useState(0),[reduced,setReduced]=useState(false),[visible,setVisible]=useState(false),[visit,setVisit]=useState(0);
  const root=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    const preference=window.matchMedia("(prefers-reduced-motion: reduce)");
    const update=()=>setReduced(preference.matches);
    update();preference.addEventListener("change",update);
    return()=>preference.removeEventListener("change",update);
  },[]);
  useEffect(()=>{
    const node=root.current;if(!node)return;
    const observer=new IntersectionObserver(([entry])=>setVisible(entry.isIntersecting),{threshold:.7});observer.observe(node);
    const replay=()=>{if(document.visibilityState==="visible")setVisit(value=>value+1);};
    window.addEventListener("pageshow",replay);document.addEventListener("visibilitychange",replay);
    return()=>{observer.disconnect();window.removeEventListener("pageshow",replay);document.removeEventListener("visibilitychange",replay);};
  },[]);
  useEffect(()=>{setPhrase(0);setWords(0);},[visible,visit]);
  const parts=headings[phrase].split(" ");
  useEffect(()=>{
    if(reduced||!visible||phrase===headings.length-1&&words===parts.length)return;
    const timer=window.setTimeout(()=>{
      if(words<parts.length)setWords(words+1);
      else {setPhrase(phrase+1);setWords(0);}
    },words<parts.length?(words===0?400:220):1200);
    return()=>window.clearTimeout(timer);
  },[words,phrase,parts.length,reduced,visible,visit]);
  return <div ref={root} className={styles.heading}><h2><span className="sr-only">How can I help?</span><span aria-hidden="true">{parts.map((word,index)=><span key={`${phrase}-${index}`} className={styles.headingWord} data-visible={reduced||index<words}>{word}{index<parts.length-1?"\u00a0":""}</span>)}</span></h2></div>;
}

export function ChatStarters({ lesson, onAsk, onNotes, onQuiz, onCards, onPlan }: {
  lesson?: Lesson; onAsk: (question: string) => void; onNotes?: () => void; onQuiz?: () => void; onCards?: () => void; onPlan?: () => void;
}) {
  const [more, setMore] = useState(false);
  const topics = [...new Set(lesson?.artifacts?.notes.map(n => n.heading) || [])].slice(0, 2);
  const prompts = [
    { label: "What is this lesson about?", mobileLabel: "What is this lesson about?", Icon: Brain, tone: "blue", run: () => onAsk("What is this lesson about?") },
    { label: "How do the main topics connect?", mobileLabel: "How do topics connect?", Icon: Brain, tone: "blue", run: () => onAsk("How do the main topics connect in this lesson?") },
    { label: onPlan ? "Open my study plan" : "Explain this lesson in detail", mobileLabel: onPlan ? "Open study plan" : "Explain in detail", Icon: onPlan ? MapTrifold : BookOpen, tone: "green", run: onPlan || (() => onAsk("Explain this lesson in detail")) },
    { label: onQuiz ? "Quiz me on this lesson" : "Explain a key idea", mobileLabel: onQuiz ? "Quiz this lesson" : "Explain a key idea", Icon: ListChecks, tone: "green", run: onQuiz || (() => onAsk(topics[0] ? `Explain “${topics[0]}” using this lesson.` : "Explain this lesson in detail")) },
    { label: onCards ? "Review this lesson’s flashcards" : "Explain the lesson’s terms", mobileLabel: onCards ? "Review flashcards" : "Explain lesson terms", Icon: Cards, tone: "orange", run: onCards || (() => onAsk("Which terms are explained in this lesson?")) },
    { label: onNotes ? "Show my study notes" : "Give me a short overview", mobileLabel: onNotes ? "Show study notes" : "Short overview", Icon: NotePencil, tone: "orange", run: onNotes || (() => onAsk("Give me a short overview")) },
  ];
  return <div className={styles.starters}>
    <div className={styles.chips} data-tour="home-prompts">{prompts.map(({ label, mobileLabel, Icon, tone, run }) => <button type="button" key={label} aria-label={label} onClick={run}><span className={styles.chipIcon} data-tone={tone} aria-hidden="true"><Icon size={18}/></span><span dir="auto"><span className={styles.desktopLabel}>{label}</span><span className={styles.mobileLabel}>{mobileLabel}</span></span></button>)}{more && <>{onPlan&&<button type="button" onClick={() => onAsk("Explain this lesson in detail")}><span className={styles.chipIcon} data-tone="blue" aria-hidden="true"><Brain size={18}/></span><span>Explain this lesson in detail</span></button>}{topics.map(topic => <button type="button" key={topic} onClick={() => onAsk(`Explain “${topic}” using this lesson.`)}><span className={styles.chipIcon} data-tone="orange" aria-hidden="true"><NotePencil size={18}/></span><span dir="auto">{topic}</span></button>)}</>}</div>
    <button type="button" className={styles.more} aria-expanded={more} onClick={() => setMore(!more)}>{more ? "View less" : "View more"}</button>
  </div>;
}
