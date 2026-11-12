"use client";

import { AnimatePresence, motion } from "framer-motion";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";
import { useIntro } from "@/components/providers/IntroProvider";
import { findProduct, categoryBySlug } from "@/lib/catalogue";
import { whatsappLink, waMessages } from "@/lib/site";

/** Builds a context-aware WhatsApp message based on the page being viewed. */
function messageFor(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] === "collections" && parts[1] && parts[2]) {
    const found = findProduct(parts[1], parts[2]);
    if (found) return waMessages.product(found.product.name, found.category.name);
  }
  if (parts[0] === "collections" && parts[1]) {
    const c = categoryBySlug(parts[1]);
    if (c) return waMessages.category(c.name);
  }
  if (parts[0] === "quote") return waMessages.custom;
  return waMessages.general;
}

export function WhatsAppFloat() {
  const pathname = usePathname();
  const { introDone } = useIntro();
  const [hint, setHint] = useState(false);

  useEffect(() => {
    if (!introDone) return;
    const show = window.setTimeout(() => setHint(true), 4000);
    const hide = window.setTimeout(() => setHint(false), 10000);
    return () => {
      window.clearTimeout(show);
      window.clearTimeout(hide);
    };
  }, [introDone]);

  return (
    <motion.div
      className="fixed bottom-5 right-5 z-[60] flex items-center gap-3 md:bottom-8 md:right-8"
      initial={{ opacity: 0, scale: 0.6 }}
      animate={introDone ? { opacity: 1, scale: 1 } : {}}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 1.2 }}
    >
      <AnimatePresence>
        {hint && (
          <motion.span
            className="hidden bg-ivory px-4 py-2.5 text-xs font-medium text-espresso shadow-lg shadow-espresso/10 sm:block"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 12 }}
            transition={{ duration: 0.5 }}
          >
            Chat with us on WhatsApp
          </motion.span>
        )}
      </AnimatePresence>
      <a
        href={whatsappLink(messageFor(pathname))}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat with DE. LAW FURNITURE LTD on WhatsApp"
        onMouseEnter={() => setHint(true)}
        onMouseLeave={() => setHint(false)}
        className="relative flex h-14 w-14 items-center justify-center rounded-full bg-[#1f7a4d] text-white shadow-xl shadow-espresso/25 transition-transform duration-500 hover:scale-105 md:h-16 md:w-16"
      >
        <span aria-hidden className="absolute inset-0 rounded-full bg-[#1f7a4d] [animation:wa-pulse_2.6s_ease-out_infinite]" />
        <WhatsAppIcon className="relative h-7 w-7" />
      </a>
    </motion.div>
  );
}
