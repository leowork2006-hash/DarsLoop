"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./landing-narrative.module.css";

const statement = "Listen in class. Find the point again. DarsLoop turns your lesson into clear notes, answers from the class and practice, with the original explanation close by.";
const words = statement.split(" ");
const audiences = ["Alimiyyah students", "Arabic classes", "Halaqahs", "Online lessons"];

export function LandingNarrative() {
  const root = useRef<HTMLElement>(null);
  const [progress, setProgress] = useState(0);
  const [enhanced, setEnhanced] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [paused, setPaused] = useState(false);
  const staticMotion = reduced || paused;

  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    let frame: number | null = null;
    const update = () => {
      frame = null;
      if (!root.current) return;
      const bounds = root.current.getBoundingClientRect();
      const travel = Math.max(260, Math.min(innerHeight * .8, bounds.height));
      setProgress(Math.max(0, Math.min(1, (innerHeight * .8 - bounds.top) / travel)));
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
      <div className={styles.top}><span className={styles.label}>THE CLASS IS THE STARTING POINT</span><span className={styles.sticker}>Built for<br/><strong>Alimiyyah students.</strong></span></div>
      <p className={styles.statement}><span className={styles.screenReader}>{statement}</span><span aria-hidden="true">{words.map((word, index) => <span key={index} className={styles.word} style={{ opacity: !enhanced || staticMotion ? 1 : Math.round((.22 + .78 * Math.max(0, Math.min(1, progress * (words.length + 3) - index))) * 1000) / 1000 }}>{word}{" "}</span>)}</span></p>
      <div className={styles.tickerHeader}><span>Built around the class you’re in.</span><button onClick={() => setPaused(value => !value)} aria-pressed={paused} disabled={reduced}>{reduced ? "Motion reduced" : paused ? "Follow scroll" : "Show full text"}</button></div>
    </div>
  </section>;
}

export function LandingAudienceTicker() {
  const [paused,setPaused]=useState(false);
  const [reduced,setReduced]=useState(false);
  useEffect(()=>{const media=matchMedia("(prefers-reduced-motion: reduce)");const update=()=>setReduced(media.matches);update();media.addEventListener("change",update);return()=>media.removeEventListener("change",update);},[]);
  return <section className={styles.audienceStrip} aria-label="Made for students of Islamic knowledge">
    <div className={styles.audienceInner}><div className={styles.audienceLabel}><span>MADE FOR YOUR STUDY CIRCLE</span><button onClick={()=>setPaused(value=>!value)} aria-pressed={paused} disabled={reduced}>{reduced?"Motion reduced":paused?"Resume ticker":"Pause ticker"}</button></div><div className={`${styles.ticker} ${paused||reduced?styles.static:""}`} data-ticker-paused={paused||reduced}><ul className={styles.track} aria-label="Classes DarsLoop is built for">{[0,1].map(copy=><li key={copy} aria-hidden={copy===1?true:undefined}>{audiences.map(audience=><span key={audience}>{audience}<i aria-hidden="true">·</i></span>)}</li>)}</ul></div></div>
  </section>;
}
