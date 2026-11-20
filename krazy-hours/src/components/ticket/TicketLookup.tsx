"use client";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function TicketLookup() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [contact, setContact] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState<{ code: string; url: string } | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("kh_registration");
      if (raw) {
        const r = JSON.parse(raw) as { code: string; k: string };
        setSaved({ code: r.code, url: `/ticket/${r.code}?k=${r.k}` });
      }
    } catch {}
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/tickets/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim(), contact: contact.trim() }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error ?? "Not found");
      router.push(d.ticketUrl);
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  };

  return (
    <main className="relative flex min-h-[100svh] items-center justify-center overflow-hidden px-4 py-20">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(225,6,0,.25),transparent)]" />
      <motion.div
        className="border-anim relative w-full max-w-md rounded-[28px] bg-ink-800/90 p-6 sm:p-8"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      >
        <Link href="/" className="font-graffiti text-3xl text-blood">KRAZY HOURS</Link>
        <h1 className="mt-4 font-display text-4xl uppercase">Find my ticket</h1>
        <p className="mt-1 text-sm text-white/55">Enter the Booking ID you got when you registered, plus the email or phone you used.</p>

        {saved && (
          <Link href={saved.url} className="mt-5 flex items-center justify-between rounded-2xl border border-blood/40 bg-blood/10 p-4 text-sm">
            <span>
              Booking on this device: <b className="font-mono">{saved.code}</b>
            </span>
            <span className="font-mono text-xs text-blood-400">Open →</span>
          </Link>
        )}

        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.2em] text-white/60">Booking ID</span>
            <input className="field font-mono uppercase" placeholder="KH-XXXXXX" value={code} onChange={(e) => setCode(e.target.value)} required maxLength={9} autoCapitalize="characters" />
          </label>
          <label className="block">
            <span className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.2em] text-white/60">Email or phone</span>
            <input className="field" placeholder="you@example.com or 0814…" value={contact} onChange={(e) => setContact(e.target.value)} required maxLength={120} />
          </label>
          {error && <p className="rounded-xl bg-[#ff6b61]/10 p-3 text-sm text-[#ffb4ae]" role="alert">{error}</p>}
          <button className="btn btn-red w-full" disabled={loading}>{loading ? "Searching…" : "Show my ticket"}</button>
        </form>
        <Link href="/#register" className="mt-6 block text-center font-mono text-[11px] uppercase tracking-[0.2em] text-white/45 hover:text-white">
          ← Haven&apos;t registered yet?
        </Link>
      </motion.div>
    </main>
  );
}
