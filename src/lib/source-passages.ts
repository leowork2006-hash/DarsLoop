import { formatTime, type Citation, type Lesson, type PdfPage, type StudyPassage } from "./types";
export function isPdfPage(passage:StudyPassage):passage is PdfPage {return "page" in passage;}
export function sourcePassages(lesson:Lesson):StudyPassage[] {return lesson.sourceKind==="pdf"?(lesson.pdfPages??[]):lesson.segments;}
export function validSourcePassage(p:StudyPassage) {return typeof p.id==="string"&&typeof p.text==="string"&&Array.isArray(p.flags)&&(isPdfPage(p)?Number.isInteger(p.page)&&p.page>=1:Number.isFinite(p.start)&&Number.isFinite(p.end)&&p.start>=0&&p.end>p.start);}
export function sourceLabel(passage?:{page?:number;start?:number}) {return passage?.page?`Page ${passage.page}`:passage?.start!==undefined?formatTime(passage.start):"Source unavailable";}
export function citedPassage(lesson:Lesson,citation?:Citation) {return sourcePassages(lesson).find(p=>p.id===citation?.segmentId);}
export function pdfSourceUrl(lesson:Lesson,page?:number,download=false) {return `/api/lessons/${lesson.id}/pdf?v=${lesson.version}${download?"&download=1":""}${page?`#page=${page}`:""}`;}
/** Canonicalize metadata only after exact quotes have been validated. */
export function sourceCitations(evidence:Citation[],passages:StudyPassage[]):Citation[] {return evidence.map(c=>{const p=passages.find(p=>p.id===c.segmentId);return p&&isPdfPage(p)?{segmentId:c.segmentId,quote:c.quote,page:p.page}:{segmentId:c.segmentId,quote:c.quote};});}
