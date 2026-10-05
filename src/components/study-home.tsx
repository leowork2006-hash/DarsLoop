"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowUp, BookOpen, Brain, Check, CaretDown, FileAudio, FolderOpen, ListBullets, MapTrifold, Microphone, NotePencil, Plus, MagnifyingGlass, UploadSimple, Users, X } from "@phosphor-icons/react";
import { Chat, type LessonTab } from "./lesson-view";
import { Modal } from "./modal";
import { StudyAvatar } from "./study-avatar";
import { formatTime, type Lesson, type Workspace } from "@/lib/types";

type HomeAction = { kind: "question"; text: string } | { kind: "notes" | "quiz" | "cards" | "plan" };
const suggestions: { label: string; action: HomeAction; icon: typeof Brain; tone: string }[] = [
  { label: "What is this lesson about?", action: { kind: "question", text: "What is this lesson about?" }, icon: Brain, tone: "blue" },
  { label: "How do these topics connect?", action: { kind: "question", text: "How do the main topics in this lesson connect?" }, icon: Brain, tone: "blue" },
  { label: "Open my study plan", action: { kind: "plan" }, icon: BookOpen, tone: "green" },
  { label: "Quiz me on this lesson", action: { kind: "quiz" }, icon: BookOpen, tone: "green" },
  { label: "Review my flashcards", action: { kind: "cards" }, icon: NotePencil, tone: "peach" },
  { label: "Show my class notes", action: { kind: "notes" }, icon: NotePencil, tone: "peach" },
];

export function StudyHome({ workspace, onAdd, onOpen, onPlay, onError, onReview, onChatLesson, onPlan, onClasses }: {
  workspace: Workspace;
  onAdd: (mode: "record" | "upload") => void;
  onOpen: (lesson: Lesson, tab?: LessonTab, itemId?: string | null) => void;
  onPlay: (lesson: Lesson, time: number) => void;
  onError: (text: string) => void;
  onReview: () => void;
  onChatLesson: (id: string | null) => void;
  onPlan: (lesson?: Lesson) => void;
  onClasses: () => void;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [picker, setPicker] = useState(false), [search, setSearch] = useState(""), [group, setGroup] = useState("");
  const [draft, setDraft] = useState<string | null>(null), [question, setQuestion] = useState("");
  const [pending, setPending] = useState<HomeAction | null>(null), [questionDraft, setQuestionDraft] = useState<{ text: string; nonce: number }>();
  const [menu, setMenu] = useState(false);
  const menuRoot = useRef<HTMLDivElement>(null), menuButton = useRef<HTMLButtonElement>(null);
  const ready = workspace.lessons.filter(l => l.status === "ready" && l.segments.length > 0);
  const active = ready.find(l => l.id === activeId) || null;
  const groupIds = group ? workspace.groups.find(g => g.id === group)?.lessons.map(l => l.id) || [] : null;
  const choices = ready.filter(l => (!groupIds || groupIds.includes(l.id)) && `${l.title} ${l.course}`.toLowerCase().includes(search.toLowerCase()));

  useEffect(() => {
    if (!menu) return;
    menuRoot.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus();
    function outside(e: PointerEvent) { if (!menuRoot.current?.contains(e.target as Node)) setMenu(false); }
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [menu]);

  function selectLesson(action: HomeAction | null = null) {
    setPending(action); setDraft(active?.id || null); setSearch(""); setGroup(""); setMenu(false); setPicker(true);
  }
  function run(action: HomeAction, lesson = active) {
    if (!lesson) { selectLesson(action); return; }
    if (action.kind === "question") setQuestionDraft({ text: action.text, nonce: Date.now() });
    else if (action.kind === "plan") onPlan(lesson);
    else if (action.kind === "notes") onOpen(lesson, "notes");
    else {
      const item = lesson.artifacts?.practice.find(p => p.kind === (action.kind === "quiz" ? "quiz" : "flashcard"));
      if (item) onOpen(lesson, "practice", item.id);
      else onError(`This lesson has no ${action.kind === "quiz" ? "quiz questions" : "flashcards"} yet.`);
    }
  }
  function confirmLesson() {
    const chosen = ready.find(l => l.id === draft);
    if (!chosen) return;
    setActiveId(chosen.id); onChatLesson(chosen.id); setPicker(false);
    if (pending) run(pending, chosen);
    else if (question.trim()) setQuestionDraft({ text: question, nonce: Date.now() });
    else setQuestionDraft(undefined);
    setQuestion(""); setPending(null);
  }
  function menuAction(action: () => void) { setMenu(false); action(); }
  function menuKey(e: React.KeyboardEvent) {
    const items = Array.from(menuRoot.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') || []);
    const index = items.indexOf(document.activeElement as HTMLButtonElement);
    if (e.key === "Escape") { e.preventDefault(); setMenu(false); menuButton.current?.focus(); }
    else if (["ArrowUp", "ArrowDown", "Home", "End"].includes(e.key)) {
      e.preventDefault(); const next = e.key === "Home" ? 0 : e.key === "End" ? items.length - 1 : (index + (e.key === "ArrowUp" ? items.length - 1 : 1)) % items.length;
      items[next]?.focus();
    } else if (e.key === "Tab") setMenu(false);
  }
  const entryActions = <div className="home-lesson-entry" data-tour="home-entry">
    <button type="button" className="home-record-control" data-tour="home-record" onClick={() => onAdd("record")}><Microphone size={19}/> <span>Record a lesson</span></button>
    <button type="button" className="home-upload-control" data-tour="home-upload" onClick={() => onAdd("upload")}><UploadSimple size={19}/> <span>Upload audio</span></button>
  </div>;
  const tools = <div className="home-composer-tools">
    <div className="home-menu-anchor" ref={menuRoot} onKeyDown={menuKey}>
      <button type="button" ref={menuButton} className={`home-attach ${menu ? "is-open" : ""}`} aria-label="Chat actions" aria-haspopup="menu" aria-expanded={menu} onClick={() => setMenu(!menu)}><Plus size={23}/></button>
      {menu && <div className="home-actions-menu" role="menu" aria-label="Chat actions">
        <button role="menuitem" onClick={() => menuAction(() => onAdd("record"))}><Microphone size={20}/>Record a lesson</button>
        <button role="menuitem" onClick={() => menuAction(() => onAdd("upload"))}><UploadSimple size={20}/>Upload audio</button>
        <button role="menuitem" onClick={() => selectLesson()}><FolderOpen size={20}/>Materials</button>
        <div className="home-menu-divider"/>
        <button role="menuitem" onClick={() => menuAction(onClasses)}><Users size={20}/>My classes</button>
        <button role="menuitem" onClick={() => menuAction(() => onPlan(active || undefined))}><MapTrifold size={20}/>Study plan</button>
        <button role="menuitem" onClick={() => menuAction(onReview)}><ListBullets size={20}/>My revision</button>
      </div>}
    </div>
    <button type="button" className={`home-source ${active ? "has-source" : ""}`} data-tour="home-source" onClick={() => selectLesson()}><BookOpen size={17}/><span>{active ? active.title : "Choose a lesson"}</span><CaretDown size={13}/></button>
  </div>;
  const welcome = <div className="home-welcome">
    <StudyAvatar reference/><h2>How can I help?</h2>
    <div className="home-suggestions" data-tour="home-prompts">{suggestions.map(({ label, action, icon: Icon, tone }) => <button key={label} type="button" onClick={() => run(action)}><span className={`home-prompt-icon ${tone}`}><Icon size={18}/></span>{label}</button>)}</div>
    <div className="home-shortcuts"><button onClick={() => selectLesson()}><FolderOpen size={17}/> Materials</button><button onClick={() => onPlan(active || undefined)}><MapTrifold size={17}/> Study plan</button><button onClick={onClasses}><Users size={17}/> My classes</button></div>
  </div>;

  return <section className={`study-home reference-chat ${active ? "has-active-chat" : ""}`}>
    <h1 className="sr-only">Your study space</h1>
    <div className="home-chat-stage" data-tour="home-chat">
      {active ? <Chat key={`${active.id}-${active.version}`} lesson={active} onPlay={time => onPlay(active, time)} onError={onError} configured={workspace.configured.generation} home tools={tools} composerActions={entryActions} emptyState={welcome} draft={questionDraft}/> : <div className="home-chat-empty">
        {welcome}
        <form className="home-composer-empty" data-tour="home-composer" onSubmit={e => { e.preventDefault(); selectLesson(question.trim().length >= 2 ? { kind: "question", text: question } : null); }}>
          <label className="sr-only" htmlFor="home-question">Ask about your lesson</label>
          <textarea id="home-question" rows={1} maxLength={1000} placeholder="Ask about your lesson…" value={question} onChange={e => setQuestion(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); selectLesson(question.trim().length >= 2 ? { kind: "question", text: question } : null); } }}/>
          <div className="home-composer-footer">{tools}<div className="home-composer-actions">{entryActions}<button className="send-button" aria-label="Choose a lesson for this question" disabled={question.trim().length < 2}><ArrowUp size={22}/></button></div></div>
        </form>
        <p className="composer-caption">Answers use your lesson. Ask a teacher for religious guidance.</p>
      </div>}
    </div>
    {picker && <Modal title="Select materials" onClose={() => { setPicker(false); setPending(null); }} className="material-picker reference-material-picker" wide>
      <p className="material-picker-intro">Choose a lesson to use in your chat.</p>
      <div className="material-picker-toolbar"><label className="search-field"><MagnifyingGlass size={17}/><span className="sr-only">Search lesson materials</span><input autoFocus placeholder="Search materials…" value={search} onChange={e => setSearch(e.target.value)}/>{search && <button type="button" className="icon-button" aria-label="Clear material search" onClick={() => setSearch("")}><X size={16}/></button>}</label>{workspace.groups.length > 0 && <label className="field"><span className="sr-only">Filter by private class</span><select aria-label="Filter by private class" value={group} onChange={e => { setGroup(e.target.value); setDraft(null); }}><option value="">All my lessons</option>{workspace.groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select></label>}</div>
      <div className="material-choice-grid" role="radiogroup" aria-label="Lesson for chat"><button type="button" className="material-new" onClick={() => { setPicker(false); onAdd("upload"); }}><Plus size={32}/><span>Upload new audio</span></button>{choices.map((l, i) => <button id={`material-${l.id}`} tabIndex={choices.some(c => c.id === draft) ? draft === l.id ? 0 : -1 : i === 0 ? 0 : -1} onKeyDown={e => { if (["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp", "Home", "End"].includes(e.key)) { e.preventDefault(); const n = e.key === "Home" ? 0 : e.key === "End" ? choices.length - 1 : (i + (["ArrowLeft", "ArrowUp"].includes(e.key) ? choices.length - 1 : 1)) % choices.length; setDraft(choices[n].id); document.getElementById(`material-${choices[n].id}`)?.focus(); } }} role="radio" aria-checked={draft === l.id} key={l.id} className={`material-choice ${draft === l.id ? "selected" : ""}`} onClick={() => setDraft(l.id)}>
        <span className="material-cover"><Microphone size={66} weight="light"/><span className="material-check">{draft === l.id && <Check size={13}/>}</span></span>
        <strong dir="auto"><FileAudio size={16}/><span>{l.title}</span></strong><small>{l.course}{l.shared && " · Shared"}</small><span>{formatTime(l.duration)} audio</span>
      </button>)}</div>
      {!choices.length && <p className="material-empty">{ready.length ? "No lessons match your search." : "Record or upload your first lesson. It will appear here when it’s ready."}</p>}
      <footer className="material-picker-footer"><span>{draft && choices.some(l => l.id === draft) ? "1 selected" : "0 selected"}</span><button type="button" className="button primary" disabled={!choices.some(l => l.id === draft)} onClick={confirmLesson}>Confirm selection</button></footer>
    </Modal>}
  </section>;
}
