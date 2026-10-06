"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./landing-narrative.module.css";

const lines = ["Find the part you missed. 🎧", "Make sense of it with your class notes. 📖", "Try it from memory. Know what to revisit. ✨"];
const statement = lines.join(" ");
const words = statement.split(" ");

export function LandingNarrative() {
  const root = useRef<HTMLElement>(null);
  const [progress, setProgress] = useState(0);
  const [enhanced, setEnhanced] = useState(false);
  const [reduced, setReduced] = useState(false);
  const staticMotion = reduced;

  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    let frame: number | null = null;
    const update = () => {
      frame = null;
      if (!root.current) return;
      const bounds = root.current.getBoundingClientRect();
      const travel = Math.max(1, bounds.height - innerHeight);
      setProgress(Math.max(0, Math.min(1, -bounds.top / travel)));
    };
    const queue = () => { if (frame === null) frame = requestAnimationFrame(update); };
    const preference = () => { setReduced(media.matches); queue(); };
    setEnhanced(true); preference();
    addEventListener("scroll", queue, { passive: true });
    addEventListener("resize", queue);
    media.addEventListener("change", preference);
    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
      removeEventListener("scroll", queue); removeEventListener("resize", queue);
      media.removeEventListener("change", preference);
    };
  }, []);

  return <section ref={root} className={styles.section} aria-label="Built around your class" data-scroll-narrative data-revealed={staticMotion || !enhanced ? words.length : Math.ceil(progress * words.length)}>
    <div className={styles.inner}>
      <p className={styles.statement}><span className={styles.screenReader}>{statement}</span><span aria-hidden="true">{lines.map((line, lineIndex) => <span className={styles.line} key={line}>{line.split(" ").map((word, wordIndex) => {
        const index = lines.slice(0, lineIndex).join(" ").split(" ").filter(Boolean).length + wordIndex;
        return <span key={index} className={styles.word} style={{ opacity: !enhanced || staticMotion ? 1 : Math.round((.22 + .78 * Math.max(0, Math.min(1, progress * (words.length + 3) - index))) * 1000) / 1000 }}>{word}{" "}</span>;
      })}</span>)}</span></p>
      <div className={styles.badges} aria-label="Built for students of Islamic knowledge"><span className={styles.sticker}>Built for <strong>Alimiyyah students.</strong></span><span className={styles.badge}>Halaqahs</span><span className={styles.badge}>Online classes</span></div>
    </div>
  </section>;
}
