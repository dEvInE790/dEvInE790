"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useIntro } from "@/components/providers/IntroProvider";

const EASE = [0.22, 1, 0.36, 1] as const;
const STORAGE_KEY = "dl-intro-seen";
const BRAND = "DE. LAW";

/**
 * Cinematic opening sequence: the wordmark rises letter by letter, a champagne
 * hairline draws across, then the panel lifts away to reveal the page.
 * Plays in full once per browser session (~2.4s); afterwards, and for
 * reduced-motion visitors, it simply fades out.
 */
export function Loader() {
  const { setIntroDone } = useIntro();
  const [mode, setMode] = useState<"full" | "quick" | null>(null);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem(STORAGE_KEY) === "1";
      sessionStorage.setItem(STORAGE_KEY, "1");
    } catch {}
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const quick = seen || reduce;
    setMode(quick ? "quick" : "full");
    document.documentElement.style.overflow = "hidden";

    const exitAt = quick ? 150 : 2300;
    const t1 = window.setTimeout(() => setVisible(false), exitAt);
    const t2 = window.setTimeout(() => setIntroDone(true), exitAt + (quick ? 100 : 350));
    const t3 = window.setTimeout(() => (document.documentElement.style.overflow = ""), exitAt + 600);
    return () => {
      [t1, t2, t3].forEach(window.clearTimeout);
      document.documentElement.style.overflow = "";
    };
  }, [setIntroDone]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          id="intro-loader"
          role="status"
          aria-label="Loading DE. LAW FURNITURE LTD"
          className="grain fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden bg-espresso text-ivory"
          initial={{ clipPath: "inset(0% 0% 0% 0%)" }}
          exit={
            mode === "quick"
              ? { opacity: 0, transition: { duration: 0.35 } }
              : { clipPath: "inset(0% 0% 100% 0%)", transition: { duration: 1.05, ease: [0.76, 0, 0.24, 1] } }
          }
        >
          {mode === "full" && (
            <>
              <motion.p
                className="eyebrow mb-6 text-gold-light/80"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.9, ease: EASE, delay: 0.15 }}
              >
                Est. 2015 · Lagos
              </motion.p>

              <h1 className="display flex overflow-hidden text-[18vw] leading-none sm:text-8xl md:text-9xl" aria-hidden>
                {BRAND.split("").map((ch, i) => (
                  <motion.span
                    key={i}
                    className="inline-block"
                    initial={{ y: "105%" }}
                    animate={{ y: "0%" }}
                    exit={{ y: "-40%", opacity: 0 }}
                    transition={{ duration: 1, ease: EASE, delay: 0.25 + i * 0.06 }}
                  >
                    {ch === " " ? " " : ch}
                  </motion.span>
                ))}
              </h1>

              <motion.span
                aria-hidden
                className="mt-6 block h-px w-48 origin-left bg-gold sm:w-72"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 1.1, ease: [0.76, 0, 0.24, 1], delay: 0.75 }}
              />

              <motion.p
                className="eyebrow mt-6 tracking-[0.6em] text-ivory/80"
                initial={{ opacity: 0, letterSpacing: "0.9em" }}
                animate={{ opacity: 1, letterSpacing: "0.6em" }}
                transition={{ duration: 1.3, ease: EASE, delay: 1.0 }}
              >
                Furniture Ltd
              </motion.p>

              <motion.p
                className="display absolute bottom-8 left-1/2 w-max -translate-x-1/2 text-lg italic text-ivory/60"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1, delay: 1.3 }}
              >
                Crafting Comfort. Defining Spaces.
              </motion.p>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
