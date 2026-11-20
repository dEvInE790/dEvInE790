"use client";
import { AnimatePresence, motion } from "framer-motion";
import { useStatus } from "./useStatus";

export default function SpotsCounter({ className = "" }: { className?: string }) {
  const { status } = useStatus();
  if (!status) return null;
  const left = status.remaining;
  const pct = status.capacity ? Math.min(100, ((status.capacity - left) / status.capacity) * 100) : 100;
  return (
    <div className={`inline-flex items-center gap-3 rounded-full border border-blood/40 bg-black/50 px-4 py-2 backdrop-blur ${className}`}>
      <span className="relative flex h-2.5 w-2.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blood opacity-75" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-blood" />
      </span>
      <span className="font-mono text-xs uppercase tracking-[0.2em] text-white/80" aria-live="polite">
        {left > 0 ? (
          <>
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.b
                key={left}
                initial={{ y: -10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 10, opacity: 0 }}
                className="inline-block font-display text-base text-white"
              >
                {left}
              </motion.b>
            </AnimatePresence>{" "}
            / {status.capacity} spots left
          </>
        ) : (
          <b className="text-blood-400">Sold out</b>
        )}
      </span>
      <span className="hidden h-1 w-16 overflow-hidden rounded bg-white/10 sm:block">
        <motion.span className="block h-full bg-blood" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1 }} />
      </span>
    </div>
  );
}
