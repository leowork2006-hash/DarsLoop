"use client";
import { useState } from "react";
import { AudioLines, BookOpen, Layers, Pause, Play } from "lucide-react";
import { StudyWorld } from "./study-world";
export function SignInScene({labels={notes:"Class notes",audio:"Your teacher’s words",practice:"A little practice"}}:{labels?:{notes:string;audio:string;practice:string}}={}){
 const [paused,setPaused]=useState(false);
 return <div className="signin-scene"><StudyWorld paused={paused} composition="welcome"/><span className="signin-scene-tag tag-notes"><BookOpen size={15}/> {labels.notes}</span><span className="signin-scene-tag tag-audio"><AudioLines size={15}/> {labels.audio}</span><span className="signin-scene-tag tag-practice"><Layers size={15}/>{labels.practice}</span><button className="icon-button signin-scene-pause" aria-label={paused?"Resume welcome animation":"Pause welcome animation"} aria-pressed={paused} onClick={()=>setPaused(p=>!p)}>{paused?<Play size={15}/>:<Pause size={15}/>}</button></div>;
}
