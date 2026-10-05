"use client";
import { useEffect, useState } from "react";
import { Brain, BookOpen, Cards, MapTrifold, NotePencil, ListChecks, Pause, Play } from "@phosphor-icons/react";
import type { Lesson } from "@/lib/types";
import styles from "./lesson-chat.module.css";

const headings = ["How can I help?", "What would you like to study?"];
export function ChatHeading() {
  const [phrase, setPhrase] = useState(0), [words, setWords] = useState(0), [paused, setPaused] = useState(false), [reduced, setReduced] = useState(true);
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const mobile = window.matchMedia("(max-width: 800px)");
    const update = () => setReduced(preference.matches || mobile.matches);
    update(); preference.addEventListener("change", update); mobile.addEventListener("change", update);
    return () => { preference.removeEventListener("change", update); mobile.removeEventListener("change", update); };
  }, []);
  const parts = headings[phrase].split(" ");
  useEffect(() => {
    if (paused || reduced) return;
    const timer = window.setTimeout(() => {
      if (words < parts.length) setWords(words + 1);
      else { setPhrase((phrase + 1) % headings.length); setWords(0); }
    }, words < parts.length ? 240 : 6000);
    return () => window.clearTimeout(timer);
  }, [words, phrase, parts.length, paused, reduced]);
  return <div className={styles.heading}><h2><span className="sr-only">How can I help?</span><span aria-hidden="true">{reduced || paused ? headings[phrase] : parts.slice(0, words).join(" ") || "\u00a0"}</span></h2>{!reduced && <button type="button" aria-label={paused ? "Resume heading animation" : "Pause heading animation"} aria-pressed={paused} onClick={() => setPaused(!paused)}>{paused ? <Play size={14}/> : <Pause size={14}/>}</button>}</div>;
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
