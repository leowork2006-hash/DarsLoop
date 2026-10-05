"use client";
import Link from "next/link";
import { useCallback, useState } from "react";
import { ArrowRight, X } from "@phosphor-icons/react";
import { Brand } from "./brand";
import { LessonView, type LessonTab } from "./lesson-view";
import { seekLessonPlayer } from "@/lib/audio-playback";
import { Player, type Seek } from "./player";
import type { Lesson } from "@/lib/types";

export function ExampleLesson({ lesson }: { lesson: Lesson }) {
  const [tab, setTab] = useState<LessonTab>("notes"), [seek, setSeek] = useState<Seek | null>(null), [error, setError] = useState("");
  const onPlay = useCallback((time: number) => {if(!seekLessonPlayer(lesson.id,time))setSeek({ lessonId: lesson.id, time, nonce: Date.now() });}, [lesson.id]);
  const onError = useCallback((message: string) => setError(message), []);
  return <div className="example-shell is-reference-lesson">
    <a className="skip-link" href="#example-content">Skip to lesson content</a>
    <header className="example-header"><Link href="/" aria-label="DarsLoop home"><Brand /></Link><Link className="button primary small" href="/signin">Start your own lesson <ArrowRight size={16} /></Link></header>
    <aside className="example-intro"><strong>Try the study experience.</strong><p>No account needed. These notes and questions are prepared from a fictional script. Search returns its passages; your practice resets when you leave.</p></aside>
    <main id="example-content" className="example-content">
      <LessonView lesson={lesson} tab={tab} setTab={setTab} onBack={() => window.location.assign("/")} onPlay={onPlay} onError={onError} onShare={() => {}} onDelete={() => {}} onReviewed={() => {}} configured={false} focusItemId={null} preview />
    </main>
    <Player lesson={lesson} seek={seek} onError={onError} audioSrc="/example/audio" />
    {error && <div className="toast" role="alert"><span>{error}</span><button className="icon-button" aria-label="Dismiss message" onClick={() => setError("")}><X size={16} /></button></div>}
  </div>;
}
