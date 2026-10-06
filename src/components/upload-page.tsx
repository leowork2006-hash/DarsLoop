"use client";
import type { SpokenLanguage } from "@/lib/spoken-language";
import { SpokenLanguageField } from "./spoken-language";
import type { StudyMaterialLanguage } from "@/lib/study-material-language";
import { StudyMaterialLanguageField } from "./study-material-language";
import { MAX_PDF_BYTES } from "@/lib/pdf-options";
import { MAX_IMPORT_BYTES, MEDIA_ACCEPT, MEDIA_EXTENSION } from "@/lib/upload-options";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Waveform as AudioLines, BookOpen, Check, CheckCircle, CaretRight as ChevronRight, FileAudio, Cards as Layers, Microphone as Mic, Pause, Play, ArrowCounterClockwise as RotateCcw, UploadSimple as Upload, ListBullets, TextAlignLeft, Notebook, ChatCircle, MapTrifold } from "@phosphor-icons/react";
import { type Lesson, type Workspace } from "@/lib/types";
import { lessonReadiness, lessonMatchesReadinessFilter, type LessonReadinessFilter } from "@/lib/lesson-readiness";
import { Modal } from "./modal";
import { api, message } from "./client-api";
import { uploadLesson } from "./import-client";

const details = [
  { id: "short", name: "Quick notes", copy: "The main points", icon: ListBullets },
  { id: "standard", name: "Balanced notes", copy: "Points and explanations", icon: TextAlignLeft },
  { id: "detailed", name: "Detailed notes", copy: "More of the lesson", icon: Notebook },
] as const;
type Detail = typeof details[number]["id"];
export function PaperCompanion({ moving = false }: { moving?: boolean }) {
  return <img className={`paper-companion ${moving ? "paper-companion-moving" : ""}`} src="/art/paper-hoopoe-v8.webp" width="640" height="640" alt="" draggable={false}/>;
}

export function UploadPage({ workspace, onRecord, onSaved, onOpen, onPlan, onError }: {
  workspace: Workspace; onRecord: () => void; onSaved: (lesson: Lesson) => void;
  onOpen: (lesson: Lesson) => void; onPlan: (lesson: Lesson) => void; onError: (text: string) => void;
}) {
  const [file, setFile] = useState<File | null>(null), [preview, setPreview] = useState("");
  const [previewFailed,setPreviewFailed]=useState(false);
  const [title, setTitle] = useState(""), [course, setCourse] = useState("");
  const [spokenLanguage,setSpokenLanguage]=useState<SpokenLanguage>("auto");
  const [studyLanguage,setStudyLanguage]=useState<StudyMaterialLanguage>("auto");
  const [notes, setNotes] = useState(true), [detail, setDetail] = useState<Detail>("standard");
  const [permitted, setPermitted] = useState(false), [fictional, setFictional] = useState(false);
  const [configure, setConfigure] = useState(false), [showProgress, setShowProgress] = useState(false);
  const [uploading, setUploading] = useState(false), [percent, setPercent] = useState<number | null>(null);
  const [jobId, setJobId] = useState<string | null>(null), [error, setError] = useState("");
  const [dragging, setDragging] = useState(false), [paused, setPaused] = useState(false), [retrying, setRetrying] = useState(false);
  const [filter, setFilter] = useState<LessonReadinessFilter>("all");
  const input = useRef<HTMLInputElement>(null), request = useRef<AbortController | null>(null);
  const job = workspace.lessons.find(l => l.id === jobId);
  const fileIsPdf=!!file&&(/\.pdf$/i.test(file.name)||file.type==="application/pdf"),pdf=job?job.sourceKind==="pdf":fileIsPdf;
  const saved = workspace.lessons.filter(l => !l.shared && !l.demo);
  const shown = saved.filter(l => lessonMatchesReadinessFilter(l, filter));
  useEffect(() => () => { request.current?.abort(); }, []);
  useEffect(() => { if (!file) return; const url = URL.createObjectURL(file); setPreview(url); return () => URL.revokeObjectURL(url); }, [file]);

  function choose(files: FileList | null) {
    setDragging(false); setError("");
    if (!files?.length) return;
    if (files.length !== 1) { setError("Choose one file at a time."); return; }
    const picked = files[0];
    if (!picked.size || picked.size > MAX_IMPORT_BYTES) { setError("Choose a file up to 500 MiB."); return; }
    const pickedIsPdf=/\.pdf$/i.test(picked.name)||picked.type==="application/pdf";
    if(pickedIsPdf&&picked.size>MAX_PDF_BYTES){setError("Choose a selectable-text PDF up to 8 MB.");return;}
    if (!pickedIsPdf&&!MEDIA_EXTENSION.test(picked.name) && !picked.type.startsWith("audio/")) { setError("Choose audio, video or a selectable-text PDF."); return; }
    setPreviewFailed(false); setFile(picked); setTitle(picked.name.replace(/\.[^.]+$/, "").slice(0, 160));
    setPermitted(false); setFictional(false); setConfigure(true); setJobId(null);
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault(); if (!file || uploading || !permitted || !fictional || !title.trim()) return;
    setError(""); setUploading(true); setPercent(null); setConfigure(false); setShowProgress(true); setJobId(null);
    const controller=new AbortController();request.current=controller;
    try{
      const lesson=await uploadLesson(file,{title:title.trim(),course:course.trim()||"My lessons",permitted,synthetic:fictional,spokenLanguage,noteOptions:{enabled:notes,detail,language:studyLanguage}},controller.signal,setPercent);
      if(!lesson.id)throw new Error("Saving was not confirmed. Check Recent uploads before trying again.");
      setJobId(lesson.id);onSaved(lesson);setPercent(100);
    }catch(e){if(!controller.signal.aborted)setError(message(e));}
    finally{setUploading(false);request.current=null;}
  }
  async function retry() {
    if (!job || retrying) return; setRetrying(true);
    try { await api(`/api/lessons/${job.id}`, { method: "POST", body: JSON.stringify({ action: "retry" }) }); const updated = await api<Lesson>(`/api/lessons/${job.id}`); onSaved(updated); }
    catch (e) { onError(message(e)); } finally { setRetrying(false); }
  }
  const readiness = job ? lessonReadiness(job) : undefined;
  const ready = readiness?.materialReady === true, failed = job?.status === "failed";
  const settled = job?.status === "ready" || failed;
  const partial = readiness?.state === "partial";
  const processingStep = ready ? 3 : readiness?.sourceReady ? 2 : job ? 1 : 0;
  const progressTitle = error || failed ? "Preparation needs attention" : partial ? readiness.label : settled ? ready ? "Your lesson is ready" : readiness?.label || "Source ready" : "Preparing your lesson";
  return <section className="upload-page">
    <h1 className="sr-only">Upload lesson material</h1>
    <div className="upload-welcome"><span className="upload-guide-avatar"><img src="/art/hoopoe-guide-v10.png" width="72" height="72" alt=""/></span><p><strong>Let’s add your lesson.</strong> Upload a class recording or selectable-text PDF. We’ll prepare notes, quizzes and flashcards.</p></div>
    <div className="upload-main-column">
        <div className={`audio-drop ${dragging ? "is-dragging" : ""}`} data-tour="upload-drop" onDragOver={e => { e.preventDefault(); if (!uploading) setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={e => { e.preventDefault(); if (!uploading) choose(e.dataTransfer.files); }}>
          <img className="upload-audio-art" src="/art/audio-upload-v11.png" width="768" height="512" alt="" draggable={false}/>
          <h2>{dragging ? "Drop your file here" : "Upload material from your class"}</h2>
          <p>Choose audio, video or a selectable-text PDF, or drag it here.</p>
          <button className="button secondary upload-choose-button" onClick={() => input.current?.click()} disabled={uploading}><Upload size={18}/> Choose a file <ArrowRight size={16}/></button>
          <input ref={input} type="file" className="sr-only" aria-label="Lesson audio, video or PDF" accept={`${MEDIA_ACCEPT},application/pdf,.pdf`} onChange={e => { choose(e.target.files); e.target.value = ""; }}/>
          <div className="audio-format-chips" aria-label="Supported file formats"><span><FileAudio size={17}/> MP3</span><span><FileAudio size={17}/> AAC / M4A</span><span><FileAudio size={17}/> MP4</span><span><BookOpen size={17}/> PDF</span></div>
          <span className="audio-formats">WAV, Ogg, WebM and FLAC also work <span>·</span> Audio: 2 hours · 500 MiB <span>·</span> PDF: 8 MB · 40 pages</span>
        </div>
        {error && !showProgress && <p className="inline-error" role="alert">{error}</p>}
        <div className="upload-record-row" data-tour="upload-record"><Mic size={24}/><div><strong>In class? Record a lesson.</strong><p>Keep the audio and study it later.</p></div><button className="button secondary" onClick={onRecord}><Mic size={17}/> Start recording</button></div>
    </div>
    <section className="upload-results-preview" aria-label="What your lesson includes"><h2>What you get</h2><div><article><BookOpen size={23}/><div><h3>Notes & transcript</h3><p>Choose your note detail. Replay the words behind it.</p></div></article><article><Layers size={23}/><div><h3>Quizzes & flashcards</h3><p>Practise what your teacher covered in this lesson.</p></div></article><article><ChatCircle size={23}/><div><h3>Ask about your lesson</h3><p>Ask a class question and check the passage behind the answer.</p></div></article><article><MapTrifold size={23}/><div><h3>Your study plan</h3><p>Follow the lesson’s topics and see what to revisit next.</p></div></article></div><p>Share permitted lessons with a private class. Each student’s practice stays private. Ask your teacher for religious guidance.</p></section>
    <section className="recent-uploads" data-tour="upload-recent"><header><div><h2>Recent uploads</h2><p>{saved.filter(l=>lessonMatchesReadinessFilter(l,"preparing")).length} preparing · {saved.filter(l=>lessonReadiness(l).materialReady).length} ready{saved.some(l=>lessonReadiness(l).state==="partial")&&<> · {saved.filter(l=>lessonReadiness(l).state==="partial").length} partial</>}{saved.some(l=>lessonReadiness(l).needsAttention)&&<> · {saved.filter(l=>lessonReadiness(l).needsAttention).length} need attention</>}</p></div><div className="upload-filters" aria-label="Filter uploads">{([["all", "All"], ["preparing", "Preparing"], ["ready", "Ready"], ["partial", "Partial"], ["failed", "Needs attention"]] as const).map(([value, label]) => <button key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</button>)}</div></header>
      {shown.length ? <div className="upload-history">{shown.slice(0, 6).map(l => {const state=lessonReadiness(l);return <button key={l.id} onClick={() => { if (state.materialReady) onOpen(l); else { setJobId(l.id); setError(""); setShowProgress(true); } }}><span className="upload-history-icon"><FileAudio size={23}/></span><span><strong dir="auto">{l.title}</strong><small>{l.course}</small></span><span className={`upload-status ${state.materialReady?"ready":state.needsAttention||state.state==="partial"?"failed":l.status}`}>{state.materialReady&&<Check size={14}/>} {state.label}</span><ChevronRight size={16}/></button>;})}</div> : <div className="upload-history-empty"><FileAudio size={27}/><p>{saved.length ? "No uploads in this view." : "Your uploads will appear here."}</p></div>}
      {uploading && !showProgress && <button className="text-link" onClick={() => setShowProgress(true)}>Show upload progress</button>}
    </section>
    {configure && file && <Modal title={fileIsPdf?"Upload PDF":"Upload audio"} onClose={() => setConfigure(false)} className="upload-config">
      <form onSubmit={submit}>
        <p className="upload-dialog-intro">Add your material and choose your study settings.</p><p className="muted">{fileIsPdf?"Choose a PDF with selectable text, up to 8 MB and 40 pages. Scanned or image-only pages need a text PDF first. Quotations link to original pages.":"We use the audio from videos. Large files are saved as a smaller audio copy. Keep your original file."}</p>
        <div className="upload-selected"><FileAudio size={25}/><div><strong>{file.name}</strong><span>{(file.size / (fileIsPdf?1_000_000:1024*1024)).toFixed(1)} {fileIsPdf?"MB":"MiB"}</span></div><button type="button" className="icon-button" aria-label="Choose another file" onClick={() => input.current?.click()}><RotateCcw size={18}/></button></div>
        {!fileIsPdf&&<><p className="muted">Local file preview · upload to prepare notes</p>{previewFailed?<p className="muted">This browser can’t preview this format. You can still upload it.</p>:<audio className="upload-audio-preview" controls src={preview||undefined} aria-label="Local file preview" onError={()=>setPreviewFailed(true)}/>}</>}
        <div className="upload-name-fields"><label className="field">Lesson name<input required maxLength={160} value={title} onChange={e => setTitle(e.target.value)} placeholder="Give it a name"/></label><label className="field">Course <span>(optional)</span><input maxLength={100} value={course} onChange={e => setCourse(e.target.value)} placeholder="e.g. Arabic"/></label></div>
        {!fileIsPdf&&<SpokenLanguageField value={spokenLanguage} onChange={setSpokenLanguage}/>}
        <StudyMaterialLanguageField value={studyLanguage} onChange={setStudyLanguage}/>
        <div className="notes-switch-row"><div><h3>Make study notes</h3><p>Choose the detail that works for you.</p></div><button type="button" role="switch" aria-checked={notes} aria-label="Make study notes" className="notes-switch" onClick={() => setNotes(v => !v)}><span/></button></div>
        {notes ? <fieldset className="note-detail-options"><legend className="sr-only">Note detail</legend>{details.map(option => <label key={option.id} className={`note-detail-choice ${detail === option.id ? "selected" : ""}`}><input type="radio" name="note-detail" value={option.id} checked={detail === option.id} onChange={() => setDetail(option.id)}/><option.icon size={28} aria-hidden="true"/><strong>{option.name}</strong><span>{option.copy}</span>{detail === option.id && <CheckCircle className="note-choice-check" size={16} weight="fill"/>}</label>)}</fieldset> : <p className="notes-off-message">You’ll still get source text, a quiz and flashcards from clear parts of your lesson.</p>}
        <p className="note-detail-boundary">All detail comes from this lesson.</p>
        <div className="upload-consent"><label><input type="checkbox" checked={permitted} onChange={e => setPermitted(e.target.checked)}/><span>{fileIsPdf?"I have permission to use this PDF.":"I have permission to use this recording."}</span></label><label><input type="checkbox" checked={fictional} onChange={e => setFictional(e.target.checked)}/><span>{fileIsPdf?"This PDF is fictional or fully anonymised, with no real student details.":"This is fictional contest audio, with no real student details."}</span></label></div>
        {error && <p className="inline-error" role="alert">{error}</p>}
        <footer className="upload-config-footer"><p>AI services process your {fileIsPdf?"PDF text":"audio"}. Lessons are private until you share them.</p><div><button type="button" className="button secondary" onClick={()=>setConfigure(false)}>Cancel</button><button className="button primary" disabled={!permitted || !fictional || !title.trim()}><Upload size={17}/> Upload & prepare</button></div></footer>
      </form>
    </Modal>}
    {showProgress && <Modal title={progressTitle} onClose={() => setShowProgress(false)} className="upload-progress-modal">
      <div className="upload-progress-art"><span className={`upload-guide-avatar ${!paused && !settled && !error?"upload-companion-moving":""}`}><img src="/art/hoopoe-guide-v10.png" width="96" height="96" alt=""/></span>{!settled && !error && <button className="motion-toggle" aria-label={paused ? "Resume animation" : "Pause animation"} onClick={() => setPaused(v => !v)}>{paused ? <Play size={13}/> : <Pause size={13}/>}</button>}</div>
      <div className="upload-progress-heading" role="status"><h3>{error || failed ? "Let’s try that again" : settled ? ready ? "Ready when you are." : readiness?.label : uploading ? percent === 100 ? pdf?"Preparing your PDF…":"Preparing your audio…" : pdf?"Sending your PDF…":"Sending your audio…" : job?.transcriptionComplete ? "Putting it all together…" : job?.status === "queued" ? pdf?"Your PDF is saved.":"Your audio is saved." : pdf?"Reading your PDF…":"Listening to your lesson…"}</h3><p>{error || (settled ? readiness?.description : uploading ? "Keep this page open while your file saves." : !workspace.configured.generation || !pdf&&!workspace.configured.asr ? pdf?"PDF saved. Processing is waiting for the AI connection.":"Audio saved. Processing is waiting for the AI connection." : job?.nextAttemptAt ? `Your original file is saved in the queue. Capacity will be checked after ${new Date(job.nextAttemptAt).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}. You can close this window.` : "Your lesson is in the processing queue. You can close this window; it will continue automatically.")}</p></div>
      <ol className="upload-stages">{[{ label: pdf?"Save PDF":"Save audio", icon: Upload }, { label: pdf?"Read page text":"Make transcript", icon: AudioLines }, { label: "Prepare study material", icon: BookOpen }].map((step, i) => <li key={step.label} className={i < processingStep ? "done" : i === processingStep && !error && !settled ? "current" : ""}>{i < processingStep ? <CheckCircle size={24} weight="fill"/> : <step.icon size={24}/>}<span>{step.label}</span>{i < processingStep && <span className="sr-only">Complete</span>}</li>)}</ol>
      {uploading && percent !== null && <div className="actual-upload-progress"><div><span>{percent === 100 ? pdf?"Sent · reading pages":"Sent · preparing audio" : pdf?"Sending PDF":"Sending audio"}</span><span>{percent}%</span></div><progress value={percent} max={100} aria-label={pdf?"PDF transfer progress":"Audio transfer progress"}/></div>}
      {job && !settled && <p className="upload-live-stage" aria-live="polite">{job.stage}</p>}
      <div className="upload-progress-actions">{settled && job ? <><button className="button secondary" onClick={() => { setShowProgress(false); onOpen(job); }}>{ready?"Open lesson":partial?"Open available material":"Open saved source"}</button>{ready?<button className="button primary" onClick={() => { setShowProgress(false); onPlan(job); }}>Open study plan <ArrowRight size={16}/></button>:readiness?.retryEligible&&<button className="button primary" disabled={retrying} onClick={() => void retry()}><RotateCcw size={16}/>{retrying ? "Trying again…" : "Retry preparation"}</button>}</> : error ? <button className="button primary" onClick={() => { setShowProgress(false); setConfigure(true); setError(""); }}>Back to your file <ArrowRight size={16}/></button> : job ? <button className="button secondary" onClick={() => setShowProgress(false)}>Back to uploads</button> : null}</div>
    </Modal>}
  </section>;
}
