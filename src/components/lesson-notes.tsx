"use client";
import { useEffect, useRef, useState } from "react";
import { BookOpen, CaretDown, CircleNotch } from "@phosphor-icons/react";
import { SourceEvidence } from "./source-evidence";
import { formatTime, type Citation, type Lesson } from "@/lib/types";
import { initialNoteView, type NoteView } from "@/lib/personal-notes";
import { studyMaterialLanguageLabels, type PreparedMaterialLanguage } from "@/lib/study-material-language";
import { api, message } from "./client-api";
import styles from "./lesson-notes.module.css";
import { detailedOptions, detailedPrepared, savedMaterialLanguage, sourceReadyForMaterial } from "@/lib/material-sections";

const views:{id:NoteView;label:string}[]=[{id:"summary",label:"Short summary"},{id:"points",label:"Key points"},{id:"detailed",label:"Detailed"}];



export function LessonNotes({lesson,onPlay,preview=false}:{lesson:Lesson;onPlay:(time:number)=>void;preview?:boolean}) {
  const [view,setView]=useState<NoteView>(()=>initialNoteView(lesson));
  const [language,setLanguage]=useState<PreparedMaterialLanguage>(()=>detailedOptions(lesson).language as PreparedMaterialLanguage);
  const savedLanguage=savedMaterialLanguage(lesson),languageChanged=language!==savedLanguage;
  const [preparing,setPreparing]=useState(false),[prepareError,setPrepareError]=useState(""),[prepareNotice,setPrepareNotice]=useState("");
  const prepareRef=useRef(false),prepared=detailedPrepared(lesson,language),pending=!!lesson.materialPreparation&&(lesson.status==="queued"||lesson.status==="processing");
  const canPrepare=!preview&&!lesson.demo&&!lesson.shared&&sourceReadyForMaterial(lesson)&&!prepared;
  async function prepareDetailed(){
    if(prepareRef.current||pending||!canPrepare)return;
    prepareRef.current=true;setPreparing(true);setPrepareError("");setPrepareNotice("");
    try{
      const result=await api<{status:"queued"|"already_queued"|"already_prepared"}>(`/api/lessons/${lesson.id}`,{method:"POST",body:JSON.stringify({action:"prepare-detailed",version:lesson.version,materialRevision:lesson.materialRevision||0,language})});
      setPrepareNotice(result.status==="already_prepared"?"Detailed notes are ready. Opening the updated lesson…":"Detailed notes are being prepared. You can keep using your saved notes.");
      window.dispatchEvent(new Event("darsloop-refresh"));
    }catch(error){setPrepareError(message(error));}
    finally{prepareRef.current=false;setPreparing(false);}
  }
  useEffect(()=>{if(prepared){setPrepareNotice("");setPrepareError("");}},[prepared]);
  const artifacts=lesson.artifacts,notesEnabled=lesson.noteOptions?.enabled!==false;
  const notes=notesEnabled?artifacts?.notes||[]:[],summaryEvidence=notes.slice(0,3).flatMap(note=>note.evidence).filter((citation,index,list)=>list.findIndex(other=>other.segmentId===citation.segmentId)===index);
  return <div className={`notes-layout ${styles.layout}`}><div className="notes-main"><div className="tab-intro"><p className="eyebrow">{lesson.demo?"PREPARED EXAMPLE NOTES":artifacts?.language?`AI NOTES · ${studyMaterialLanguageLabels[artifacts.language]}`:"AI NOTES · FROM THIS LESSON"}</p><h2>{lesson.sourceKind==="pdf"?"Your source notes.":"Your class notes."}</h2><p>{lesson.sourceKind==="pdf"?"Organized from selectable PDF text. Open each cited page to check the original wording and layout.":lesson.demo?"Prepared from a fictional lesson. Tap a time to hear the explanation.":"Organized from clear lesson passages. Tap a time to hear the teacher."}</p></div>
    <div className={styles.viewControls} role="group" aria-label="Note view">{views.map(item=><button key={item.id} type="button" aria-pressed={view===item.id} onClick={()=>setView(item.id)}>{item.label}</button>)}</div><div className={styles.languageControl}><label htmlFor={`notes-language-${lesson.id}`}>Notes language</label><select id={`notes-language-${lesson.id}`} value={language} disabled={pending||preparing||preview||lesson.demo||lesson.shared} onChange={event=>{setLanguage(event.target.value as PreparedMaterialLanguage);setPrepareError("");setPrepareNotice("");}}>{(["en","ur","ar"] as const).map(value=><option key={value} value={value}>{studyMaterialLanguageLabels[value]}</option>)}</select></div><p className={styles.viewCaption}>{languageChanged?`Your saved notes remain in ${studyMaterialLanguageLabels[savedLanguage]}. Prepare the selected language below to change them.`:view==="detailed"&&!prepared?"Detailed view shows your saved notes. Section-by-section Detailed notes have not been prepared yet.":prepared?"Detailed notes were prepared section by section from your saved source.":"Uses the notes already saved for this lesson."}</p>
    {(view==="detailed"||languageChanged)&&!prepared&&<section className={styles.prepare} aria-label="Prepare detailed notes"><div><h3>{pending?"Preparing detailed notes…":"Prepare detailed notes"}</h3><p>{pending?"Your existing notes stay available while the saved source is revisited.":lesson.shared?"Only the lesson owner can prepare a fuller version.":preview||lesson.demo?"This example has one prepared set of notes.":lesson.sourceKind==="pdf"?"Revisit your saved PDF passages section by section. Original source quotations stay unchanged.":"Revisit the saved transcript section by section. Your recording will not be transcribed again, and original quotations stay unchanged."}</p>{canPrepare&&!pending&&<p className={styles.progressNotice}>Preparing uses AI. Switching note views does not. This replaces saved notes and practice; new questions start with fresh progress.</p>}</div>{canPrepare&&<button type="button" className="button primary small" disabled={preparing||pending||lesson.status==="processing"||lesson.status==="queued"} onClick={()=>void prepareDetailed()}>{preparing||pending?<><CircleNotch size={16} className="spin"/>Preparing…</>:<><BookOpen size={16}/>Prepare {languageChanged?studyMaterialLanguageLabels[language].split(" · ")[0]:"Detailed"}</>}</button>}</section>}
    {prepareError&&<p className={styles.error} role="alert">{prepareError}</p>}{prepareNotice&&!pending&&<p className={styles.status} role="status">{prepareNotice}</p>}
    {!!artifacts?.preparation?.uncoveredSections.length&&<p className={styles.viewCaption} role="status">Some source sections do not have supported notes in this preparation. Check the full {lesson.sourceKind==="pdf"?"PDF":"transcript"} for those passages.</p>}
    {notes.length?<>
      {view==="summary"?<article className={styles.summary}><span className={styles.sectionLabel}>SHORT SUMMARY</span><p dir="auto">{artifacts?.overview||notes.slice(0,3).map(note=>note.text).join(" ")}</p><SourceEvidence evidence={summaryEvidence} lesson={lesson} onPlay={onPlay}/></article>:view==="points"?<div className={styles.points}>{notes.map((note,index)=><details key={`${index}-${note.heading}`} className={styles.point}><summary><span className={styles.number}>{String(index+1).padStart(2,"0")}</span><h3 dir="auto">{note.heading}</h3><CaretDown size={17}/></summary><div className={styles.pointBody}><p dir="auto">{note.text}</p><SourceEvidence evidence={note.evidence} lesson={lesson} onPlay={onPlay}/></div></details>)}</div>:<div className={styles.detail}>{notes.map((note,index)=><article className="note-section" key={`${index}-${note.heading}`}><div className="note-number">{String(index+1).padStart(2,"0")}</div><div><h3 dir="auto">{note.heading}</h3><p dir="auto">{note.text}</p><SourceEvidence evidence={note.evidence} lesson={lesson} onPlay={onPlay}/></div></article>)}</div>}
    </>:<div className={styles.unavailable}><BookOpen size={24}/><h3>{!notesEnabled?"Notes are turned off.":lesson.error?"Class notes couldn’t be prepared.":"Class notes are still being prepared."}</h3><p>{!notesEnabled?lesson.sourceKind==="pdf"?"Your PDF pages and supported practice are available in the other tabs.":"Your transcript and supported practice are available in the other tabs.":lesson.sourceKind==="pdf"?"You can still read PDF pages and open the private original source.":"You can still read the transcript and listen to your original recording."}</p></div>}
  </div></div>;
}
