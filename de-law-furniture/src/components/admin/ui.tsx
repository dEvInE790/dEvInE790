"use client";

import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { btn } from "./styles";

export { btn };


export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn("border border-espresso/10 bg-white p-5 sm:p-7", className)}>{children}</section>;
}

export function PageTitle({ title, intro, actions }: { title: string; intro?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="display text-4xl text-espresso sm:text-5xl">{title}</h1>
        {intro && <p className="mt-2 max-w-2xl text-sm text-taupe">{intro}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

type FieldProps = { label: string; hint?: ReactNode; className?: string; children: ReactNode; htmlFor?: string };
export function Field({ label, hint, className, children, htmlFor }: FieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-xs font-semibold uppercase tracking-[0.14em] text-espresso/80">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-taupe">{hint}</p>}
    </div>
  );
}

const inputCls = "w-full border border-espresso/20 bg-white px-3 py-2.5 text-[0.95rem] text-charcoal outline-none transition-colors focus:border-espresso";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(inputCls, props.className)} />;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={4} {...props} className={cn(inputCls, "resize-y", props.className)} />;
}

export function Select({ children, ...props }: InputHTMLAttributes<HTMLSelectElement> & { children: ReactNode }) {
  return (
    <select {...(props as React.SelectHTMLAttributes<HTMLSelectElement>)} className={cn(inputCls, "pr-8", props.className)}>
      {children}
    </select>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-3 text-sm text-espresso">
      <span className="relative inline-flex">
        <input type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="h-6 w-11 rounded-full bg-espresso/20 transition-colors peer-checked:bg-[#1f7a4d] peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-gold-deep" />
        <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
      </span>
      {label}
    </label>
  );
}

export function Button({ variant = "primary", className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof btn }) {
  return <button type="button" {...props} className={cn(btn[variant], className)} />;
}

export function Notice({ tone = "info", children }: { tone?: "info" | "error" | "success"; children: ReactNode }) {
  const styles = {
    info: "border-espresso/15 bg-cream/60 text-espresso",
    error: "border-[#a4442e]/30 bg-[#a4442e]/5 text-[#7a2f1f]",
    success: "border-[#1f7a4d]/30 bg-[#1f7a4d]/5 text-[#1f5c3d]",
  };
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cn("border px-4 py-3 text-sm", styles[tone])}>
      {children}
    </div>
  );
}
