"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, BookOpen, X } from "@phosphor-icons/react";
import { guideCopy, type GuideLanguage } from "@/lib/guide-language";
import { pageGuides, type GuidePage } from "@/lib/page-guides";
export function GuidedTour({onClose,onChangeLanguage,language="en",page}:{onClose:()=>void;onChangeLanguage:()=>void;language?:GuideLanguage;page?:GuidePage}) {
 const copy=guideCopy[language];
 const steps=page?pageGuides[page].map(s=>({selector:s.selector,title:s.copy[language][0],text:s.copy[language][1]})):["add","review","insights","classes"].map((name,i)=>({selector:`[data-tour="${name}"]`,title:copy.step[i][0],text:copy.step[i][1]}));
 const [step,setStep]=useState(0),[position,setPosition]=useState<{top:number;left:number;width:number;height:number}|null>(null);
 const [tipHeight,setTipHeight]=useState(270),[viewport,setViewport]=useState({width:320,height:650});
 const dialog=useRef<HTMLDialogElement>(null),box=useRef<HTMLElement>(null),close=useRef(onClose);close.current=onClose;
 useLayoutEffect(()=>{setViewport({width:innerWidth,height:innerHeight});const d=dialog.current,previous=document.activeElement as HTMLElement|null,overflow=document.body.style.overflow;d?.showModal();document.body.style.overflow="hidden";box.current?.focus();return()=>{d?.close();document.body.style.overflow=overflow;const target=previous?.isConnected&&previous!==document.body?previous:document.getElementById("workspace-main");target?.focus({preventScroll:true});};},[]);
 useEffect(()=>{box.current?.focus();},[]);
 useLayoutEffect(()=>{const el=box.current;if(!el)return;const measure=()=>setTipHeight(el.getBoundingClientRect().height);measure();const observer=new ResizeObserver(measure);observer.observe(el);return()=>observer.disconnect();},[step,language]);
 useEffect(()=>{
  const targets=Array.from(document.querySelectorAll<HTMLElement>(steps[step].selector)),target=targets.find(t=>t.getBoundingClientRect().width>0&&t.getBoundingClientRect().height>0);
  if(target){const r=target.getBoundingClientRect();if(r.top<75||r.bottom>innerHeight-90)target.scrollIntoView({block:"center",behavior:"instant"});}
  const place=()=>{setViewport({width:innerWidth,height:innerHeight});if(!target){setPosition(null);return;}const r=target.getBoundingClientRect(),left=Math.max(0,r.left-5),top=Math.max(0,r.top-5);setPosition({top,left,width:Math.max(0,Math.min(innerWidth,r.right+5)-left),height:Math.max(0,Math.min(innerHeight,r.bottom+5)-top)});};
  place();window.addEventListener("resize",place);window.addEventListener("scroll",place,true);return()=>{window.removeEventListener("resize",place);window.removeEventListener("scroll",place,true);};
 },[step,page]);
 const width=Math.min(336,viewport.width-28),below=position?position.top+position.height+14:86,above=position?position.top-tipHeight-14:86;
 const top=Math.max(14,Math.min(below+tipHeight<=viewport.height-14?below:above,viewport.height-tipHeight-14));
 const left=position?Math.max(14,Math.min(position.left,viewport.width-width-14)):(viewport.width-width)/2;
 return <dialog ref={dialog} className="tour-layer" aria-label="Page guide" onCancel={e=>{e.preventDefault();close.current();}}>
  {position?<><div className="tour-blur" style={{left:0,top:0,width:"100%",height:position.top}}/><div className="tour-blur" style={{left:0,top:position.top,width:position.left,height:position.height}}/><div className="tour-blur" style={{left:position.left+position.width,top:position.top,right:0,height:position.height}}/><div className="tour-blur" style={{left:0,top:position.top+position.height,width:"100%",bottom:0}}/><div className="tour-spotlight" style={position}/></>:<div className="tour-blur" style={{inset:0}}/>}
  <aside ref={box} tabIndex={-1} className="tour-tip" role="region" aria-label="Quick workspace guide" lang={language} dir={language==="en"?"ltr":"rtl"} style={{top,left,width}}><button className="icon-button tour-close" aria-label="Close workspace guide" onClick={onClose}><X size={18}/></button><span className="tour-icon"><BookOpen size={20}/></span><span className="mini-label">{copy.label} · <bdi dir="ltr">{step+1} / {steps.length}</bdi></span><h3>{steps[step].title}</h3><p>{steps[step].text}</p><div className="tour-actions">{step?<button className="text-link" onClick={()=>setStep(s=>s-1)}><ArrowLeft size={14}/> {copy.back}</button>:<button className="text-link" onClick={onClose}>{copy.skip}</button>}<button className="button primary small" onClick={()=>step===steps.length-1?onClose():setStep(s=>s+1)}>{step===steps.length-1?copy.done:copy.next}<ArrowRight size={14}/></button></div><button className="text-link tour-language-link" onClick={onChangeLanguage}>{copy.change}</button></aside>
 </dialog>;
}
