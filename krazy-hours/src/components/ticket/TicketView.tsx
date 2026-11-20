"use client";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { EVENT, naira } from "@/lib/event";

export type TicketData = {
  bookingCode: string;
  fullName: string;
  category: string;
  quantity: number;
  amount: number;
  status: "pending" | "confirmed" | "rejected" | "cancelled";
  checkedIn: boolean;
  createdAt: string;
  note: string | null;
  checkinCode: string | null;
  qrSvg: string | null;
};

const ease = [0.16, 1, 0.3, 1] as const;

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative flex min-h-[100svh] flex-col items-center justify-center overflow-hidden px-4 py-16">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,rgba(225,6,0,.28),transparent)]" />
      <Link href="/" className="relative mb-8 font-graffiti text-3xl text-blood">KRAZY HOURS</Link>
      {children}
    </main>
  );
}

function Row({ k, v, mono }: { k: string; v: React.ReactNode; mono?: boolean }) {
  return (
    <div>
      <p className="font-mono text-[9px] uppercase tracking-[0.3em] text-white/40">{k}</p>
      <p className={`mt-0.5 ${mono ? "font-mono tracking-wider" : "font-display uppercase tracking-wide"} text-[15px] text-white`}>{v}</p>
    </div>
  );
}

export default function TicketView({ data }: { data: TicketData }) {
  const router = useRouter();
  const ticketRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);

  // Pending bookings refresh themselves so the ticket appears as soon as it's verified.
  useEffect(() => {
    if (data.status !== "pending") return;
    const id = setInterval(() => !document.hidden && router.refresh(), 30000);
    return () => clearInterval(id);
  }, [data.status, router]);

  const download = async () => {
    if (!ticketRef.current) return;
    setSaving(true);
    try {
      const { toPng } = await import("html-to-image");
      const url = await toPng(ticketRef.current, { pixelRatio: 3, backgroundColor: "#050505", cacheBust: true });
      const a = document.createElement("a");
      a.href = url;
      a.download = `krazy-hours-${data.bookingCode}.png`;
      a.click();
    } catch {
      alert("Couldn't create the image — take a screenshot of your ticket instead.");
    } finally {
      setSaving(false);
    }
  };

  if (data.status !== "confirmed") {
    const pending = data.status === "pending";
    return (
      <Shell>
        <motion.div
          className="border-anim relative w-full max-w-md rounded-[28px] bg-ink-800/90 p-8 text-center"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease }}
        >
          {pending ? (
            <motion.svg viewBox="0 0 24 24" className="mx-auto h-16 w-16" fill="none" stroke="#e10600" strokeWidth="1.6" strokeLinecap="round"
              animate={{ rotate: [0, 0, 180, 180] }} transition={{ duration: 3, repeat: Infinity, times: [0, 0.4, 0.6, 1] }}>
              <path d="M6 3h12M6 21h12M7 3c0 5 10 7 10 9s-10 4-10 9M17 3c0 5-10 7-10 9s10 4 10 9" />
            </motion.svg>
          ) : (
            <svg viewBox="0 0 24 24" className="mx-auto h-16 w-16" fill="none" stroke="#ff6b61" strokeWidth="1.6" strokeLinecap="round">
              <circle cx="12" cy="12" r="9" />
              <path d="M9 9l6 6M15 9l-6 6" />
            </svg>
          )}
          <p
            className={`mt-5 inline-block rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-[0.3em] ${
              pending ? "border border-amber-400/40 bg-amber-400/10 text-amber-300" : "border border-[#ff6b61]/40 bg-[#ff6b61]/10 text-[#ffb4ae]"
            }`}
          >
            {pending ? "Pending verification" : data.status === "rejected" ? "Payment not verified" : "Booking cancelled"}
          </p>
          <h1 className="mt-4 font-display text-3xl uppercase leading-tight">
            {pending ? "We're checking your payment" : data.status === "rejected" ? "We couldn't verify this payment" : "This booking was cancelled"}
          </h1>
          <p className="mt-3 text-white/60">
            {pending
              ? "Your booking has been submitted successfully! Your ticket will be confirmed once payment has been verified. This page updates automatically."
              : "No ticket has been issued for this booking. If you believe this is a mistake, contact the organisers with your Booking ID and transfer receipt."}
          </p>
          {data.note && !pending && <p className="mt-3 rounded-xl bg-white/5 p-3 text-sm text-white/70">Note from organisers: {data.note}</p>}
          <div className="mt-6 grid grid-cols-2 gap-4 rounded-2xl bg-white/[0.03] p-4 text-left">
            <Row k="Booking ID" v={data.bookingCode} mono />
            <Row k="Name" v={data.fullName} />
            <Row k="Tickets" v={`${data.quantity} × ${data.category}`} />
            <Row k="Amount" v={naira(data.amount)} />
          </div>
          {pending && (
            <button onClick={() => router.refresh()} className="btn btn-ghost mt-6 w-full">
              Refresh status
            </button>
          )}
        </motion.div>
      </Shell>
    );
  }

  return (
    <Shell>
      <motion.div
        initial={{ opacity: 0, rotateX: 70, y: 80, scale: 0.9 }}
        animate={{ opacity: 1, rotateX: 0, y: 0, scale: 1 }}
        transition={{ duration: 1.1, ease }}
        style={{ transformPerspective: 1200 }}
        className="relative w-full max-w-[380px]"
      >
        <div ref={ticketRef} className="relative overflow-hidden rounded-[26px] bg-[#0b0b0b] text-white shadow-[0_40px_120px_-30px_rgba(225,6,0,.7)]">
          {/* shine sweep */}
          <motion.span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 z-20 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/25 to-transparent"
            initial={{ left: "-50%" }}
            animate={{ left: "150%" }}
            transition={{ duration: 1.4, delay: 1, ease: "easeInOut" }}
          />
          {/* header */}
          <div className="relative overflow-hidden bg-[radial-gradient(ellipse_at_50%_0%,#9b0c05,#2a0201_60%,#0b0b0b)] px-6 pb-6 pt-7 text-center">
            <p className="font-mono text-[9px] uppercase tracking-[0.35em] text-white/60">TribeWave Records × Motion Boys Squad</p>
            <p className="mt-2 font-graffiti text-[56px] leading-[0.85] text-bone [text-shadow:0_4px_0_#7a0300]">KRAZY</p>
            <p className="font-graffiti text-[56px] leading-[0.85] text-blood [text-shadow:0_0_24px_rgba(225,6,0,.7)]">HOURS</p>
            <p className="mt-2 font-display text-sm uppercase tracking-[0.35em]">Apartment Party</p>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-4 px-6 pt-6">
            <div className="col-span-2">
              <p className="font-mono text-[9px] uppercase tracking-[0.3em] text-white/40">Guest</p>
              <p className="font-display text-2xl uppercase leading-tight">{data.fullName}</p>
            </div>
            <Row k="Category" v={data.category} />
            <Row k="Admits" v={`${data.quantity} ${data.quantity > 1 ? "people" : "person"}`} />
            <Row k="Date" v={EVENT.dateLabel} />
            <Row k="Time" v={EVENT.timeLabel} />
            <Row k="Booking ID" v={data.bookingCode} mono />
            <div>
              <p className="font-mono text-[9px] uppercase tracking-[0.3em] text-white/40">Payment</p>
              <p className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-0.5 font-display text-[13px] uppercase tracking-wider text-emerald-400">
                ✓ Confirmed
              </p>
            </div>
          </div>

          {/* perforation */}
          <div className="relative my-6 h-6">
            <span className="absolute -left-3 top-0 h-6 w-6 rounded-full bg-ink" />
            <span className="absolute -right-3 top-0 h-6 w-6 rounded-full bg-ink" />
            <span className="absolute inset-x-5 top-1/2 border-t-2 border-dashed border-white/15" />
          </div>

          <div className="flex items-center gap-5 px-6 pb-6">
            <div className="shrink-0 rounded-xl bg-white p-2.5">
              <div className="h-[118px] w-[118px] [&>svg]:h-full [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: data.qrSvg ?? "" }} />
            </div>
            <div className="min-w-0">
              <p className="font-mono text-[9px] uppercase tracking-[0.3em] text-white/40">Check-in code</p>
              <p className="mt-1 break-all font-mono text-lg tracking-[0.15em] text-white">{data.checkinCode}</p>
              <p className="mt-3 text-[11px] leading-snug text-white/45">Show this QR at the door. One scan admits your whole booking.</p>
              {data.checkedIn && (
                <p className="mt-2 inline-block rounded bg-white/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.2em] text-white/70">Checked in</p>
              )}
            </div>
          </div>
          <div className="border-t border-white/10 bg-black/40 px-6 py-3 text-center font-mono text-[9px] uppercase leading-relaxed tracking-[0.2em] text-white/45">
            Road 13, Block 13, Diamond Estate, Isheri · Opp. Jendol Supermarket
          </div>
        </div>
      </motion.div>

      <motion.div className="relative mt-8 flex w-full max-w-[380px] flex-col gap-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}>
        <button onClick={download} className="btn btn-red w-full" disabled={saving}>
          {saving ? "Preparing…" : "Download ticket"}
        </button>
        <p className="text-center text-xs text-white/40">Or screenshot this page. Don&apos;t share your QR code — it can only be used once.</p>
      </motion.div>
    </Shell>
  );
}
