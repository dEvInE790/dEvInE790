"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const LenisContext = createContext<Lenis | null>(null);
export const useLenis = () => useContext(LenisContext);

/**
 * Inertia-based smooth scrolling (Lenis) kept in sync with GSAP ScrollTrigger.
 * Disabled for visitors who prefer reduced motion and on touch-first devices,
 * where native scrolling already feels best.
 */
export function SmoothScroll({ children }: { children: ReactNode }) {
  const [lenis, setLenis] = useState<Lenis | null>(null);
  const rafCb = useRef<((time: number) => void) | null>(null);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    if (reduce || coarse) return;

    const instance = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      anchors: { offset: -96 },
    });
    instance.on("scroll", ScrollTrigger.update);
    rafCb.current = (time: number) => instance.raf(time * 1000);
    gsap.ticker.add(rafCb.current);
    gsap.ticker.lagSmoothing(0);
    setLenis(instance);

    return () => {
      if (rafCb.current) gsap.ticker.remove(rafCb.current);
      instance.destroy();
      setLenis(null);
    };
  }, []);

  return <LenisContext.Provider value={lenis}>{children}</LenisContext.Provider>;
}
