"use client";

import Link from "next/link";
import { ArrowRight, Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Brand } from "./brand";
import styles from "./landing-nav.module.css";

const sections = [
  ["#features", "Features"],
  ["#how-it-works", "How it works"],
  ["#practice", "Practice"],
  ["#questions", "Questions"],
] as const;

export function LandingNav() {
  const [open, setOpen] = useState(false);
  const header = useRef<HTMLElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) return;
    const firstLink = menu.current?.querySelector<HTMLAnchorElement>("a");
    firstLink?.focus({ preventScroll: true });
    const onOutside = (event: PointerEvent | FocusEvent) => {
      if (event.target instanceof Node && !header.current?.contains(event.target)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        toggle.current?.focus({ preventScroll: true });
      }
    };
    const desktop = window.matchMedia("(min-width: 861px)");
    const onDesktop = () => { if (desktop.matches) setOpen(false); };
    document.addEventListener("pointerdown", onOutside);
    document.addEventListener("focusin", onOutside);
    document.addEventListener("keydown", onKey);
    desktop.addEventListener("change", onDesktop);
    return () => {
      document.removeEventListener("pointerdown", onOutside);
      document.removeEventListener("focusin", onOutside);
      document.removeEventListener("keydown", onKey);
      desktop.removeEventListener("change", onDesktop);
    };
  }, [open]);

  return <header className={styles.header} ref={header} data-landing-nav>
    <button
      ref={toggle}
      className={styles.toggle}
      type="button"
      aria-label={open ? "Close navigation" : "Open navigation"}
      aria-controls="landing-mobile-navigation"
      aria-expanded={open}
      onClick={() => setOpen((value) => !value)}
    >{open ? <X size={21} /> : <Menu size={21} />}</button>
    <Link className={styles.logo} href="/" aria-label="DarsLoop AI home" onClick={() => setOpen(false)}><Brand /></Link>
    <nav className={styles.desktopNav} aria-label="Main navigation">
      {sections.map(([href, label]) => <a href={href} key={href}>{label}</a>)}
    </nav>
    <div className={styles.actions}>
      <Link className={styles.signin} href="/signin">Sign in</Link>
      <Link className={styles.start} href="/signin" aria-label="Start learning">
        <span className={styles.desktopLabel}>Start learning</span><span className={styles.mobileLabel}>Start</span><ArrowRight size={15} />
      </Link>
    </div>
    <nav
      ref={menu}
      id="landing-mobile-navigation"
      className={styles.mobileNav}
      aria-label="Mobile navigation"
      hidden={!open}
    >
      {sections.map(([href, label]) => <a href={href} key={href} onClick={() => setOpen(false)}>{label}<ArrowRight size={15} /></a>)}
      <Link href="/signin" onClick={() => setOpen(false)}>Sign in<ArrowRight size={15} /></Link>
    </nav>
  </header>;
}
