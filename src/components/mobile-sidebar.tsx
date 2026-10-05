"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { X } from "@phosphor-icons/react";

export function MobileSidebar({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const element = dialog.current!;
    const opener = document.querySelector<HTMLButtonElement>(".mobile-menu-button");
    const previousOverflow = document.body.style.overflow;
    const desktop = window.matchMedia("(min-width: 801px)");
    const resize = () => { if (desktop.matches) close.current(); };
    document.body.style.overflow = "hidden";
    element.showModal();
    desktop.addEventListener("change", resize);
    return () => {
      desktop.removeEventListener("change", resize);
      element.close();
      document.body.style.overflow = previousOverflow;
      opener?.focus({ preventScroll: true });
    };
  }, []);
  return <dialog ref={dialog} id="workspace-drawer" className="workspace-drawer" aria-labelledby="workspace-drawer-title" onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <h2 id="workspace-drawer-title" className="sr-only">Workspace navigation</h2>
    <button type="button" className="workspace-drawer-close" aria-label="Close workspace menu" onClick={onClose} autoFocus><X size={22}/></button>
    <div className="mobile-sidebar">{children}</div>
  </dialog>;
}
