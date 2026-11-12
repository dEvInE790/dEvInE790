"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle } from "lucide-react";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";
import { ButtonLink } from "@/components/ui/Button";
import { site } from "@/lib/site";
import type { SubmitState } from "./useEnquiry";

/** Honest failure / unavailable notice with a WhatsApp fallback carrying the visitor's details. */
export function FormProblem({ state }: { state: SubmitState }) {
  const show = state.status === "unavailable" || state.status === "error";
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          role="alert"
          className="border border-[#a4442e]/30 bg-[#a4442e]/5 p-6"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
        >
          <div className="flex gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#a4442e]" strokeWidth={1.5} aria-hidden />
            <div>
              <p className="font-semibold text-espresso">{state.status === "unavailable" ? "Online submission is unavailable" : "Your enquiry was not sent"}</p>
              <p className="mt-1 text-sm leading-relaxed text-taupe">
                {"message" in state && state.message} You can send the same details to us on WhatsApp in one tap, or call {site.phones[0].display}.
              </p>
              {"whatsapp" in state && (
                <ButtonLink href={state.whatsapp} variant="solid" className="mt-5" icon={<WhatsAppIcon className="h-4 w-4" />}>
                  Send via WhatsApp
                </ButtonLink>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function FormSuccess({ title, name, phone, reference, children }: { title: string; name: string; phone: string; reference: string; children?: React.ReactNode }) {
  const first = name.trim().split(/\s+/)[0];
  return (
    <motion.div
      role="status"
      aria-live="polite"
      className="flex flex-col items-start py-10"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
    >
      <svg viewBox="0 0 80 80" className="h-20 w-20 text-gold-deep" aria-hidden>
        <motion.circle cx="40" cy="40" r="38" fill="none" stroke="currentColor" strokeWidth="1.2" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.1, ease: "easeInOut" }} />
        <motion.path d="M25 41l10 10 20-22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.7, delay: 0.9, ease: "easeOut" }} />
      </svg>
      <h2 className="display mt-8 text-4xl text-espresso md:text-5xl">Thank you, {first}.</h2>
      <p className="mt-4 max-w-lg text-base leading-relaxed text-taupe md:text-lg">{title}</p>
      <p className="mt-3 max-w-lg text-sm leading-relaxed text-taupe">
        Our team will contact you on <strong className="text-espresso">{phone}</strong> during opening hours ({site.hours.label}).
      </p>
      {reference && <p className="eyebrow mt-6 text-gold-deep">Reference {reference}</p>}
      {children && <div className="mt-10 flex flex-wrap gap-3">{children}</div>}
    </motion.div>
  );
}
