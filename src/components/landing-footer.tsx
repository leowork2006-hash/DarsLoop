"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Brand } from "./brand";
import styles from "./landing-footer.module.css";

export function LandingFooter() {
  const wordmark = useRef<HTMLAnchorElement>(null);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const node = wordmark.current;
    if (!node) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const revealIfReduced = () => { if (reduced.matches) setEntered(true); };
    reduced.addEventListener("change", revealIfReduced);
    if (reduced.matches || !("IntersectionObserver" in window)) {
      setEntered(true);
      return () => reduced.removeEventListener("change", revealIfReduced);
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setEntered(true);
        observer.disconnect();
      }
    }, { threshold: .2 });
    observer.observe(node);
    return () => {
      observer.disconnect();
      reduced.removeEventListener("change", revealIfReduced);
    };
  }, []);

  return <footer className={styles.footer} data-landing-footer>
    <div className={styles.links}>
      <div className={styles.intro}><Link href="/" aria-label="DarsLoop AI home"><Brand /></Link><p>Notes and practice<br />for Islamic classes.</p></div>
      <nav aria-label="Get started"><h3>Get started</h3><Link href="/signin">Start learning</Link><Link href="/example">Explore the example</Link></nav>
      <nav aria-label="Your study tools"><h3>Your study tools</h3><a href="#features">Notes &amp; class answers</a><a href="#practice">Quizzes &amp; flashcards</a><a href="#how-it-works">How it works</a></nav>
      <nav aria-label="Good to know"><h3>Good to know</h3><a href="#questions">Questions &amp; privacy</a><Link href="/signin">Your account</Link><p>Built by a student.<br />For the class you’re in.</p></nav>
    </div>
    <Link
      ref={wordmark}
      className={styles.wordmark}
      href="/"
      aria-label="DarsLoop AI home"
      data-entered={entered}
      data-footer-wordmark
    ><Brand /></Link>
    <div className={styles.bottom}><span>© 2026 DarsLoop</span><span>Your class is the starting point.</span></div>
  </footer>;
}
