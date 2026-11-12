"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "framer-motion";
import { useEffect, useState } from "react";
import { Phone } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { useIntro } from "@/components/providers/IntroProvider";
import { useLenis } from "@/components/providers/SmoothScroll";
import { nav, site, whatsappLink, waMessages } from "@/lib/site";
import type { CatalogueIndex } from "@/lib/types";
import { cn } from "@/lib/utils";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";

const EASE = [0.76, 0, 0.24, 1] as const;

export function Header({ catalogue }: { catalogue: CatalogueIndex }) {
  const pathname = usePathname();
  const { introDone } = useIntro();
  const lenis = useLenis();
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);

  useMotionValueEvent(scrollY, "change", (y) => {
    const prev = scrollY.getPrevious() ?? 0;
    setScrolled(y > 40);
    setHidden(y > 320 && y > prev + 2 && !open);
    if (y < prev - 2) setHidden(false);
  });

  // Close the menu on route change.
  useEffect(() => {
    setOpen(false);
    setHidden(false);
  }, [pathname]);

  // Lock scroll while the mobile menu is open; close on Escape.
  useEffect(() => {
    if (!open) return;
    lenis?.stop();
    document.documentElement.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      lenis?.start();
      document.documentElement.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open, lenis]);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const solid = scrolled && !open;

  return (
    <>
      <motion.header
        className={cn(
          "fixed inset-x-0 top-0 z-50 transition-[background-color,color,border-color,backdrop-filter] duration-700",
          solid ? "border-b border-espresso/10 bg-ivory/85 text-espresso backdrop-blur-xl" : "border-b border-transparent bg-transparent text-ivory"
        )}
        initial={{ y: "-100%" }}
        animate={{ y: introDone && !hidden ? "0%" : "-100%" }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: introDone && !scrolled ? 0.6 : 0 }}
      >
        <div className={cn("container-luxe flex items-center justify-between transition-[height] duration-700", solid ? "h-18" : "h-22")}>
          <Link href="/" aria-label={`${site.name} — home`} className="relative z-10">
            <Logo />
          </Link>

          <nav aria-label="Main" className="hidden lg:block">
            <ul className="flex items-center gap-10">
              {nav.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={isActive(item.href) ? "page" : undefined}
                    className="link-underline pb-1 text-[0.72rem] font-semibold uppercase tracking-[0.24em]"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/quote"
              className={cn(
                "hidden border px-5 py-3 text-[0.68rem] font-semibold uppercase tracking-[0.22em] transition-colors duration-500 md:inline-flex",
                solid ? "border-espresso/30 hover:bg-espresso hover:text-ivory" : "border-ivory/50 hover:bg-ivory hover:text-espresso"
              )}
            >
              Request a Quote
            </Link>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls="mobile-menu"
              aria-label={open ? "Close menu" : "Open menu"}
              className="relative z-10 flex h-12 w-12 items-center justify-center lg:hidden"
            >
              <span className="relative block h-3 w-7">
                <motion.span
                  className="absolute left-0 top-0 h-px w-full bg-current"
                  animate={open ? { top: "50%", rotate: 45 } : { top: "0%", rotate: 0 }}
                  transition={{ duration: 0.5, ease: EASE }}
                />
                <motion.span
                  className="absolute bottom-0 right-0 h-px bg-current"
                  animate={open ? { bottom: "50%", rotate: -45, width: "100%" } : { bottom: "0%", rotate: 0, width: "65%" }}
                  transition={{ duration: 0.5, ease: EASE }}
                />
              </span>
            </button>
          </div>
        </div>
      </motion.header>

      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Site menu"
            className="grain fixed inset-0 z-40 flex flex-col overflow-y-auto bg-espresso text-ivory lg:hidden"
            initial={{ clipPath: "inset(0% 0% 100% 0%)" }}
            animate={{ clipPath: "inset(0% 0% 0% 0%)" }}
            exit={{ clipPath: "inset(0% 0% 100% 0%)", transition: { duration: 0.7, ease: EASE, delay: 0.15 } }}
            transition={{ duration: 0.8, ease: EASE }}
            data-lenis-prevent
          >
            <nav aria-label="Mobile" className="container-luxe flex flex-1 flex-col justify-center pb-10 pt-28">
              <ul className="space-y-1">
                {[...nav, { href: "/quote", label: "Request a Quote" }].map((item, i) => (
                  <li key={item.href} className="overflow-hidden">
                    <motion.div
                      initial={{ y: "100%" }}
                      animate={{ y: "0%" }}
                      exit={{ y: "100%", transition: { duration: 0.4, ease: EASE } }}
                      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.25 + i * 0.06 }}
                    >
                      <Link
                        href={item.href}
                        aria-current={isActive(item.href) ? "page" : undefined}
                        className="group flex items-baseline gap-4 py-1.5"
                      >
                        <span className="eyebrow w-6 text-gold/70">0{i + 1}</span>
                        <span className={cn("display text-[2.6rem] leading-tight transition-colors xs:text-5xl", isActive(item.href) ? "text-gold-light" : "group-hover:text-gold-light")}>
                          {item.label}
                        </span>
                      </Link>
                    </motion.div>
                  </li>
                ))}
              </ul>

              <motion.div
                className="mt-10 grid gap-6 border-t border-ivory/15 pt-8 text-sm text-ivory/75 sm:grid-cols-2"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8, delay: 0.7 }}
              >
                <div className="space-y-2">
                  <p className="eyebrow text-gold/80">Call</p>
                  {site.phones.map((p) => (
                    <a key={p.tel} href={`tel:${p.tel}`} className="flex items-center gap-2 hover:text-ivory">
                      <Phone className="h-4 w-4" strokeWidth={1.4} /> {p.display}
                    </a>
                  ))}
                </div>
                <div className="space-y-2">
                  <p className="eyebrow text-gold/80">WhatsApp</p>
                  <a href={whatsappLink(waMessages.general)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-ivory">
                    <WhatsAppIcon className="h-4 w-4" /> {site.whatsapp.display}
                  </a>
                  <p className="pt-2 text-ivory/55">Open {site.hours.label}</p>
                </div>
              </motion.div>

              <motion.ul
                className="mt-8 flex flex-wrap gap-x-4 gap-y-2 text-xs uppercase tracking-[0.18em] text-ivory/45"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8, delay: 0.85 }}
              >
                {catalogue.map((c) => (
                  <li key={c.slug}>
                    <Link href={`/collections/${c.slug}`} className="hover:text-ivory">
                      {c.name}
                    </Link>
                  </li>
                ))}
              </motion.ul>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
