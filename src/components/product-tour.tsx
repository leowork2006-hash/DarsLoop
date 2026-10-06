"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, Check, CheckCircle2, ChevronDown, Headphones, Home, Layers, LockKeyhole, MessageCircle, MousePointer2, Pause, Play, Plus, RotateCcw, Send, Users, X } from "lucide-react";
import type { Citation, Lesson } from "@/lib/types";
import { formatTime } from "@/lib/types";
import { Brand } from "./brand";
import styles from "./product-tour.module.css";

const tabs = [
  { id: "notes", label: "Notes", icon: BookOpen },
  { id: "ask", label: "Ask this class", icon: MessageCircle },
  { id: "quiz", label: "Quiz", icon: CheckCircle2 },
  { id: "cards", label: "Flashcards", icon: Layers },
] as const;
type Tab = typeof tabs[number]["id"];
const tourSteps = [
  { delay: 700, target: "detail" }, { delay: 800, action: "detail" },
  { delay: 2300, target: "ask" }, { delay: 800, action: "ask" },
  { delay: 950, target: "send" }, { delay: 750, action: "send" },
  { delay: 4200, target: "quiz" }, { delay: 800, action: "quiz" },
  { delay: 850, target: "choice" }, { delay: 700, action: "choose" },
  { delay: 850, target: "check" }, { delay: 650, action: "check" },
  { delay: 2200, target: "cards" }, { delay: 800, action: "cards" },
  { delay: 900, target: "reveal" }, { delay: 750, action: "reveal" },
  { delay: 1800, target: "rating" }, { delay: 750, action: "rating" },
  { delay: 1700, target: "notes" }, { delay: 750, action: "notes" },
] as const;
const demoQuestion = "How should I revise after class?";

/** A local, prepared example. It never invokes AI or changes the lesson's demo status. */
export function ProductTour({ lesson }: { lesson: Lesson }) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const screen = useRef<HTMLDivElement>(null);
  const audio = useRef<HTMLAudioElement>(null);
  const [tab, setTab] = useState<Tab>("notes");
  const [detail, setDetail] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [inView, setInView] = useState(false);
  const [visible, setVisible] = useState(true);
  const [step, setStep] = useState(0);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const [question, setQuestion] = useState(demoQuestion);
  const [sent, setSent] = useState("");
  const [answerIndex, setAnswerIndex] = useState<number | null>(null);
  const [words, setWords] = useState(0);
  const [manualChat, setManualChat] = useState(false);
  const [choice, setChoice] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [rating, setRating] = useState("");
  const [source, setSource] = useState<Citation | null>(null);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioNotice, setAudioNotice] = useState("");
  const notes = lesson.artifacts?.notes ?? [];
  const quiz = lesson.artifacts?.practice.find(item => item.kind === "quiz");
  const card = lesson.artifacts?.practice.find(item => item.kind === "flashcard");
  const answer = answerIndex === null ? "This prepared example covers listening, catch-up and revision. Try a question about one of those topics." : notes[answerIndex]?.text ?? "This topic is not covered in the example.";
  const answerWords = answer.split(/\s+/);
  const running = playing && !reduced && inView && visible;

  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const motion = () => { setReduced(media.matches); if (media.matches) setPlaying(false); };
    setReduced(media.matches);
    setPlaying(!media.matches);
    media.addEventListener("change", motion);
    const visibility = () => setVisible(!document.hidden);
    visibility();
    document.addEventListener("visibilitychange", visibility);
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: .15 });
    if (root.current) observer.observe(root.current);
    return () => { media.removeEventListener("change", motion); document.removeEventListener("visibilitychange", visibility); observer.disconnect(); };
  }, []);

  const submitQuestion = useCallback((value: string, manual: boolean) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    const text = trimmed.toLowerCase();
    const match = /quiz|mistake|wrong/.test(text) ? 3 : /absen|absent|miss|catch/.test(text) ? 2 : /revis|return|remember|check/.test(text) ? 1 : /listen|writ|note|attention/.test(text) ? 0 : null;
    setSent(trimmed); setAnswerIndex(match !== null && notes[match] ? match : null); setWords(0); setManualChat(manual); setSource(null);
  }, [notes]);

  useEffect(() => {
    if (!sent) return;
    if (reduced) { setWords(answerWords.length); return; }
    if (!inView || !visible || (!manualChat && !running)) return;
    if (words >= answerWords.length) return;
    const timer = setTimeout(() => setWords(count => Math.min(count + 1, answerWords.length)), 58);
    return () => clearTimeout(timer);
  }, [sent, reduced, inView, visible, manualChat, running, words, answerWords.length]);

  useEffect(() => {
    if (!running) return;
    const current = tourSteps[step];
    const timer = setTimeout(() => {
      if ("target" in current) {
        const element = frame.current?.querySelector<HTMLElement>(`[data-tour-target="${current.target}"]`);
        if (element && frame.current) {
          if (screen.current?.contains(element)) {
            const control = element.getBoundingClientRect(), panel = screen.current.getBoundingClientRect();
            if (control.bottom > panel.bottom - 12) screen.current.scrollTop += control.bottom - panel.bottom + 12;
            else if (control.top < panel.top + 12) screen.current.scrollTop -= panel.top - control.top + 12;
          }
          const rect = element.getBoundingClientRect(), bounds = frame.current.getBoundingClientRect();
          setCursor({ x: rect.left - bounds.left + rect.width * .58, y: rect.top - bounds.top + rect.height * .55 });
        }
      } else {
        switch (current.action) {
          case "detail": setDetail(true); break;
          case "ask": setTab("ask"); setSource(null); setQuestion(demoQuestion); setSent(""); break;
          case "send": submitQuestion(demoQuestion, false); break;
          case "quiz": setTab("quiz"); setSource(null); setChoice(null); setChecked(false); break;
          case "choose": setChoice(quiz?.answer ?? null); break;
          case "check": setChecked(true); break;
          case "cards": setTab("cards"); setSource(null); setRevealed(false); setRating(""); break;
          case "reveal": setRevealed(true); break;
          case "rating": setRating("Marked for another review."); break;
          case "notes": setTab("notes"); setSource(null); setDetail(false); break;
        }
      }
      setStep(index => (index + 1) % tourSteps.length);
    }, current.delay);
    return () => clearTimeout(timer);
  }, [running, step, quiz?.answer, submitQuestion]);

  useEffect(() => { audio.current?.pause(); setAudioNotice(""); }, [source, tab]);
  useEffect(() => { if (screen.current) screen.current.scrollTop = 0; }, [tab]);

  const pause = () => setPlaying(false);
  const selectTab = (next: Tab) => { pause(); setTab(next); setSource(null); };
  const openSource = (citation?: Citation) => { pause(); if (citation) setSource(citation); };
  const sourceSegment = source ? lesson.segments.find(segment => segment.id === source.segmentId) : undefined;
  const playSource = async () => {
    pause();
    if (!audio.current || !sourceSegment) return;
    if (audioPlaying) { audio.current.pause(); return; }
    audio.current.currentTime = sourceSegment.start;
    try { await audio.current.play(); setAudioNotice(""); } catch { setAudioNotice("Audio could not start. Open the full example to try again."); }
  };
  const citation = (evidence?: Citation[]) => {
    const first = evidence?.[0];
    const passage = lesson.segments.find(segment => segment.id === first?.segmentId);
    return first ? <button className={styles.citation} onClick={() => openSource(first)}><Headphones size={13} /> {passage ? formatTime(passage.start) : "Source"} <span>Class passage</span><ArrowRight size={12} /></button> : null;
  };

  return <div className={styles.wrap} ref={root} data-product-tour data-scene={tab} data-tour-running={running}>
    <div className={styles.frame} ref={frame} onPointerDownCapture={pause} onFocusCapture={pause}>
      <div className={styles.chrome}><span className={styles.dots} aria-hidden="true"><i /><i /><i /></span><span className={styles.address}><LockKeyhole size={11} /> DarsLoop / Your study space</span><span className={styles.chromeLabel}>Interactive example</span></div>
      <div className={styles.app}>
        <aside className={styles.sidebar} aria-label="Example workspace">
          <Brand />
          <Link href="/example" className={styles.add}><Plus size={15} /> Open example</Link>
          <span className={styles.sideItem}><Home size={17} /> Home</span>
          <span className={`${styles.sideItem} ${styles.sideActive}`}><BookOpen size={17} /> My lessons</span>
          <button className={styles.sideItem} onClick={() => selectTab("quiz")}><Layers size={17} /> Review</button>
          <Link href="/example" className={styles.sideItem}><Users size={17} /> Your study space</Link>
          <div className={styles.courses}><span>YOUR COURSE</span><span><i /> {lesson.course}</span><div className={styles.lessonMini}><BookOpen size={14} /><span>{lesson.title}<small>Fictional lesson · {formatTime(lesson.duration)}</small></span></div></div>
          <div className={styles.sideFoot}><LockKeyhole size={13} /> Private by default</div>
        </aside>
        <div className={styles.main}>
          <div className={styles.topbar}><span><BookOpen size={14} /><span>My lessons</span><ArrowRight size={11} /><b>{lesson.course}</b></span><span className={styles.avatar}>S</span></div>
          <div className={styles.heading}><div><span className={styles.eyebrow}>FROM YOUR CLASS</span><h3>Listening & learning</h3><p>One lesson. Notes, answers and practice.</p></div><span className={styles.ready}><Check size={12} /> Notes ready</span></div>
          <div className={styles.tabs} role="tablist" aria-label="Explore the example lesson" onKeyDown={event => {
            const current = tabs.findIndex(item => item.id === tab);
            let next: number;
            if (event.key === "ArrowRight") next = (current + 1) % tabs.length;
            else if (event.key === "ArrowLeft") next = (current + tabs.length - 1) % tabs.length;
            else if (event.key === "Home") next = 0;
            else if (event.key === "End") next = tabs.length - 1;
            else return;
            event.preventDefault(); selectTab(tabs[next].id); root.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
          }}>{tabs.map(({ id: tabId, label, icon: Icon }) => <button key={tabId} id={`${id}-${tabId}`} role="tab" aria-controls={`${id}-panel`} aria-selected={tab === tabId} tabIndex={tab === tabId ? 0 : -1} data-tour-target={tabId} onClick={() => selectTab(tabId)}><Icon size={15} /><span>{label}</span></button>)}</div>
          <div className={styles.screen} ref={screen} id={`${id}-panel`} role="tabpanel" aria-labelledby={`${id}-${tab}`} tabIndex={0}>
            {tab === "notes" && <div className={styles.notes}>
              <div className={styles.sceneTop}><span className={styles.sceneTitle}>Class notes</span><div className={styles.segmented} role="group" aria-label="Note detail"><button aria-pressed={!detail} onClick={() => { pause(); setDetail(false); }}>Summary</button><button aria-pressed={detail} data-tour-target="detail" onClick={() => { pause(); setDetail(true); }}>Detailed</button></div></div>
              {!detail ? <><div className={styles.summary}><span className={styles.tinyLabel}>THE SHORT VERSION</span><h4>Stay with the explanation.</h4><p>{lesson.artifacts?.overview}</p><div className={styles.keyPoints}>{notes.slice(0, 3).map((note, index) => <span key={note.heading}><i>{String(index + 1).padStart(2, "0")}</i>{note.heading}</span>)}</div></div><div className={styles.sourceHint}><Headphones size={17} /><span>Every note leads back to the class passage.</span>{citation(notes[0]?.evidence)}</div></> : <div className={styles.detailed}>{notes.slice(0, 3).map((note, index) => <article key={note.heading}><span className={styles.noteNumber}>{String(index + 1).padStart(2, "0")}</span><div><h4>{note.heading}</h4><p>{note.text}</p>{citation(note.evidence)}</div></article>)}</div>}
            </div>}
            {tab === "ask" && <div className={styles.chat}>
              <div className={styles.sceneTop}><span className={styles.sceneTitle}>Ask about this lesson</span><span className={styles.prepared}>Prepared example</span></div>
              <div className={styles.conversation}>
                {!sent ? <div className={styles.chatWelcome}><span className={styles.chatMark}><MessageCircle size={23} /></span><h4>Keep the class in context.</h4><p>Try a question about listening or revision.</p><button onClick={() => { pause(); setQuestion(demoQuestion); submitQuestion(demoQuestion, true); }}>{demoQuestion}<ArrowRight size={14} /></button></div> : <><div className={styles.userMessage}>{sent}</div><div className={styles.assistantMessage}><span className={styles.answerMark}><MessageCircle size={16} /></span><div><span className={styles.answerLabel}>From this lesson</span><p>{answerWords.slice(0, words).join(" ")} {words < answerWords.length && <i className={styles.typing} aria-label="Revealing answer" />}</p>{words >= answerWords.length && answerIndex !== null && citation(notes[answerIndex]?.evidence)}</div></div></>}
              </div>
              <form className={styles.composer} onSubmit={event => { event.preventDefault(); pause(); submitQuestion(question, true); }}><input aria-label="Question about the example lesson" value={question} maxLength={180} onChange={event => setQuestion(event.target.value)} placeholder="Ask about this lesson…" /><button aria-label="Send example question" type="submit" data-tour-target="send" disabled={!question.trim()}><Send size={16} /></button></form>
            </div>}
            {tab === "quiz" && quiz && <div className={styles.practice}>
              <div className={styles.sceneTop}><span className={styles.sceneTitle}>A quick check</span><span className={styles.practiceCount}>Sample question</span></div>
              <h4 className={styles.question}>{quiz.question}</h4>
              <div className={styles.choices}>{quiz.choices.map((option, index) => <button key={option} aria-pressed={choice === option} disabled={checked} data-tour-target={option === quiz.answer ? "choice" : undefined} className={`${choice === option ? styles.chosen : ""} ${checked && option === quiz.answer ? styles.correct : ""}`} onClick={() => { pause(); setChoice(option); }}><span>{String.fromCharCode(65 + index)}</span>{option}{checked && option === quiz.answer && <Check size={15} />}</button>)}</div>
              <div className={styles.quizFooter}>{checked ? <div className={styles.feedback}><CheckCircle2 size={18} /><div><b>{choice === quiz.answer ? "That's right." : "Return to the explanation."}</b><p>{choice === quiz.answer ? "You followed the point from this lesson." : quiz.answer}</p>{citation(quiz.evidence)}</div><button aria-label="Try quiz again" onClick={() => { pause(); setChoice(null); setChecked(false); }}><RotateCcw size={15} /></button></div> : <button className={styles.primary} data-tour-target="check" disabled={!choice} onClick={() => { pause(); setChecked(true); }}>Check answer<ArrowRight size={15} /></button>}</div>
            </div>}
            {tab === "cards" && card && <div className={styles.cards}>
              <div className={styles.sceneTop}><span className={styles.sceneTitle}>Bring the idea to mind</span><span className={styles.practiceCount}>Sample flashcard</span></div>
              <div className={`${styles.flashcard} ${revealed ? styles.flipped : ""}`}><span className={styles.tinyLabel}>{revealed ? "THE CLASS EXPLANATION" : "TRY TO RECALL"}</span><Layers size={25} /><h4>{revealed ? card.answer : card.question}</h4>{revealed && citation(card.evidence)}{!revealed && <button className={styles.primary} data-tour-target="reveal" onClick={() => { pause(); setRevealed(true); }}>Reveal answer<ArrowRight size={15} /></button>}</div>
              {revealed && <div className={styles.recall}>{rating ? <span><CheckCircle2 size={17} />{rating}<button onClick={() => { pause(); setRevealed(false); setRating(""); }}>Try again</button></span> : <><span>How did you do?</span><div><button data-tour-target="rating" onClick={() => { pause(); setRating("Marked for another review."); }}>Revisit this</button><button onClick={() => { pause(); setRating("You recalled this idea."); }}>I remembered</button></div></>}</div>}
            </div>}
          </div>
          {source && <div className={styles.sourcePanel} role="region" aria-label="Original class passage"><div><b>Original class passage</b><button aria-label="Close original passage" onClick={() => setSource(null)}><X size={16} /></button></div><blockquote>{source.quote}</blockquote><button className={styles.listen} onClick={playSource}>{audioPlaying ? <Pause size={13} /> : <Play size={13} fill="currentColor" />} {audioPlaying ? "Pause audio" : `Listen from ${formatTime(sourceSegment?.start ?? 0)}`}</button>{audioNotice && <p role="status">{audioNotice}</p>}</div>}
          <div className={styles.player}><span className={styles.audioIcon}><Headphones size={14} /></span><span>Fictional class recording</span><div className={styles.wave} aria-hidden="true">{Array.from({ length: 32 }, (_, index) => <i key={index} style={{ height: Math.round(5 + Math.abs(Math.sin(index * 1.7)) * 13) }} />)}</div><span>{formatTime(lesson.duration)}</span><span className={styles.speed}>1×<ChevronDown size={11} /></span></div>
        </div>
      </div>
      {running && cursor && <div className={styles.cursor} aria-hidden="true" style={{ left: cursor.x, top: cursor.y }}><MousePointer2 size={27} fill="#28232e" /><span>Explore</span></div>}
    </div>
    <div className={styles.caption}><span><i /> Interactive tour · fictional example</span><div><Link href="/example">Try it yourself <ArrowRight size={13} /></Link><button disabled={reduced} onClick={() => { audio.current?.pause(); if (playing) setPlaying(false); else { setTab("notes"); setDetail(false); setSource(null); setStep(0); setCursor(null); setPlaying(true); } }} aria-label={reduced ? "Product walkthrough motion is off" : playing ? "Pause product walkthrough" : "Play product walkthrough"}>{playing ? <Pause size={13} /> : <Play size={13} />}{reduced ? "Motion off" : playing ? "Pause tour" : "Play tour"}</button></div></div>
    <audio ref={audio} src="/example/audio" preload="none" onPlay={() => setAudioPlaying(true)} onPause={() => setAudioPlaying(false)} onEnded={() => setAudioPlaying(false)} />
  </div>;
}
