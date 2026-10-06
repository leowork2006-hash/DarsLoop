"use client";
import { useEffect, useRef, useState } from "react";

/** Prepared, local-only previews. Suspend when offscreen, hidden or reduced motion. */
export function useLandingLoop(length = 48) {
  const root = useRef<HTMLElement>(null);
  const [tick, setTick] = useState(0);
  const [running, setRunning] = useState(false);
  const holdUntil = useRef(0);
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    let visible = false;
    let timer: ReturnType<typeof setInterval> | undefined;
    const update = () => {
      clearInterval(timer);
      const active = visible && !document.hidden && !media.matches;
      setRunning(active);
      if (active) timer = setInterval(() => {
        if (Date.now() >= holdUntil.current && !element.matches(":focus-within")) setTick(value => (value + 1) % length);
      }, 300);
    };
    const observer = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; update(); }, { threshold: .08 });
    observer.observe(element);
    document.addEventListener("visibilitychange", update);
    media.addEventListener("change", update);
    return () => { observer.disconnect(); clearInterval(timer); document.removeEventListener("visibilitychange", update); media.removeEventListener("change", update); };
  }, [length]);
  return { root, tick, running, interact: () => { holdUntil.current = Date.now() + 12000; } };
}
