"use client";
import type { SpokenLanguage } from "@/lib/spoken-language";
import { SpokenLanguageField } from "./spoken-language";
import { MAX_IMPORT_BYTES, MEDIA_ACCEPT, MEDIA_EXTENSION } from "@/lib/upload-options";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Waveform as AudioLines, BookOpen, Check, CheckCircle, CaretRight as ChevronRight, FileAudio, Cards as Layers, Microphone as Mic, Pause, Play, ArrowCounterClockwise as RotateCcw, UploadSimple as Upload, ListBullets, TextAlignLeft, Notebook, ChatCircle, MapTrifold } from "@phosphor-icons/react";
import { type Lesson, type Workspace } from "@/lib/types";
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
  const [notes, setNotes] = useState(true), [detail, setDetail] = useState<Detail>("standard");
  const [permitted, setPermitted] = useState(false), [fictional, setFictional] = useState(false);
  const [configure, setConfigure] = useState(false), [showProgress, setShowProgress] = useState(false);
  const [uploading, setUploading] = useState(false), [percent, setPercent] = useState<number | null>(null);
  const [jobId, setJobId] = useState<string | null>(null), [error, setError] = useState("");
  const [dragging, setDragging] = useState(false), [paused, setPaused] = useState(false), [retrying, setRetrying] = useState(false);
  const [filter, setFilter] = useState("all");
  const input = useRef<HTMLInputElement>(null), request = useRef<AbortController | null>(null);
  const job = workspace.lessons.find(l => l.id === jobId);
  const saved = workspace.lessons.filter(l => !l.shared && !l.demo);
  const shown = saved.filter(l => filter === "all" || (filter === "preparing" ? l.status === "processing" || l.status === "queued" : l.status === filter));
  useEffect(() => () => { request.current?.abort(); }, []);
  useEffect(() => { if (!file) return; const url = URL.createObjectURL(file); setPreview(url); return () => URL.revokeObjectURL(url); }, [file]);

  function choose(files: FileList | null) {
    setDragging(false); setError("");
    if (!files?.length) return;
    if (files.length !== 1) { setError("Choose one recording at a time."); return; }
    const picked = files[0];
    if (!picked.size || picked.size > MAX_IMPORT_BYTES) { setError("Choose a file up to 500 MB."); return; }
    if (!MEDIA_EXTENSION.test(picked.name) && !picked.type.startsWith("audio/")) { setError("Choose a recording, such as MP3, AAC or MP4."); return; }
    setPreviewFailed(false); setFile(picked); setTitle(picked.name.replace(/\.[^.]+$/, "").slice(0, 160));
    setPermitted(false); setFictional(false); setConfigure(true); setJobId(null);
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault(); if (!file || uploading || !permitted || !fictional || !title.trim()) return;
    setError(""); setUploading(true); setPercent(null); setConfigure(false); setShowProgress(true); setJobId(null);
    const controller=new AbortController();request.current=controller;
    try{
      const lesson=await uploadLesson(file,{title:title.trim(),course:course.trim()||"My lessons",permitted,synthetic:fictional,spokenLanguage,noteOptions:{enabled:notes,detail}},controller.signal,setPercent);
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
  const ready = job?.status === "ready", failed = job?.status === "failed";
  const processingStep = ready ? 3 : job?.transcriptionComplete ? 2 : job ? 1 : 0;
  return <section className="upload-page">
    <h1 className="sr-only">Upload audio</h1>
    <div className="upload-welcome"><span className="upload-guide-avatar"><img src="/art/hoopoe-guide-v10.png" width="72" height="72" alt=""/></span><p><strong>Let’s add your lesson.</strong> Upload your class recording. We’ll turn it into notes, quizzes and flashcards.</p></div>
    <div className="upload-main-column">
        <div className={`audio-drop ${dragging ? "is-dragging" : ""}`} data-tour="upload-drop" onDragOver={e => { e.preventDefault(); if (!uploading) setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={e => { e.preventDefault(); if (!uploading) choose(e.dataTransfer.files); }}>
          <img className="upload-audio-art" src="/art/audio-upload-v11.png" width="768" height="512" alt="" draggable={false}/>
          <h2>{dragging ? "Drop your audio here" : "Upload audio from your class"}</h2>
          <p>Choose audio or a video, or drag it here.</p>
          <button className="button secondary upload-choose-button" onClick={() => input.current?.click()} disabled={uploading}><Upload size={18}/> Choose a file <ArrowRight size={16}/></button>
          <input ref={input} type="file" className="sr-only" aria-label="Lesson audio or video" accept={MEDIA_ACCEPT} onChange={e => { choose(e.target.files); e.target.value = ""; }}/>
          <div className="audio-format-chips" aria-label="Supported audio formats"><span><FileAudio size={17}/> MP3</span><span><FileAudio size={17}/> AAC / M4A</span><span><FileAudio size={17}/> MP4</span></div>
          <span className="audio-formats">WAV, Ogg, WebM and FLAC also work <span>·</span> 1 hour · Up to 500 MB</span>
        </div>
        {error && !showProgress && <p className="inline-error" role="alert">{error}</p>}
        <div className="upload-record-row" data-tour="upload-record"><Mic size={24}/><div><strong>In class? Record a lesson.</strong><p>Keep the audio and study it later.</p></div><button className="button secondary" onClick={onRecord}><Mic size={17}/> Start recording</button></div>
    </div>
    <section className="upload-results-preview" aria-label="What your lesson includes"><h2>What you get</h2><div><article><BookOpen size={23}/><div><h3>Notes & transcript</h3><p>Choose your note detail. Replay the words behind it.</p></div></article><article><Layers size={23}/><div><h3>Quizzes & flashcards</h3><p>Practise what your teacher covered in this lesson.</p></div></article><article><ChatCircle size={23}/><div><h3>Ask about your lesson</h3><p>Ask a class question and check the passage behind the answer.</p></div></article><article><MapTrifold size={23}/><div><h3>Your study plan</h3><p>Follow the lesson’s topics and see what to revisit next.</p></div></article></div><p>Share permitted lessons with a private class. Each student’s practice stays private. Ask your teacher for religious guidance.</p></section>
    <section className="recent-uploads" data-tour="upload-recent"><header><div><h2>Recent uploads</h2><p>{saved.filter(l=>l.status==="queued"||l.status==="processing").length} preparing · {saved.filter(l=>l.status==="ready").length} ready</p></div><div className="upload-filters" aria-label="Filter uploads">{[["all", "All"], ["preparing", "Preparing"], ["ready", "Ready"], ["failed", "Needs attention"]].map(([value, label]) => <button key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</button>)}</div></header>
      {shown.length ? <div className="upload-history">{shown.slice(0, 6).map(l => <button key={l.id} onClick={() => { if (l.status === "ready") onOpen(l); else { setJobId(l.id); setError(""); setShowProgress(true); } }}><span className="upload-history-icon"><FileAudio size={23}/></span><span><strong dir="auto">{l.title}</strong><small>{l.course}</small></span><span className={`upload-status ${l.status}`}>{l.status === "ready" ? <><Check size={14}/> Ready</> : l.status === "failed" ? "Needs attention" : "Preparing"}</span><ChevronRight size={16}/></button>)}</div> : <div className="upload-history-empty"><FileAudio size={27}/><p>{saved.length ? "No uploads in this view." : "Your recordings will appear here."}</p></div>}
      {uploading && !showProgress && <button className="text-link" onClick={() => setShowProgress(true)}>Show upload progress</button>}
    </section>
    {configure && file && <Modal title="Upload audio" onClose={() => setConfigure(false)} className="upload-config">
      <form onSubmit={submit}>
        <p className="upload-dialog-intro">Add your recording and choose your notes.</p><p className="muted">We use the audio from videos. Large files are saved as a smaller audio copy. Keep your original file.</p>
        <div className="upload-selected"><FileAudio size={25}/><div><strong>{file.name}</strong><span>{(file.size / 1024 / 1024).toFixed(1)} MB</span></div><button type="button" className="icon-button" aria-label="Choose another audio file" onClick={() => input.current?.click()}><RotateCcw size={18}/></button></div>
        {previewFailed?<p className="muted">This browser can’t preview this format. You can still upload it.</p>:<audio className="upload-audio-preview" controls src={preview} aria-label="Preview your recording" onError={()=>setPreviewFailed(true)}/>}
        <div className="upload-name-fields"><label className="field">Lesson name<input required maxLength={160} value={title} onChange={e => setTitle(e.target.value)} placeholder="Give it a name"/></label><label className="field">Course <span>(optional)</span><input maxLength={100} value={course} onChange={e => setCourse(e.target.value)} placeholder="e.g. Arabic"/></label></div>
        <SpokenLanguageField value={spokenLanguage} onChange={setSpokenLanguage}/>
        <div className="notes-switch-row"><div><h3>Make study notes</h3><p>Choose the detail that works for you.</p></div><button type="button" role="switch" aria-checked={notes} aria-label="Make study notes" className="notes-switch" onClick={() => setNotes(v => !v)}><span/></button></div>
        {notes ? <fieldset className="note-detail-options"><legend className="sr-only">Note detail</legend>{details.map(option => <label key={option.id} className={`note-detail-choice ${detail === option.id ? "selected" : ""}`}><input type="radio" name="note-detail" value={option.id} checked={detail === option.id} onChange={() => setDetail(option.id)}/><option.icon size={28} aria-hidden="true"/><strong>{option.name}</strong><span>{option.copy}</span>{detail === option.id && <CheckCircle className="note-choice-check" size={16} weight="fill"/>}</label>)}</fieldset> : <p className="notes-off-message">You’ll still get a transcript, quiz and flashcards from clear parts of your lesson.</p>}
        <p className="note-detail-boundary">All detail comes from this lesson.</p>
        <div className="upload-consent"><label><input type="checkbox" checked={permitted} onChange={e => setPermitted(e.target.checked)}/><span>I have permission to use this recording.</span></label><label><input type="checkbox" checked={fictional} onChange={e => setFictional(e.target.checked)}/><span>This is fictional contest audio, with no real student details.</span></label></div>
        {error && <p className="inline-error" role="alert">{error}</p>}
        <footer className="upload-config-footer"><p>AI services process your audio. Lessons are private until you share them.</p><div><button type="button" className="button secondary" onClick={()=>setConfigure(false)}>Cancel</button><button className="button primary" disabled={!permitted || !fictional || !title.trim()}><Upload size={17}/> Upload & prepare</button></div></footer>
      </form>
    </Modal>}
    {showProgress && <Modal title={ready ? "Your lesson is ready" : "Preparing your lesson"} onClose={() => setShowProgress(false)} className="upload-progress-modal">
      <div className="upload-progress-art"><span className={`upload-guide-avatar ${!paused && !ready && !failed && !error?"upload-companion-moving":""}`}><img src="/art/hoopoe-guide-v10.png" width="96" height="96" alt=""/></span>{!ready && !failed && !error && <button className="motion-toggle" aria-label={paused ? "Resume animation" : "Pause animation"} onClick={() => setPaused(v => !v)}>{paused ? <Play size={13}/> : <Pause size={13}/>}</button>}</div>
      <div className="upload-progress-heading" role="status"><h3>{error || failed ? "Let’s try that again" : ready ? "Ready when you are." : uploading ? percent === 100 ? "Preparing your audio…" : "Sending your audio…" : job?.transcriptionComplete ? "Putting it all together…" : job?.status === "queued" ? "Your audio is saved." : "Listening to your lesson…"}</h3><p>{error || (failed ? job?.error || "Your audio is saved. Try preparing it again." : ready ? "Open your lesson to read, ask and practise." : uploading ? "Keep this page open while your file saves." : !workspace.configured.asr || !workspace.configured.generation ? "Audio saved. Processing is waiting for the AI connection." : "You can close this window. Your lesson will keep preparing.")}</p></div>
      <ol className="upload-stages">{[{ label: "Save audio", icon: Upload }, { label: "Make transcript", icon: AudioLines }, { label: "Prepare study material", icon: BookOpen }].map((step, i) => <li key={step.label} className={i < processingStep ? "done" : i === processingStep && !error && !failed ? "current" : ""}>{i < processingStep ? <CheckCircle size={24} weight="fill"/> : <step.icon size={24}/>}<span>{step.label}</span>{i < processingStep && <span className="sr-only">Complete</span>}</li>)}</ol>
      {uploading && percent !== null && <div className="actual-upload-progress"><div><span>{percent === 100 ? "Sent · preparing audio" : "Sending audio"}</span><span>{percent}%</span></div><progress value={percent} max={100} aria-label="Audio transfer progress"/></div>}
      {job && !ready && !failed && <p className="upload-live-stage" aria-live="polite">{job.stage}</p>}
      <div className="upload-progress-actions">{ready && job ? <><button className="button secondary" onClick={() => { setShowProgress(false); onOpen(job); }}>Open lesson</button><button className="button primary" onClick={() => { setShowProgress(false); onPlan(job); }}>Open study plan <ArrowRight size={16}/></button></> : failed ? <button className="button primary" disabled={retrying} onClick={() => void retry()}><RotateCcw size={16}/>{retrying ? "Trying again…" : "Try again"}</button> : error ? <button className="button primary" onClick={() => { setShowProgress(false); setConfigure(true); setError(""); }}>Back to your file <ArrowRight size={16}/></button> : job ? <button className="button secondary" onClick={() => setShowProgress(false)}>Back to uploads</button> : null}</div>
    </Modal>}
  </section>;
}
