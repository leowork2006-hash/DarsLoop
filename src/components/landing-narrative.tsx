"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./landing-narrative.module.css";

const lines = ["Find the point you missed. 🎧", "Make sense of your notes. 📖", "Recall. Check. Try again. ✨"];
const statement = lines.join(" ");
const words = statement.split(" ");
const audiences = ["Students of Islamic knowledge", "Arabic classes", "Study circles", "Online classes"];

export function LandingNarrative() {
  const root = useRef<HTMLElement>(null);
  const ticker = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [enhanced, setEnhanced] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [tickerVisible, setTickerVisible] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const staticMotion = reduced;

  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    let frame: number | null = null;
    let rootVisible = true;
    const update = () => {
      frame = null;
      if (!root.current) return;
      const bounds = root.current.getBoundingClientRect();
      const travel = Math.max(1, bounds.height - innerHeight);
      setProgress(Math.max(0, Math.min(1, -bounds.top / travel)));
    };
    const queue = () => { if (frame === null && rootVisible && !document.hidden) frame = requestAnimationFrame(update); };
    const preference = () => { setReduced(media.matches); queue(); };
    const visibility = () => { setPageVisible(!document.hidden); if (!document.hidden) queue(); };
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.target === root.current) { rootVisible = entry.isIntersecting; if (rootVisible) queue(); }
        if (entry.target === ticker.current) setTickerVisible(entry.isIntersecting);
      }
    });
    if (root.current) observer.observe(root.current);
    if (ticker.current) observer.observe(ticker.current);
    setEnhanced(true); preference();
    visibility();
    addEventListener("scroll", queue, { passive: true });
    addEventListener("resize", queue);
    media.addEventListener("change", preference);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
      removeEventListener("scroll", queue); removeEventListener("resize", queue);
      media.removeEventListener("change", preference);
      document.removeEventListener("visibilitychange", visibility);
      observer.disconnect();
    };
  }, []);

  return <section ref={root} className={styles.section} aria-label="Built around your class" data-scroll-narrative data-revealed={staticMotion || !enhanced ? words.length : Math.ceil(progress * words.length)}>
    <div className={styles.inner}>
      <p className={styles.statement}><span className={styles.screenReader}>{statement}</span><span aria-hidden="true">{lines.map((line, lineIndex) => <span className={styles.line} key={line}>{line.split(" ").map((word, wordIndex) => {
        const index = lines.slice(0, lineIndex).join(" ").split(" ").filter(Boolean).length + wordIndex;
        return <span key={index} className={styles.word} style={{ opacity: !enhanced || staticMotion ? 1 : Math.round((.22 + .78 * Math.max(0, Math.min(1, progress * (words.length + 3) - index))) * 1000) / 1000 }}>{word}{" "}</span>;
      })}</span>)}</span></p>
      <div className={styles.badges} aria-label="Built for students of Islamic knowledge"><span className={styles.sticker}>Built for <strong>students of Islamic knowledge.</strong></span><span className={styles.sticker}>Study circles</span><span className={styles.sticker}>Online classes</span></div>
      <div ref={ticker} className={styles.ticker} aria-label={`Built for ${audiences.join(", ")}`} data-audience-ticker data-running={enhanced && !reduced && tickerVisible && pageVisible}>
        <div className={styles.track} aria-hidden="true">{[0, 1].map(copy => <div key={copy} className={styles.tickerGroup}><span className={styles.tickerLabel}>Built for</span>{audiences.map(audience => <span key={audience} className={styles.tickerAudience}>{audience}<span className={styles.tickerStar}>✦</span></span>)}</div>)}</div>
      </div>
    </div>
  </section>;
}
