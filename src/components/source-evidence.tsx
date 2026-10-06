"use client";
import { ArrowSquareOut, CaretDown, FilePdf, Play } from "@phosphor-icons/react";
import { citedPassage, isPdfPage, pdfSourceUrl, sourceLabel } from "@/lib/source-passages";
import type { Citation, Lesson } from "@/lib/types";
export function SourceLink({lesson,citation,onPlay,className="timestamp"}:{lesson:Lesson;citation:Citation;onPlay:(time:number)=>void;className?:string}){
  const passage=citedPassage(lesson,citation);if(!passage)return null;
  return isPdfPage(passage)?<a className={className} href={pdfSourceUrl(lesson,passage.page)} target="_blank" rel="noreferrer" aria-label={`Open PDF page ${passage.page}`}><FilePdf size={13}/><bdi>{sourceLabel(passage)}</bdi><ArrowSquareOut size={12}/></a>:<button type="button" className={className} onClick={()=>onPlay(passage.start)} aria-label={`Play passage at ${sourceLabel(passage)}`}><Play size={11} weight="fill"/><bdi>{sourceLabel(passage)}</bdi></button>;
}
export function SourceEvidence({evidence,lesson,onPlay}:{evidence:Citation[];lesson:Lesson;onPlay:(time:number)=>void}){
  return <div className="evidence-row">{evidence.map((citation,index)=>citedPassage(lesson,citation)?<div className="evidence-link" key={`${citation.segmentId}-${index}`}><SourceLink lesson={lesson} citation={citation} onPlay={onPlay}/><details className="quote-detail"><summary>{lesson.sourceKind==="pdf"?"Source excerpt":lesson.demo?"Fictional script words":"Teacher’s words"}<CaretDown size={13}/></summary><blockquote dir="auto">{citation.quote}</blockquote></details></div>:null)}</div>;
}
