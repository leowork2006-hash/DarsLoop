"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, BookOpen, Cards, CheckCircle, CircleNotch, FileAudio, Headphones, List, ListChecks, Microphone, MagnifyingGlass, SquaresFour, UploadSimple, Users, WarningCircle, X } from "@phosphor-icons/react";
import { availablePractice } from "@/lib/insights";
import { formatTime, type Lesson, type Workspace } from "@/lib/types";

type LibraryTab = "all" | "mine" | "shared";
type StatusFilter = "all" | "ready" | "preparing" | "failed";
export type LessonsPageProps = {
  workspace: Workspace;
  course: string;
  onCourse: (course: string) => void;
  onOpen: (lesson: Lesson) => void;
  onUpload: () => void;
  onRecord: () => void;
  onClasses: () => void;
};

function addedDate(lesson: Lesson) {
  const date = new Date(lesson.createdAt);
  return Number.isFinite(date.getTime()) ? date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "Date unavailable";
}

function LessonStatus({ lesson }: { lesson: Lesson }) {
  if (lesson.status === "ready" && lesson.error) return <span className="lessons-status lessons-status-failed"><Headphones size={13} /> Transcript ready</span>;
  if (lesson.status === "ready") return <span className="lessons-status lessons-status-ready"><CheckCircle size={13} /> Ready</span>;
  if (lesson.status === "failed") return <span className="lessons-status lessons-status-failed"><WarningCircle size={13} /> Needs attention</span>;
  return <span className="lessons-status lessons-status-preparing"><CircleNotch size={13} className="lessons-preparing-icon" /> {lesson.status === "queued" ? "Queued" : "Preparing"}</span>;
}

function LessonContents({ lesson }: { lesson: Lesson }) {
  if (lesson.status === "failed") return <p className="lessons-card-stage">Open your lesson for details.</p>;
  if (lesson.status !== "ready") return <p className="lessons-card-stage" dir="auto">{lesson.stage || "Study material is being prepared."}</p>;
  const practice = availablePractice(lesson), quizzes = practice.filter(item => item.kind === "quiz").length, cards = practice.filter(item => item.kind === "flashcard").length;
  const notes = lesson.noteOptions?.enabled === false ? 0 : lesson.artifacts?.notes.length || 0;
  return <div className="lessons-card-contents">
    {notes > 0 && <span><BookOpen size={13} />{notes} {notes === 1 ? "note" : "notes"}</span>}
    {quizzes > 0 && <span><ListChecks size={13} />{quizzes} {quizzes === 1 ? "question" : "questions"}</span>}
    {cards > 0 && <span><Cards size={13} />{cards} {cards === 1 ? "card" : "cards"}</span>}
    {!notes && !quizzes && !cards && <span><Headphones size={13} />Audio & transcript</span>}
  </div>;
}

function LessonCover({ lesson, view }: { lesson: Lesson; view: "grid" | "list" }) {
  const note = lesson.status === "ready" && lesson.noteOptions?.enabled !== false ? lesson.artifacts?.notes[0] : undefined;
  return <div className={`lessons-audio-cover ${note && view === "grid" ? "has-note-preview" : ""}`}>
    <span className="lessons-file-icon"><FileAudio size={view === "grid" ? 32 : 25} weight="regular" /></span>
    {note && view === "grid" && <div className="lessons-note-preview"><span>{lesson.demo ? "Example note" : "AI note preview"}</span><strong dir="auto">{note.heading}</strong><p dir="auto">{note.text}</p></div>}
    {lesson.duration > 0 && Number.isFinite(lesson.duration) && <span className="lessons-audio-duration"><Headphones size={12} /><bdi>{formatTime(lesson.duration)}</bdi></span>}
  </div>;
}

export function LessonsPage({ workspace, course, onCourse, onOpen, onUpload, onRecord, onClasses }: LessonsPageProps) {
  const [tab, setTab] = useState<LibraryTab>("all");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [view, setView] = useState<"grid" | "list">("grid");
  const all = [...workspace.lessons].sort((first, second) => (Date.parse(second.createdAt) || 0) - (Date.parse(first.createdAt) || 0));
  const courses = Array.from(new Set([...all.map(lesson => lesson.course), ...(course ? [course] : [])])).filter(Boolean).sort();
  const search = query.trim().toLocaleLowerCase();
  const filtered = all.filter(lesson => (tab !== "mine" || lesson.ownerId === workspace.userId && !lesson.demo)
    && (tab !== "shared" || lesson.shared === true && lesson.ownerId !== workspace.userId && !lesson.demo)
    && (!course || lesson.course === course)
    && (status === "all" || (status === "preparing" ? lesson.status === "queued" || lesson.status === "processing" : lesson.status === status))
    && (!search || `${lesson.title} ${lesson.course}`.toLocaleLowerCase().includes(search)));
  const hasFilters = Boolean(query || course || status !== "all");
  function clearFilters() { setQuery(""); onCourse(""); setStatus("all"); }

  return <section className="lessons-reference-page">
    <header className="lessons-page-heading"><div className="lessons-heading-title"><span className="lessons-heading-icon"><BookOpen size={27} /></span><div><h1>My lessons</h1><p>Your recordings, class notes, and practice in one place.</p></div></div><div className="lessons-heading-actions"><button type="button" className="lessons-button" onClick={onRecord}><Microphone size={17} />Record a lesson</button><button type="button" className="lessons-button lessons-button-dark" onClick={onUpload}><UploadSimple size={17} />Upload audio</button></div></header>
    <Link href="/example" className="lessons-class-link" aria-label="Open the prepared demo lesson"><FileAudio size={25}/><div><strong>Demo lesson · Listening, catch-up & revision</strong><p>Prepared fictional class with audio, notes, transcript, quiz and flashcards. Works without a live AI request.</p></div><span className="lessons-button">Open demo<ArrowRight size={15}/></span></Link>
    <div className="lessons-page-tabs" role="tablist" aria-label="Lesson collections">{([{ id: "all", label: "All lessons" }, { id: "mine", label: "My recordings" }, { id: "shared", label: "Shared with me" }] as const).map(option => <button type="button" key={option.id} id={`lessons-tab-${option.id}`} role="tab" aria-selected={tab === option.id} aria-controls="lessons-content" onClick={() => setTab(option.id)}>{option.label}</button>)}</div>
    <div className="lessons-toolbar" data-tour="lessons-toolbar">
      <div className="lessons-search"><MagnifyingGlass size={17} /><input type="search" aria-label="Search lessons" placeholder="Search your lessons…" value={query} onChange={event => setQuery(event.target.value)} />{query && <button type="button" aria-label="Clear lesson search" onClick={() => setQuery("")}><X size={14} /></button>}</div>
      <div className="lessons-filter-controls"><label><span className="sr-only">Filter lessons by course</span><select value={course} onChange={event => onCourse(event.target.value)}><option value="">All courses</option>{courses.map(value => <option value={value} key={value}>{value}</option>)}</select></label><label><span className="sr-only">Filter lessons by status</span><select value={status} onChange={event => setStatus(event.target.value as StatusFilter)}><option value="all">All statuses</option><option value="ready">Ready</option><option value="preparing">Preparing</option><option value="failed">Needs attention</option></select></label><div className="lessons-view-toggle" role="group" aria-label="Lesson layout"><button type="button" aria-label="Grid view" aria-pressed={view === "grid"} onClick={() => setView("grid")}><SquaresFour size={18} /></button><button type="button" aria-label="List view" aria-pressed={view === "list"} onClick={() => setView("list")}><List size={18} /></button></div></div>
    </div>
    <div className="lessons-results-heading"><p><strong>{filtered.length}</strong> {filtered.length === 1 ? "lesson" : "lessons"}{course && <span> in <bdi>{course}</bdi></span>}</p><span>Newest first</span></div>
    <div id="lessons-content" role="tabpanel" aria-labelledby={`lessons-tab-${tab}`} data-tour="lessons-content">
      {filtered.length ? <div className={`lessons-results lessons-results-${view}`}>{filtered.map(lesson => <button type="button" key={`${lesson.id}-${lesson.version}`} className={`lessons-library-card ${lesson.shared ? "is-shared" : ""} ${lesson.demo ? "is-example" : ""}`} onClick={() => onOpen(lesson)} aria-label={`Open ${lesson.title}`}>
        <LessonCover lesson={lesson} view={view} />
        <div className="lessons-card-body"><div className="lessons-card-top"><span className="lessons-card-course" dir="auto">{lesson.course || "My lessons"}</span><LessonStatus lesson={lesson} /></div><h2 dir="auto">{lesson.title}</h2><LessonContents lesson={lesson} /><div className="lessons-card-footer"><span>{lesson.demo ? <>Fictional example</> : lesson.shared ? <><Users size={12} />Shared with you</> : <>Added {addedDate(lesson)}</>}</span><ArrowRight size={16} /></div></div>
      </button>)}</div> : <div className="lessons-empty-panel"><span className="lessons-empty-icon">{tab === "shared" ? <Users size={34} /> : search ? <MagnifyingGlass size={34} /> : <FileAudio size={34} />}</span><h2>{hasFilters && all.length > 0 ? "No lessons match these filters" : tab === "shared" ? "No shared lessons yet" : all.length === 0 ? "Your first lesson starts here" : "No recordings here yet"}</h2><p>{hasFilters && all.length > 0 ? "Try another title, course, or preparation status." : tab === "shared" ? "Join a private class to see lessons shared with you. Your practice responses stay your own." : all.length === 0 ? "Record a class or upload its audio. Your notes and practice will stay linked to the lesson." : "Record a lesson or upload permitted audio to add it here."}</p><div className="lessons-empty-actions">{hasFilters && all.length > 0 ? <button type="button" className="lessons-button" onClick={clearFilters}>Clear filters</button> : tab === "shared" ? <button type="button" className="lessons-button lessons-button-dark" onClick={onClasses}><Users size={17} />Open private classes</button> : <><button type="button" className="lessons-button" onClick={onRecord}><Microphone size={17} />Record a lesson</button><button type="button" className="lessons-button lessons-button-dark" onClick={onUpload}><UploadSimple size={17} />Upload audio</button></>}</div></div>}
    </div>
    <div className="lessons-class-link"><Users size={21} /><div><strong>Learning with classmates?</strong><p>Permitted lessons can be shared in a private class. Your answers and review history remain private.</p></div><button type="button" className="lessons-button" onClick={onClasses}>Private classes<ArrowRight size={15} /></button></div>
  </section>;
}
