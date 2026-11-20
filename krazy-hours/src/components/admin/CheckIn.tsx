"use client";
import { useEffect, useRef, useState } from "react";
import { naira } from "@/lib/event";
import type { Booking } from "./Dashboard";

type Lookup = { booking: Booking; alreadyCheckedIn: boolean };

type Detector = { detect: (src: HTMLVideoElement) => Promise<{ rawValue: string }[]> };

export default function CheckIn({ onChange, notify }: { onChange: () => void; notify: (m: string, e?: boolean) => void }) {
  const [code, setCode] = useState("");
  const [result, setResult] = useState<Lookup | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [canScan, setCanScan] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => setCanScan("BarcodeDetector" in window && !!navigator.mediaDevices?.getUserMedia), []);

  const stop = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setScanning(false);
  };
  useEffect(() => stop, []);

  const lookup = async (value: string, commit = false) => {
    if (!value.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/admin/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: value.trim(), commit }),
      });
      const d = await r.json();
      if (!r.ok) {
        setResult(d.booking ? { booking: d.booking, alreadyCheckedIn: false } : null);
        throw new Error(d.error ?? "Lookup failed");
      }
      setResult(d);
      if (commit) {
        notify(d.alreadyCheckedIn ? "Already checked in earlier" : `Admitted ${d.booking.quantity} — ${d.booking.full_name}`, d.alreadyCheckedIn);
        onChange();
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const scan = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      setScanning(true);
      const video = videoRef.current!;
      video.srcObject = stream;
      await video.play();
      const Ctor = (window as unknown as { BarcodeDetector: new (o: object) => Detector }).BarcodeDetector;
      const detector = new Ctor({ formats: ["qr_code"] });
      const tick = async () => {
        if (!streamRef.current) return;
        try {
          const codes = await detector.detect(video);
          if (codes[0]?.rawValue) {
            setCode(codes[0].rawValue);
            stop();
            lookup(codes[0].rawValue);
            return;
          }
        } catch {}
        requestAnimationFrame(tick);
      };
      tick();
    } catch {
      stop();
      setError("Camera unavailable — type the check-in code instead.");
    }
  };

  const b = result?.booking;
  return (
    <div className="mx-auto max-w-lg">
      <h2 className="font-display text-2xl uppercase">Door check-in</h2>
      <p className="mt-1 text-sm text-white/50">Scan the guest&apos;s QR or type their check-in code / Booking ID.</p>
      <form
        className="mt-5 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          lookup(code);
        }}
      >
        <input className="field font-mono uppercase" placeholder="Check-in code or KH-XXXXXX" value={code} onChange={(e) => setCode(e.target.value)} autoCapitalize="characters" />
        <button className="btn btn-red shrink-0" disabled={loading}>Find</button>
      </form>
      {canScan && !scanning && (
        <button onClick={scan} className="btn btn-ghost mt-3 w-full">📷 Scan QR code</button>
      )}
      <div className={`relative mt-3 overflow-hidden rounded-2xl ${scanning ? "" : "hidden"}`}>
        <video ref={videoRef} className="w-full" playsInline muted />
        <div className="pointer-events-none absolute inset-[18%] rounded-2xl border-2 border-blood" />
        <button onClick={stop} className="absolute right-3 top-3 rounded-full bg-black/70 px-3 py-1 text-sm">Stop</button>
      </div>

      {error && <p className="mt-4 rounded-xl border border-[#ff6b61]/40 bg-[#ff6b61]/10 p-4 font-semibold text-[#ffb4ae]" role="alert">⛔ {error}</p>}

      {b && !error && (
        <div className={`mt-4 rounded-2xl border p-5 ${result!.alreadyCheckedIn ? "border-amber-400/50 bg-amber-400/10" : "border-emerald-500/50 bg-emerald-500/10"}`}>
          <p className={`font-display text-2xl uppercase ${result!.alreadyCheckedIn ? "text-amber-300" : "text-emerald-400"}`}>
            {result!.alreadyCheckedIn ? "⚠ Already checked in" : "✓ Valid ticket"}
          </p>
          <p className="mt-2 text-lg font-semibold">{b.full_name}</p>
          <p className="text-white/65">
            Admit <b className="text-white">{b.quantity}</b> · {b.category_name} · {naira(b.amount)} · <span className="font-mono">{b.booking_code}</span>
          </p>
          {b.checked_in_at && <p className="mt-1 text-sm text-white/55">Checked in at {new Date(b.checked_in_at).toLocaleTimeString("en-NG", { timeZone: "Africa/Lagos" })}</p>}
          {!result!.alreadyCheckedIn && (
            <button className="btn btn-red mt-4 w-full" disabled={loading} onClick={() => lookup(b.booking_code, true)}>
              Admit {b.quantity} {b.quantity > 1 ? "guests" : "guest"}
            </button>
          )}
          <button className="mt-3 w-full text-sm text-white/50" onClick={() => { setResult(null); setCode(""); }}>Next guest</button>
        </div>
      )}
    </div>
  );
}
