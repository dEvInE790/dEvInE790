"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useLenis } from "./SmoothScroll";

type Phase = "idle" | "covering" | "covered" | "revealing";

const TransitionContext = createContext<{ navigate: (href: string) => void }>({ navigate: () => {} });
export const usePageTransition = () => useContext(TransitionContext);

const EASE = [0.76, 0, 0.24, 1] as const;

/**
 * Premium page transitions: an espresso curtain rises to cover the page,
 * the route changes behind it, then the curtain continues upward to reveal
 * the new page. Internal <a> clicks are intercepted globally, so every
 * link on the site gets the transition without special components.
 */
export function PageTransitionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const lenis = useLenis();
  const [phase, setPhase] = useState<Phase>("idle");
  const pendingHref = useRef<string | null>(null);
  const fallbackTimer = useRef<number | undefined>(undefined);
  const fromPath = useRef<string>("");

  const navigate = useCallback(
    (href: string) => {
      const url = new URL(href, window.location.href);
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      // Same page (e.g. only the query string changes) or reduced motion: navigate directly.
      if (url.pathname === window.location.pathname || reduce || phase !== "idle") {
        router.push(url.pathname + url.search + url.hash);
        return;
      }
      pendingHref.current = url.pathname + url.search + url.hash;
      fromPath.current = window.location.pathname;
      setPhase("covering");
    },
    [router, phase]
  );

  // Intercept internal link clicks (capture phase runs before Next's <Link> handler).
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const anchor = (e.target as Element | null)?.closest?.("a");
      if (!anchor || !anchor.href) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download") || anchor.dataset.noTransition !== undefined) return;
      const url = new URL(anchor.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname) return; // same-page anchors/query: let Next/Lenis handle
      e.preventDefault();
      e.stopPropagation();
      navigate(url.pathname + url.search + url.hash);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [navigate]);

  // When the new route has rendered behind the curtain, reveal it.
  useEffect(() => {
    if (phase !== "covered" || pathname === fromPath.current) return;
    window.clearTimeout(fallbackTimer.current);
    lenis?.scrollTo(0, { immediate: true, force: true });
    window.scrollTo(0, 0);
    const t = window.setTimeout(() => setPhase("revealing"), 80);
    return () => window.clearTimeout(t);
  }, [pathname, phase, lenis]);

  useEffect(() => {
    const t = window.setTimeout(() => ScrollTrigger.refresh(), 400);
    return () => window.clearTimeout(t);
  }, [pathname]);

  const onCovered = () => {
    const href = pendingHref.current;
    pendingHref.current = null;
    if (href) {
      router.push(href, { scroll: true });
      // If navigation stalls or fails, never leave the visitor behind a curtain.
      fallbackTimer.current = window.setTimeout(() => setPhase("revealing"), 5000);
    }
    setPhase("covered");
  };

  return (
    <TransitionContext.Provider value={{ navigate }}>
      {children}
      <AnimatePresence>
        {phase !== "idle" && (
          <motion.div
            key="curtain"
            aria-hidden
            className="pointer-events-auto fixed inset-0 z-[90] flex items-center justify-center bg-espresso"
            initial={{ y: "100%" }}
            animate={phase === "revealing" ? { y: "-100%" } : { y: "0%" }}
            transition={{ duration: 0.65, ease: EASE }}
            onAnimationComplete={() => {
              if (phase === "covering") onCovered();
              else if (phase === "revealing") setPhase("idle");
            }}
          >
            <motion.span
              className="display text-3xl tracking-[0.2em] text-gold-light"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: phase === "revealing" ? 0 : 1, y: 0 }}
              transition={{ duration: 0.4, delay: phase === "covering" ? 0.2 : 0 }}
            >
              DE. LAW
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>
    </TransitionContext.Provider>
  );
}
