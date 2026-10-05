"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { ArrowLeft, ArrowRight, BookOpen, Cards, Check, CheckCircle, ClipboardText, Headphones, ListChecks, Minus, Pause, Play, Plus, Timer, WarningCircle, X } from "@phosphor-icons/react";
import { formatTime, type Lesson, type PracticeItem, type Review } from "@/lib/types";
import { exclusiveAudio, playAt } from "@/lib/audio-playback";
import { exampleReview } from "@/lib/example-practice";
import { examSecondsLeft, sessionPractice, sessionScore } from "@/lib/practice-session";
import { api, message } from "./client-api";
import { Brand } from "./brand";
import styles from "./practice-session.module.css";

type SavedAnswer = { correct: boolean; review: Review };
export type PracticeSessionProps = {
  title?: string;
  returnLabel?: string;
  lesson: Lesson;
  items: PracticeItem[];
  mode: "drill" | "test";
  preview?: boolean;
  scenePaused?: boolean;
  initialItemId?: string | null;
  onClose: () => void;
  onOpen: (lesson: Lesson, itemId: string) => void;
  onPlay?: (lesson: Lesson, time: number) => void;
  onReviewed: (review: Review) => void;
  onError: (text: string) => void;
};

function SourcePassage({ item, lesson, onListen }: { item: PracticeItem; lesson: Lesson; onListen: (time: number) => void }) {
  return <div className={styles.sources}>
    <p className={styles.sourceLabel}><BookOpen size={15} /> From your lesson</p>
    {item.evidence.map((citation, index) => {
      const segment = lesson.segments.find(part => part.id === citation.segmentId);
      if (!segment) return null;
      return <div className={styles.sourcePassage} key={`${citation.segmentId}-${index}`}>
        <blockquote dir="auto">{citation.quote}</blockquote>
        <button type="button" className={styles.sourceTime} onClick={() => onListen(segment.start)} aria-label={`Listen to the supporting passage at ${formatTime(segment.start)}`}><Play size={12} weight="fill" /><bdi>{formatTime(segment.start)}</bdi><span>Listen to the explanation</span></button>
      </div>;
    })}
  </div>;
}

/** Successful saves are retained during a retry; unanswered timed items are never submitted as invented responses. */
export function PracticeSession({ lesson: initialLesson, items: requestedItems, mode, onClose, onOpen, onReviewed, onError, title, returnLabel = "Back to practice", preview = false, scenePaused = false, initialItemId }: PracticeSessionProps) {
  // Pin the captured source. A server-side source change still returns its existing 409 guard.
  const [lesson] = useState(initialLesson);
  const isTest = mode === "test";
  const [mounted, setMounted] = useState(false);
  const supported = useMemo(() => sessionPractice(lesson, requestedItems, isTest), [lesson, requestedItems, isTest]);
  const [questionCount, setQuestionCount] = useState(supported.length);
  const [items, setItems] = useState(() => initialItemId ? [...supported.filter(item => item.id === initialItemId), ...supported.filter(item => item.id !== initialItemId)] : supported);
  const [stage, setStage] = useState<"setup" | "question" | "results">(isTest ? "setup" : "question");
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const answersRef = useRef(answers);
  const [revealed, setRevealed] = useState(false);
  const [results, setResults] = useState<Record<string, SavedAnswer>>({});
  const resultsRef = useRef<Record<string, SavedAnswer>>({});
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [saveStarted, setSaveStarted] = useState(false);
  const [error, setError] = useState("");
  const [minutes, setMinutes] = useState(0);
  const [deadline, setDeadline] = useState<number | null>(null);
  const [seconds, setSeconds] = useState<number | null>(null);
  const [expired, setExpired] = useState(false);
  const [motionPaused, setMotionPaused] = useState(scenePaused);
  const [exitRequested, setExitRequested] = useState(false);
  const [listeningAt, setListeningAt] = useState<number | null>(null);
  const [audioError, setAudioError] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const scrollArea = useRef<HTMLDivElement>(null);
  const audio = useRef<HTMLAudioElement>(null);
  const titleId = useId(), questionId = useId();
  const submitRef = useRef<(timedOut?: boolean) => Promise<void>>(async () => {});
  const item = items[index], result = item && results[item.id];
  const score = sessionScore(items, results, answers);
  const allFlashcards = items.length > 0 && items.every(question => question.kind === "flashcard");
  const audioSource = preview && lesson.id === "fictional-example" ? "/example/audio" : `/api/lessons/${lesson.id}/audio?v=${lesson.version}`;

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    if (!mounted) return;
    const current = dialog.current;
    const sourcePlayer = audio.current;
    if (sourcePlayer) exclusiveAudio(sourcePlayer);
    current?.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { sourcePlayer?.pause(); current?.close(); document.body.style.overflow = previousOverflow; };
  }, [mounted]);
  useEffect(() => { setMotionPaused(scenePaused); }, [scenePaused]);
  useEffect(() => {
    if (!deadline || stage !== "question" || expired) return;
    const tick = () => {
      const remaining = examSecondsLeft(deadline);
      setSeconds(remaining);
      if (!remaining) { setExpired(true); void submitRef.current(true); }
    };
    tick();
    const interval = window.setInterval(tick, 250);
    document.addEventListener("visibilitychange", tick);
    return () => { window.clearInterval(interval); document.removeEventListener("visibilitychange", tick); };
  }, [deadline, stage, expired]);
  useEffect(() => {
    if (stage !== "question") return;
    dialog.current?.querySelector<HTMLElement>(`#${CSS.escape(questionId)}`)?.focus({ preventScroll: true });
    if (scrollArea.current) scrollArea.current.scrollTop = 0;
    if (dialog.current) dialog.current.scrollTop = 0;
  }, [index, stage, questionId, mounted]);
  useEffect(() => { if (stage === "results") setExitRequested(false); }, [stage]);
  useEffect(() => {
    if (stage !== "results" || exitRequested) return;
    dialog.current?.querySelector<HTMLElement>("[data-results-heading]")?.focus({ preventScroll: true });
    if (scrollArea.current) scrollArea.current.scrollTop = 0;
    if (dialog.current) dialog.current.scrollTop = 0;
  }, [stage, exitRequested]);

  function choose(question: PracticeItem, choice: string) {
    if (busyRef.current || saveStarted || expired || resultsRef.current[question.id]) return;
    const updated = { ...answersRef.current, [question.id]: choice };
    answersRef.current = updated; setAnswers(updated);
  }
  async function save(question: PracticeItem, remembered?: boolean) {
    if (resultsRef.current[question.id]) return resultsRef.current[question.id];
    const answer = answersRef.current[question.id];
    const response = preview ? exampleReview(lesson, question, question.kind === "quiz" ? answer === question.answer : remembered === true) : await api<SavedAnswer>(`/api/lessons/${lesson.id}/review`, {
      method: "POST", body: JSON.stringify({ itemId: question.id, version: lesson.version, ...(question.kind === "quiz" ? { answer } : { remembered }) }),
    });
    resultsRef.current = { ...resultsRef.current, [question.id]: response }; setResults(resultsRef.current);
    if (!preview) onReviewed(response.review);
    return response;
  }
  async function check(remembered?: boolean) {
    if (!item || busyRef.current || resultsRef.current[item.id] || item.kind === "quiz" && !item.choices.includes(answersRef.current[item.id])) return;
    busyRef.current = true; setBusy(true); setError("");
    try { await save(item, remembered); setRevealed(true); }
    catch (failure) { const text = message(failure); setError(text); onError(text); }
    finally { busyRef.current = false; setBusy(false); }
  }
  async function submitTest(timedOut = false) {
    const attempted = items.filter(question => question.choices.includes(answersRef.current[question.id]));
    if (busyRef.current || !timedOut && attempted.length !== items.length) return;
    busyRef.current = true; setBusy(true); setSaveStarted(true); setError("");
    try { for (const question of attempted) await save(question); setStage("results"); }
    catch (failure) { const text = message(failure); setError(text); onError(text); }
    finally { busyRef.current = false; setBusy(false); }
  }
  submitRef.current = submitTest;
  function startExam() {
    const count = Math.max(1, Math.min(questionCount, supported.length));
    setItems(supported.slice(0, count)); setIndex(0); setStage("question");
    if (minutes) { setDeadline(Date.now() + minutes * 60_000); setSeconds(minutes * 60); }
  }
  function next() {
    audio.current?.pause();
    if (index + 1 >= items.length) setStage("results");
    else { setIndex(current => current + 1); setRevealed(false); setError(""); setListeningAt(null); }
  }
  function requestClose() {
    if (busyRef.current) return;
    if (stage === "question" && (isTest || Object.keys(answersRef.current).length > score.saved)) setExitRequested(true);
    else { audio.current?.pause(); onClose(); }
  }
  async function listen(time: number) {
    const player = audio.current;
    if (!player) { onOpen(lesson, item.id); return; }
    setListeningAt(time);
    setAudioError("");
    try { if (player.readyState < HTMLMediaElement.HAVE_METADATA) player.load(); await playAt(player, time); }
    catch { const text = "The source audio couldn’t play. Try again or return to the lesson recording."; setAudioError(text); onError(text); }
  }

  if (!mounted) return null;
  return createPortal(<dialog ref={dialog} className={styles.dialog} aria-labelledby={titleId} data-stage={stage} data-motion-paused={motionPaused || undefined} onCancel={event => { event.preventDefault(); if (exitRequested) setExitRequested(false); else requestClose(); }}>
    <div className={styles.shell}>
      <div className={styles.ambient} aria-hidden="true"><span /><span /></div>
      {stage === "question" && <div className={styles.questionScenery} aria-hidden="true"><span className={styles.hillBack} /><span className={styles.hillFront} /><span className={styles.studyObject}><Image src="/illustrations/practice-notebook-v27.png" width={1536} height={1024} sizes="(max-width: 740px) 140px, 235px" alt="" /></span></div>}
      <header className={styles.header} inert={exitRequested}>
        <div className={styles.brand}><Brand /><span className={styles.sessionLabel}>{isTest ? <ClipboardText size={16} /> : allFlashcards ? <Cards size={16} /> : <BookOpen size={16} />}<h2 id={titleId}>{title ?? (isTest ? "Mock exam" : allFlashcards ? "Flashcards" : "Quiz")}</h2></span></div>
        <div className={styles.headerActions}>
          {stage === "question" && <span className={`${styles.headerPill} ${seconds !== null && seconds <= 60 ? styles.timerEnding : ""}`}>{isTest && seconds !== null ? <><Timer size={17} /><bdi>{formatTime(seconds)}</bdi></> : <>{allFlashcards ? "Card" : "Question"} <bdi>{index + 1} / {items.length}</bdi></>}</span>}
          <button type="button" className={styles.iconButton} aria-label={motionPaused ? "Resume scene motion" : "Pause scene motion"} aria-pressed={motionPaused} onClick={() => setMotionPaused(current => !current)}>{motionPaused ? <Play size={17} /> : <Pause size={17} />}</button>
          <button type="button" className={styles.iconButton} disabled={busy} aria-label="Close dialog" onClick={requestClose}><X size={22} /></button>
        </div>
      </header>
      <div ref={scrollArea} className={styles.scrollArea} inert={exitRequested}>
        {!supported.length ? <div className={styles.empty}><BookOpen size={38} /><h3>No supported questions yet.</h3><p>Only clear points from this lesson become practice.</p><button type="button" className={styles.darkButton} onClick={onClose}>{returnLabel}<ArrowRight size={16} /></button></div> : stage === "setup" ? <main className={styles.setup}>
          <section className={styles.setupForm} aria-label="Mock exam settings">
            <div className={styles.setupHeading}><h3>How many questions?</h3><p>Choose how much of this lesson to practise.</p></div>
            <div className={styles.setupMaterial}><Headphones size={20} /><div><span>Selected lesson</span><strong dir="auto">{lesson.title}</strong></div><CheckCircle size={18} /></div>
            <div className={styles.totalRow}><span>Total: <strong>{questionCount}</strong></span><span>{supported.length} available</span></div>
            <div className={styles.typeRow}><span className={styles.typeIcon}><ListChecks size={23} /></span><div className={styles.typeText}><h4>Multiple choice</h4><p>Select the supported answer from the options.</p></div><div className={styles.stepper}><button type="button" aria-label="Fewer questions" disabled={questionCount <= 1} onClick={() => setQuestionCount(count => Math.max(1, count - 1))}><Minus size={16} /></button><input id={`${titleId}-count`} type="number" min={1} max={supported.length} step={1} aria-label="Number of questions" value={questionCount} onChange={event => setQuestionCount(Math.max(1, Math.min(supported.length, Math.trunc(Number(event.target.value)) || 1)))} /><button type="button" aria-label="More questions" disabled={questionCount >= supported.length} onClick={() => setQuestionCount(count => Math.min(supported.length, count + 1))}><Plus size={16} /></button></div></div>
            <div className={styles.timeSetting}><Timer size={20} /><label htmlFor={`${titleId}-time`}>Time limit</label><select id={`${titleId}-time`} value={minutes} onChange={event => setMinutes(Number(event.target.value))}><option value={0}>No timer</option>{[1, 5, 10, 20].map(value => <option key={value} value={value}>{value} {value === 1 ? "minute" : "minutes"}</option>)}</select></div>
            <p className={styles.setupNote}>Uses the multiple choice questions already prepared from this lesson. Answers and sources appear after submission.</p>
            <div className={styles.setupBottom}><button type="button" className={styles.lightButton} onClick={onClose}><ArrowLeft size={17} /> Back</button><button type="button" className={styles.darkButton} onClick={startExam}>Start mock exam <ArrowRight size={18} /></button></div>
          </section>
          <aside className={styles.setupPreview} aria-label="Exam preview"><h4>Your exam preview</h4><div className={styles.previewQuestionCard} aria-hidden="true"><div className={styles.previewCardHeading}><ListChecks size={20} /><span>Multiple choice</span><b>{questionCount}</b></div><div className={styles.previewQuestionLines}><i /><i /></div><div className={styles.previewAnswerLines}>{["A", "B", "C"].map(letter => <span key={letter}><b>{letter}</b><i /></span>)}</div></div><div className={styles.previewMaterial}><p dir="auto">{lesson.course}</p><h5 dir="auto">{lesson.title}</h5></div><dl className={styles.previewMetrics}><div><dt>Questions</dt><dd>{questionCount}</dd></div><div><dt>Question type</dt><dd>Multiple choice</dd></div><div><dt>Time limit</dt><dd>{minutes ? `${minutes} ${minutes === 1 ? "minute" : "minutes"}` : "No timer"}</dd></div></dl><div className={styles.previewRules}><span><BookOpen size={17} /> Sources after submission</span><span><Timer size={17} /> {minutes ? "Ends automatically when time is up" : "Work at your own pace"}</span></div><p>{preview ? "Fictional example · responses aren’t saved." : "Saved responses update your private review schedule."} This lesson practice does not cover an official exam syllabus.</p></aside>
        </main> : stage === "results" ? <main className={styles.results}>
          <div className={styles.resultHero}><span className={styles.resultIcon}><CheckCircle size={35} weight="regular" /></span><span className={styles.kicker}>{expired ? "TIME’S UP" : "ATTEMPT COMPLETE"}</span><h3 tabIndex={-1} data-results-heading>{isTest ? "Your exam results" : allFlashcards ? "Cards complete." : "You made time to revise."}</h3><p>{allFlashcards ? `You marked ${score.correct} of ${score.total} cards as remembered.` : `${score.correct} of ${score.total} ${score.total === 1 ? "answer" : "answers"} correct.`}</p>{score.answered < score.total && <p className={styles.unanswered}>{score.total - score.answered} unanswered · no response saved for these questions.</p>}<p className={styles.resultsNote}>{allFlashcards ? "Card recall is your own check, separate from quiz marks." : "These marks describe this attempt at your lesson questions."} {preview ? "Example responses aren’t saved." : "Your responses stay private."}</p></div>
          <section className={styles.resultReview}><div className={styles.reviewHeading}><h4>Review the explanation</h4><span>{items.length} {allFlashcards ? "cards" : "questions"}</span></div>{items.map((question, position) => <details key={question.id} className={styles.resultItem}>
            <summary><span className={`${styles.resultNumber} ${results[question.id]?.correct ? styles.numberCorrect : ""}`}>{results[question.id]?.correct ? <Check size={17} /> : position + 1}</span><span dir="auto">{question.question}</span><span className={styles.outcome}>{question.kind === "flashcard" ? results[question.id]?.correct ? "Remembered" : "Revisit" : !answers[question.id] ? "Unanswered" : results[question.id]?.correct ? "Correct" : "Revisit"}</span></summary>
            <div className={styles.resultDetail}>{question.kind === "quiz" && <p className={styles.yourAnswer}>Your answer: <span dir="auto">{answers[question.id] ?? "No answer selected"}</span></p>}<p className={styles.supportedAnswer}><strong>{question.kind === "quiz" ? "Supported answer" : "Card answer"}</strong><span dir="auto">{question.answer}</span></p><SourcePassage item={question} lesson={lesson} onListen={time => void listen(time)} /></div>
          </details>)}</section>
          <div className={styles.resultActions}><button type="button" className={styles.darkButton} onClick={() => { audio.current?.pause(); onClose(); }}>{returnLabel}<ArrowRight size={18} /></button></div>
        </main> : item && <main className={styles.questionLayout}>
          <aside className={styles.questionAside}><span className={styles.kicker}>{isTest ? "YOUR MOCK EXAM" : allFlashcards ? "RECALL, THEN REVEAL" : "ONE POINT AT A TIME"}</span><h3>{isTest ? "See what you recall." : allFlashcards ? "Bring it to mind." : "A little practice.\nA clearer lesson."}</h3><div className={styles.lessonContext}><Headphones size={17} /><div><strong dir="auto">{lesson.title}</strong><small dir="auto">{lesson.course}</small></div></div><p className={styles.asideNote}>{isTest ? "Sources and supported answers appear at the end." : "Each answer leads back to your teacher’s words."}</p></aside>
          <section className={styles.questionPanel} aria-label={allFlashcards ? "Study card" : "Practice question"}>
            <div className={styles.progressRow}><span>{allFlashcards ? "Card" : "Question"} <bdi>{index + 1} of {items.length}</bdi></span><span>{isTest ? `${score.answered} answered` : allFlashcards ? "Recall before revealing" : result ? "Explanation unlocked" : "Choose an answer"}</span></div><div className={styles.track} aria-hidden="true"><span style={{ width: `${(index + 1) / items.length * 100}%` }} /></div>
            {isTest && <nav className={styles.questionNav} aria-label="Exam questions">{items.map((question, position) => <button type="button" key={question.id} aria-label={`Question ${position + 1}${answers[question.id] !== undefined ? ", answered" : ""}`} aria-current={position === index ? "step" : undefined} className={answers[question.id] !== undefined ? styles.navAnswered : ""} disabled={busy || expired} onClick={() => setIndex(position)}>{position + 1}</button>)}</nav>}
            <article className={styles.question} key={item.id}><h3 id={questionId} tabIndex={-1} dir="auto">{item.question}</h3>
              {item.kind === "quiz" ? <div className={styles.choices}>{item.choices.map((choice, position) => <button type="button" key={`${choice}-${position}`} className={`${styles.choice} ${answers[item.id] === choice ? styles.selected : ""} ${!isTest && result && choice === item.answer ? styles.correct : ""} ${!isTest && result && choice === answers[item.id] && !result.correct ? styles.missed : ""}`} disabled={busy || expired || (isTest ? saveStarted : Boolean(result))} aria-pressed={answers[item.id] === choice} onClick={() => choose(item, choice)}><span className={styles.choiceLetter}>{String.fromCharCode(65 + position)}</span><span dir="auto">{choice}</span>{!isTest && result && choice === item.answer && <Check size={19} weight="bold" />}</button>)}</div> : <div className={`${styles.recallCard} ${revealed ? styles.cardRevealed : ""}`}>{revealed ? <><p className={styles.kicker}>CARD ANSWER · FROM YOUR LESSON</p><p dir="auto">{item.answer}</p></> : <><BookOpen size={39} weight="duotone" /><p>Bring the explanation to mind.<br />Then reveal the answer.</p></>}</div>}
              {!isTest && revealed && <div className={`${styles.feedback} ${result && !result.correct ? styles.feedbackRevisit : ""}`} aria-live="polite"><h4>{result ? item.kind === "flashcard" ? result.correct ? "Marked as remembered" : "Saved to revisit" : result.correct ? "That’s right." : "Let’s revisit this point." : "Compare with your lesson"}</h4>{item.kind === "quiz" && <p dir="auto">{item.answer}</p>}<SourcePassage item={item} lesson={lesson} onListen={time => void listen(time)} />{result && <p className={styles.nextDue}>{preview ? "Example · response not saved" : `Next review: ${result.review.intervalDays === 0 ? "in 10 minutes" : `in ${result.review.intervalDays} ${result.review.intervalDays === 1 ? "day" : "days"}`}.`}</p>}</div>}
            </article>
            {expired && <p className={styles.timeUp} role="status"><Timer size={18} /> Time’s up. {busy ? "Saving your selected answers…" : "Your selected answers are ready to review."}</p>}
            {error && <div className={styles.saveError} role="alert"><WarningCircle size={18} /><div><strong>Couldn’t {isTest ? "finish saving" : "save this response"}.</strong><p>{error}</p>{isTest && <p>{score.saved} of {score.answered} selected answers saved. Retry continues with the remaining answers.</p>}</div></div>}
            <footer className={`${styles.questionFooter} ${!isTest && !result && item.kind === "quiz" ? styles.checkFooter : ""}`}>{isTest ? <><button type="button" className={styles.lightButton} disabled={!index || busy || expired} onClick={() => setIndex(current => current - 1)}><ArrowLeft size={16} /> Back</button><div className={styles.footerActions}>{index < items.length - 1 && <button type="button" className={styles.lightButton} disabled={busy || expired} onClick={() => setIndex(current => current + 1)}>Next <ArrowRight size={16} /></button>}<button type="button" className={styles.darkButton} disabled={busy || !expired && score.answered !== items.length} onClick={() => void submitTest(expired)}>{busy ? `Saving ${score.saved} of ${score.answered}…` : saveStarted ? "Retry remaining answers" : "Submit answers"}<Check size={16} /></button></div></> : result ? <><span className={styles.footerHint}>{preview ? "Example · not saved" : `${score.saved} of ${items.length} responses saved`}</span><button type="button" className={styles.darkButton} onClick={next}>{index + 1 === items.length ? allFlashcards ? "Finish cards" : "Finish quiz" : "Next"}<ArrowRight size={17} /></button></> : item.kind === "quiz" ? <button type="button" className={styles.darkButton} disabled={busy || answers[item.id] === undefined} onClick={() => void check()}>{busy ? "Saving…" : "Check answer"}<Check size={17} /></button> : !revealed ? <><span className={styles.footerHint}>Recall is your own check.</span><button type="button" className={styles.darkButton} onClick={() => setRevealed(true)}>Reveal answer <BookOpen size={17} /></button></> : <><span className={styles.footerHint}>How did you do?</span><div className={styles.footerActions}><button type="button" className={styles.lightButton} disabled={busy} onClick={() => void check(false)}>Revisit this</button><button type="button" className={styles.darkButton} disabled={busy} onClick={() => void check(true)}>{busy ? "Saving…" : "I remembered"}<Check size={17} /></button></div></>}</footer>
            {isTest && <p className={styles.examFootnote}>{items.length} available lesson {items.length === 1 ? "question" : "questions"} · {deadline ? "timed attempt" : "at your own pace"} · results after submission</p>}
          </section>
        </main>}
      </div>
      <div className={`${styles.audioShelf} ${listeningAt !== null ? styles.audioVisible : ""}`} inert={exitRequested}><span><Headphones size={17} /> Supporting original audio <bdi>{listeningAt !== null ? formatTime(listeningAt) : ""}</bdi></span><audio ref={audio} preload="none" controls aria-label="Supporting original audio" src={audioSource} onPlay={event => exclusiveAudio(event.currentTarget)} onError={() => { if (listeningAt !== null) setAudioError("The source audio is unavailable. Return to the lesson to retry playback."); }} /><button type="button" className={styles.iconButton} aria-label="Close source audio" onClick={() => { audio.current?.pause(); setListeningAt(null); }}><X size={17} /></button>{audioError && <p className={styles.audioError} role="alert">{audioError}</p>}</div>
      {exitRequested && <div className={styles.exitOverlay}><div className={styles.exitCard} role="alertdialog" aria-labelledby={`${titleId}-exit`}><h3 id={`${titleId}-exit`}>Leave this attempt?</h3><p>{isTest ? "Choices that haven’t been submitted will be discarded." : "Your checked responses are saved. The current unchecked choice will be discarded."}</p><div><button type="button" className={styles.lightButton} autoFocus onClick={() => setExitRequested(false)}>Keep practising</button><button type="button" className={styles.darkButton} onClick={() => { audio.current?.pause(); onClose(); }}>Leave attempt <ArrowRight size={16} /></button></div></div></div>}
    </div>
  </dialog>, document.body);
}
