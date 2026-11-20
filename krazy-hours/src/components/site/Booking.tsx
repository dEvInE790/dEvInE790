"use client";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { naira } from "@/lib/event";
import { useStatus } from "./useStatus";
import { Eyebrow, SplitHeading } from "./Reveal";

const ease = [0.16, 1, 0.3, 1] as const;
type Step = "select" | "details" | "pay" | "done";
const STEPS: { id: Step; label: string }[] = [
  { id: "select", label: "Tickets" },
  { id: "details", label: "Details" },
  { id: "pay", label: "Payment" },
  { id: "done", label: "Submitted" },
];

type Result = { bookingCode: string; ticketUrl: string; amount: number; quantity: number; category: string };
const LS_KEY = "kh_last_booking";

const panel = {
  initial: (dir: number) => ({ opacity: 0, x: dir * 60, filter: "blur(6px)" }),
  animate: { opacity: 1, x: 0, filter: "blur(0px)", transition: { duration: 0.55, ease } },
  exit: (dir: number) => ({ opacity: 0, x: dir * -60, filter: "blur(6px)", transition: { duration: 0.3 } }),
};

function validPhone(v: string) {
  const d = v.replace(/[^\d+]/g, "");
  if (/^\+(?!234)\d{8,15}$/.test(d)) return true;
  let x = d.startsWith("+") ? d.slice(1) : d;
  if (x.startsWith("234")) x = x.slice(3);
  if (x.startsWith("0")) x = x.slice(1);
  return /^[789][01]\d{8}$/.test(x);
}

export default function Booking() {
  const { status, error: statusError, refresh } = useStatus();
  const [step, setStep] = useState<Step>("select");
  const [dir, setDir] = useState(1);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [form, setForm] = useState({ fullName: "", phone: "", email: "", paymentReference: "", website: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [previous, setPrevious] = useState<{ code: string; url: string } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) setPrevious(JSON.parse(raw));
    } catch {}
  }, []);

  const categories = status?.categories ?? [];
  const category = categories.find((c) => c.id === categoryId) ?? null;
  const remaining = status?.remaining ?? 0;
  const maxQty = Math.max(0, Math.min(status?.max_per_booking ?? 1, remaining));
  const total = category ? category.price * qty : 0;
  const soldOut = !!status && remaining <= 0;
  const closed = !!status && !status.bookings_open;

  // Keep quantity inside the live limit if spots get taken while someone is booking.
  useEffect(() => {
    if (maxQty > 0 && qty > maxQty) setQty(maxQty);
  }, [maxQty, qty]);

  useEffect(() => {
    if (!file || !file.type.startsWith("image/") || /hei[cf]/i.test(file.type)) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const go = (next: Step) => {
    const order = STEPS.findIndex((s) => s.id === next) - STEPS.findIndex((s) => s.id === step);
    setDir(order >= 0 ? 1 : -1);
    setStep(next);
    setServerError(null);
    const top = sectionRef.current?.querySelector("#booking-card")?.getBoundingClientRect().top ?? 0;
    if (top < 0) sectionRef.current?.querySelector("#booking-card")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setErrors((er) => ({ ...er, [k]: "" }));
  };

  const validateDetails = () => {
    const e: Record<string, string> = {};
    if (form.fullName.trim().length < 2 || !/^[\p{L}][\p{L} .'-]+$/u.test(form.fullName.trim())) e.fullName = "Enter your full name";
    if (!validPhone(form.phone)) e.phone = "Enter a valid phone number, e.g. 0814 127 6327";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) e.email = "Enter a valid email address";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const copy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const t = document.createElement("textarea");
      t.value = text;
      document.body.appendChild(t);
      t.select();
      document.execCommand("copy");
      t.remove();
    }
    setCopied(key);
    setTimeout(() => setCopied(null), 1800);
  };

  const pickFile = (f: File | undefined | null) => {
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) {
      setErrors((e) => ({ ...e, receipt: "File is larger than 5 MB" }));
      return;
    }
    setErrors((e) => ({ ...e, receipt: "" }));
    setFile(f);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || !category) return;
    const er: Record<string, string> = {};
    if (form.paymentReference.trim().length < 4) er.paymentReference = "Enter the reference / session ID from your transfer receipt";
    if (!file) er.receipt = "Upload your payment receipt or screenshot";
    if (Object.keys(er).length) {
      setErrors(er);
      return;
    }
    setSubmitting(true);
    setServerError(null);
    const fd = new FormData();
    fd.set("categoryId", category.id);
    fd.set("quantity", String(qty));
    fd.set("fullName", form.fullName);
    fd.set("phone", form.phone);
    fd.set("email", form.email);
    fd.set("paymentReference", form.paymentReference);
    fd.set("website", form.website);
    fd.set("receipt", file!);
    try {
      const r = await fetch("/api/bookings", { method: "POST", body: fd });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        setServerError(data.error ?? "Something went wrong. Please try again.");
        if (data.fieldErrors) setErrors(data.fieldErrors);
        if (r.status === 409) refresh();
        // details errors live on the previous step
        if (data.fieldErrors && ["fullName", "phone", "email"].some((k) => k in data.fieldErrors)) go("details");
        return;
      }
      setResult(data);
      try {
        const saved = { code: data.bookingCode, url: data.ticketUrl };
        localStorage.setItem(LS_KEY, JSON.stringify(saved));
        setPrevious(saved);
      } catch {}
      refresh();
      go("done");
    } catch {
      setServerError("Network error — check your connection and try again. Your booking was not submitted.");
    } finally {
      setSubmitting(false);
    }
  };

  const stepIndex = STEPS.findIndex((s) => s.id === step);

  return (
    <section id="tickets" ref={sectionRef} className="relative overflow-hidden px-4 py-24 sm:px-6 sm:py-32">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,rgba(225,6,0,.18),transparent)]" />
      <div className="relative mx-auto max-w-3xl">
        <Eyebrow>Tickets</Eyebrow>
        <SplitHeading text="SECURE YOUR SPOT" accent="SPOT" className="font-display text-5xl uppercase leading-[0.95] sm:text-7xl" />
        <p className="mt-4 max-w-xl text-white/60">
          Only {status?.capacity ?? 30} people get in. Pay by bank transfer, upload your receipt, and your ticket is
          issued as soon as an organiser verifies the payment.
        </p>

        {previous && step !== "done" && (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm">
            <span className="text-white/70">
              You booked <b className="font-mono text-white">{previous.code}</b> on this device.
            </span>
            <Link href={previous.url} className="font-mono text-xs uppercase tracking-[0.2em] text-blood-400 hover:text-white">
              Check status →
            </Link>
          </div>
        )}

        <div id="booking-card" className="border-anim mt-8 scroll-mt-24 rounded-[28px] bg-ink-800/90 p-5 backdrop-blur sm:p-8">
          {/* progress */}
          <ol className="mb-8 grid grid-cols-4 gap-2" aria-label="Booking progress">
            {STEPS.map((s, i) => (
              <li key={s.id} className="flex flex-col gap-2" aria-current={i === stepIndex ? "step" : undefined}>
                <span className="relative h-1 overflow-hidden rounded-full bg-white/10">
                  <motion.span
                    className="absolute inset-y-0 left-0 bg-blood"
                    initial={false}
                    animate={{ width: i <= stepIndex ? "100%" : "0%" }}
                    transition={{ duration: 0.6, ease }}
                  />
                </span>
                <span className={`font-mono text-[9px] uppercase tracking-[0.2em] sm:text-[10px] ${i <= stepIndex ? "text-white" : "text-white/35"}`}>
                  {s.label}
                </span>
              </li>
            ))}
          </ol>

          {!status ? (
            <div className="py-10 text-center text-white/60">
              {statusError ? "Booking is temporarily unavailable. Please refresh in a moment." : "Loading tickets…"}
            </div>
          ) : (
            <AnimatePresence mode="wait" custom={dir}>
              {/* ---------------------------------------------------------- 1 */}
              {step === "select" && (
                <motion.div key="select" custom={dir} variants={panel} initial="initial" animate="animate" exit="exit">
                  {soldOut || closed ? (
                    <div className="py-10 text-center">
                      <p className="font-graffiti text-5xl text-blood">{soldOut ? "SOLD OUT" : "CLOSED"}</p>
                      <p className="mt-3 text-white/60">
                        {soldOut
                          ? "All spots are currently taken. If a pending payment is rejected, spots may reopen — check back."
                          : "Bookings are paused right now. Check back soon."}
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <h3 className="font-display text-2xl uppercase">Choose your ticket</h3>
                        <span className="font-mono text-xs text-white/50">
                          <b className="text-white">{remaining}</b> left
                        </span>
                      </div>
                      <div className="mt-5 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Ticket category">
                        {categories.map((c) => {
                          const active = c.id === categoryId;
                          return (
                            <motion.button
                              type="button"
                              key={c.id}
                              role="radio"
                              aria-checked={active}
                              onClick={() => setCategoryId(c.id)}
                              whileTap={{ scale: 0.97 }}
                              animate={active ? { scale: 1.02 } : { scale: 1 }}
                              className={`relative overflow-hidden rounded-2xl border p-5 text-left transition-colors ${
                                active ? "border-blood bg-blood/10 shadow-glow" : "border-white/10 bg-white/[0.03] hover:border-white/30"
                              }`}
                            >
                              {active && (
                                <motion.span
                                  layoutId="ticket-glow"
                                  className="absolute inset-0 bg-[radial-gradient(circle_at_80%_0%,rgba(225,6,0,.35),transparent_60%)]"
                                />
                              )}
                              <span className="relative flex items-start justify-between">
                                <span>
                                  <span className="block font-display text-3xl uppercase tracking-wide">{c.name}</span>
                                  {c.description && <span className="text-sm text-white/50">{c.description}</span>}
                                </span>
                                <span
                                  className={`mt-1 flex h-6 w-6 items-center justify-center rounded-full border-2 ${active ? "border-blood bg-blood" : "border-white/30"}`}
                                >
                                  {active && (
                                    <motion.svg initial={{ scale: 0 }} animate={{ scale: 1 }} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="4">
                                      <path d="M5 12l5 5L20 7" />
                                    </motion.svg>
                                  )}
                                </span>
                              </span>
                              <span className="relative mt-6 block font-display text-4xl text-blood">{naira(c.price)}</span>
                              <span className="relative font-mono text-[10px] uppercase tracking-[0.25em] text-white/40">per ticket</span>
                            </motion.button>
                          );
                        })}
                      </div>

                      <div className="mt-6 flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                        <div>
                          <p className="font-display text-lg uppercase">Number of tickets</p>
                          <p className="text-xs text-white/45">Max {maxQty} per booking</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 text-xl transition hover:border-blood disabled:opacity-30"
                            onClick={() => setQty((q) => Math.max(1, q - 1))}
                            disabled={qty <= 1}
                            aria-label="Fewer tickets"
                          >
                            −
                          </button>
                          <span className="relative w-8 overflow-hidden text-center font-display text-3xl" aria-live="polite">
                            <AnimatePresence mode="popLayout" initial={false}>
                              <motion.span key={qty} className="block" initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}>
                                {qty}
                              </motion.span>
                            </AnimatePresence>
                          </span>
                          <button
                            type="button"
                            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 text-xl transition hover:border-blood disabled:opacity-30"
                            onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
                            disabled={qty >= maxQty}
                            aria-label="More tickets"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <div className="mt-6 flex flex-col gap-4 border-t border-white/10 pt-6 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/50">Total</p>
                          <motion.p key={total} initial={{ scale: 1.15, color: "#ff2a1f" }} animate={{ scale: 1, color: "#ffffff" }} className="origin-left font-display text-5xl">
                            {naira(total)}
                          </motion.p>
                        </div>
                        <button type="button" className="btn btn-red w-full sm:w-auto" disabled={!category || qty < 1 || qty > maxQty} onClick={() => go("details")}>
                          Continue
                        </button>
                      </div>
                    </>
                  )}
                </motion.div>
              )}

              {/* ---------------------------------------------------------- 2 */}
              {step === "details" && (
                <motion.form
                  key="details"
                  custom={dir}
                  variants={panel}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  noValidate
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (validateDetails()) go("pay");
                  }}
                >
                  <h3 className="font-display text-2xl uppercase">Your details</h3>
                  <p className="mt-1 text-sm text-white/50">Use the name on your ID — it&apos;ll be on your ticket.</p>
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
                  <div className="mt-6 rounded-2xl bg-white/[0.03] p-4 text-sm text-white/70">
                    {qty} × {category?.name} — <b className="text-white">{naira(total)}</b>
                  </div>
                  <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
                    <button type="button" className="btn btn-ghost" onClick={() => go("select")}>
                      Back
                    </button>
                    <button type="submit" className="btn btn-red">
                      Proceed to payment
                    </button>
                  </div>
                </motion.form>
              )}

              {/* ---------------------------------------------------------- 3 */}
              {step === "pay" && status && (
                <motion.form key="pay" custom={dir} variants={panel} initial="initial" animate="animate" exit="exit" onSubmit={submit} noValidate>
                  <div className="text-center">
                    <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/50">Amount to transfer</p>
                    <p className="font-display text-6xl text-white sm:text-7xl">{naira(total)}</p>
                    <button type="button" onClick={() => copy(String(total), "amt")} className="mt-1 font-mono text-[11px] uppercase tracking-[0.2em] text-blood-400 hover:text-white">
                      {copied === "amt" ? "✓ Amount copied" : "Copy amount"}
                    </button>
                    <p className="mt-1 text-xs text-white/40">
                      {qty} × {category?.name} ticket{qty > 1 ? "s" : ""}
                    </p>
                  </div>

                  {/* bank card */}
                  <motion.div
                    className="relative mx-auto mt-6 max-w-md overflow-hidden rounded-3xl bg-gradient-to-br from-[#1b1b1b] via-[#0e0e0e] to-[#2a0402] p-6 shadow-[0_30px_80px_-20px_rgba(225,6,0,.5)]"
                    initial={{ rotateX: 25, opacity: 0, y: 30 }}
                    animate={{ rotateX: 0, opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease, delay: 0.1 }}
                    style={{ transformPerspective: 900 }}
                  >
                    <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-blood/30 blur-3xl" />
                    <div className="relative flex items-center justify-between">
                      <span className="rounded-full bg-[#7c3aed]/20 px-3 py-1 font-display text-lg tracking-wide text-[#c4b5fd]">{status.bank_name}</span>
                      <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/40">Bank transfer</span>
                    </div>
                    <p className="relative mt-6 font-mono text-[10px] uppercase tracking-[0.3em] text-white/45">Account number</p>
                    <div className="relative mt-1 flex items-center justify-between gap-3">
                      <p className="font-mono text-3xl tracking-[0.12em] text-white sm:text-4xl">{status.account_number}</p>
                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.9 }}
                        onClick={() => copy(status.account_number, "acct")}
                        className="flex shrink-0 items-center gap-1.5 rounded-full bg-blood px-4 py-2.5 font-display text-sm uppercase tracking-wider text-white"
                      >
                        {copied === "acct" ? "Copied ✓" : "Copy"}
                      </motion.button>
                    </div>
                    <p className="relative mt-5 font-mono text-[10px] uppercase tracking-[0.3em] text-white/45">Account name</p>
                    <p className="relative mt-1 font-display text-xl uppercase tracking-wide">{status.account_name}</p>
                  </motion.div>

                  <ol className="mx-auto mt-6 max-w-md space-y-2.5">
                    {[
                      "Copy the PalmPay account number.",
                      "Open your banking app.",
                      `Transfer the exact amount: ${naira(total)}.`,
                      "Return to this page.",
                      "Upload your payment receipt or screenshot.",
                      "Submit your booking for verification.",
                    ].map((t, i) => (
                      <motion.li
                        key={i}
                        className="flex gap-3 text-sm text-white/75"
                        initial={{ opacity: 0, x: -14 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.25 + i * 0.06 }}
                      >
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-blood/60 font-mono text-[11px] text-blood-400">{i + 1}</span>
                        <span className="pt-0.5">{t}</span>
                      </motion.li>
                    ))}
                  </ol>

                  <div className="mx-auto mt-8 max-w-md space-y-4">
                    <label className="block">
                      <span className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.2em] text-white/60">Payment reference / session ID</span>
                      <input
                        className="field font-mono"
                        value={form.paymentReference}
                        onChange={set("paymentReference")}
                        placeholder="From your transfer receipt"
                        aria-invalid={!!errors.paymentReference}
                        maxLength={64}
                        autoComplete="off"
                      />
                      {errors.paymentReference && <span className="mt-1 block text-sm text-[#ff6b61]">{errors.paymentReference}</span>}
                    </label>

                    <div>
                      <span className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.2em] text-white/60">Payment receipt / screenshot</span>
                      <label
                        className={`group relative flex min-h-[140px] cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border-2 border-dashed p-4 text-center transition-colors ${
                          errors.receipt ? "border-[#ff6b61]" : file ? "border-blood bg-blood/5" : "border-white/15 hover:border-blood/60"
                        }`}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          pickFile(e.dataTransfer.files?.[0]);
                        }}
                      >
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf"
                          className="sr-only"
                          onChange={(e) => pickFile(e.target.files?.[0])}
                        />
                        {file ? (
                          <>
                            {preview ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={preview} alt="Receipt preview" className="max-h-40 rounded-lg object-contain" />
                            ) : (
                              <span className="font-display text-3xl text-blood">{file.type === "application/pdf" ? "PDF" : "FILE"}</span>
                            )}
                            <span className="max-w-full truncate text-sm text-white/70">{file.name}</span>
                            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-blood-400">Tap to change</span>
                          </>
                        ) : (
                          <>
                            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#e10600" strokeWidth="1.8" aria-hidden className="transition-transform group-hover:-translate-y-1">
                              <path d="M12 16V4M6 10l6-6 6 6M4 20h16" />
                            </svg>
                            <span className="text-sm text-white/80">Tap to upload your receipt</span>
                            <span className="text-xs text-white/40">JPG, PNG, WEBP, HEIC or PDF · max 5 MB</span>
                          </>
                        )}
                      </label>
                      {errors.receipt && <span className="mt-1 block text-sm text-[#ff6b61]">{errors.receipt}</span>}
                    </div>

                    {/* honeypot */}
                    <input type="text" name="website" value={form.website} onChange={set("website")} tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />

                    <AnimatePresence>
                      {serverError && (
                        <motion.p initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="rounded-xl border border-[#ff6b61]/40 bg-[#ff6b61]/10 p-3 text-sm text-[#ffb4ae]" role="alert">
                          {serverError}
                        </motion.p>
                      )}
                    </AnimatePresence>

                    <p className="text-xs leading-relaxed text-white/40">
                      Your booking stays <b className="text-white/70">pending</b> until an organiser checks the transfer in the PalmPay account.
                      Uploading a receipt does not confirm a ticket by itself.
                    </p>

                    <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-between">
                      <button type="button" className="btn btn-ghost" onClick={() => go("details")} disabled={submitting}>
                        Back
                      </button>
                      <button type="submit" className="btn btn-red" disabled={submitting}>
                        {submitting ? (
                          <>
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                            Submitting…
                          </>
                        ) : (
                          "Submit payment"
                        )}
                      </button>
                    </div>
                  </div>
                </motion.form>
              )}

              {/* ---------------------------------------------------------- 4 */}
              {step === "done" && result && (
                <motion.div key="done" custom={dir} variants={panel} initial="initial" animate="animate" exit="exit" className="py-4 text-center">
                  <div className="relative mx-auto h-28 w-28">
                    <motion.span
                      className="absolute inset-0 rounded-full border-2 border-blood"
                      initial={{ scale: 0.4, opacity: 0 }}
                      animate={{ scale: [0.4, 1.3, 1], opacity: [0, 1, 1] }}
                      transition={{ duration: 0.8, ease }}
                    />
                    <motion.span
                      className="absolute inset-0 rounded-full border border-blood/40"
                      animate={{ scale: [1, 1.6], opacity: [0.8, 0] }}
                      transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
                    />
                    {/* hourglass = pending verification */}
                    <motion.svg viewBox="0 0 24 24" className="absolute inset-[26%]" fill="none" stroke="#e10600" strokeWidth="1.8" strokeLinecap="round"
                      animate={{ rotate: [0, 0, 180, 180] }}
                      transition={{ duration: 3, repeat: Infinity, times: [0, 0.4, 0.6, 1], ease: "easeInOut" }}
                    >
                      <path d="M6 3h12M6 21h12M7 3c0 5 10 7 10 9s-10 4-10 9M17 3c0 5-10 7-10 9s10 4 10 9" />
                    </motion.svg>
                  </div>
                  <p className="mt-6 inline-block rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.3em] text-amber-300">
                    Pending verification
                  </p>
                  <h3 className="mx-auto mt-4 max-w-md font-display text-2xl uppercase leading-tight sm:text-3xl">
                    Your booking has been submitted successfully!
                  </h3>
                  <p className="mx-auto mt-3 max-w-md text-white/65">Your ticket will be confirmed once payment has been verified.</p>

                  <div className="mx-auto mt-6 max-w-sm rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/45">Booking ID</span>
                      <button type="button" className="font-mono text-[10px] uppercase tracking-[0.2em] text-blood-400" onClick={() => copy(result.bookingCode, "code")}>
                        {copied === "code" ? "Copied ✓" : "Copy"}
                      </button>
                    </div>
                    <p className="font-mono text-2xl tracking-widest">{result.bookingCode}</p>
                    <p className="mt-2 text-sm text-white/55">
                      {result.quantity} × {result.category} · {naira(result.amount)}
                    </p>
                  </div>
                  <p className="mx-auto mt-4 max-w-sm text-xs text-white/45">
                    Save your Booking ID. Use it with your email or phone on the “My ticket” page to check status and download your ticket once confirmed.
                  </p>
                  <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                    <Link href={result.ticketUrl} className="btn btn-red">
                      Track my ticket
                    </Link>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>
      </div>
    </section>
  );
}
