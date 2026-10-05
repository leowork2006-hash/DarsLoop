"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, AudioLines, BookOpen, Check, Headphones, Layers, MessageCircle, Pause, Play } from "lucide-react";
import { StudyIllustration } from "./study-illustration";
const stages=[
  {name:"Record",title:"Be present for the explanation.",body:"Record with permission, or upload a lesson you’re allowed to use. Keep the original audio alongside your study material.",kind:"audio" as const,icon:AudioLines},
  {name:"Read",title:"The notes take shape for you.",body:"DarsLoop organizes the lesson into notes and a summary. Tap a time to hear the explanation a note came from.",kind:"notes" as const,icon:BookOpen},
  {name:"Ask",title:"Find what your teacher covered.",body:"Ask a question about this class. A supported answer brings the teacher’s passage and a time you can replay.",kind:"chat" as const,icon:MessageCircle},
  {name:"Practise",title:"Bring the lesson back to mind.",body:"Try a quiz or a flashcard, then check the explanation. Save the points you want to return to.",kind:"practice" as const,icon:Layers},
];
export function ProductStory(){
  const [index,setIndex]=useState(0),[playing,setPlaying]=useState(false),[reduced,setReduced]=useState(true),[visible,setVisible]=useState(false);
  const ref=useRef<HTMLDivElement>(null),cycles=useRef(0);
  useEffect(()=>{const media=window.matchMedia("(prefers-reduced-motion: reduce)");const update=()=>{setReduced(media.matches);if(media.matches)setPlaying(false);};update();media.addEventListener("change",update);const observer=new IntersectionObserver(entries=>setVisible(entries[0]?.isIntersecting||false),{threshold:.35});if(ref.current)observer.observe(ref.current);return()=>{media.removeEventListener("change",update);observer.disconnect();};},[]);
  useEffect(()=>{if(visible&&!reduced&&cycles.current===0){cycles.current=1;setPlaying(true);}},[visible,reduced]);
  useEffect(()=>{if(!playing||!visible||reduced)return;const timer=setTimeout(()=>{if(index===3){setPlaying(false);return;}setIndex(i=>i+1);},4500);return()=>clearTimeout(timer);},[playing,index,visible,reduced]);
  const stage=stages[index],Icon=stage.icon;
  const pauseForInteraction=()=>{cycles.current=1;setPlaying(false);};
  return <div className={`product-story ${playing?"story-playing":"story-still"}`} ref={ref} onMouseEnter={pauseForInteraction} onFocusCapture={pauseForInteraction}>
    <div className="story-controls"><div className="story-tabs" role="tablist" aria-label="Explore the lesson workflow">{stages.map((s,i)=><button role="tab" id={`story-tab-${i}`} aria-selected={i===index} aria-controls="story-panel" tabIndex={i===index?0:-1} key={s.name} onClick={()=>{setPlaying(false);setIndex(i);}} onKeyDown={e=>{if(e.key==="ArrowRight"||e.key==="ArrowLeft"||e.key==="Home"||e.key==="End"){e.preventDefault();const next=e.key==="Home"?0:e.key==="End"?3:(i+(e.key==="ArrowRight"?1:3))%4;setPlaying(false);setIndex(next);document.getElementById(`story-tab-${next}`)?.focus();}}}><span>0{i+1}</span>{s.name}</button>)}</div><button className="story-play" aria-label={playing?"Pause workflow animation":"Play workflow animation"} disabled={reduced} onClick={()=>{if(!playing&&index===3)setIndex(0);setPlaying(p=>!p);}}>{playing?<Pause size={17}/>:<Play size={17}/>}</button></div>
    <div className="story-panel" id="story-panel" role="tabpanel" aria-labelledby={`story-tab-${index}`}>
      <div className={`story-art story-art-${index}`} key={`art-${index}`}><StudyIllustration kind={stage.kind}/><div className="story-art-label"><Icon size={16}/><span>{index===0?"Your original recording":index===1?"Notes with audio times":index===2?"Answers from this class": "Quizzes + flashcards"}</span></div></div>
      <div className="story-detail" key={`detail-${index}`}><span className="eyebrow">ONE LESSON · FOUR WAYS TO STUDY</span><h3>{stage.title}</h3><p>{stage.body}</p><div className="story-example">{index===0?<><span className="story-example-label"><AudioLines size={15}/> ADAB OF LEARNING</span><div className="story-wave">{Array.from({length:38},(_,i)=><i key={i} style={{height:`${12+Math.abs(Math.sin(i*1.42)*Math.cos(i*.4))*42}px`}}/>)}</div><p>Record here or upload audio</p></>:index===1?<><span className="story-example-label"><BookOpen size={15}/> LESSON NOTE</span><h4>Give the explanation your attention.</h4><p>Follow the explanation first. Fill the gaps afterwards.</p><span className="story-citation"><Headphones size={14}/> 0:24 · Original passage</span></>:index===2?<><span className="story-example-label"><MessageCircle size={15}/> ASK THIS CLASS</span><h4>“How should I revise afterwards?”</h4><p>Close your notes, explain one idea, then compare it with the teacher’s passage.</p><span className="story-citation"><Headphones size={14}/> From the fictional example lesson</span></>:<><span className="story-example-label"><Layers size={15}/> RECALL CARD</span><h4>What revision exercise did the teacher describe?</h4><div className="story-recall"><Check size={16}/><span>Recall → check the passage → revisit</span></div></>}</div><Link className="text-link arrow-link" href="/learn?example=1">Try it in the example <ArrowRight size={17}/></Link></div>
    </div><p className="story-caption">Workflow illustration using a fictional lesson. Fresh audio needs the AI services connected.</p>
  </div>;
}
