import { timingSafeEqual } from "node:crypto";
import type { Metadata } from "next";
import Link from "next/link";
import QRCode from "qrcode";
import { supabaseAdmin } from "@/lib/supabase/admin";
import TicketView, { type TicketData } from "@/components/ticket/TicketView";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your ticket — KRAZY HOURS", robots: { index: false, follow: false } };

function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export default async function TicketPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ k?: string }>;
}) {
  const { code } = await params;
  const { k } = await searchParams;
  const bookingCode = decodeURIComponent(code).toUpperCase();

  let data: TicketData | null = null;
  if (/^KH-[A-Z0-9]{6}$/.test(bookingCode) && k && /^[a-f0-9]{48}$/.test(k)) {
    const { data: b } = await supabaseAdmin()
      .from("bookings")
      .select("booking_code, access_token, checkin_code, full_name, category_name, quantity, amount, status, checked_in_at, created_at, admin_note")
      .eq("booking_code", bookingCode)
      .maybeSingle();

    if (b && safeEqual(b.access_token, k)) {
      const confirmed = b.status === "confirmed";
      const payload = `KH1|${b.booking_code}|${b.checkin_code}`;
      data = {
        bookingCode: b.booking_code,
        fullName: b.full_name,
        category: b.category_name,
        quantity: b.quantity,
        amount: b.amount,
        status: b.status,
        checkedIn: !!b.checked_in_at,
        createdAt: b.created_at,
        note: b.status === "rejected" ? b.admin_note : null,
        // The QR / check-in code only exists on the page once payment is verified.
        checkinCode: confirmed ? b.checkin_code : null,
        qrSvg: confirmed
          ? await QRCode.toString(payload, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#050505", light: "#ffffff" } })
          : null,
      };
    }
  }

  if (!data) {
    return (
      <main className="flex min-h-[100svh] flex-col items-center justify-center px-6 text-center">
        <p className="font-graffiti text-6xl text-blood">KH</p>
        <h1 className="mt-4 font-display text-3xl uppercase">Ticket not found</h1>
        <p className="mt-2 max-w-sm text-white/60">This ticket link is invalid. Look your booking up with your Booking ID and email or phone.</p>
        <Link href="/ticket" className="btn btn-red mt-8">Find my ticket</Link>
      </main>
    );
  }
  return <TicketView data={data} />;
}
