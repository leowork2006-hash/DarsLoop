"use client";
import { useEffect, useState } from 'react';
import { Moon, Sun, Desktop } from '@phosphor-icons/react';
export type ThemePreference='light'|'dark'|'system';
const choices=[{id:'light',label:'Light',Icon:Sun},{id:'dark',label:'Dark',Icon:Moon},{id:'system',label:'System',Icon:Desktop}] as const;
export function ThemeControl(){
  const [value,setValue]=useState<ThemePreference>('light');
  useEffect(()=>{const read=()=>{const p=document.documentElement.dataset.themePreference;setValue(p==='dark'||p==='system'?p:'light');};read();window.addEventListener('darsloop-theme',read);return()=>window.removeEventListener('darsloop-theme',read);},[]);
  function apply(next:ThemePreference){setValue(next);document.documentElement.dataset.themePreference=next;document.documentElement.dataset.theme=next==='system'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):next;try{localStorage.setItem('darsloop-theme',next);}catch{}window.dispatchEvent(new Event('darsloop-theme'));}
  return <div className="theme-control" role="group" aria-label="Appearance">{choices.map(({id,label,Icon})=><button key={id} type="button" aria-pressed={value===id} aria-label={`${label} theme`} onClick={()=>apply(id)}><Icon size={18}/><span>{label}</span></button>)}</div>;
}
export const themeScript=`(()=>{let p='light';try{const s=localStorage.getItem('darsloop-theme');if(['light','dark','system'].includes(s))p=s}catch{}const q=matchMedia('(prefers-color-scheme: dark)');const apply=()=>{document.documentElement.dataset.themePreference=p;document.documentElement.dataset.theme=p==='system'?(q.matches?'dark':'light'):p};apply();q.addEventListener('change',()=>{p=document.documentElement.dataset.themePreference||'light';apply()})})()`;
