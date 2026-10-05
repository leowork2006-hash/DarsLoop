"use client";

import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, BookOpen, Check, Play, WarningCircle } from "@phosphor-icons/react";
import { formatTime, type Lesson, type PracticeItem, type Review } from "@/lib/types";
import { api, message } from "./client-api";
import { Modal } from "./modal";

type SavedAnswer = { correct: boolean; review: Review };
export type PracticeSessionProps = {
  title?: string;
  returnLabel?: string;
  lesson: Lesson;
  items: PracticeItem[];
  mode: "drill" | "test";
  onClose: () => void;
  onOpen: (lesson: Lesson, itemId: string) => void;
  onPlay?: (lesson: Lesson, time: number) => void;
  onReviewed: (review: Review) => void;
  onError: (text: string) => void;
};

function SourcePassage({ item, lesson, onPlay, onOpen }: Pick<PracticeSessionProps, "lesson" | "onPlay" | "onOpen"> & { item: PracticeItem }) {
  return <div className="review-source-passages">
    <p className="review-source-label"><BookOpen size={15} /> From your lesson</p>
    {item.evidence.map((citation, index) => {
      const segment = lesson.segments.find(part => part.id === citation.segmentId);
      if (!segment) return null;
      return <div className="review-source-passage" key={`${citation.segmentId}-${index}`}>
        <blockquote dir="auto">{citation.quote}</blockquote>
        <button type="button" className="review-source-time" onClick={() => onPlay ? onPlay(lesson, segment.start) : onOpen(lesson, item.id)} aria-label={`Listen to the supporting passage at ${formatTime(segment.start)}`}><Play size={12} weight="fill" /><bdi>{formatTime(segment.start)}</bdi><span>Listen</span></button>
      </div>;
    })}
  </div>;
}

/** Each returned result is saved once in this session; retry skips completed writes. */
export function PracticeSession({ lesson, items, mode, onClose, onOpen, onPlay, onReviewed, onError, title, returnLabel = "Back to Review" }: PracticeSessionProps) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState(false);
  const [results, setResults] = useState<Record<string, SavedAnswer>>({});
  const resultsRef = useRef<Record<string, SavedAnswer>>({});
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [submitted, setSubmitted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [saveStarted, setSaveStarted] = useState(false);
  const [error, setError] = useState("");
  const item = items[index];
  const result = item && results[item.id];
  const answered = items.filter(question => answers[question.id] !== undefined).length;
  const saved = Object.keys(results).length;
  const correct = items.filter(question => results[question.id]?.correct).length;
  const isTest = mode === "test";
  const allFlashcards = items.every(question => question.kind === "flashcard");

  async function save(question: PracticeItem, remembered?: boolean) {
    if (resultsRef.current[question.id]) return resultsRef.current[question.id];
    const response = await api<SavedAnswer>(`/api/lessons/${lesson.id}/review`, {
      method: "POST",
      body: JSON.stringify({ itemId: question.id, version: lesson.version, ...(question.kind === "quiz" ? { answer: answers[question.id] } : { remembered }) }),
    });
    resultsRef.current = { ...resultsRef.current, [question.id]: response };
    setResults(resultsRef.current);
    onReviewed(response.review);
    return response;
  }

  async function check(remembered?: boolean) {
    if (!item || busyRef.current || resultsRef.current[item.id]) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    try { await save(item, remembered); setRevealed(true); }
    catch (failure) { const text = message(failure); setError(text); onError(text); }
    finally { busyRef.current = false; setBusy(false); }
  }

  async function submitTest() {
    if (busyRef.current || answered !== items.length) return;
    busyRef.current = true;
    setBusy(true);
    setSaveStarted(true);
    setError("");
    try {
      for (const question of items) await save(question);
      setSubmitted(true);
    } catch (failure) {
      const text = message(failure);
      setError(text);
      onError(text);
    } finally { busyRef.current = false; setBusy(false); }
  }

  function next() {
    if (index + 1 >= items.length) setFinished(true);
    else { setIndex(current => current + 1); setRevealed(false); setError(""); }
  }

  if (!item) return null;
  return <Modal title={title ?? (isTest ? "Practice test" : "Quick drill")} onClose={onClose} className="review-session-modal">
    <p className="review-session-lesson" dir="auto">{lesson.title}<span>{lesson.course}</span></p>
    {(submitted || finished) ? <div className="review-session-results">
      <div className="review-result-heading"><span className="review-complete-icon"><Check size={25} /></span><div><h3>{isTest ? "Your test results" : "Drill complete"}</h3><p>{allFlashcards ? `You marked ${correct} of ${items.length} cards as remembered.` : `${correct} of ${items.length} ${items.length === 1 ? "answer" : "answers"} correct.`}</p></div></div>
      <p className="review-results-note">{allFlashcards ? "Card recall is your own check. It is separate from quiz marks." : "These marks describe this attempt at your lesson questions."} Saved reviews help you choose what to revisit.</p>
      <div className="review-result-list">{items.map((question, position) => <details key={question.id} className={`review-result-item ${results[question.id]?.correct ? "answer-correct" : "answer-revisit"}`}>
        <summary><span className="review-answer-number">{position + 1}</span><span dir="auto">{question.question}</span><span className="review-answer-outcome">{allFlashcards ? results[question.id]?.correct ? "Remembered" : "Revisit" : results[question.id]?.correct ? "Correct" : "Revisit"}</span></summary>
        {question.kind === "quiz" && <p className="review-your-answer">Your answer: <span dir="auto">{answers[question.id]}</span></p>}
        <p className="review-correct-answer"><strong>{question.kind === "quiz" ? "Supported answer" : "Card answer"}</strong><span dir="auto">{question.answer}</span></p>
        <SourcePassage item={question} lesson={lesson} onPlay={onPlay} onOpen={onOpen} />
      </details>)}</div>
      <div className="review-session-footer"><p>Your personal responses stay private.</p><button type="button" className="review-button review-button-dark" onClick={onClose}>{returnLabel} <ArrowRight size={16} /></button></div>
    </div> : <>
      <div className="review-session-progress"><p>{isTest ? "Question" : item.kind === "flashcard" ? "Card" : "Question"} <bdi>{index + 1} of {items.length}</bdi></p><p>{isTest ? `${answered} answered` : item.kind === "flashcard" ? "Recall first, then reveal" : "Try it, then check"}</p></div>
      <div className="review-session-track" aria-hidden="true"><span style={{ width: `${(index + 1) / items.length * 100}%` }} /></div>
      {isTest && <div className="review-question-nav" aria-label="Test questions">{items.map((question, position) => <button type="button" key={question.id} aria-label={`Question ${position + 1}${answers[question.id] !== undefined ? ", answered" : ""}`} aria-current={position === index ? "step" : undefined} className={answers[question.id] !== undefined ? "is-answered" : ""} disabled={busy} onClick={() => setIndex(position)}>{position + 1}</button>)}</div>}
      <article className="review-session-question" key={item.id}>
        <h3 dir="auto">{item.question}</h3>
        {item.kind === "quiz" ? <div className="review-answer-choices">{item.choices.map((choice, position) => <button type="button" key={`${choice}-${position}`} className={`${answers[item.id] === choice ? "is-selected" : ""} ${!isTest && result && choice === item.answer ? "is-correct" : ""} ${!isTest && result && choice === answers[item.id] && !result.correct ? "is-missed" : ""}`} disabled={busy || (isTest ? saveStarted : Boolean(result))} aria-pressed={answers[item.id] === choice} onClick={() => setAnswers(current => ({ ...current, [item.id]: choice }))}><span>{String.fromCharCode(65 + position)}</span><span dir="auto">{choice}</span>{!isTest && result && choice === item.answer && <Check size={18} />}</button>)}</div> : <div className={`review-card-recall ${revealed ? "is-revealed" : ""}`}>{revealed ? <><p className="review-source-label">Card answer</p><p dir="auto">{item.answer}</p></> : <><BookOpen size={30} /><p>Bring the explanation to mind.<br />Then reveal the answer.</p></>}</div>}
        {!isTest && revealed && <div className="review-drill-feedback" aria-live="polite"><h4>{result ? item.kind === "flashcard" ? result.correct ? "Marked as remembered" : "Saved to revisit" : result.correct ? "Correct" : "Let’s revisit this point" : "Compare with your lesson"}</h4>{item.kind === "quiz" && <p dir="auto">{item.answer}</p>}<SourcePassage item={item} lesson={lesson} onPlay={onPlay} onOpen={onOpen} />{result && <p className="review-next-due">Next review: {result.review.intervalDays === 0 ? "in 10 minutes" : `in ${result.review.intervalDays} ${result.review.intervalDays === 1 ? "day" : "days"}`}.</p>}</div>}
      </article>
      {error && <div className="review-save-error" role="alert"><WarningCircle size={18} /><div><strong>Couldn’t save {isTest ? "all answers" : "this response"}.</strong><p>{error}</p>{isTest && <p>{saved} of {items.length} answers saved. Retry continues with the remaining answers.</p>}</div></div>}
      <div className="review-session-footer">
        {isTest ? <><button type="button" className="review-button" disabled={!index || busy} onClick={() => setIndex(current => current - 1)}><ArrowLeft size={16} /> Back</button><div className="review-test-actions">{index < items.length - 1 && <button type="button" className="review-button" disabled={busy} onClick={() => setIndex(current => current + 1)}>Next <ArrowRight size={16} /></button>}<button type="button" className="review-button review-button-dark" disabled={busy || answered !== items.length} onClick={() => void submitTest()}>{busy ? `Saving ${saved} of ${items.length}…` : saveStarted ? "Retry remaining answers" : "Submit answers"}<Check size={16} /></button></div></> : result ? <><p>{saved} of {items.length} responses saved.</p><button type="button" className="review-button review-button-dark" onClick={next}>{index + 1 === items.length ? "Finish drill" : "Next"}<ArrowRight size={16} /></button></> : item.kind === "quiz" ? <><p>Feedback uses your lesson.</p><button type="button" className="review-button review-button-dark" disabled={busy || answers[item.id] === undefined} onClick={() => void check()}>{busy ? "Saving…" : "Check answer"}<Check size={16} /></button></> : !revealed ? <><p>Card recall is self-reported.</p><button type="button" className="review-button review-button-dark" onClick={() => setRevealed(true)}>Reveal answer <BookOpen size={16} /></button></> : <><p>How did you do?</p><div className="review-test-actions"><button type="button" className="review-button" disabled={busy} onClick={() => void check(false)}>Revisit this</button><button type="button" className="review-button review-button-dark" disabled={busy} onClick={() => void check(true)}>{busy ? "Saving…" : "I remembered"}<Check size={16} /></button></div></>}
      </div>
      {isTest && <p className="review-test-note">Answers are shown after submission. This uses {items.length} available lesson questions; it is not an official exam.</p>}
    </>}
  </Modal>;
}
