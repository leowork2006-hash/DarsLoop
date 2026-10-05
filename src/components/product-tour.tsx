"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, BarChart3, BookOpen, Headphones, Layers, LockKeyhole, MessageCircle, MousePointer2, Pause, Play, Plus, Search, Users } from "lucide-react";
import { Brand } from "./brand";
import { Notes, Chat, Practice } from "./lesson-view";
import { Insights } from "./insights";
import type { Lesson } from "@/lib/types";
const tabs=[{id:"notes",label:"Notes",icon:BookOpen},{id:"ask",label:"Ask this class",icon:MessageCircle},{id:"practice",label:"Practice",icon:Layers},{id:"insights",label:"Insights",icon:BarChart3}] as const;
export function ProductTour({lesson}:{lesson:Lesson}) {
  const [tab,setTab]=useState(0),[playing,setPlaying]=useState(false),[reduced,setReduced]=useState(false),[notice,setNotice]=useState("");
  const root=useRef<HTMLDivElement>(null),[inView,setInView]=useState(true);
  useEffect(()=>{const media=matchMedia("(prefers-reduced-motion: reduce)"),update=()=>{setReduced(media.matches);setPlaying(!media.matches);};update();media.addEventListener("change",update);const observer=new IntersectionObserver(([e])=>setInView(e.isIntersecting),{threshold:.1});if(root.current)observer.observe(root.current);return()=>{media.removeEventListener("change",update);observer.disconnect();};},[]);
  useEffect(()=>{if(!playing||!inView)return;const timer=setInterval(()=>{if(!document.hidden)setTab(t=>(t+1)%tabs.length);},6500);return()=>clearInterval(timer);},[playing,inView]);
  const select=(index:number)=>{setPlaying(false);setTab(index);setNotice("");};
  const play=(time:number)=>{setPlaying(false);setNotice(`In your lesson, this opens your original recording at ${Math.floor(time/60)}:${String(Math.floor(time%60)).padStart(2,"0")}.`);};
  const illustrated={...lesson,demo:false};
  return <div className="product-tour-wrap" ref={root}><div className={`product-tour ${playing?"tour-playing":""}`} data-step={tab}>
    <div className="browser-chrome"><span className="window-dots" aria-hidden="true"><i/><i/><i/></span><span><LockKeyhole size={10}/> DarsLoop / Your study space</span><span className="browser-chrome-tail">Made for your class</span></div>
    <div className="tour-app"><aside className="tour-app-sidebar"><Brand/><span className="tour-add"><Plus size={14}/> Add a lesson</span><span className="tour-nav active"><BookOpen size={15}/> My lessons</span><span className="tour-nav"><Layers size={15}/> Review</span><span className={`tour-nav ${tab===3?"active":""}`}><BarChart3 size={15}/> Insights</span><span className="tour-nav"><Users size={15}/> Classes</span><div className="tour-course"><span className="mini-label">YOUR COURSES</span><span><i/>Adab of learning</span><span><i/>Arabic class</span></div><span className="tour-sidebar-foot"><LockKeyhole size={12}/> Private to you</span></aside><div className="tour-app-main"><div className="tour-topbar"><span><BookOpen size={13}/> My lessons <ArrowRight size={11}/><b>Adab of learning</b></span><Search size={15}/></div><div className="tour-lesson-heading"><div><span className="mini-label">YOUR CLASS, READY TO REVISIT</span><h3>Listening & learning</h3></div><span className="tour-ready"><span/>Notes ready</span></div><div className="tour-tabs" role="tablist" aria-label="Product walkthrough" onKeyDown={e=>{if(e.key==="ArrowRight"||e.key==="ArrowLeft"){e.preventDefault();const next=(tab+(e.key==="ArrowRight"?1:tabs.length-1))%tabs.length;select(next);root.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();}}}>{tabs.map(({id,label,icon:Icon},i)=><button role="tab" key={id} id={`walkthrough-${id}`} aria-controls="walkthrough-panel" aria-selected={tab===i} tabIndex={tab===i?0:-1} onClick={()=>select(i)}><Icon size={14}/>{label}</button>)}</div>
    <div className="tour-screen" id="walkthrough-panel" role="tabpanel" aria-labelledby={`walkthrough-${tabs[tab].id}`} onPointerDownCapture={()=>setPlaying(false)} onFocusCapture={()=>setPlaying(false)}>
      {tab===0&&<Notes lesson={illustrated} onPlay={play}/>}
      {tab===1&&<Chat key="marketing-chat" lesson={illustrated} preview configured={false} onPlay={play} onError={setNotice}/>}
      {tab===2&&<Practice lesson={lesson} preview scenePaused={!playing} focusItemId={null} onPlay={play} onReviewed={()=>{}} onError={setNotice}/>}
      {tab===3&&<Insights lessons={[]} reviews={[]} onReview={()=>{}} onPractice={()=>select(2)}/>}
    </div>{notice&&<div className="tour-notice" role="status"><Headphones size={16}/>{notice}</div>}<div className="tour-player"><span><Play size={13} fill="currentColor"/></span><div className="tour-player-wave" aria-hidden="true">{Array.from({length:46},(_,i)=><i key={i} style={{height:8+Math.abs(Math.sin(i*1.4))*14}}/>)}</div><span>Original class audio</span><Headphones size={14}/></div></div></div>
    <div className="demo-cursor" aria-hidden="true"><MousePointer2 size={29} fill="#242837"/><span>You</span></div>
  </div><div className="tour-caption"><span><i/> Product walkthrough · illustrated fictional lesson</span><button onClick={()=>setPlaying(p=>!p)} disabled={reduced} aria-label={playing?"Pause product walkthrough":"Play product walkthrough"}>{playing?<Pause size={13}/>:<Play size={13}/>} {reduced?"Motion off":playing?"Pause":"Play"}</button></div></div>;
}
