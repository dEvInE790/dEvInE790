"use client";

import Link from "next/link";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useRef, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { Photo } from "./Photo";
import { SplitText } from "@/components/motion/SplitText";
import { useIntro } from "@/components/providers/IntroProvider";
import type { Img } from "@/lib/images";

const EASE = [0.22, 1, 0.36, 1] as const;

type Props = {
  eyebrow: string;
  title: string[];
  intro?: ReactNode;
  image: Img;
  crumbs?: { href: string; label: string }[];
  children?: ReactNode;
};

/** Cinematic header for inner pages: zoom-and-fade image, masked title, parallax on scroll. */
export function PageHero({ eyebrow, title, intro, image, crumbs, children }: Props) {
  const { introDone } = useIntro();
  const reduce = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const imgY = useTransform(scrollYProgress, [0, 1], ["0%", "22%"]);
  const contentY = useTransform(scrollYProgress, [0, 1], ["0%", "35%"]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  return (
    <section ref={ref} className="grain relative flex min-h-[78svh] items-end overflow-hidden bg-espresso text-ivory md:min-h-[86svh]">
      <motion.div className="absolute inset-0 will-change-transform" style={{ y: reduce ? 0 : imgY }}>
        <motion.div
          className="absolute inset-0"
          initial={{ scale: 1.25, opacity: 0 }}
          animate={introDone ? { scale: 1, opacity: 1 } : {}}
          transition={{ duration: 2.2, ease: EASE }}
        >
          <Photo src={image.src} alt={image.alt} fill priority sizes="100vw" className="object-cover" />
        </motion.div>
      </motion.div>
      <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-espresso via-espresso/55 to-espresso/30" />

      <motion.div className="container-luxe relative pb-16 pt-40 md:pb-24" style={reduce ? undefined : { y: contentY, opacity: contentOpacity }}>
        {crumbs && (
          <motion.nav
            aria-label="Breadcrumb"
            initial={{ opacity: 0 }}
            animate={introDone ? { opacity: 1 } : {}}
            transition={{ duration: 1, delay: 0.3 }}
            className="mb-8"
          >
            <ol className="flex flex-wrap items-center gap-2 text-[0.7rem] uppercase tracking-[0.2em] text-ivory/60">
              {crumbs.map((c, i) => (
                <li key={c.href} className="flex items-center gap-2">
                  {i > 0 && <ChevronRight className="h-3 w-3" aria-hidden />}
                  {i < crumbs.length - 1 ? (
                    <Link href={c.href} className="hover:text-ivory">
                      {c.label}
                    </Link>
                  ) : (
                    <span aria-current="page" className="text-ivory/90">
                      {c.label}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </motion.nav>
        )}
        <motion.p
          className="eyebrow mb-6 flex items-center gap-4 text-gold-light"
          initial={{ opacity: 0, y: 14 }}
          animate={introDone ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 1, ease: EASE, delay: 0.2 }}
        >
          <span className="rule" /> {eyebrow}
        </motion.p>
        <SplitText as="h1" lines={title} play={introDone} delay={0.3} className="display max-w-5xl text-[3rem] xs:text-6xl md:text-8xl lg:text-[7.5rem]" />
        {intro && (
          <motion.div
            className="mt-8 max-w-2xl text-base leading-relaxed text-ivory/75 md:text-lg"
            initial={{ opacity: 0, y: 20 }}
            animate={introDone ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 1.1, ease: EASE, delay: 0.8 }}
          >
            {intro}
          </motion.div>
        )}
        {children && (
          <motion.div
            className="mt-10"
            initial={{ opacity: 0, y: 20 }}
            animate={introDone ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 1.1, ease: EASE, delay: 1 }}
          >
            {children}
          </motion.div>
        )}
      </motion.div>
    </section>
  );
}
