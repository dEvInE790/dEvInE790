"use client";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { naira } from "@/lib/event";
import { useStatus } from "./useStatus";
import { Eyebrow, SplitHeading } from "./Reveal";
import { LS_KEY, loadRegistration, saveRegistration, type SavedRegistration } from "./Register";

const ease = [0.16, 1, 0.3, 1] as const;

type Summary = {
  bookingCode: string;
  fullName: string;
  category: string;
  amount: number;
  status: "registered" | "pending" | "confirmed" | "cancelled";
  note: string | null;
  paymentReference: string | null;
};

export default function Payment() {
  const { status } = useStatus();
  const [access, setAccess] = useState<SavedRegistration | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);
  const [lookup, setLookup] = useState({ code: "", contact: "" });
  const [lookupError, setLookupError] = useState<string | null>(null);

  const [reference, setReference] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(async (a: SavedRegistration) => {
    setLoading(true);
    try {
      const r = await fetch(`/api/registration?code=${encodeURIComponent(a.code)}&k=${encodeURIComponent(a.k)}`, { cache: "no-store" });
      if (!r.ok) throw new Error();
      setSummary(await r.json());
      setAccess(a);
    } catch {
      setAccess(null);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Pick up a registration from the link (?code=&k=), this device, or a fresh sign-up.
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const fromUrl = sp.get("code") && sp.get("k") ? { code: sp.get("code")!.toUpperCase(), k: sp.get("k")! } : null;
    const a = fromUrl ?? loadRegistration();
    if (fromUrl) saveRegistration(fromUrl);
    if (a) load(a);
    const onReg = (e: Event) => load((e as CustomEvent<SavedRegistration>).detail);
    window.addEventListener("kh:registration", onReg);
    return () => window.removeEventListener("kh:registration", onReg);
  }, [load]);

  useEffect(() => {
    if (!file || !file.type.startsWith("image/") || /hei[cf]/i.test(file.type)) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const forget = () => {
    try {
      localStorage.removeItem(LS_KEY);
    } catch {}
    setAccess(null);
    setSummary(null);
    setJustSubmitted(false);
    if (window.location.search) history.replaceState(null, "", window.location.pathname + "#payment");
  };

  const findRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setLookupError(null);
    setLoading(true);
    try {
      const r = await fetch("/api/tickets/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: lookup.code.trim(), contact: lookup.contact.trim() }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error ?? "Not found");
      saveRegistration({ code: d.code, k: d.k });
    } catch (err) {
      setLookupError((err as Error).message);
      setLoading(false);
    }
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
    if (submitting || !access) return;
    const er: Record<string, string> = {};
    if (reference.trim().length < 4) er.paymentReference = "Enter the reference / session ID from your transfer receipt";
    if (!file) er.receipt = "Upload your payment receipt or screenshot";
    setErrors(er);
    if (Object.keys(er).length) return;

    setSubmitting(true);
    setServerError(null);
    const fd = new FormData();
    fd.set("code", access.code);
    fd.set("k", access.k);
    fd.set("paymentReference", reference);
    fd.set("receipt", file!);
    try {
      const r = await fetch("/api/payments", { method: "POST", body: fd });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        setServerError(d.error ?? "Something went wrong. Please try again.");
        if (d.fieldErrors) setErrors(d.fieldErrors);
        if (r.status === 409) load(access);
        return;
      }
      setJustSubmitted(true);
      setFile(null);
      setReference("");
      await load(access);
    } catch {
      setServerError("Network error — check your connection and try again. Your payment proof was not submitted.");
    } finally {
      setSubmitting(false);
    }
  };

  const ticketUrl = access ? `/ticket/${access.code}?k=${access.k}` : "#";

  return (
    <section id="payment" className="relative scroll-mt-16 overflow-hidden px-4 py-24 sm:px-6 sm:py-32">
      <div className="pointer-events-none absolute -right-40 top-10 h-[28rem] w-[28rem] rounded-full bg-blood/15 blur-[140px]" />
      <div className="relative mx-auto max-w-3xl">
        <Eyebrow>Step 2 · Payment</Eyebrow>
        <SplitHeading text="PAY & CONFIRM" accent="CONFIRM" className="font-display text-5xl uppercase leading-[0.95] sm:text-7xl" />
        <p className="mt-4 max-w-xl text-white/60">
          Already registered? Transfer to PalmPay, upload your receipt, and your ticket is issued as soon as an organiser verifies the payment.
        </p>

        <div className="border-anim mt-8 rounded-[28px] bg-ink-800/90 p-5 backdrop-blur sm:p-8">
          <AnimatePresence mode="wait">
            {loading && !summary ? (
              <motion.div key="loading" className="flex justify-center py-12" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <span className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-blood" />
              </motion.div>
            ) : !summary ? (
              /* ------------------------------------------------ find registration */
              <motion.form key="find" onSubmit={findRegistration} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.5, ease }}>
                <h3 className="font-display text-2xl uppercase">Find your registration</h3>
                <p className="mt-1 text-sm text-white/50">Enter the Booking ID you got when you registered, plus your email or phone.</p>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <input className="field font-mono uppercase" placeholder="KH-XXXXXX" value={lookup.code} onChange={(e) => setLookup({ ...lookup, code: e.target.value })} maxLength={9} required autoCapitalize="characters" aria-label="Booking ID" />
                  <input className="field" placeholder="Email or phone" value={lookup.contact} onChange={(e) => setLookup({ ...lookup, contact: e.target.value })} maxLength={120} required aria-label="Email or phone" />
                </div>
                {lookupError && <p className="mt-3 rounded-xl bg-[#ff6b61]/10 p-3 text-sm text-[#ffb4ae]" role="alert">{lookupError}</p>}
                <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <a href="#register" className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/50 hover:text-white">
                    ↑ Not registered yet? Register first
                  </a>
                  <button className="btn btn-red" disabled={loading}>Continue</button>
                </div>
              </motion.form>
            ) : summary.status === "registered" ? (
              /* ------------------------------------------------ pay */
              <motion.form key="pay" onSubmit={submit} noValidate initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.55, ease }}>
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-white/[0.03] px-4 py-3 text-sm">
                  <span>
                    <b>{summary.fullName}</b> · {summary.category} · <span className="font-mono text-white/60">{summary.bookingCode}</span>
                  </span>
                  <button type="button" onClick={forget} className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/45 hover:text-white">
                    Not you?
                  </button>
                </div>

                {summary.note && (
                  <p className="mt-4 rounded-xl border border-amber-400/40 bg-amber-400/10 p-3 text-sm text-amber-200" role="alert">
                    Your last payment couldn&apos;t be verified: {summary.note} Please pay again and upload a new receipt.
                  </p>
                )}

                <div className="mt-6 text-center">
                  <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/50">Amount to transfer</p>
                  <p className="font-display text-6xl text-white sm:text-7xl">{naira(summary.amount)}</p>
                  <button type="button" onClick={() => copy(String(summary.amount), "amt")} className="mt-1 font-mono text-[11px] uppercase tracking-[0.2em] text-blood-400 hover:text-white">
                    {copied === "amt" ? "✓ Amount copied" : "Copy amount"}
                  </button>
                </div>

                {status && (
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
                      <motion.button type="button" whileTap={{ scale: 0.9 }} onClick={() => copy(status.account_number, "acct")} className="flex shrink-0 items-center gap-1.5 rounded-full bg-blood px-4 py-2.5 font-display text-sm uppercase tracking-wider text-white">
                        {copied === "acct" ? "Copied ✓" : "Copy"}
                      </motion.button>
                    </div>
                    <p className="relative mt-5 font-mono text-[10px] uppercase tracking-[0.3em] text-white/45">Account name</p>
                    <p className="relative mt-1 font-display text-xl uppercase tracking-wide">{status.account_name}</p>
                  </motion.div>
                )}

                <ol className="mx-auto mt-6 max-w-md space-y-2.5">
                  {[
                    "Copy the PalmPay account number.",
                    "Open your banking app.",
                    `Transfer the exact amount: ${naira(summary.amount)}.`,
                    "Return to this page.",
                    "Upload your payment receipt or screenshot.",
                    "Submit your payment for verification.",
                  ].map((t, i) => (
                    <motion.li key={i} className="flex gap-3 text-sm text-white/75" initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 + i * 0.06 }}>
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-blood/60 font-mono text-[11px] text-blood-400">{i + 1}</span>
                      <span className="pt-0.5">{t}</span>
                    </motion.li>
                  ))}
                </ol>

                <div className="mx-auto mt-8 max-w-md space-y-4">
                  <label className="block">
                    <span className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.2em] text-white/60">Payment reference / session ID</span>
                    <input className="field font-mono" value={reference} onChange={(e) => { setReference(e.target.value); setErrors((x) => ({ ...x, paymentReference: "" })); }} placeholder="From your transfer receipt" aria-invalid={!!errors.paymentReference} maxLength={64} autoComplete="off" />
                    {errors.paymentReference && <span className="mt-1 block text-sm text-[#ff6b61]">{errors.paymentReference}</span>}
                  </label>

                  <div>
                    <span className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.2em] text-white/60">Payment receipt / screenshot</span>
                    <label
                      className={`group relative flex min-h-[140px] cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border-2 border-dashed p-4 text-center transition-colors ${
                        errors.receipt ? "border-[#ff6b61]" : file ? "border-blood bg-blood/5" : "border-white/15 hover:border-blood/60"
                      }`}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => { e.preventDefault(); pickFile(e.dataTransfer.files?.[0]); }}
                    >
                      <input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf" className="sr-only" onChange={(e) => pickFile(e.target.files?.[0])} />
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

                  <AnimatePresence>
                    {serverError && (
                      <motion.p initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="rounded-xl border border-[#ff6b61]/40 bg-[#ff6b61]/10 p-3 text-sm text-[#ffb4ae]" role="alert">
                        {serverError}
                      </motion.p>
                    )}
                  </AnimatePresence>

                  <p className="text-xs leading-relaxed text-white/40">
                    Your payment stays <b className="text-white/70">pending</b> until an organiser checks the transfer in the PalmPay account. Uploading a receipt does not confirm a ticket by itself.
                  </p>

                  <button type="submit" className="btn btn-red w-full" disabled={submitting}>
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
              </motion.form>
            ) : (
              /* ------------------------------------------------ status */
              <motion.div key={summary.status} className="py-4 text-center" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, ease }}>
                {summary.status === "pending" && (
                  <>
                    <div className="relative mx-auto h-28 w-28">
                      <motion.span className="absolute inset-0 rounded-full border-2 border-blood" initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: [0.4, 1.3, 1], opacity: 1 }} transition={{ duration: 0.8, ease }} />
                      <motion.span className="absolute inset-0 rounded-full border border-blood/40" animate={{ scale: [1, 1.6], opacity: [0.8, 0] }} transition={{ duration: 1.8, repeat: Infinity }} />
                      <motion.svg viewBox="0 0 24 24" className="absolute inset-[26%]" fill="none" stroke="#e10600" strokeWidth="1.8" strokeLinecap="round" animate={{ rotate: [0, 0, 180, 180] }} transition={{ duration: 3, repeat: Infinity, times: [0, 0.4, 0.6, 1] }}>
                        <path d="M6 3h12M6 21h12M7 3c0 5 10 7 10 9s-10 4-10 9M17 3c0 5-10 7-10 9s10 4 10 9" />
                      </motion.svg>
                    </div>
                    <p className="mt-6 inline-block rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.3em] text-amber-300">Pending verification</p>
                    <h3 className="mx-auto mt-4 max-w-md font-display text-2xl uppercase leading-tight sm:text-3xl">
                      {justSubmitted ? "Your booking has been submitted successfully!" : "Payment submitted"}
                    </h3>
                    <p className="mx-auto mt-3 max-w-md text-white/65">Your ticket will be confirmed once payment has been verified.</p>
                  </>
                )}
                {summary.status === "confirmed" && (
                  <>
                    <motion.p className="font-graffiti text-6xl text-blood" initial={{ scale: 0.5, rotate: -8, opacity: 0 }} animate={{ scale: 1, rotate: -3, opacity: 1 }} transition={{ type: "spring", stiffness: 200, damping: 12 }}>
                      YOU&apos;RE IN
                    </motion.p>
                    <p className="mx-auto mt-3 max-w-md text-white/65">Payment verified. Your ticket is ready.</p>
                  </>
                )}
                {summary.status === "cancelled" && (
                  <>
                    <p className="font-display text-3xl uppercase text-[#ffb4ae]">Registration cancelled</p>
                    <p className="mx-auto mt-3 max-w-md text-white/60">{summary.note ?? "Contact the organisers with your Booking ID if this is a mistake."}</p>
                  </>
                )}
                <div className="mx-auto mt-6 max-w-sm rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left">
                  <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/45">Booking ID</p>
                  <p className="font-mono text-2xl tracking-widest">{summary.bookingCode}</p>
                  <p className="mt-2 text-sm text-white/55">
                    {summary.fullName} · {summary.category} · {naira(summary.amount)}
                  </p>
                </div>
                <div className="mt-6 flex flex-col items-center gap-3">
                  {summary.status !== "cancelled" && (
                    <Link href={ticketUrl} className="btn btn-red">
                      {summary.status === "confirmed" ? "View my ticket" : "Track my ticket"}
                    </Link>
                  )}
                  <button type="button" onClick={forget} className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/40 hover:text-white">
                    Use a different Booking ID
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
