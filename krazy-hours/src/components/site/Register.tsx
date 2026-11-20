"use client";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { naira } from "@/lib/event";
import { useStatus } from "./useStatus";
import { Eyebrow, SplitHeading } from "./Reveal";

const ease = [0.16, 1, 0.3, 1] as const;
export const LS_KEY = "kh_registration";
export type SavedRegistration = { code: string; k: string };

export function saveRegistration(r: SavedRegistration) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(r));
  } catch {}
  window.dispatchEvent(new CustomEvent<SavedRegistration>("kh:registration", { detail: r }));
}
export function loadRegistration(): SavedRegistration | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as SavedRegistration) : null;
  } catch {
    return null;
  }
}

function validPhone(v: string) {
  const d = v.replace(/[^\d+]/g, "");
  if (/^\+(?!234)\d{8,15}$/.test(d)) return true;
  let x = d.startsWith("+") ? d.slice(1) : d;
  if (x.startsWith("234")) x = x.slice(3);
  if (x.startsWith("0")) x = x.slice(1);
  return /^[789][01]\d{8}$/.test(x);
}

type Done = { bookingCode: string; k: string; amount: number; category: string; fullName: string };

export default function Register() {
  const { status, error: statusError, refresh } = useStatus();
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [form, setForm] = useState({ fullName: "", phone: "", email: "", website: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<Done | null>(null);
  const [hasSaved, setHasSaved] = useState(false);

  useEffect(() => setHasSaved(!!loadRegistration()), []);

  const categories = status?.categories ?? [];
  const category = categories.find((c) => c.id === categoryId) ?? null;
  const full = !!status && status.remaining <= 0;
  const closed = !!status && !status.bookings_open;

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setErrors((er) => ({ ...er, [k]: "" }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    const er: Record<string, string> = {};
    if (!categoryId) er.categoryId = "Choose Girls or Boys";
    if (form.fullName.trim().length < 2 || !/^[\p{L}][\p{L} .'-]+$/u.test(form.fullName.trim())) er.fullName = "Enter your full name";
    if (!validPhone(form.phone)) er.phone = "Enter a valid phone number, e.g. 0814 000 0000";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) er.email = "Enter a valid email address";
    setErrors(er);
    if (Object.keys(er).length) return;

    setSubmitting(true);
    setServerError(null);
    try {
      const r = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId, ...form }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        setServerError(d.error ?? "Something went wrong. Please try again.");
        if (d.fieldErrors) setErrors(d.fieldErrors);
        if (r.status === 409) refresh();
        return;
      }
      setDone(d);
      saveRegistration({ code: d.bookingCode, k: d.k });
      setHasSaved(true);
      refresh();
    } catch {
      setServerError("Network error — check your connection and try again. You are not registered yet.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="register" className="relative scroll-mt-16 overflow-hidden px-4 py-24 sm:px-6 sm:py-32">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,rgba(225,6,0,.18),transparent)]" />
      <div className="relative mx-auto max-w-3xl">
        <Eyebrow>Step 1 · Register</Eyebrow>
        <SplitHeading text="REGISTER YOUR SPOT" accent="SPOT" className="font-display text-5xl uppercase leading-[0.95] sm:text-7xl" />
        <p className="mt-4 max-w-xl text-white/60">
          Only {status?.capacity ?? 35} people can register. Once you&apos;re in, head to payment to confirm your ticket.
        </p>

        {status && (
          <div className="mt-6 max-w-md">
            <div className="flex justify-between font-mono text-[11px] uppercase tracking-[0.2em] text-white/60">
              <span>
                <b className="text-white">{status.registered}</b> / {status.capacity} registered
              </span>
              <span className={status.remaining <= 5 ? "text-blood-400" : ""}>{status.remaining} left</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-blood-700 to-blood shadow-glow-sm"
                initial={{ width: 0 }}
                whileInView={{ width: `${Math.min(100, (status.registered / Math.max(status.capacity, 1)) * 100)}%` }}
                viewport={{ once: true }}
                transition={{ duration: 1.2, ease }}
              />
            </div>
          </div>
        )}

        <div className="border-anim mt-8 rounded-[28px] bg-ink-800/90 p-5 backdrop-blur sm:p-8">
          {!status ? (
            <div className="py-10 text-center text-white/60">
              {statusError ? "Registration is temporarily unavailable. Please refresh in a moment." : "Loading…"}
            </div>
          ) : (
            <AnimatePresence mode="wait">
              {done ? (
                <motion.div key="done" className="py-4 text-center" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, ease }}>
                  <div className="relative mx-auto h-24 w-24">
                    <motion.span className="absolute inset-0 rounded-full border-2 border-blood" initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: [0.4, 1.25, 1], opacity: 1 }} transition={{ duration: 0.7 }} />
                    <motion.span className="absolute inset-0 rounded-full border border-blood/40" animate={{ scale: [1, 1.6], opacity: [0.8, 0] }} transition={{ duration: 1.8, repeat: Infinity }} />
                    <svg viewBox="0 0 24 24" className="absolute inset-[24%]" fill="none" stroke="#e10600" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <motion.path d="M5 12.5l4.5 4.5L19 7.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.6, delay: 0.35 }} />
                    </svg>
                  </div>
                  <h3 className="mt-6 font-display text-3xl uppercase">You&apos;re registered, {done.fullName.split(" ")[0]}!</h3>
                  <p className="mx-auto mt-2 max-w-md text-white/65">
                    Your spot is held. Pay <b className="text-white">{naira(done.amount)}</b> to confirm your {done.category} ticket.
                  </p>
                  <div className="mx-auto mt-5 max-w-xs rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/45">Your Booking ID</p>
                    <p className="font-mono text-2xl tracking-widest">{done.bookingCode}</p>
                  </div>
                  <p className="mx-auto mt-3 max-w-sm text-xs text-white/45">Save this ID. You&apos;ll need it with your email or phone to pay from another device.</p>
                  <a href="#payment" className="btn btn-red mt-6">
                    Continue to payment
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                      <path d="M12 5v14M6 13l6 6 6-6" />
                    </svg>
                  </a>
                </motion.div>
              ) : full || closed ? (
                <motion.div key="full" className="py-10 text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <p className="font-graffiti text-5xl text-blood">{full ? "FULL" : "CLOSED"}</p>
                  <p className="mt-3 text-white/60">
                    {full ? `All ${status.capacity} spots are taken. Registration is closed.` : "Registration is paused right now. Check back soon."}
                  </p>
                  {hasSaved && (
                    <a href="#payment" className="btn btn-ghost mt-6">Already registered? Go to payment</a>
                  )}
                </motion.div>
              ) : (
                <motion.form key="form" onSubmit={submit} noValidate initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.5, ease }}>
                  <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/60">I&apos;m coming as</p>
                  <div className="mt-2 grid grid-cols-2 gap-3" role="radiogroup" aria-label="Ticket category">
                    {categories.map((c) => {
                      const active = c.id === categoryId;
                      return (
                        <motion.button
                          type="button"
                          key={c.id}
                          role="radio"
                          aria-checked={active}
                          onClick={() => {
                            setCategoryId(c.id);
                            setErrors((e) => ({ ...e, categoryId: "" }));
                          }}
                          whileTap={{ scale: 0.97 }}
                          animate={active ? { scale: 1.02 } : { scale: 1 }}
                          className={`relative overflow-hidden rounded-2xl border p-4 text-left transition-colors sm:p-5 ${
                            active ? "border-blood bg-blood/10 shadow-glow" : errors.categoryId ? "border-[#ff6b61]/60" : "border-white/10 bg-white/[0.03] hover:border-white/30"
                          }`}
                        >
                          {active && <motion.span layoutId="cat-glow" className="absolute inset-0 bg-[radial-gradient(circle_at_80%_0%,rgba(225,6,0,.35),transparent_60%)]" />}
                          <span className="relative flex items-start justify-between">
                            <span className="font-display text-2xl uppercase tracking-wide sm:text-3xl">{c.name}</span>
                            <span className={`mt-1 flex h-6 w-6 items-center justify-center rounded-full border-2 ${active ? "border-blood bg-blood" : "border-white/30"}`}>
                              {active && (
                                <motion.svg initial={{ scale: 0 }} animate={{ scale: 1 }} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="4">
                                  <path d="M5 12l5 5L20 7" />
                                </motion.svg>
                              )}
                            </span>
                          </span>
                          <span className="relative mt-4 block font-display text-3xl text-blood sm:text-4xl">{naira(c.price)}</span>
                          {c.description && <span className="relative text-xs text-white/45">{c.description}</span>}
                        </motion.button>
                      );
                    })}
                  </div>
                  {errors.categoryId && <span className="mt-1 block text-sm text-[#ff6b61]">{errors.categoryId}</span>}

                  <div className="mt-6 space-y-4">
                    {(
                      [
                        { k: "fullName", label: "Full name", type: "text", auto: "name", ph: "e.g. Tolu Adebayo", mode: "text" },
                        { k: "phone", label: "Phone number (WhatsApp)", type: "tel", auto: "tel", ph: "e.g. 0814 000 0000", mode: "tel" },
                        { k: "email", label: "Email address", type: "email", auto: "email", ph: "you@example.com", mode: "email" },
                      ] as const
                    ).map((f) => (
                      <label key={f.k} className="block">
                        <span className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.2em] text-white/60">{f.label}</span>
                        <input
                          className="field"
                          type={f.type}
                          inputMode={f.mode}
                          autoComplete={f.auto}
                          placeholder={f.ph}
                          value={form[f.k]}
                          onChange={set(f.k)}
                          aria-invalid={!!errors[f.k]}
                          maxLength={f.k === "email" ? 120 : 80}
                          required
                        />
                        <AnimatePresence>
                          {errors[f.k] && (
                            <motion.span initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-1 block text-sm text-[#ff6b61]">
                              {errors[f.k]}
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </label>
                    ))}
                  </div>
                  <input type="text" name="website" value={form.website} onChange={set("website")} tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />

                  <AnimatePresence>
                    {serverError && (
                      <motion.p initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-5 rounded-xl border border-[#ff6b61]/40 bg-[#ff6b61]/10 p-3 text-sm text-[#ffb4ae]" role="alert">
                        {serverError}
                      </motion.p>
                    )}
                  </AnimatePresence>

                  <div className="mt-6 flex flex-col gap-4 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-white/50">
                      {category ? (
                        <>
                          You&apos;ll pay <b className="text-white">{naira(category.price)}</b> in the next step.
                        </>
                      ) : (
                        "One registration = one person."
                      )}
                    </p>
                    <button type="submit" className="btn btn-red w-full sm:w-auto" disabled={submitting}>
                      {submitting ? (
                        <>
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                          Registering…
                        </>
                      ) : (
                        "Register"
                      )}
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          )}
        </div>
      </div>
    </section>
  );
}
