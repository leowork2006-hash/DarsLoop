"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUp, BookOpen, Brain, Check, CheckCircle as CheckCircle2, CaretDown as ChevronDown, Folder as FolderOpen, Headphones, House as Home, Cards as Layers, LockKey as LockKeyhole, MapTrifold as Map, ListChecks, ChatCircle as MessageCircle, Cursor as MousePointer2, Pause, Play, Plus, ArrowCounterClockwise as RotateCcw, PaperPlaneTilt as Send, Microphone, MagnifyingGlass as Search, UploadSimple as Upload, Users, X } from "@phosphor-icons/react";
import type { Citation, Lesson } from "@/lib/types";
import { formatTime } from "@/lib/types";
import { Brand } from "./brand";
import { ChatStarters } from "./chat-starters";
import { getStudyPlan } from "@/lib/study-plan";
import styles from "./product-tour.module.css";

const tabs = [
  { id: "notes", label: "Notes", icon: BookOpen },
  { id: "ask", label: "Ask this class", icon: MessageCircle },
  { id: "quiz", label: "Quiz", icon: CheckCircle2 },
  { id: "cards", label: "Flashcards", icon: Layers },
] as const;
type Tab = typeof tabs[number]["id"] | "home" | "library" | "review" | "plan";
const tourSteps = [
  { delay: 2000, target: "home-input" }, { delay: 700, action: "home-type" },
  { delay: 1700, target: "home-send" }, { delay: 750, action: "home-send" },
  { delay: 4700, target: "nav-library" }, { delay: 800, action: "library" },
  { delay: 1600, target: "lesson" }, { delay: 800, action: "notes" },
  { delay: 1700, target: "detail" }, { delay: 800, action: "detail" },
  { delay: 1900, target: "ask" }, { delay: 800, action: "ask" },
  { delay: 900, target: "send" }, { delay: 750, action: "send" },
  { delay: 3800, target: "nav-review" }, { delay: 800, action: "review" },
  { delay: 1600, target: "start-quiz" }, { delay: 800, action: "quiz" },
  { delay: 850, target: "choice" }, { delay: 700, action: "choose" },
  { delay: 850, target: "check" }, { delay: 650, action: "check" },
  { delay: 1800, target: "cards" }, { delay: 800, action: "cards" },
  { delay: 900, target: "reveal" }, { delay: 750, action: "reveal" },
  { delay: 1700, target: "nav-plan" }, { delay: 800, action: "plan" },
  { delay: 1400, target: "topic" }, { delay: 750, action: "topic" },
  { delay: 2200, target: "nav-home" }, { delay: 800, action: "home" },
] as const;
const demoQuestion = "How should I revise after class?";
const homeQuestion = "What should I focus on while listening?";

/** A local, prepared example. It never invokes AI or changes the lesson's demo status. */
export function ProductTour({ lesson }: { lesson: Lesson }) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const screen = useRef<HTMLDivElement>(null);
  const audio = useRef<HTMLAudioElement>(null);
  const [tab, setTab] = useState<Tab>("home");
  const [drawer, setDrawer] = useState(false);
  const [search, setSearch] = useState("");
  const [topicIndex, setTopicIndex] = useState<number | null>(null);
  const [detail, setDetail] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [inView, setInView] = useState(false);
  const [visible, setVisible] = useState(true);
  const [step, setStep] = useState(0);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const [question, setQuestion] = useState("");
  const [sent, setSent] = useState("");
  const [answerIndex, setAnswerIndex] = useState<number | null>(null);
  const [words, setWords] = useState(0);
  const [manualChat, setManualChat] = useState(false);
  const [typingHome, setTypingHome] = useState(false);
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
  const plan = getStudyPlan([lesson], [], { includeDemo: true, now: 0 });
  const topics = plan.units[0]?.topics ?? [];
  const lessonView = tab === "notes" || tab === "ask";
  const reviewView = tab === "review" || tab === "quiz" || tab === "cards";
  const pageTitle = tab === "home" ? "Chat" : tab === "library" ? "My lessons" : tab === "plan" ? "Study plan" : reviewView ? "Review" : lesson.title;
  const activeTabs = lessonView ? tabs.slice(0, 2) : reviewView ? tabs.slice(2) : [];
  const answer = answerIndex === -1 ? lesson.artifacts?.overview ?? "This example covers listening, catch-up and revision." : answerIndex === null ? "This prepared example covers listening, catch-up and revision. Try a question about one of those topics." : notes[answerIndex]?.text ?? "This topic is not covered in the example.";
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
    const match = /what.*lesson.*about|overview|topics.*connect/.test(text) ? -1 : /quiz|mistake|wrong/.test(text) ? 3 : /absen|absent|miss|catch/.test(text) ? 2 : /revis|return|remember|check/.test(text) ? 1 : /listen|writ|note|attention/.test(text) ? 0 : null;
    setSent(trimmed); setAnswerIndex(match === -1 ? -1 : match !== null && notes[match] ? match : null); setWords(0); setManualChat(manual); setSource(null);
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
    if (!typingHome || !running || tab !== "home") return;
    if (question.length >= homeQuestion.length) { setTypingHome(false); return; }
    const timer = setTimeout(() => setQuestion(value => homeQuestion.slice(0, value.length + 1)), 34);
    return () => clearTimeout(timer);
  }, [typingHome, running, tab, question.length]);

  useEffect(() => {
    if (!running) return;
    const current = tourSteps[step];
    const timer = setTimeout(() => {
      if ("target" in current) {
        const findTarget = () => Array.from(frame.current?.querySelectorAll<HTMLElement>(`[data-tour-target="${current.target}"]`) ?? []).find(node => node.getBoundingClientRect().width > 0);
        let element = findTarget();
        if (!element && current.target.startsWith("nav-")) {
          setDrawer(true);
          setTimeout(() => { const node = findTarget(); if (node && frame.current) { const rect = node.getBoundingClientRect(), bounds = frame.current.getBoundingClientRect(); setCursor({ x: rect.left - bounds.left + rect.width * .6, y: rect.top - bounds.top + rect.height * .55 }); } }, 80);
        }
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
        setDrawer(false);
        switch (current.action) {
          case "home": setTab("home"); setSent(""); setQuestion(""); setWords(0); setTypingHome(false); break;
          case "home-type": setQuestion(""); setTypingHome(true); break;
          case "home-send": setTypingHome(false); submitQuestion(homeQuestion, false); setQuestion(""); break;
          case "library": setTab("library"); setSearch(""); break;
          case "review": setTab("review"); break;
          case "plan": setTab("plan"); setTopicIndex(null); break;
          case "topic": setTopicIndex(0); break;
          case "detail": setDetail(true); break;
          case "ask": setTab("ask"); setSource(null); setQuestion(demoQuestion); setSent(""); break;
          case "send": submitQuestion(demoQuestion, false); break;
          case "quiz": setTab("quiz"); setSource(null); setChoice(null); setChecked(false); break;
          case "choose": setChoice(quiz?.answer ?? null); break;
          case "check": setChecked(true); break;
          case "cards": setTab("cards"); setSource(null); setRevealed(false); setRating(""); break;
          case "reveal": setRevealed(true); break;
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
  const selectTab = (next: Tab) => { pause(); setTypingHome(false); setTab(next); setSource(null); setDrawer(false); if (next === "home") { setSent(""); setQuestion(""); } };
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

  const sidebarContent = <>
    <Brand />
    <nav aria-label="Preview workspace">
      <button className={`${styles.sideItem} ${tab === "home" ? styles.sideActive : ""}`} data-tour-target="nav-home" onClick={() => selectTab("home")}><Home size={19} />Home</button>
      <button className={`${styles.sideItem} ${tab === "library" || lessonView ? styles.sideActive : ""}`} data-tour-target="nav-library" onClick={() => selectTab("library")}><FolderOpen size={19} />My lessons</button>
      <div className={styles.sideDivider}/>
      <button className={styles.courseButton} onClick={() => selectTab("library")}><span><BookOpen size={18}/></span>{lesson.course}<ChevronDown size={13}/></button>
      <button className={`${styles.sideItem} ${tab === "plan" ? styles.sideActive : ""}`} data-tour-target="nav-plan" onClick={() => selectTab("plan")}><BookOpen size={19} />Study plan</button>
      <button className={`${styles.sideItem} ${reviewView ? styles.sideActive : ""}`} data-tour-target="nav-review" onClick={() => selectTab("review")}><Layers size={19} />Review</button>
      {reviewView && <div className={styles.reviewLinks}><button onClick={() => selectTab("quiz")}><ListChecks size={16}/>Quiz</button><button onClick={() => selectTab("cards")}><Layers size={16}/>Flashcards</button></div>}
    </nav>
    <Link href="/example" className={styles.add}><Plus size={18}/>Open full example</Link>
    <div className={styles.sideFoot}><LockKeyhole size={14}/>Fictional example</div>
  </>;

  return <div className={styles.wrap} ref={root} data-product-tour data-scene={tab} data-tour-running={running}>
    <div className={styles.frame} ref={frame} onPointerDownCapture={pause} onFocusCapture={pause}>
      <div className={styles.chrome} aria-label="Browser-style product preview"><span className={styles.dots} aria-hidden="true"><i /><i /><i /></span><span className={styles.address}><LockKeyhole size={12}/><span>darsloop-production.up.railway.app/example</span></span><span className={styles.chromeTools} aria-hidden="true"><Search size={16}/><i>S</i></span></div>
      <div className={styles.app}>
        <aside className={styles.sidebar} aria-label="Example workspace">{sidebarContent}</aside>
        {drawer && <div className={styles.drawer}><button className={styles.drawerClose} aria-label="Close preview workspace menu" onClick={() => setDrawer(false)}><X size={20}/></button>{sidebarContent}</div>}
        <div className={styles.main}>
          <div className={styles.topbar}><button className={styles.mobileMenu} aria-label="Open preview workspace menu" aria-expanded={drawer} onClick={() => setDrawer(value => !value)}><span/><span/><span/></button><span><span>{tab === "home" ? "Home" : tab === "library" ? "Workspace" : "My lessons"}</span><ArrowRight size={12}/>{tab === "home" ? <MessageCircle size={17}/> : <BookOpen size={17}/>}<b>{pageTitle}</b></span><span className={styles.avatar}>S</span></div>
          {tab !== "home" && <div className={styles.heading}><div><h3>{tab === "library" ? "My lessons" : tab === "plan" ? "Your study plan" : reviewView ? "Practice your lessons" : lesson.title}</h3><p>{tab === "library" ? "Your recordings, resources, notes and practice in one place." : tab === "plan" ? "A clear way through your lessons." : reviewView ? "A quick quiz, a few cards, or a test without hints." : `${lesson.course} · ${formatTime(lesson.duration)} · Fictional example`}</p></div>{lessonView && <button className={styles.backToLibrary} onClick={() => selectTab("library")}>My lessons<ArrowRight size={14}/></button>}</div>}
          {!!activeTabs.length && <div className={styles.tabs} role="tablist" aria-label={reviewView ? "Review options" : "Explore the example lesson"} onKeyDown={event => {
            const current = activeTabs.findIndex(item => item.id === tab);
            let next: number;
            if (event.key === "ArrowRight") next = (Math.max(0,current) + 1) % activeTabs.length;
            else if (event.key === "ArrowLeft") next = (Math.max(0,current) + activeTabs.length - 1) % activeTabs.length;
            else if (event.key === "Home") next = 0;
            else if (event.key === "End") next = activeTabs.length - 1;
            else return;
            event.preventDefault(); selectTab(activeTabs[next].id); root.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
          }}>{activeTabs.map(({ id: tabId, label, icon: Icon }) => <button key={tabId} id={`${id}-${tabId}`} role="tab" aria-controls={`${id}-panel`} aria-selected={tab === tabId || tab === "review" && tabId === "quiz"} tabIndex={tab === tabId || tab === "review" && tabId === "quiz" ? 0 : -1} data-tour-target={tabId} onClick={() => selectTab(tabId)}><Icon size={17}/><span>{label}</span></button>)}</div>}
          <div className={styles.screen} ref={screen} id={`${id}-panel`} role="tabpanel" aria-label={!activeTabs.length ? pageTitle : undefined} aria-labelledby={activeTabs.length ? `${id}-${tab === "review" ? "quiz" : tab}` : undefined} tabIndex={0}>
            {tab === "home" && <div className={styles.homeScene}>{sent ? <div className={styles.homeConversation}><div className={styles.sceneTop}><span className={styles.sceneTitle}>Ask your class</span><span className={styles.prepared}>Prepared example</span></div><div className={styles.userMessage}>{sent}</div><div className={styles.assistantMessage}><span className={styles.answerMark}><img src="/art/hoopoe-guide-v10.png" alt="" width={32} height={32}/></span><div><span className={styles.answerLabel}>From this lesson</span><p>{answerWords.slice(0, words).join(" ")} {words < answerWords.length && <i className={styles.typing} aria-label="Revealing Home answer"/>}</p>{words >= answerWords.length && answerIndex !== null && answerIndex >= 0 && citation(notes[answerIndex]?.evidence)}</div></div></div> : <div className={styles.homeWelcome}><span className={styles.mascot}><img src="/art/hoopoe-guide-v10.png" alt="" width={76} height={76}/></span><h3>How can I help?</h3><ChatStarters lesson={lesson} onAsk={text => { pause(); setTypingHome(false); submitQuestion(text, true); setQuestion(""); }} onNotes={() => selectTab("notes")} onQuiz={() => selectTab("quiz")} onCards={() => selectTab("cards")} onPlan={() => selectTab("plan")}/><div className={styles.homeShortcuts}><button onClick={() => selectTab("library")}><FolderOpen size={17}/>Materials</button><button onClick={() => selectTab("plan")}><Map size={17}/>Study plan</button><Link href="/example"><Users size={17}/>My classes</Link></div></div>}<form className={styles.homeComposer} onSubmit={event => { event.preventDefault(); pause(); setTypingHome(false); submitQuestion(question, true); setQuestion(""); }}><input data-tour-target="home-input" aria-label="Home example question" placeholder="Ask about your lesson…" value={question} maxLength={180} onChange={event => { setTypingHome(false); setQuestion(event.target.value); }}/><div><button type="button" aria-label="Choose example material" onClick={() => selectTab("library")}><Plus size={20}/></button><button type="button" className={styles.chooseLesson} onClick={() => selectTab("library")}><BookOpen size={15}/><span>{sent ? lesson.title : "Choose a lesson"}</span><ChevronDown size={12}/></button><Link href="/example" aria-label="Record in the full example"><Microphone size={18}/></Link><Link href="/example" aria-label="Open example upload"><Upload size={18}/></Link><button className={styles.homeSend} data-tour-target="home-send" aria-label="Send prepared home question" disabled={!question.trim()}><ArrowUp size={20}/></button></div></form><p className={styles.homeCaption}>Answers use your lesson. Ask a teacher for religious guidance.</p></div>}
            {tab === "library" && <div className={styles.libraryScene}><div className={styles.libraryCollections}><span>All lessons</span><span>My materials</span><span>Shared with me</span></div><label className={styles.librarySearch}><Search size={18}/><input aria-label="Search preview lessons" placeholder="Search your lessons…" value={search} onChange={event => setSearch(event.target.value)}/></label><div className={styles.libraryCount}><span>{`${lesson.title} ${lesson.course}`.toLowerCase().includes(search.toLowerCase()) ? "1 lesson" : "0 lessons"}</span><span>Newest first</span></div>{`${lesson.title} ${lesson.course}`.toLowerCase().includes(search.toLowerCase()) ? <button className={styles.libraryCard} data-tour-target="lesson" onClick={() => selectTab("notes")}><div className={styles.libraryCover}><Microphone size={35}/><div><span>Example note</span><strong>{notes[0]?.heading}</strong><p>{notes[0]?.text}</p></div><span className={styles.libraryDuration}><Headphones size={13}/>{formatTime(lesson.duration)}</span></div><div className={styles.libraryCardBody}><span>{lesson.course}<i><CheckCircle2 size={14}/>Ready</i></span><h4>{lesson.title}</h4><p>{notes.length} notes · {lesson.artifacts?.practice.filter(item => item.kind === "quiz").length} questions · {lesson.artifacts?.practice.filter(item => item.kind === "flashcard").length} cards</p><div>Fictional example<ArrowRight size={17}/></div></div></button> : <p>No lessons match this search.</p>}</div>}
            {tab === "review" && <div className={styles.reviewScene}><div className={styles.reviewBanner}><span>ONE POINT AT A TIME</span><h4>Try it. Check it. Hear it again.</h4><p>Choose a lesson. Each answer takes you back to the teacher’s words.</p></div><div className={styles.reviewLesson}><span>{lesson.course}</span><h4>{lesson.title}</h4><p>Fictional sample practice · {quiz ? "Quiz and flashcards" : "Class practice"}</p><div><button className={styles.primary} data-tour-target="start-quiz" onClick={() => selectTab("quiz")}>Start quiz<ArrowRight size={16}/></button><button onClick={() => selectTab("cards")}>Study cards<Layers size={16}/></button></div></div></div>}
            {tab === "plan" && <div className={styles.planScene}><div className={styles.planSummary}><span><BookOpen size={15}/>{topics.length} topics</span><span><Check size={15}/>0 practised</span><span><RotateCcw size={15}/>0 to revisit</span></div><div className={styles.planBanner}><h4>From your sources to a clear next step.</h4><p>Follow a topic, check its source, then practise.</p></div><h4 className={styles.planUnit}>{lesson.title}</h4><div className={styles.planTopics}>{topics.map((topic,index) => <div key={topic.id}><button data-tour-target={index === 0 ? "topic" : undefined} aria-expanded={topicIndex === index} onClick={() => { pause(); setTopicIndex(topicIndex === index ? null : index); }}><i/><span>{topic.title}<small>{topic.practiceCount ? "Ready to try" : "Read & listen"}</small></span><ChevronDown size={15}/></button>{topicIndex === index && <article><p>{topic.description}</p>{citation(topic.sources)}<button className={styles.primary} onClick={() => selectTab("notes")}>Open notes<ArrowRight size={15}/></button></article>}</div>)}</div></div>}
            {tab === "notes" && <div className={styles.notes}>
              <div className={styles.sceneTop}><span className={styles.sceneTitle}>Class notes</span><div className={styles.segmented} role="group" aria-label="Note detail"><button aria-pressed={!detail} onClick={() => { pause(); setDetail(false); }}>Summary</button><button aria-pressed={detail} data-tour-target="detail" onClick={() => { pause(); setDetail(true); }}>Detailed</button></div></div>
              {!detail ? <><div className={styles.summary}><span className={styles.tinyLabel}>SHORT SUMMARY</span><h4>Your class notes.</h4><p>{lesson.artifacts?.overview}</p><div className={styles.keyPoints}>{notes.slice(0, 3).map((note, index) => <span key={note.heading}><i>{String(index + 1).padStart(2, "0")}</i>{note.heading}</span>)}</div></div><div className={styles.sourceHint}><Headphones size={17} /><span>Every note leads back to the class passage.</span>{citation(notes[0]?.evidence)}</div></> : <div className={styles.detailed}>{notes.slice(0, 3).map((note, index) => <article key={note.heading}><span className={styles.noteNumber}>{String(index + 1).padStart(2, "0")}</span><div><h4>{note.heading}</h4><p>{note.text}</p>{citation(note.evidence)}</div></article>)}</div>}
            </div>}
            {tab === "ask" && <div className={styles.chat}>
              <div className={styles.sceneTop}><span className={styles.sceneTitle}>Ask this lesson</span><span className={styles.prepared}>Prepared example</span></div>
              <div className={styles.conversation}>
                {!sent ? <div className={styles.chatWelcome}><span className={styles.chatMark}><MessageCircle size={23} /></span><h4>Keep the class in context.</h4><p>Try a question about listening or revision.</p><button onClick={() => { pause(); setQuestion(demoQuestion); submitQuestion(demoQuestion, true); }}>{demoQuestion}<ArrowRight size={14} /></button></div> : <><div className={styles.userMessage}>{sent}</div><div className={styles.assistantMessage}><span className={styles.answerMark}><img src="/art/hoopoe-guide-v10.png" alt="" width={32} height={32}/></span><div><span className={styles.answerLabel}>From this lesson</span><p>{answerWords.slice(0, words).join(" ")} {words < answerWords.length && <i className={styles.typing} aria-label="Revealing answer" />}</p>{words >= answerWords.length && answerIndex !== null && answerIndex >= 0 && citation(notes[answerIndex]?.evidence)}</div></div></>}
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
          {source && <div className={styles.sourcePanel} role="region" aria-label="Original class passage"><div><b>Original class passage</b><button aria-label="Close original passage" onClick={() => setSource(null)}><X size={16} /></button></div><blockquote>{source.quote}</blockquote><button className={styles.listen} onClick={playSource}>{audioPlaying ? <Pause size={13} /> : <Play size={13} weight="fill" />} {audioPlaying ? "Pause audio" : `Listen from ${formatTime(sourceSegment?.start ?? 0)}`}</button>{audioNotice && <p role="status">{audioNotice}</p>}</div>}
          <div className={styles.player}><span className={styles.audioIcon}><Headphones size={14} /></span><span>Fictional class recording</span><div className={styles.wave} aria-hidden="true">{Array.from({ length: 32 }, (_, index) => <i key={index} style={{ height: Math.round(5 + Math.abs(Math.sin(index * 1.7)) * 13) }} />)}</div><span>{formatTime(lesson.duration)}</span><span className={styles.speed}>1×<ChevronDown size={11} /></span></div>
        </div>
      </div>
      {running && cursor && <div className={styles.cursor} aria-hidden="true" style={{ left: cursor.x, top: cursor.y }}><MousePointer2 size={27} fill="#28232e" /><span>Explore</span></div>}
    </div>
    <audio ref={audio} src="/example/audio" preload="none" onPlay={() => setAudioPlaying(true)} onPause={() => setAudioPlaying(false)} onEnded={() => setAudioPlaying(false)} />
  </div>;
}
