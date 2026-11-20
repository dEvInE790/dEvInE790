"use client";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { EVENT } from "@/lib/event";

function diff(target: number) {
  const ms = Math.max(target - Date.now(), 0);
  return {
    done: ms === 0,
    d: Math.floor(ms / 86400000),
    h: Math.floor(ms / 3600000) % 24,
    m: Math.floor(ms / 60000) % 60,
    s: Math.floor(ms / 1000) % 60,
  };
}

function Digit({ value, label }: { value: number; label: string }) {
  const v = String(value).padStart(2, "0");
  return (
    <div className="flex flex-col items-center">
      <div className="relative h-[2.6rem] w-[3.3rem] overflow-hidden rounded-xl border border-white/10 bg-black/50 backdrop-blur sm:h-14 sm:w-[4.2rem]">
        <AnimatePresence initial={false} mode="popLayout">
          <motion.span
            key={v}
            initial={{ y: "-100%", opacity: 0 }}
            animate={{ y: "0%", opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-0 flex items-center justify-center font-display text-2xl tabular-nums text-white sm:text-3xl"
          >
            {v}
          </motion.span>
        </AnimatePresence>
      </div>
      <span className="mt-1.5 font-mono text-[9px] uppercase tracking-[0.3em] text-white/50">{label}</span>
    </div>
  );
}

export default function Countdown({ compact = false }: { compact?: boolean }) {
  const target = new Date(EVENT.startsAt).getTime();
  const [t, setT] = useState<ReturnType<typeof diff> | null>(null);

  useEffect(() => {
    setT(diff(target));
    const id = setInterval(() => setT(diff(target)), 1000);
    return () => clearInterval(id);
  }, [target]);

  if (t?.done) {
    const over = Date.now() > new Date(EVENT.endsAt).getTime();
    return (
      <p className="font-display text-xl uppercase tracking-widest text-blood-400">
        {over ? "That was KRAZY. See you next time." : "● We're live right now"}
      </p>
    );
  }
  const vals = t ?? { d: 0, h: 0, m: 0, s: 0 };
  return (
    <div className={`flex items-start gap-2 sm:gap-3 ${compact ? "scale-90" : ""}`} role="timer" aria-label="Countdown to December 17, 4 PM">
      <Digit value={vals.d} label="Days" />
      <span className="pt-2 font-display text-2xl text-blood sm:pt-3">:</span>
      <Digit value={vals.h} label="Hrs" />
      <span className="pt-2 font-display text-2xl text-blood sm:pt-3">:</span>
      <Digit value={vals.m} label="Min" />
      <span className="pt-2 font-display text-2xl text-blood sm:pt-3">:</span>
      <Digit value={vals.s} label="Sec" />
    </div>
  );
}
