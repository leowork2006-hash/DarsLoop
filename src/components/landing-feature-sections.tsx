"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, AudioLines, BookOpen, Check, CheckCircle2, ChevronRight, Headphones, Layers, Map, MessageCircle, Pause, Play, RotateCcw, X } from "lucide-react";
import type { Citation, Lesson } from "@/lib/types";
import { formatTime } from "@/lib/types";
import styles from "./landing-feature-sections.module.css";

const features = [
  { id: "record", label: "Record", icon: AudioLines, title: "Be there for the explanation.", copy: "Record with permission, or upload a lesson you can use. Keep the original audio close when you come back to study.", action: "Hear the example" },
  { id: "notes", label: "Notes", icon: BookOpen, title: "Find your way back into the class.", copy: "Start with the short summary. Open the detailed notes when you need more. Each supported point leads back to the passage.", action: "Explore the notes" },
  { id: "ask", label: "Ask", icon: MessageCircle, title: "Ask the question you still have.", copy: "Ask about the selected lesson and check the explanation behind the answer. The class stays the starting point.", action: "Try the class chat" },
  { id: "practice", label: "Practice", icon: Layers, title: "Give the idea another try.", copy: "A question to answer. A card to recall. When you miss a point, return to the explanation before trying again.", action: "Try a question" },
  { id: "plan", label: "Study plan", icon: Map, title: "Know where to start next.", copy: "Move through the lesson’s topics at your own pace. Read a point, try recalling it, and revisit its original passage.", action: "See the study space" },
] as const;
type Feature = typeof features[number]["id"];

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    update(); media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return reduced;
}

export function LandingFeatureShowcase({ lesson }: { lesson: Lesson }) {
  const id = useId();
  const root = useRef<HTMLElement>(null);
  const audio = useRef<HTMLAudioElement>(null);
  const reduced = useReducedMotion();
  const [selected, setSelected] = useState<Feature>("record");
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioTime, setAudioTime] = useState(0);
  const [audioError, setAudioError] = useState("");
  const [detail, setDetail] = useState(false);
  const [source, setSource] = useState<Citation | null>(null);
  const [asked, setAsked] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [choice, setChoice] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [planIndex, setPlanIndex] = useState(0);
  const feature = features.find(item => item.id === selected)!;
  const notes = lesson.artifacts?.notes ?? [];
  const revisionNote = notes[1] ?? notes[0];
  const quiz = lesson.artifacts?.practice.find(item => item.kind === "quiz");
  const words = (revisionNote?.text ?? "This point is not available in this example.").split(/\s+/);
  const currentPlan = notes[planIndex];
  const sourceSegment = lesson.segments.find(segment => segment.id === source?.segmentId);

  useEffect(() => {
    audio.current?.pause(); setAudioError(""); setSource(null);
  }, [selected]);
  useEffect(() => {
    if (!asked || selected !== "ask") return;
    if (reduced) { setWordCount(words.length); return; }
    if (wordCount >= words.length) return;
    const timer = setTimeout(() => setWordCount(count => Math.min(count + 1, words.length)), 48);
    return () => clearTimeout(timer);
  }, [asked, selected, reduced, wordCount, words.length]);

  const select = (next: Feature) => { audio.current?.pause(); setSelected(next); setSource(null); };
  const toggleAudio = async (time?: number) => {
    if (!audio.current) return;
    if (audioPlaying && time === undefined) { audio.current.pause(); return; }
    if (time !== undefined) audio.current.currentTime = time;
    try { await audio.current.play(); setAudioError(""); } catch { setAudioError("Audio could not start. You can also listen in the full example."); }
  };
  const showSource = (citation?: Citation) => { audio.current?.pause(); if (citation) setSource(citation); };
  const sourceButton = (evidence?: Citation[]) => {
    const first = evidence?.[0];
    const segment = lesson.segments.find(item => item.id === first?.segmentId);
    return first ? <button className={styles.sourceButton} onClick={() => showSource(first)}><Headphones size={14} />{segment ? formatTime(segment.start) : "Source"}<span>Original passage</span><ArrowRight size={13} /></button> : null;
  };

  return <section id="how-it-works" className={styles.showcase} ref={root} aria-labelledby={`${id}-title`} data-feature-showcase data-feature={selected}>
    <div className={styles.sectionHeading}><span className={styles.eyebrow}>YOUR LESSON, CONNECTED</span><h2 id={`${id}-title`}>From the first listen<br/><em>to the next question.</em></h2><p>A study space built around the class you’re in.</p></div>
    <div className={styles.featureTabs} role="tablist" aria-label="Explore DarsLoop features" onKeyDown={event => {
      const current = features.findIndex(item => item.id === selected);
      let next: number;
      if (event.key === "ArrowRight") next = (current + 1) % features.length;
      else if (event.key === "ArrowLeft") next = (current + features.length - 1) % features.length;
      else if (event.key === "Home") next = 0;
      else if (event.key === "End") next = features.length - 1;
      else return;
      event.preventDefault(); select(features[next].id); root.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
    }}>{features.map(({ id: featureId, label, icon: Icon }) => <button key={featureId} role="tab" id={`${id}-${featureId}`} aria-selected={selected === featureId} aria-controls={`${id}-panel`} tabIndex={selected === featureId ? 0 : -1} onClick={() => select(featureId)}><Icon size={18} />{label}</button>)}</div>
    <div className={styles.featureLayout}>
      <div className={styles.featureCopy} key={selected}><span className={styles.featureNumber}>0{features.findIndex(item => item.id === selected) + 1} / {feature.label.toUpperCase()}</span><h3>{feature.title}</h3><p>{feature.copy}</p><Link href="/example">{feature.action}<ArrowRight size={17} /></Link><span className={styles.sampleNote}>Try the fictional lesson in these cards.</span></div>
      <div className={styles.cardStage}>
        <div className={`${styles.backCard} ${styles.backOne}`} aria-hidden="true"><span /><i /><i /><i /></div><div className={`${styles.backCard} ${styles.backTwo}`} aria-hidden="true"><span /><i /><i /><i /></div>
        <div className={styles.sampleCard}>
          <div className={styles.cardTop}><span className={styles.cardBrand}><span>D</span>DarsLoop</span><span className={styles.cardSample}>Fictional lesson</span></div>
          <div className={styles.cardBody} key={selected} id={`${id}-panel`} role="tabpanel" aria-labelledby={`${id}-${selected}`} tabIndex={0}>
            {selected === "record" && <div className={styles.recordCard}>
              <span className={styles.smallLabel}>KEEP THE CLASS CLOSE</span><h4>{lesson.title}</h4><p>{lesson.course} <span>·</span> {formatTime(lesson.duration)} audio</p>
              <div className={styles.recordWave} aria-hidden="true">{Array.from({ length: 43 }, (_, index) => <i key={index} style={{ height: `${Math.round(12 + Math.abs(Math.sin(index * 1.28) * Math.cos(index * .27)) * 78)}%` }} />)}</div>
              <div className={styles.audioTransport}><button aria-label={audioPlaying ? "Pause feature example audio" : "Play feature example audio"} onClick={() => toggleAudio()}>{audioPlaying ? <Pause size={20} /> : <Play size={20} fill="currentColor" />}</button><div><b>{audioPlaying ? "Playing the class" : "Listen to the example"}</b><span>{formatTime(audioTime)} / {formatTime(lesson.duration)}</span></div><Headphones size={20} /></div>
              <input className={styles.audioSeek} type="range" aria-label="Seek feature example audio" min={0} max={lesson.duration} step={.1} value={audioTime} onChange={event => { const time = Number(event.target.value); setAudioTime(time); if (audio.current) audio.current.currentTime = time; }} />
              <div className={styles.recordFoot}><CheckCircle2 size={17} /><span>A fictional class you can actually replay.</span></div>
            </div>}
            {selected === "notes" && <div className={styles.notesCard}>
              <div className={styles.cardSceneTitle}><h4>Class notes</h4><div className={styles.noteSwitch} role="group" aria-label="Feature note detail"><button aria-pressed={!detail} onClick={() => setDetail(false)}>Summary</button><button aria-pressed={detail} onClick={() => setDetail(true)}>Detailed</button></div></div>
              {!detail ? <><div className={styles.noteSummary}><span className={styles.smallLabel}>THE SHORT VERSION</span><p>{lesson.artifacts?.overview}</p></div><div className={styles.notePoints}>{notes.slice(0, 3).map((note, index) => <div key={note.heading}><span>0{index + 1}</span><b>{note.heading}</b></div>)}</div>{sourceButton(notes[0]?.evidence)}</> : <div className={styles.noteDetails}>{notes.slice(0, 2).map(note => <article key={note.heading}><h5>{note.heading}</h5><p>{note.text}</p>{sourceButton(note.evidence)}</article>)}</div>}
            </div>}
            {selected === "ask" && <div className={styles.askCard}>
              <div className={styles.cardSceneTitle}><h4>Ask this class</h4><span className={styles.preparedLabel}>Prepared example</span></div>
              <div className={styles.questionBubble}>How should I revise after class?</div>
              <div className={styles.answerBubble}><span><MessageCircle size={18} /></span><div><b>From the lesson</b>{asked ? <p>{words.slice(0, wordCount).join(" ")}{wordCount < words.length && <i className={styles.answerCursor} aria-label="Revealing prepared answer" />}</p> : <p>Try this question, then open the passage behind its answer.</p>}{asked && wordCount >= words.length && sourceButton(revisionNote?.evidence)}</div></div>
              <button className={styles.cardAction} onClick={() => { setAsked(true); setWordCount(0); }}>{asked ? "Replay the answer" : "Try this question"}<ArrowRight size={16} /></button>
            </div>}
            {selected === "practice" && quiz && <div className={styles.quizCard}>
              <div className={styles.cardSceneTitle}><h4>A quick check</h4><span className={styles.preparedLabel}>Sample question</span></div><h5>{quiz.question}</h5><div className={styles.quizChoices}>{quiz.choices.map((option, index) => <button key={option} aria-pressed={choice === option} disabled={checked} className={`${choice === option ? styles.choiceSelected : ""} ${checked && option === quiz.answer ? styles.choiceCorrect : ""}`} onClick={() => setChoice(option)}><span>{String.fromCharCode(65 + index)}</span>{option}{checked && option === quiz.answer && <Check size={16} />}</button>)}</div>
              {!checked ? <button className={styles.cardAction} disabled={!choice} onClick={() => setChecked(true)}>Check answer<ArrowRight size={16} /></button> : <div className={styles.quizFeedback}><div><CheckCircle2 size={17} /><b>{choice === quiz.answer ? "You found the point." : "Check the explanation."}</b><button aria-label="Retry feature sample question" onClick={() => { setChoice(null); setChecked(false); }}><RotateCcw size={16} /></button></div>{sourceButton(quiz.evidence)}</div>}
            </div>}
            {selected === "plan" && <div className={styles.planCard}>
              <div className={styles.cardSceneTitle}><h4>Your next study step</h4><Map size={18} /></div><p className={styles.planIntro}>Choose a point from this lesson.</p><div className={styles.planSteps}>{notes.slice(0, 3).map((note, index) => <button key={note.heading} aria-pressed={planIndex === index} className={planIndex === index ? styles.planSelected : ""} onClick={() => { setPlanIndex(index); setSource(null); }}><span>0{index + 1}</span><b>{note.heading}</b><ChevronRight size={15} /></button>)}</div><div className={styles.planDetail}><p>{currentPlan?.text}</p>{sourceButton(currentPlan?.evidence)}</div>
            </div>}
            {source && <div className={styles.sourceDisclosure} role="region" aria-label="Feature original passage"><div><b>Original class passage</b><button aria-label="Close feature original passage" onClick={() => { audio.current?.pause(); setSource(null); }}><X size={15} /></button></div><blockquote>{source.quote}</blockquote><button onClick={() => audioPlaying ? audio.current?.pause() : toggleAudio(sourceSegment?.start ?? 0)}>{audioPlaying ? <Pause size={13} /> : <Play size={13} fill="currentColor" />}{audioPlaying ? "Pause audio" : `Listen from ${formatTime(sourceSegment?.start ?? 0)}`}</button></div>}
            {audioError && <p className={styles.audioError} role="status">{audioError}</p>}
          </div>
          <div className={styles.cardBottom}><BookOpen size={13} /><span>{lesson.course}</span><span>Source stays with you</span></div>
        </div>
        <span className={styles.floatingLabel}><Headphones size={14} /><span>Back to the moment.</span><svg width="42" height="31" viewBox="0 0 42 31" fill="none" aria-hidden="true"><path d="M2 2c22-5 29 10 30 21m0 0-7-7m7 7 7-8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg></span>
      </div>
    </div>
    <audio ref={audio} src="/example/audio" preload="none" onPlay={() => setAudioPlaying(true)} onPause={() => setAudioPlaying(false)} onEnded={() => setAudioPlaying(false)} onTimeUpdate={() => { if (audio.current) setAudioTime(audio.current.currentTime); }} />
  </section>;
}

const loopSteps = [
  { label: "Read", icon: BookOpen, heading: "Start with the explanation.", copy: "Read one point from the class. Give yourself a clear idea to come back to." },
  { label: "Recall", icon: Layers, heading: "Try before you look.", copy: "Close the notes for a moment. Bring the idea to mind in your own words." },
  { label: "Check", icon: Headphones, heading: "Return to the original.", copy: "Compare your answer with the class passage. Revisit the point you missed." },
] as const;

export function LandingStudyLoop({ lesson }: { lesson: Lesson }) {
  const id = useId();
  const [step, setStep] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const card = lesson.artifacts?.practice.find(item => item.kind === "flashcard" && /revision/.test(item.question)) ?? lesson.artifacts?.practice.find(item => item.kind === "flashcard");
  const note = lesson.artifacts?.notes[1] ?? lesson.artifacts?.notes[0];
  const evidence = card?.evidence[0] ?? note?.evidence[0];
  const segment = lesson.segments.find(item => item.id === evidence?.segmentId);
  const active = loopSteps[step];
  const Icon = active.icon;
  return <section className={styles.studyLoop} aria-labelledby={`${id}-title`} data-study-loop data-step={step}>
    <div className={styles.loopInner}>
      <div className={styles.loopHeading}><div><span className={styles.darkEyebrow}>A SMALL ROUTINE TO COME BACK TO</span><h2 id={`${id}-title`}>Read the idea.<br/><em>Then bring it back.</em></h2></div><p>Practice recalling, then check the source. Your lesson is there when you need another look.</p></div>
      <div className={styles.loopLayout}>
        <div className={styles.loopSteps}><div role="group" aria-label="Explore the study routine">{loopSteps.map((item, index) => <button key={item.label} aria-pressed={step === index} onClick={() => { setStep(index); setRevealed(false); }}><span>0{index + 1}</span><div><b>{item.label}</b><small>{index === 0 ? "Follow the point" : index === 1 ? "Try it from memory" : "Go back to the source"}</small></div><ArrowRight size={18} /></button>)}</div><Link href="#practice">Try a question<ArrowRight size={17} /></Link></div>
        <div className={styles.loopPaperStage}><div className={styles.loopBackPaper} aria-hidden="true" /><div className={styles.loopPaper} key={step}><div className={styles.loopPaperTop}><span><Icon size={18} />{active.label}</span><span>Fictional lesson</span></div><h3>{active.heading}</h3><p className={styles.loopPaperCopy}>{active.copy}</p>
          {step === 0 && <div className={styles.loopExcerpt}><span>FROM THE CLASS NOTES</span><h4>{note?.heading}</h4><p>{note?.text}</p></div>}
          {step === 1 && <div className={styles.loopRecall}><Layers size={28} /><h4>{revealed ? card?.answer : card?.question}</h4><button onClick={() => setRevealed(value => !value)}>{revealed ? "Try recalling again" : "Reveal the class explanation"}<ArrowRight size={16} /></button></div>}
          {step === 2 && <div className={styles.loopSource}><span><Headphones size={14} />{formatTime(segment?.start ?? 0)} · Original passage</span><blockquote>{evidence?.quote}</blockquote><Link href="/example">Open the lesson & listen<ArrowRight size={14} /></Link></div>}
          <div className={styles.loopPaperFoot}><span>{lesson.course}</span><span>0{step + 1} / 03</span></div>
        </div></div>
      </div>
      <div className={styles.researchNote}><BookOpen size={17} /><p>A study routine informed by research on practice testing and distributed study.<span><a href="https://pubmed.ncbi.nlm.nih.gov/33683913/" target="_blank" rel="noopener noreferrer">Classroom testing research<ArrowRight size={11} /></a><a href="https://pubmed.ncbi.nlm.nih.gov/26173288/" target="_blank" rel="noopener noreferrer">Learning techniques review<ArrowRight size={11} /></a></span></p></div>
    </div>
  </section>;
}
