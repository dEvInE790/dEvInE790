"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { useIntro } from "@/components/providers/IntroProvider";

/** Fade-up for above-the-fold content, timed to start once the intro loader lifts. */
export function HeroReveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  const { introDone } = useIntro();
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 30 }}
      animate={introDone ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay }}
    >
      {children}
    </motion.div>
  );
}
