"use client";
import { motion, useScroll, useTransform } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import PartyScene from "./PartyScene";
import Countdown from "./Countdown";
import SpotsCounter from "./SpotsCounter";
import { EVENT } from "@/lib/event";
import { useStatus } from "./useStatus";

const ease = [0.16, 1, 0.3, 1] as const;
// Fixed (not random) per-letter offsets so SSR and client match.
const SPIN = [-14, 9, -6, 12, -10, 7, -12, 5, -8, 11];

function GraffitiWord({ word, start, className, glitch }: { word: string; start: number; className: string; glitch: boolean }) {
  return (
    <span className={`glitch flex justify-center ${glitch ? "is-glitching" : ""} ${className}`} data-text={word} aria-hidden>
      {word.split("").map((ch, i) => {
        const k = start + i;
        return (
          <motion.span
            key={i}
            className="inline-block will-change-transform"
            initial={{ opacity: 0, y: "-60%", scale: 1.8, rotate: SPIN[k % SPIN.length], filter: "blur(14px)" }}
            animate={{ opacity: 1, y: "0%", scale: 1, rotate: SPIN[k % SPIN.length] / 6, filter: "blur(0px)" }}
            transition={{ duration: 0.75, ease, delay: 0.25 + k * 0.07 }}
          >
            {ch}
          </motion.span>
        );
      })}
    </span>
  );
}

export default function Hero() {
  const { status } = useStatus();
  const capacity = status?.capacity ?? EVENT.capacity;
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const titleY = useTransform(scrollYProgress, [0, 1], ["0%", "40%"]);
  const titleOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);
  const titleScale = useTransform(scrollYProgress, [0, 1], [1, 0.85]);

  // Occasional glitch on the logotype
  const [glitch, setGlitch] = useState(false);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let t: ReturnType<typeof setTimeout>;
    const loop = (first = false) => {
      t = setTimeout(() => {
        setGlitch(true);
        setTimeout(() => setGlitch(false), 420);
        loop();
      }, first ? 2600 : 4000 + Math.random() * 4000);
    };
    loop(true);
    return () => clearTimeout(t);
  }, []);

  return (
    <section ref={ref} id="top" className="relative flex min-h-[100svh] items-center justify-center overflow-hidden">
      <PartyScene scrollY={scrollYProgress} />

      <motion.div
        className="relative z-10 mx-auto flex w-full max-w-6xl flex-col items-center px-4 pb-28 pt-28 text-center sm:pb-32"
        style={{ y: titleY, opacity: titleOpacity, scale: titleScale }}
      >
        <motion.p
          className="mb-4 font-mono text-[10px] uppercase tracking-[0.35em] text-white/70 sm:text-xs"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
        >
          TribeWave Records <span className="text-blood">×</span> Motion Boys Squad present
        </motion.p>

        <h1 className="relative select-none" aria-label="Krazy Hours">
          {/* red light bursts behind the type */}
          <motion.span
            aria-hidden
            className="absolute left-1/2 top-1/2 -z-10 h-[140%] w-[120%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(225,6,0,.65),transparent)] blur-2xl"
            initial={{ opacity: 0, scale: 0.4 }}
            animate={{ opacity: [0, 1, 0.45, 0.8, 0.5], scale: [0.4, 1.15, 1, 1.05, 1] }}
            transition={{ duration: 1.6, delay: 0.5, times: [0, 0.25, 0.5, 0.75, 1] }}
          />
          <span className="block font-graffiti leading-[0.82]">
            <GraffitiWord
              word="KRAZY"
              start={0}
              glitch={glitch}
              className="text-[clamp(4.6rem,22vw,13.5rem)] text-bone [text-shadow:0_0_2px_#fff,0_6px_0_#7a0300,0_0_40px_rgba(225,6,0,.6)]"
            />
            <GraffitiWord word="HOURS" start={5} glitch={glitch} className="spray-text -mt-[0.06em] text-[clamp(4.6rem,22vw,13.5rem)]" />
          </span>
          {/* paint drip underline */}
          <motion.svg
            aria-hidden
            viewBox="0 0 400 30"
            className="mx-auto -mt-2 h-5 w-[70%] text-blood sm:h-7"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.1 }}
          >
            <motion.path
              d="M5 12 C 80 4, 160 20, 240 9 S 360 6, 395 14"
              stroke="currentColor"
              strokeWidth="7"
              strokeLinecap="round"
              fill="none"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.9, delay: 1.1, ease }}
            />
            {[60, 150, 290, 350].map((x, i) => (
              <motion.line
                key={x}
                x1={x}
                x2={x}
                y1={12}
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
                initial={{ y2: 12 }}
                animate={{ y2: 18 + (i % 2) * 8 }}
                transition={{ duration: 1.4, delay: 1.7 + i * 0.15, ease: "easeIn" }}
              />
            ))}
          </motion.svg>
        </h1>

        <motion.p
          className="mt-3 font-display text-2xl uppercase tracking-[0.25em] text-white sm:text-4xl"
          initial={{ opacity: 0, letterSpacing: "0.6em" }}
          animate={{ opacity: 1, letterSpacing: "0.25em" }}
          transition={{ duration: 1.2, delay: 1.0, ease }}
        >
          {EVENT.type}
        </motion.p>

        <motion.div
          className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 font-display text-lg uppercase tracking-wider sm:text-2xl"
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.12, delayChildren: 1.25 } } }}
        >
          {[EVENT.dateLabel, "•", EVENT.timeLabel].map((t, i) => (
            <motion.span
              key={i}
              className={t === "•" ? "text-blood" : "text-white/90"}
              variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.6, ease } } }}
            >
              {t}
            </motion.span>
          ))}
        </motion.div>

        <motion.div
          className="mt-5 animate-pulse-red rounded-md border border-blood bg-blood/15 px-4 py-2 font-display text-sm uppercase tracking-[0.25em] text-white sm:text-base"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 1.5, ease }}
        >
          ⚠ Only {capacity} people allowed
        </motion.div>

        <motion.div
          className="mt-7"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.65, ease }}
        >
          <Countdown />
        </motion.div>

        <motion.div
          className="mt-8 flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.85, ease }}
        >
          <a href="#register" className="btn btn-red w-full sm:w-auto">
            Book your ticket
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </a>
          <a href="#details" className="btn btn-ghost w-full sm:w-auto">
            View event details
          </a>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.1 }} className="mt-6">
          <SpotsCounter />
        </motion.div>
      </motion.div>

      <motion.a
        href="#details"
        aria-label="Scroll to details"
        className="absolute bottom-6 left-1/2 z-10 hidden -translate-x-1/2 flex-col items-center gap-2 text-white/50 sm:flex"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.4 }}
      >
        <span className="font-mono text-[10px] uppercase tracking-[0.4em]">Scroll</span>
        <span className="relative h-10 w-px overflow-hidden bg-white/15">
          <span className="absolute inset-x-0 top-0 h-1/2 bg-blood" style={{ animation: "scan 1.6s ease-in-out infinite" }} />
        </span>
      </motion.a>
    </section>
  );
}
