"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, AudioLines, BookOpen, CircleHelp, Layers, MessageCircle, X } from "lucide-react";
import { Modal } from "./modal";
import Image from "next/image";

const preferencePrefix="darsloop-help-v2:";
const guideIcons={audio:AudioLines,notes:BookOpen,chat:MessageCircle,practice:Layers};
export function useHelpPreference(name:string){
  const [visible,setVisible]=useState(false);
  useEffect(()=>{try{setVisible(localStorage.getItem(preferencePrefix+name)!=="dismissed");}catch{setVisible(true);}},[name]);
  function dismiss(){setVisible(false);try{localStorage.setItem(preferencePrefix+name,"dismissed");}catch{/* The current session can still dismiss help. */}}
  return {visible,dismiss,show:()=>setVisible(true)};
}
const help={
  upload:{kind:"audio" as const,title:"Add the recording you already have.",text:"Choose permitted audio and give the lesson a name. DarsLoop will prepare your notes, quizzes and flashcards."},
  record:{kind:"audio" as const,title:"Keep the microphone near the speaker.",text:"Check the level before you start. Noise reduction can help, but distant or unclear speech can still be missed."},
  notes:{kind:"notes" as const,title:"The notes are made for you.",text:"Each point includes a time. Tap it to hear the teacher, or open “Teacher’s words” to read the supporting passage."},
  ask:{kind:"chat" as const,title:"Ask about the class you’ve opened.",text:"Supported answers include the teacher’s passage and time. If the lesson doesn’t cover your question, DarsLoop will say so."},
  practice:{kind:"practice" as const,title:"Try an answer before you look.",text:"Choose Quiz or Flashcards. Check the teacher’s passage afterwards, then save when to revisit the point."},
  sources:{kind:"chat" as const,title:"Find a possible hadith source.",text:"Search wording from your class. A publisher’s record and grade don’t confirm which narration your teacher intended."},
};
export function ContextHelp({topic}:{topic:keyof typeof help}){
  const [opened,setOpened]=useState(false),item=help[topic],Icon=guideIcons[item.kind];
  const anchor=useRef<HTMLButtonElement>(null);
  useEffect(()=>{if(!opened)return;const escape=(e:KeyboardEvent)=>{if(e.key==="Escape"){setOpened(false);anchor.current?.focus();}};window.addEventListener("keydown",escape);return()=>window.removeEventListener("keydown",escape);},[opened]);
  return <div className="feature-help-anchor"><button ref={anchor} type="button" className="context-help-reopen" aria-expanded={opened} onClick={()=>setOpened(v=>!v)}><CircleHelp size={15}/> How this works</button>{opened&&<aside className="feature-help-tip" aria-label="Feature guide"><span className="feature-tip-icon"><Icon size={20}/></span><strong>{item.title}</strong><p>{item.text}</p><button type="button" className="icon-button" aria-label="Dismiss feature guide" onClick={()=>setOpened(false)}><X size={17}/></button></aside>}</div>;
}
const steps=[
  {kind:"audio" as const,title:"Record or upload your class.",text:"Upload permitted audio or record in the app. For this contest preview, use fictional audio with no real student details."},
  {kind:"notes" as const,title:"Read the notes. Ask a question.",text:"Read the automatic notes, ask about the selected class, and tap a time to hear the original explanation. You don’t need to write the notes yourself."},
  {kind:"practice" as const,title:"Revise with quizzes and flashcards.",text:"Try a quiz or flashcard. Check the teacher’s passage, then save the next review. You can share permitted lessons through a private class."},
];
export function StudyGuide({onClose,onExample,onAdd}:{onClose:()=>void;onExample:()=>void;onAdd:()=>void}){
  const [step,setStep]=useState(0),item=steps[step];
  return <Modal title="A quick look around" onClose={onClose}><div className="guide-art" key={step}><Image src={item.kind==="practice"?"/art/revision-cards-v3.webp":"/art/study-desk-v3.webp"} alt="" width={340} height={255} unoptimized/><span className="guide-art-number">0{step+1}</span></div><div className="guide-copy"><span className="eyebrow">{step+1} OF 3 · YOUR STUDY SPACE</span><h3>{item.title}</h3><p>{item.text}</p></div><div className="guide-progress" aria-label={`Step ${step+1} of 3`}>{steps.map((s,i)=><button type="button" key={s.title} className={i===step?"active":""} aria-label={`Show guide step ${i+1}`} aria-current={i===step?"step":undefined} onClick={()=>setStep(i)}/>)}</div><div className="guide-actions">{step>0?<button className="button quiet" onClick={()=>setStep(s=>s-1)}><ArrowLeft size={16}/> Back</button>:<button className="button quiet" onClick={onClose}>Skip guide</button>}{step<2?<button className="button primary" onClick={()=>setStep(s=>s+1)}>Next <ArrowRight size={17}/></button>:<button className="button primary" onClick={onExample}>Try the example <ArrowRight size={17}/></button>}</div>{step===2&&<button className="guide-add text-link" onClick={onAdd}>Or add a lesson</button>}</Modal>;
}
