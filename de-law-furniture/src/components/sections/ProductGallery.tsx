"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useState } from "react";
import { Photo } from "@/components/ui/Photo";
import { useIntro } from "@/components/providers/IntroProvider";
import type { Img } from "@/lib/images";
import { cn } from "@/lib/utils";

export function ProductGallery({ images: given, name }: { images: Img[]; name: string }) {
  const images = given.length ? given : [{ src: "", alt: name }];
  const [active, setActive] = useState(0);
  const { introDone } = useIntro();
  const reduce = useReducedMotion();
  return (
    <div>
      <motion.div
        className="relative aspect-[4/5] overflow-hidden bg-espresso-soft md:aspect-[5/6]"
        initial={reduce ? false : { clipPath: "inset(100% 0% 0% 0%)" }}
        animate={introDone ? { clipPath: "inset(0% 0% 0% 0%)" } : {}}
        transition={{ duration: 1.4, ease: [0.76, 0, 0.24, 1], delay: 0.2 }}
      >
        <AnimatePresence initial={false} mode="popLayout">
          <motion.div
            key={active}
            className="absolute inset-0"
            initial={{ opacity: 0, scale: 1.08 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          >
            <Photo src={images[active].src} alt={images[active].alt} fill priority={active === 0} sizes="(min-width: 1024px) 55vw, 100vw" className="object-cover" label={name} />
          </motion.div>
        </AnimatePresence>
      </motion.div>
      {images.length > 1 && (
        <div className="mt-4 flex gap-3" role="group" aria-label={`${name} photographs`}>
          {images.map((img, i) => (
            <button
              key={img.src + i}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`Show photograph ${i + 1} of ${images.length}`}
              aria-pressed={active === i}
              className={cn(
                "relative h-20 w-16 overflow-hidden bg-espresso-soft transition-all duration-500 md:h-24 md:w-20",
                active === i ? "opacity-100 ring-1 ring-gold ring-offset-2 ring-offset-espresso" : "opacity-50 hover:opacity-90"
              )}
            >
              <Photo src={img.src} alt="" fill sizes="80px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
