"use client";
import { useState } from "react";
import { FilePdf, DownloadSimple, MagnifyingGlass } from "@phosphor-icons/react";
import { pdfSourceUrl } from "@/lib/source-passages";
import type { Lesson } from "@/lib/types";
export function PdfPages({lesson}:{lesson:Lesson}){
  const [query,setQuery]=useState("");const pages=(lesson.pdfPages??[]).filter(p=>!query||p.text.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
  return <div className="transcript-workspace"><div className="tab-intro"><p className="eyebrow">YOUR PRIVATE SOURCE</p><h2>PDF pages.</h2><p>Selectable text from {lesson.sourcePageCount} physical PDF pages. Extraction can miss layout or symbols; check important wording in the original. DarsLoop does not perform OCR.</p><a className="button secondary small" href={pdfSourceUrl(lesson)} target="_blank" rel="noreferrer"><FilePdf size={17}/>Open original PDF</a> <a className="button secondary small" href={pdfSourceUrl(lesson,undefined,true)}><DownloadSimple size={17}/>Download</a></div><label className="search-field" data-tour="source-search"><MagnifyingGlass size={17}/><input aria-label="Search PDF pages" placeholder="Find a word in this PDF…" value={query} onChange={e=>setQuery(e.target.value)}/></label><div className="transcript-list">{pages.map(page=><article key={page.id} className={`transcript-passage ${page.flags.length?"uncertain-passage":""}`}><a className="timestamp" href={pdfSourceUrl(lesson,page.page)} target="_blank" rel="noreferrer">Page {page.page}</a><div><p dir="auto" style={{whiteSpace:"pre-wrap"}}>{page.text||"No selectable text on this page."}</p>{!!page.flags.length&&<p className="uncertainty-label">{page.flags.join(" · ")}</p>}</div></article>)}{!pages.length&&<p>No matching pages. Try a shorter phrase.</p>}</div></div>;
}
