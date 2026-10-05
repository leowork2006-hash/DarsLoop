"use client";
import { useEffect, useId, useRef } from "react";
import { X } from "@phosphor-icons/react";
export function Modal({title,onClose,children,wide=false,className=""}:{title:string;onClose:()=>void;children:React.ReactNode;wide?:boolean;className?:string}) {
  const ref=useRef<HTMLDialogElement>(null),titleId=useId();
  useEffect(()=>{const d=ref.current;d?.showModal();return()=>d?.close();},[]);
  return <dialog ref={ref} className={`modal ${wide?"modal-wide":""} ${className}`} aria-labelledby={titleId} onCancel={e=>{e.preventDefault();onClose();}} onClick={e=>{if(e.target===e.currentTarget)onClose();}}><div className="modal-inner"><header className="modal-header"><h2 id={titleId} dir="auto">{title}</h2><button type="button" className="icon-button" onClick={onClose} aria-label="Close dialog"><X size={20}/></button></header>{children}</div></dialog>;
}
