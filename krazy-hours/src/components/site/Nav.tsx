"use client";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "framer-motion";
import Link from "next/link";
import { useEffect, useState } from "react";

const links = [
  { href: "#details", label: "Details" },
  { href: "#expect", label: "What to expect" },
  { href: "#tickets", label: "Tickets" },
  { href: "#sponsors", label: "Sponsors" },
];

export default function Nav() {
  const { scrollY } = useScroll();
  const [solid, setSolid] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);

  useMotionValueEvent(scrollY, "change", (y) => {
    const prev = scrollY.getPrevious() ?? 0;
    setSolid(y > 40);
    setHidden(y > 400 && y > prev && !open);
  });

  useEffect(() => {
    document.documentElement.style.overflow = open ? "hidden" : "";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <motion.header
        className={`fixed inset-x-0 top-0 z-50 transition-colors duration-500 ${
          solid ? "border-b border-white/5 bg-ink/70 backdrop-blur-xl" : "bg-transparent"
        }`}
        animate={{ y: hidden ? "-100%" : "0%" }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      >
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6" aria-label="Main">
          <a href="#top" className="group flex items-center gap-2" aria-label="Krazy Hours home">
            <span className="font-graffiti text-2xl text-blood transition-transform group-hover:-rotate-6">KH</span>
            <span className="hidden font-display text-sm uppercase tracking-[0.3em] text-white/80 sm:inline">Krazy Hours</span>
          </a>
          <ul className="hidden items-center gap-8 md:flex">
            {links.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  className="group relative font-mono text-[11px] uppercase tracking-[0.25em] text-white/70 transition-colors hover:text-white"
                >
                  {l.label}
                  <span className="absolute -bottom-1 left-0 h-px w-0 bg-blood transition-all duration-300 group-hover:w-full" />
                </a>
              </li>
            ))}
            <li>
              <Link href="/ticket" className="font-mono text-[11px] uppercase tracking-[0.25em] text-white/70 hover:text-white">
                My ticket
              </Link>
            </li>
          </ul>
          <div className="flex items-center gap-2">
            <a href="#tickets" className="btn btn-red !min-h-[40px] !px-5 !text-sm">
              Book
            </a>
            <button
              type="button"
              className="relative flex h-11 w-11 items-center justify-center rounded-full border border-white/15 md:hidden"
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              onClick={() => setOpen((o) => !o)}
            >
              <motion.span className="absolute h-[2px] w-5 bg-white" animate={open ? { rotate: 45, y: 0 } : { rotate: 0, y: -4 }} />
              <motion.span className="absolute h-[2px] w-5 bg-white" animate={open ? { rotate: -45, y: 0 } : { rotate: 0, y: 4 }} />
            </button>
          </div>
        </nav>
      </motion.header>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-40 flex flex-col justify-between bg-ink px-6 pb-10 pt-24 md:hidden"
            initial={{ clipPath: "circle(0% at 100% 0%)" }}
            animate={{ clipPath: "circle(150% at 100% 0%)" }}
            exit={{ clipPath: "circle(0% at 100% 0%)" }}
            transition={{ duration: 0.6, ease: [0.76, 0, 0.24, 1] }}
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_10%,rgba(225,6,0,.3),transparent_55%)]" />
            <motion.ul
              className="relative space-y-2"
              initial="hidden"
              animate="show"
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: 0.2 } } }}
            >
              {[...links, { href: "/ticket", label: "My ticket" }].map((l) => (
                <motion.li
                  key={l.href}
                  variants={{ hidden: { opacity: 0, x: -30 }, show: { opacity: 1, x: 0 } }}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                >
                  <a
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className="block py-1 font-display text-5xl uppercase text-white transition-colors active:text-blood"
                  >
                    {l.label}
                  </a>
                </motion.li>
              ))}
            </motion.ul>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="relative space-y-4">
              <a href="#tickets" onClick={() => setOpen(false)} className="btn btn-red w-full">
                Book your ticket
              </a>
              <p className="text-center font-mono text-[10px] uppercase tracking-[0.3em] text-white/40">
                Dec 17 · 10PM–5AM · Isheri
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
