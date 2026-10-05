"use client";
import { useEffect, useId, useRef, useState } from "react";
import { BookOpen, CaretDown, Check, CircleNotch, Copy, Headphones, NotePencil, Play, WarningCircle, X } from "@phosphor-icons/react";
import { SourceEvidence } from "./source-evidence";
import { formatTime, type Citation, type Lesson } from "@/lib/types";
import { editableClassNotes, initialNoteView, PERSONAL_NOTES_LIMIT, type NoteView, type PersonalNotes } from "@/lib/personal-notes";
import { studyMaterialLanguageLabels } from "@/lib/study-material-language";
import { api, message } from "./client-api";
import styles from "./lesson-notes.module.css";

const views:{id:NoteView;label:string}[]=[{id:"summary",label:"Short summary"},{id:"points",label:"Key points"},{id:"detailed",label:"Detailed"}];



function PersonalNotesEditor({lesson,view,onSavedView,initialPreview=false}:{lesson:Lesson;view:NoteView;onSavedView:(view:NoteView)=>void;initialPreview?:boolean}) {
  const editorId=useId(),[saved,setSaved]=useState<PersonalNotes|null>(null),[text,setText]=useState(""),[editing,setEditing]=useState(false);
  const [loading,setLoading]=useState(!initialPreview),[saving,setSaving]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
  const [loaded,setLoaded]=useState(initialPreview),[conflict,setConflict]=useState(false);
  const active=useRef(true),inFlight=useRef(false),editor=useRef<HTMLTextAreaElement>(null);
  const dirty=text!==(saved?.text||"");
  useEffect(()=>{active.current=true;return()=>{active.current=false;};},[]);

  async function load(signal?:AbortSignal) {
    setLoading(true);setError("");
    try {
      const result=await api<{notes:PersonalNotes|null}>(`/api/lessons/${lesson.id}/notes?version=${lesson.version}`,{signal});
      if(!active.current||signal?.aborted)return;
      setSaved(result.notes);setText(result.notes?.text||"");setLoaded(true);setConflict(false);setNotice("");
      if(result.notes)onSavedView(result.notes.view);
    } catch(failure){if(active.current&&!signal?.aborted){setError(message(failure));setLoaded(false);}}
    finally{if(active.current&&!signal?.aborted)setLoading(false);}
  }
  useEffect(()=>{
    if(initialPreview)return;
    const controller=new AbortController();void load(controller.signal);return()=>controller.abort();
    // The parent keys this editor by lesson/version, keeping requests and drafts scoped.
  },[lesson.id,lesson.version,initialPreview]);
  useEffect(()=>{
    if(!dirty)return;
    const warn=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue="";};
    const navigate=(event:Event)=>{if(!window.confirm("Leave without saving your personal notes?"))event.preventDefault();};
    window.addEventListener("beforeunload",warn);window.addEventListener("darsloop-before-navigation",navigate);
    return()=>{window.removeEventListener("beforeunload",warn);window.removeEventListener("darsloop-before-navigation",navigate);};
  },[dirty]);
  useEffect(()=>{if(editing)editor.current?.focus();},[editing]);

  async function save() {
    if(inFlight.current||!loaded)return;
    if(initialPreview){setSaved({version:lesson.version,revision:(saved?.revision||0)+1,text,view,updatedAt:new Date().toISOString()});setEditing(false);setNotice("Saved for this example visit.");return;}
    inFlight.current=true;setSaving(true);setError("");setNotice("");
    try {
      const result=await api<{notes:PersonalNotes}>(`/api/lessons/${lesson.id}/notes`,{method:"PUT",body:JSON.stringify({version:lesson.version,revision:saved?.revision||0,text,view})});
      if(!active.current)return;
      setSaved(result.notes);setText(result.notes.text);setEditing(false);setConflict(false);setNotice("Your notes are saved.");
    } catch(failure){if(active.current){const description=message(failure);setError(description);setConflict(description.includes("saved elsewhere"));}}
    finally{inFlight.current=false;if(active.current)setSaving(false);}
  }
  async function copyDraft() {
    try{await navigator.clipboard.writeText(text);setNotice("Your text is copied.");}
    catch{editor.current?.focus();editor.current?.select();setNotice("Your text is selected. Copy it before reloading.");}
  }
  function cancel() {setText(saved?.text||"");setEditing(false);setNotice("");if(!conflict)setError("");}

  return <section className={styles.personal} aria-labelledby={`${editorId}-title`}>
    <div className={styles.personalHeader}><div><span className={styles.personalLabel}><NotePencil size={16}/> PERSONAL</span><h3 id={`${editorId}-title`}>Your notes</h3></div>{!editing&&<button type="button" className="button secondary small" disabled={loading||!loaded} onClick={()=>{setEditing(true);setNotice("");}}><NotePencil size={16}/>{saved?.text?"Edit notes":"Write notes"}</button>}</div>
    <p className={styles.personalCaption}>{initialPreview?"Try writing here. Example edits last until you leave.":"Add or edit your own version. It stays private to you."} Your edits are separate from {lesson.sourceKind==="pdf"?"source excerpts":"teacher quotations"} and practice.</p>
    {loading?<p className={styles.status} role="status"><CircleNotch size={16} className="spin"/>Opening your saved notes…</p>:editing?<>
      <label className="sr-only" htmlFor={editorId}>Your personal notes for {lesson.title}</label>
      <textarea ref={editor} id={editorId} className={styles.editor} value={text} rows={10} dir="auto" maxLength={PERSONAL_NOTES_LIMIT} disabled={saving} placeholder="Write your questions, reminders or your own class notes…" onChange={event=>{setText(event.target.value);setNotice("");}}/>
      <div className={styles.editorFooter}><span>{text.length.toLocaleString()} / {PERSONAL_NOTES_LIMIT.toLocaleString()}</span><span>{dirty?"Unsaved changes":"Saved version"}</span></div>
      <div className={styles.editorActions}><div>{!text&&editableClassNotes(lesson)&&<button type="button" className={styles.textAction} disabled={saving} onClick={()=>setText(editableClassNotes(lesson))}><Copy size={16}/>Use class notes as a starting point</button>}</div><div><button type="button" className="button secondary small" disabled={saving} onClick={cancel}><X size={15}/>Cancel</button><button type="button" className="button primary small" disabled={saving||!loaded||!dirty||conflict} onClick={()=>void save()}>{saving?<CircleNotch size={16} className="spin"/>:<Check size={16}/>}Save notes</button></div></div>
    </>:saved?.text?<div className={styles.personalText} dir="auto">{saved.text}</div>:loaded?<p className={styles.emptyPersonal}>Keep questions and reminders beside the class notes.</p>:null}
    {error&&<div className={styles.error} role="alert"><p><WarningCircle size={16}/>{error}</p>{conflict?<div><button type="button" className={styles.textAction} onClick={()=>void copyDraft()}><Copy size={16}/>Copy my changes</button><button type="button" className={styles.textAction} onClick={()=>{if(window.confirm("Reload your saved notes? Unsaved changes in this editor will be replaced."))void load();}}>Reload saved notes</button></div>:!loaded&&<button type="button" className={styles.textAction} onClick={()=>void load()}>Try again</button>}</div>}
    {notice&&<p className={styles.status} role="status"><Check size={16}/>{notice}</p>}
  </section>;
}

export function LessonNotes({lesson,onPlay,preview=false}:{lesson:Lesson;onPlay:(time:number)=>void;preview?:boolean}) {
  const [view,setView]=useState<NoteView>(()=>initialNoteView(lesson));
  const artifacts=lesson.artifacts,notesEnabled=lesson.noteOptions?.enabled!==false;
  const notes=notesEnabled?artifacts?.notes||[]:[],summaryEvidence=notes.slice(0,3).flatMap(note=>note.evidence).filter((citation,index,list)=>list.findIndex(other=>other.segmentId===citation.segmentId)===index);
  return <div className={`notes-layout ${styles.layout}`}><div className="notes-main"><div className="tab-intro"><p className="eyebrow">{lesson.demo?"PREPARED EXAMPLE NOTES":artifacts?.language?`AI NOTES · ${studyMaterialLanguageLabels[artifacts.language]}`:"AI NOTES · FROM THIS LESSON"}</p><h2>{lesson.sourceKind==="pdf"?"Your source notes.":"Your class notes."}</h2><p>{lesson.sourceKind==="pdf"?"Organized from selectable PDF text. Open each cited page to check the original wording and layout.":lesson.demo?"Prepared from a fictional lesson. Tap a time to hear the explanation.":"Organized from clear lesson passages. Tap a time to hear the teacher."}</p></div>
    {notes.length?<><div className={styles.viewControls} role="group" aria-label="Note view">{views.map(item=><button key={item.id} type="button" aria-pressed={view===item.id} onClick={()=>setView(item.id)}>{item.label}</button>)}</div><p className={styles.viewCaption}>Uses the notes already saved for this lesson.</p>
      {view==="summary"?<article className={styles.summary}><span className={styles.sectionLabel}>SHORT SUMMARY</span><p dir="auto">{artifacts?.overview||notes.slice(0,3).map(note=>note.text).join(" ")}</p><SourceEvidence evidence={summaryEvidence} lesson={lesson} onPlay={onPlay}/></article>:view==="points"?<div className={styles.points}>{notes.map((note,index)=><details key={`${index}-${note.heading}`} className={styles.point}><summary><span className={styles.number}>{String(index+1).padStart(2,"0")}</span><h3 dir="auto">{note.heading}</h3><CaretDown size={17}/></summary><div className={styles.pointBody}><p dir="auto">{note.text}</p><SourceEvidence evidence={note.evidence} lesson={lesson} onPlay={onPlay}/></div></details>)}</div>:<div className={styles.detail}>{notes.map((note,index)=><article className="note-section" key={`${index}-${note.heading}`}><div className="note-number">{String(index+1).padStart(2,"0")}</div><div><h3 dir="auto">{note.heading}</h3><p dir="auto">{note.text}</p><SourceEvidence evidence={note.evidence} lesson={lesson} onPlay={onPlay}/></div></article>)}</div>}
    </>:<div className={styles.unavailable}><BookOpen size={24}/><h3>{!notesEnabled?"Notes are turned off.":lesson.error?"Class notes couldn’t be prepared.":"Class notes are still being prepared."}</h3><p>{!notesEnabled?lesson.sourceKind==="pdf"?"Your PDF pages and supported practice are available in the other tabs.":"Your transcript and supported practice are available in the other tabs.":lesson.sourceKind==="pdf"?"You can still read PDF pages and open the private original source.":"You can still read the transcript and listen to your original recording."}</p></div>}
    <PersonalNotesEditor key={`${lesson.id}-${lesson.version}`} lesson={lesson} view={view} onSavedView={setView} initialPreview={preview}/>
  </div><aside className="lesson-aside"><div className="term-panel"><span className="mini-label"><BookOpen size={15}/> TERMS FROM THE LESSON</span><h3>{lesson.sourceKind==="pdf"?"Terms from this source.":"Terms explained in class."}</h3>{!lesson.demo&&<p className="muted">{lesson.sourceKind==="pdf"?"Definitions use this PDF only. Check the cited pages against the original layout.":"Term spellings are as transcribed. Replay the audio to check them."}</p>}{artifacts?.terms.length?artifacts.terms.map((term,index)=><div className="term" key={index}><strong dir="auto">{term.term}</strong><p dir="auto">{term.definition}</p><SourceEvidence evidence={term.evidence} lesson={lesson} onPlay={onPlay}/></div>):<p className="muted">No clear term definitions were captured. Definitions won’t be filled in from outside this lesson.</p>}</div><div className="aside-tip"><Headphones size={20}/><h3>{lesson.sourceKind==="pdf"?"Open a cited page.":"Tap a time to listen."}</h3><p>{lesson.sourceKind==="pdf"?"Exact extracted passages stay beside your notes. Page numbers refer to PDF pages.":"The original teacher passages stay beside your class notes."}</p></div></aside></div>;
}
