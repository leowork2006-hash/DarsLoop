"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight, Waveform as AudioLines, BookOpen, Check, CaretDown as ChevronDown, CaretRight as ChevronRight,
  Question as CircleHelp, Clock as Clock3, Headphones, Cards as Layers, ChatCircle as MessageCircle, Play,
  ArrowCounterClockwise as RotateCcw, UploadSimple as Upload,
} from "@phosphor-icons/react";
import { getStudyPlan, type StudyPlanTopic, type StudyPlanUnit } from "@/lib/study-plan";
import { formatTime, type Lesson, type PracticeItem, type Workspace } from "@/lib/types";
import { ExamWeek } from "./learning-tools";
import { pdfSourceUrl, sourceLabel } from "@/lib/source-passages";
import { Modal } from "./modal";

type Filter = "all" | "to_try" | "due";
type Order = "lesson" | "review";
type Props = {
  workspace: Workspace;
  initialCourse: string | null;
  onUpload: () => void;
  onOpenLesson: (lesson: Lesson) => void;
  onOpenSource: (lesson: Lesson, time: number) => void;
  onOpenPractice: (lesson: Lesson, itemId: string) => void;
  onAsk: (lesson: Lesson) => void;
};

const rank = (topic: StudyPlanTopic) =>
  topic.status === "due" ? 0 : topic.status === "untried" ? 1 : topic.status === "in_progress" ? 2 : topic.status === "read_only" ? 3 : 4;

function statusText(topic: StudyPlanTopic) {
  if (topic.status === "due") return "Ready to revisit";
  if (topic.status === "untried") return "Ready to try";
  if (topic.status === "in_progress") return "In progress";
  if (topic.status === "practised") return "Practised";
  return "Read & listen";
}

function TopicRow({ topic, isNext, onOpen, onListen }: {
  topic: StudyPlanTopic; isNext: boolean; onOpen: () => void; onListen: () => void;
}) {
  return <li className={`plan-ref-topic ${isNext ? "is-next" : ""}`}>
    <span className={`plan-ref-topic-dot ${topic.status}`} aria-hidden="true">{topic.status === "practised" ? <Check size={10}/> : null}</span>
    <button className="plan-ref-topic-main" onClick={onOpen}>
      <span dir="auto">{topic.title}</span>
      <span className={`plan-ref-topic-status ${topic.status}`}>{statusText(topic)}</span>
      <ChevronRight size={17} aria-hidden="true"/>
    </button>
    <button className="plan-ref-topic-listen" onClick={onListen} aria-label={`Open source at ${sourceLabel(topic.sources[0])}`}>
      <Play size={11} weight="fill" aria-hidden="true"/> {sourceLabel(topic.sources[0])}
    </button>
  </li>;
}

export function StudyPlanPage({ workspace, initialCourse, onUpload, onOpenLesson, onOpenSource, onOpenPractice, onAsk }: Props) {
  const [course, setCourse] = useState(initialCourse || "");
  const [filter, setFilter] = useState<Filter>("all");
  const [order, setOrder] = useState<Order>("lesson");
  const [expandedId, setExpandedId] = useState<string | false | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showHow, setShowHow] = useState(false);
  const [howStep, setHowStep] = useState(0);

  useEffect(() => { setCourse(initialCourse || ""); setExpandedId(null); }, [initialCourse]);
  const all = useMemo(() => getStudyPlan(workspace.lessons, workspace.reviews), [workspace.lessons, workspace.reviews]);
  const plan = useMemo(() => getStudyPlan(workspace.lessons, workspace.reviews, { course }), [workspace.lessons, workspace.reviews, course]);
  const selected = plan.units.flatMap(unit => unit.topics).find(topic => topic.id === selectedId) ?? null;
  const lessonById = (id: string) => workspace.lessons.find(lesson => lesson.id === id);
  const selectedLesson = selected ? lessonById(selected.lessonId) : undefined;
  const nextTopic = plan.units.flatMap(unit => unit.topics).find(topic => topic.id === plan.next?.topicId);
  const firstTopic = plan.units.flatMap(unit => unit.topics)[0];
  const pendingCount = workspace.lessons.filter(lesson => lesson.status === "queued" || lesson.status === "processing").length;

  const visibleUnits = plan.units.map(unit => {
    const topics = unit.topics.filter(topic => filter === "all" || (filter === "due"
      ? topic.status === "due"
      : topic.status === "untried" || topic.status === "in_progress"));
    return { ...unit, topics: order === "review" ? [...topics].sort((a, b) => rank(a) - rank(b)) : topics };
  }).filter(unit => unit.topics.length);
  if (order === "review") visibleUnits.sort((a, b) => Math.min(...a.topics.map(rank)) - Math.min(...b.topics.map(rank)));
  const openUnitId = expandedId === null ? visibleUnits[0]?.lessonId : expandedId === false ? undefined : expandedId;
  const sideTopic = filter === "all" ? nextTopic : visibleUnits.flatMap(unit => unit.topics)[0];
  const sideLesson = sideTopic ? lessonById(sideTopic.lessonId) : undefined;

  const reviewsFor = (topic: StudyPlanTopic, item: PracticeItem) => workspace.reviews.find(review =>
    review.lessonId === topic.lessonId && review.version === topic.lessonVersion && review.itemId === item.id);
  const itemFor = (topic: StudyPlanTopic, kind: PracticeItem["kind"]): PracticeItem | undefined => {
    const lesson = lessonById(topic.lessonId);
    const items = lesson?.artifacts?.practice.filter(item => item.kind === kind && topic.practiceItemIds.includes(item.id)) ?? [];
    return items.find(item => { const review = reviewsFor(topic, item); return review && Date.parse(review.dueAt) <= Date.now(); })
      ?? items.find(item => !reviewsFor(topic, item)) ?? items[0];
  };
  const quizItem = selected ? itemFor(selected, "quiz") : undefined;
  const flashcardItem = selected ? itemFor(selected, "flashcard") : undefined;
  const sourceTime = selected?.sources[0]?.start ?? 0;
  function openSource(lesson:Lesson,topic:StudyPlanTopic){if(lesson.sourceKind==="pdf"){window.open(pdfSourceUrl(lesson,topic.sources[0]?.page),"_blank","noopener,noreferrer");}else onOpenSource(lesson,topic.sources[0]?.start??0);}
  const openHow = () => { setHowStep(0); setShowHow(true); };
  const howSteps = [
    { tag: "01 / Your lesson", title: "Start with your source", body: "Each topic comes from a prepared lesson or PDF. The original source stays one tap away." },
    { tag: "02 / The source", title: "Check what was said", body: "Open the passage behind a topic. AI notes can miss words, so check important details in the original source." },
    { tag: "03 / Your next step", title: "Try it, then revisit", body: "A saved answer sets a review date. The plan shows your activity, not a mastery score." },
  ];

  return <section className="study-plan-page plan-reference">
    <header className="plan-heading" data-tour="plan-heading">
      <div className="plan-ref-heading-copy">
        <span className="plan-ref-kicker">STUDY PLAN</span>
        <h1 dir="auto">{course || "Your study plan"}</h1>
        <p>{course ? "Your lessons, topics and next steps." : "A clear way through your lessons."}</p>
        {!!plan.units.length && <div className="plan-ref-summary" aria-label="Study plan activity">
          <span><BookOpen size={15}/><strong>{plan.summary.topics}</strong> {plan.summary.topics === 1 ? "topic" : "topics"}</span>
          <span><Check size={15}/><strong>{plan.summary.topicsPractised}</strong> practised</span>
          <span><RotateCcw size={15}/><strong>{plan.summary.topicsDue}</strong> to revisit</span>
        </div>}
      </div>
      <div className="plan-head-actions">
        <button className="plan-ref-help-button" onClick={openHow}><CircleHelp size={16}/> How it works</button>
        <button className="plan-ref-add-button" onClick={onUpload}><Upload size={16}/> Add lesson</button>
      </div>
    </header>

    <section className="plan-how" aria-label="How the study plan works">
      <div className="plan-ref-banner-copy">
        <span className="plan-ref-kicker">GET THE MOST FROM YOUR PLAN</span>
        <h2>From your sources to a clear next step.</h2>
        <p>Follow a topic, check its source, then practise.</p>
        <button onClick={openHow}>See how it works <ArrowRight size={15}/></button>
      </div>
      {firstTopic && <div className="plan-ref-banner-preview" aria-hidden="true">
        <span className="plan-ref-preview-label">FROM YOUR LESSON</span>
        <div className="plan-ref-preview-row"><span className="plan-ref-preview-pin"/><b dir="auto">{firstTopic.title}</b></div>
        <div className="plan-ref-preview-row"><span className="plan-ref-preview-pin"/><span>Original source · {sourceLabel(firstTopic.sources[0])}</span></div>
      </div>}
    </section>

    <div className="plan-controls" data-tour="plan-controls">
      <strong>Customize your plan</strong>
      <div className="plan-ref-control-right">
        <div className="plan-ref-filter" role="group" aria-label="Show topics">
          <button aria-pressed={filter === "all"} onClick={() => { setFilter("all"); setExpandedId(null); }}>All</button>
          <button aria-pressed={filter === "to_try"} onClick={() => { setFilter("to_try"); setExpandedId(null); }}>To try</button>
          <button aria-pressed={filter === "due"} onClick={() => { setFilter("due"); setExpandedId(null); }}>Revisit{plan.summary.topicsDue ? ` ${plan.summary.topicsDue}` : ""}</button>
        </div>
        <label className="plan-ref-select">Course <span><select value={course} onChange={event => { setCourse(event.target.value); setExpandedId(null); }} aria-label="Course"><option value="">All courses</option>{all.courses.map(name => <option value={name} key={name}>{name}</option>)}</select><ChevronDown size={14}/></span></label>
        <label className="plan-ref-select">Order <span><select value={order} onChange={event => { setOrder(event.target.value === "review" ? "review" : "lesson"); setExpandedId(null); }} aria-label="Topic order"><option value="lesson">Latest lesson</option><option value="review">Review first</option></select><ChevronDown size={14}/></span></label>
      </div>
    </div>

    <div className="plan-ref-layout">
      <div className="plan-timeline" data-tour="plan-timeline">
        <div className="plan-timeline-label"><span><ArrowRight size={16}/></span><strong>{filter === "due" ? "Ready to revisit" : "Start learning here"}</strong></div>
        {visibleUnits.length ? visibleUnits.map((unit: StudyPlanUnit) => {
          const expanded = openUnitId === unit.lessonId;
          const unitNext = unit.topics.find(topic => topic.id === plan.next?.topicId) ?? unit.topics[0];
          const unitLesson = lessonById(unit.lessonId);
          return <article className={`plan-ref-unit ${expanded ? "is-open" : ""}`} key={unit.lessonId}>
            <div className="plan-ref-unit-header">
              <button className="plan-ref-unit-toggle" aria-expanded={expanded} aria-controls={`plan-unit-${unit.lessonId}`} onClick={() => setExpandedId(expanded ? false : unit.lessonId)}>
                <span className="plan-ref-unit-chevron"><ChevronDown size={17}/></span>
                <span className="plan-ref-unit-title"><span className="plan-ref-unit-kicker"><AudioLines size={13}/>{unit.course} · {unit.sourceKind==="pdf"?`${unit.sourcePageCount} PDF pages`:`${formatTime(unit.duration)} audio`}</span><strong dir="auto">{unit.title}</strong><small>{unit.topics.length} {unit.topics.length === 1 ? "topic" : "topics"}{unit.unclearPassages ? ` · ${unit.unclearPassages} unclear ${unit.unclearPassages === 1 ? "passage" : "passages"}` : ""}</small></span>
              </button>
              <button className="plan-ref-open-lesson" onClick={() => { if (unitLesson) onOpenLesson(unitLesson); }}>Open lesson <ArrowRight size={14}/></button>
            </div>
            <div className="plan-ref-unit-content" id={`plan-unit-${unit.lessonId}`} hidden={!expanded}>
              {unitNext && <button className="plan-ref-checkpoint" onClick={() => setSelectedId(unitNext.id)}>
                <span className="plan-ref-checkpoint-icon"><Clock3 size={17}/></span>
                <span><strong>{unitNext.status === "due" ? "Revisit this passage" : unitNext.practiceCount ? "See what you know" : "Begin with the recording"}</strong><small>{unitNext.practiceCount ? `${unitNext.practiceCount} ${unitNext.practiceCount === 1 ? "question" : "questions"} from this passage` : `Original source · ${sourceLabel(unitNext.sources[0])}`}</small></span>
                <b>Continue <ArrowRight size={14}/></b>
              </button>}
              <ol className="plan-ref-topic-list">{unit.topics.map(topic => <TopicRow key={topic.id} topic={topic} isNext={topic.id === plan.next?.topicId} onOpen={() => setSelectedId(topic.id)} onListen={() => { if (unitLesson) openSource(unitLesson,topic); }}/>)}</ol>
              <div className="plan-ref-unit-source"><Headphones size={13}/> Source: <button onClick={() => { if (unitLesson) onOpenLesson(unitLesson); }} dir="auto">{unit.title}</button></div>
            </div>
          </article>;
        }) : <div className="plan-empty">
          <span className="plan-ref-empty-icon"><BookOpen size={28} strokeWidth={1.5}/></span>
          <h2>{!all.units.length ? pendingCount ? "Your lesson is being prepared" : "Start with a class recording" : filter === "due" ? "Nothing to revisit yet" : filter === "to_try" ? "No topics to try here" : "No lessons in this course"}</h2>
          <p>{!all.units.length ? pendingCount ? "Your topics will appear when the lesson is ready." : "Add permitted class audio or a PDF source to build your study plan." : filter === "due" ? "Practise a question and it will return when it is due." : "Choose All to see your lesson topics."}</p>
          <button onClick={!all.units.length ? onUpload : () => { setFilter("all"); setCourse(""); }}>
            {!all.units.length ? "Add a lesson" : "Show all topics"} <ArrowRight size={15}/>
          </button>
        </div>}
      </div>

      <aside className="plan-ref-side">
        <div className="plan-ref-next">
          <span className="plan-ref-kicker">YOUR NEXT STEP</span>
          {sideTopic && sideLesson ? <><h2 dir="auto">{sideTopic.title}</h2><p>{sideTopic.status === "due" ? "A question is ready to revisit." : sideTopic.practiceCount ? "Try a question from this passage." : "Start with the original source."}</p><span className="plan-ref-next-source"><Headphones size={14}/><span dir="auto">{sideLesson.title}</span><bdi>{sourceLabel(sideTopic.sources[0])}</bdi></span><button onClick={() => setSelectedId(sideTopic.id)}>Start here <ArrowRight size={15}/></button></> : <><h2>{all.units.length ? "Nothing in this view." : "Your lessons, in order."}</h2><p>{all.units.length ? "Show all topics to choose what to study." : "Add a recording or PDF to begin."}</p><button onClick={all.units.length ? () => { setFilter("all"); setCourse(""); } : onUpload}>{all.units.length ? "See all topics" : "Add a lesson"} <ArrowRight size={15}/></button></>}
        </div>
        {!!all.units.length && <div className="plan-ref-activity">
          <h2>Your activity</h2>
          <div className="plan-ref-activity-bar" role="progressbar" aria-label="Questions tried" aria-valuemin={0} aria-valuemax={plan.summary.practiceItems || 1} aria-valuenow={plan.summary.practiceItemsTried}><span style={{ width: `${plan.summary.practiceItems ? Math.round(plan.summary.practiceItemsTried / plan.summary.practiceItems * 100) : 0}%` }}/></div>
          <p><span>Questions tried</span><strong>{plan.summary.practiceItemsTried} / {plan.summary.practiceItems}</strong></p>
          <p><span>Due now</span><strong>{plan.summary.practiceItemsDue}</strong></p>
          <small>Saved practice, not a mastery score.</small>
        </div>}
      </aside>
    </div>

    <ExamWeek userId={workspace.userId} lessons={workspace.lessons} reviews={workspace.reviews} onOpen={onOpenLesson} onPractice={onOpenPractice}/>
    {selected && selectedLesson && <Modal title={selected.title} onClose={() => setSelectedId(null)} className="plan-ref-topic-modal">
      <div className="plan-ref-modal-intro"><span className={`plan-ref-topic-status ${selected.status}`}>{statusText(selected)}</span><span><AudioLines size={13}/>{sourceLabel(selected.sources[0])} in original source</span></div>
      {selected.kind === "note" && <p className="plan-ref-modal-note" dir="auto">{selected.description}</p>}
      <button className="plan-ref-modal-source" onClick={() => { setSelectedId(null); openSource(selectedLesson,selected); }}>
        <span><Play size={17} weight="fill"/></span><span><strong>{selectedLesson.sourceKind==="pdf"?"Open the source page":"Listen to the source"}</strong><small dir="auto">{selected.sources[0]?.quote || "Open the original recording"}</small></span><bdi>{sourceLabel(selected.sources[0])}</bdi>
      </button>
      <div className="plan-ref-modal-actions">
        <button onClick={() => { setSelectedId(null); selected.kind === "note" ? onOpenLesson(selectedLesson) : openSource(selectedLesson,selected); }}><BookOpen size={20}/><strong>{selected.kind === "note" ? "Read notes" : selectedLesson.sourceKind==="pdf"?"Read PDF pages":"Read transcript"}</strong><ArrowRight size={16}/></button>
        {flashcardItem && <button onClick={() => { setSelectedId(null); onOpenPractice(selectedLesson, flashcardItem.id); }}><Layers size={20}/><strong>Flashcards</strong><ArrowRight size={16}/></button>}
        {quizItem && <button onClick={() => { setSelectedId(null); onOpenPractice(selectedLesson, quizItem.id); }}><Check size={20}/><strong>Try a quiz</strong><ArrowRight size={16}/></button>}
        <button onClick={() => { setSelectedId(null); onAsk(selectedLesson); }}><MessageCircle size={20}/><strong>Ask about this lesson</strong><ArrowRight size={16}/></button>
      </div>
      {!quizItem && !flashcardItem && <p className="plan-ref-no-practice">No supported practice for this passage yet.</p>}
      <p className="plan-ref-modal-safety">AI notes and extracted text can miss words. Check the original source for important details.</p>
    </Modal>}

    {showHow && <Modal title="How your plan works" onClose={() => setShowHow(false)} className="plan-ref-how-modal">
      <div className="plan-ref-how-body"><span className="plan-ref-kicker">{howSteps[howStep].tag}</span><h3>{howSteps[howStep].title}</h3><p>{howSteps[howStep].body}</p>
        <div className="plan-ref-how-card">{howStep === 0 ? <><AudioLines size={22}/><span><strong dir="auto">{plan.units[0]?.title || "Your class recording"}</strong><small>{plan.units[0] ? plan.units[0].sourceKind==="pdf"?`${plan.units[0].sourcePageCount} PDF pages`:`${formatTime(plan.units[0].duration)} original audio` : "Add a lesson to begin"}</small></span></> : howStep === 1 ? <><BookOpen size={22}/><span><strong dir="auto">{firstTopic?.title || "A topic from your lesson"}</strong><small>{firstTopic ? `Source · ${sourceLabel(firstTopic.sources[0])}` : "Linked to a passage"}</small></span></> : <><RotateCcw size={22}/><span><strong>{firstTopic?.practiceCount ? `${firstTopic.practiceCount} questions in this passage` : "Practise when supported"}</strong><small>Saved answers set review dates</small></span></>}</div>
      </div>
      <div className="plan-ref-how-footer"><div className="plan-ref-how-dots" aria-label={`Step ${howStep + 1} of 3`}>{howSteps.map((_, index) => <button key={index} onClick={() => setHowStep(index)} aria-label={`Show step ${index + 1}`} aria-current={index === howStep ? "step" : undefined}/>)}</div><div><button onClick={() => howStep ? setHowStep(howStep - 1) : setShowHow(false)}>{howStep ? "Back" : "Close"}</button><button onClick={() => howStep < 2 ? setHowStep(howStep + 1) : setShowHow(false)}>{howStep < 2 ? "Next" : "Done"}<ArrowRight size={15}/></button></div></div>
    </Modal>}
  </section>;
}
