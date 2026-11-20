"use client";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

/** Short cinematic intro. Shown once per browser session; skipped for reduced motion. */
export default function Preloader() {
  const [show, setShow] = useState(true);
  const [n, setN] = useState(0);

  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem("kh_intro") === "1";
      sessionStorage.setItem("kh_intro", "1");
    } catch {}
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (seen || reduce) {
      setShow(false);
      return;
    }
    document.documentElement.style.overflow = "hidden";
    const start = performance.now();
    const dur = 1400;
    let raf = 0;
    const step = (t: number) => {
      const p = Math.min((t - start) / dur, 1);
      setN(Math.round((1 - Math.pow(1 - p, 3)) * 100));
      if (p < 1) raf = requestAnimationFrame(step);
      else setTimeout(() => setShow(false), 250);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    if (!show) document.documentElement.style.overflow = "";
  }, [show]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="pre"
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-ink"
          exit={{ clipPath: "inset(0 0 100% 0)" }}
          initial={{ clipPath: "inset(0 0 0% 0)" }}
          transition={{ duration: 0.8, ease: [0.76, 0, 0.24, 1] }}
          aria-hidden
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_55%,rgba(225,6,0,.25),transparent_60%)]" />
          <p className="relative font-graffiti text-4xl text-blood animate-flicker sm:text-7xl">KRAZY HOURS</p>
          <div className="relative mt-6 h-[3px] w-48 overflow-hidden rounded bg-white/10">
            <div className="h-full bg-blood shadow-glow" style={{ width: `${n}%` }} />
          </div>
          <p className="relative mt-3 font-mono text-xs tracking-[0.4em] text-white/60">{String(n).padStart(3, "0")}</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
