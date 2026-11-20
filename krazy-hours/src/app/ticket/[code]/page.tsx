import type { Metadata } from "next";
import Link from "next/link";
import QRCode from "qrcode";
import { getBookingByToken } from "@/lib/access";
import TicketView, { type TicketData } from "@/components/ticket/TicketView";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your ticket — KRAZY HOURS", robots: { index: false, follow: false } };

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
    const b = await getBookingByToken(bookingCode, k);
    if (b) {
      const confirmed = b.status === "confirmed";
      data = {
        bookingCode: b.booking_code,
        accessToken: b.access_token,
        fullName: b.full_name,
        category: b.category_name,
        amount: b.amount,
        status: b.status,
        checkedIn: !!b.checked_in_at,
        createdAt: b.created_at,
        note: b.status === "registered" || b.status === "cancelled" ? b.admin_note : null,
        // The QR / check-in code only exists on the page once payment is verified.
        checkinCode: confirmed ? b.checkin_code : null,
        qrSvg: confirmed
          ? await QRCode.toString(`KH1|${b.booking_code}|${b.checkin_code}`, {
              type: "svg",
              margin: 0,
              errorCorrectionLevel: "M",
              color: { dark: "#050505", light: "#ffffff" },
            })
          : null,
      };
    }
  }

  if (!data) {
    return (
      <main className="flex min-h-[100svh] flex-col items-center justify-center px-6 text-center">
        <p className="font-graffiti text-6xl text-blood">KH</p>
        <h1 className="mt-4 font-display text-3xl uppercase">Ticket not found</h1>
        <p className="mt-2 max-w-sm text-white/60">This link is invalid. Look your registration up with your Booking ID and email or phone.</p>
        <Link href="/ticket" className="btn btn-red mt-8">Find my ticket</Link>
      </main>
    );
  }
  return <TicketView data={data} />;
}
