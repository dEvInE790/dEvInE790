"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { Photo } from "@/components/ui/Photo";
import type { Img } from "@/lib/images";
import { cn } from "@/lib/utils";

type ClipImageProps = {
  image: Img;
  className?: string;
  sizes?: string;
  priority?: boolean;
  /** Direction the mask opens from */
  from?: "bottom" | "left" | "right" | "top";
  /** Parallax travel in % of the image height (0 disables) */
  parallax?: number;
  delay?: number;
  label?: string;
};

const clipFrom = {
  bottom: "inset(100% 0% 0% 0%)",
  top: "inset(0% 0% 100% 0%)",
  left: "inset(0% 100% 0% 0%)",
  right: "inset(0% 0% 0% 100%)",
};

/**
 * Image revealed through an animated clip-path mask, with a gentle scale-down
 * and optional scroll parallax for depth. Transforms only — GPU friendly.
 */
export function ClipImage({ image, className, sizes = "(min-width: 1024px) 50vw, 100vw", priority, from = "bottom", parallax = 10, delay = 0, label }: ClipImageProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [`-${parallax}%`, `${parallax}%`]);

  // The viewport trigger lives on an unclipped wrapper: an element hidden by its
  // own clip-path never reports itself as "in view".
  return (
    <motion.div ref={ref} className={cn("relative", className)} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.15 }}>
      <motion.div
        className="absolute inset-0 overflow-hidden bg-cream"
        variants={{
          hidden: { clipPath: reduce ? "inset(0% 0% 0% 0%)" : clipFrom[from] },
          show: { clipPath: "inset(0% 0% 0% 0%)", transition: { duration: 1.4, ease: [0.76, 0, 0.24, 1], delay } },
        }}
      >
        <motion.div
          className="absolute inset-x-0 will-change-transform"
          style={{
            y: reduce || !parallax ? 0 : y,
            top: parallax ? `-${parallax}%` : 0,
            bottom: parallax ? `-${parallax}%` : 0,
          }}
        >
          <motion.div
            className="absolute inset-0"
            variants={{ hidden: { scale: 1.25 }, show: { scale: 1, transition: { duration: 1.8, ease: [0.22, 1, 0.36, 1], delay } } }}
          >
            <Photo src={image.src} alt={image.alt} fill sizes={sizes} priority={priority} className="object-cover" label={label} />
          </motion.div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
