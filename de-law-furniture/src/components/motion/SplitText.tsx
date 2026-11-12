"use client";

import { motion, type Variants } from "framer-motion";
import { Fragment, type ElementType } from "react";

const EASE = [0.22, 1, 0.36, 1] as const;

type SplitTextProps = {
  /** Each entry renders as its own line */
  lines: string[];
  as?: ElementType;
  className?: string;
  lineClassName?: string;
  delay?: number;
  stagger?: number;
  /** When provided, animation is driven by this flag instead of viewport entry */
  play?: boolean;
  id?: string;
};

/**
 * Editorial headline reveal: each word rises from behind a mask, staggered.
 * The viewport trigger sits on the (unclipped) line, so the words — hidden
 * inside their masks — still animate reliably. Screen readers get the full
 * sentence as one string.
 */
export function SplitText({ lines, as: Tag = "h2", className, lineClassName, delay = 0, stagger = 0.08, play, id }: SplitTextProps) {
  const controlled = play !== undefined;
  const word: Variants = {
    hidden: { y: "110%", rotate: 4 },
    show: (i: number) => ({ y: "0%", rotate: 0, transition: { duration: 1.15, ease: EASE, delay: delay + i * stagger } }),
  };
  let wordIndex = 0;
  return (
    <Tag id={id} className={className} aria-label={lines.join(" ")}>
      {lines.map((line, li) => (
        <motion.span
          key={li}
          aria-hidden
          className={lineClassName ?? "block"}
          initial="hidden"
          {...(controlled ? { animate: play ? "show" : "hidden" } : { whileInView: "show", viewport: { once: true, amount: 0.3 } })}
        >
          {line.split(" ").map((w, wi, arr) => {
            const i = wordIndex++;
            return (
              <Fragment key={wi}>
                <span className="-mb-[0.2em] inline-block overflow-hidden pb-[0.2em] align-bottom">
                  <motion.span className="inline-block will-change-transform" variants={word} custom={i}>
                    {w}
                  </motion.span>
                </span>
                {wi < arr.length - 1 && " "}
              </Fragment>
            );
          })}
        </motion.span>
      ))}
    </Tag>
  );
}
