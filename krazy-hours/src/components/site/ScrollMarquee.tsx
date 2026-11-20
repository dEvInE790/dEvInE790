"use client";
import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/**
 * Huge typography that slides with the scroll (GSAP ScrollTrigger, scrubbed).
 * Two rows travel in opposite directions.
 */
export default function ScrollMarquee({ rows }: { rows: [string, string] }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".mq-a",
        { xPercent: 0 },
        { xPercent: -30, ease: "none", scrollTrigger: { trigger: root.current, start: "top bottom", end: "bottom top", scrub: 0.6 } },
      );
      gsap.fromTo(
        ".mq-b",
        { xPercent: -30 },
        { xPercent: 0, ease: "none", scrollTrigger: { trigger: root.current, start: "top bottom", end: "bottom top", scrub: 0.6 } },
      );
      gsap.fromTo(
        ".mq-skew",
        { skewY: 4 },
        { skewY: -4, ease: "none", scrollTrigger: { trigger: root.current, start: "top bottom", end: "bottom top", scrub: true } },
      );
    }, root);
    return () => ctx.revert();
  }, []);

  const repeat = (t: string) => Array.from({ length: 4 }, () => t).join("  ✦  ");

  return (
    <div ref={root} className="relative overflow-hidden border-y border-white/5 bg-ink py-6 sm:py-10" aria-hidden>
      <div className="mq-skew">
        <p className="mq-a whitespace-nowrap font-display text-[16vw] uppercase leading-none text-blood sm:text-[10vw]">
          {repeat(rows[0])}
        </p>
        <p className="mq-b stroke-text whitespace-nowrap font-display text-[16vw] uppercase leading-none sm:text-[10vw]">
          {repeat(rows[1])}
        </p>
      </div>
    </div>
  );
}
