"use client";
import { useId, useState } from "react";
import { CaretDown, CaretUp } from "@phosphor-icons/react";
import { isPdfPage, sourceLabel, sourcePassages } from "@/lib/source-passages";
import type { Lesson } from "@/lib/types";
import styles from "./source-excerpt.module.css";

/** Layout only: the exact original string remains the text node and evidence. */
export function SourceExcerpt({text,label,actions,flags=[],emptyText="No selectable text on this page."}:{text:string;label:string;actions?:React.ReactNode;flags?:string[];emptyText?:string}){
  const [expanded,setExpanded]=useState(false),[lineBreaks,setLineBreaks]=useState(false),id=useId();
  const lengthy=text.length>850||text.split("\n").length>10,hasLineBreaks=text.includes("\n");
  return <section className={`${styles.excerpt} ${flags.length?styles.flagged:""}`} aria-label={label}>
    <header className={styles.header}><h3>{label}</h3>{actions&&<div className={styles.actions}>{actions}</div>}</header>
    {text?<p id={id} dir="auto" data-source-text className={`${styles.text} ${lineBreaks?styles.lineBreaks:""} ${lengthy&&!expanded?styles.clamped:""}`}>{text}</p>:<p className={styles.empty}>{emptyText}</p>}
    {(lengthy||hasLineBreaks)&&<div className={styles.controls}>{lengthy&&<button type="button" aria-expanded={expanded} aria-controls={id} onClick={()=>setExpanded(!expanded)}>{expanded?<CaretUp size={15}/>:<CaretDown size={15}/>} {expanded?"Show less":"Show full text"}</button>}{hasLineBreaks&&<button type="button" aria-pressed={lineBreaks} aria-controls={id} onClick={()=>setLineBreaks(!lineBreaks)}>{lineBreaks?"Read as paragraphs":"Show line breaks"}</button>}</div>}
    {!!flags.length&&<p className={styles.warning}>{flags.join(" · ")}</p>}
  </section>;
}

/** Short native option labels keep PDF choices readable on desktop and phone. */
export function SourcePassagePicker({lesson,value,onChange,disabled=false}:{lesson:Lesson;value:string;onChange:(id:string)=>void;disabled?:boolean}){
  const id=useId(),pdf=lesson.sourceKind==="pdf";
  return <label className={`${styles.picker} field`} htmlFor={id}><span>{pdf?"Choose a PDF page":"Choose a lesson passage"}</span><select id={id} disabled={disabled} value={value} onChange={event=>onChange(event.target.value)}>{sourcePassages(lesson).map(passage=><option key={passage.id} value={passage.id}>{isPdfPage(passage)?`${sourceLabel(passage)}${!passage.text?" · No selectable text":passage.flags.length?" · Check original wording":""}`:`${sourceLabel(passage)} · ${passage.text.replace(/\s+/gu," ").slice(0,70)}`}</option>)}</select></label>;
}
