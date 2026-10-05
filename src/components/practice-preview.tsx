"use client";
import { useState } from "react";
import { Headphones, X } from "lucide-react";
import type { Lesson } from "@/lib/types";
import { Practice } from "./lesson-view";
export function PracticePreview({ lesson }: { lesson: Lesson }) {
  const [notice, setNotice] = useState("");
  return <div className="editorial-practice-preview">
    <Practice lesson={lesson} preview focusItemId={null} onReviewed={()=>{}} onError={setNotice} onPlay={time=>setNotice("In your lesson, this opens your original recording at "+Math.floor(time/60)+":"+String(Math.floor(time%60)).padStart(2,"0")+".")}/>
    {notice&&<div className="editorial-preview-notice" role="status"><Headphones size={17}/><span>{notice}</span><button className="icon-button" aria-label="Dismiss preview message" onClick={()=>setNotice("")}><X size={15}/></button></div>}
    <p className="editorial-preview-caption">Try the actual practice interface · fictional lesson · responses aren’t saved</p>
  </div>;
}
