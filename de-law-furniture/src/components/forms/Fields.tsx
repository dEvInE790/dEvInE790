"use client";

import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

type Base = { name: string; label: string; error?: string; hint?: ReactNode; optional?: boolean; className?: string };

function Wrapper({ name, label, error, hint, optional, className, children }: Base & { children: ReactNode }) {
  return (
    <div className={cn("relative", className)}>
      <label htmlFor={`f-${name}`} className="eyebrow flex items-center gap-2 text-espresso/80">
        {label}
        {optional ? <span className="normal-case tracking-normal text-taupe/80">(optional)</span> : <span aria-hidden className="text-gold-deep">*</span>}
      </label>
      {children}
      {hint && !error && (
        <p id={`f-${name}-hint`} className="mt-2 text-xs text-taupe">
          {hint}
        </p>
      )}
      <AnimatePresence>
        {error && (
          <motion.p
            id={`f-${name}-error`}
            role="alert"
            className="mt-2 text-xs font-medium text-[#a4442e]"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

const describedBy = (name: string, error?: string, hint?: ReactNode) =>
  [error ? `f-${name}-error` : null, hint && !error ? `f-${name}-hint` : null].filter(Boolean).join(" ") || undefined;

export function TextField({ name, label, error, hint, optional, className, ...rest }: Base & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <Wrapper {...{ name, label, error, hint, optional, className }}>
      <input
        id={`f-${name}`}
        name={name}
        className="field"
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(name, error, hint)}
        required={!optional}
        {...rest}
      />
    </Wrapper>
  );
}

export function TextArea({ name, label, error, hint, optional, className, ...rest }: Base & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <Wrapper {...{ name, label, error, hint, optional, className }}>
      <textarea
        id={`f-${name}`}
        name={name}
        rows={5}
        className="field resize-y"
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(name, error, hint)}
        required={!optional}
        {...rest}
      />
    </Wrapper>
  );
}

/** Hidden from people, tempting to bots. */
export function Honeypot() {
  return (
    <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
      <label>
        Company website
        <input type="text" name="company_website" tabIndex={-1} autoComplete="off" />
      </label>
    </div>
  );
}
