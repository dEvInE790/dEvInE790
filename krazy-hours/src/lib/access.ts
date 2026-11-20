import "server-only";
import { timingSafeEqual } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";

export function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export const GUEST_COLUMNS =
  "id, booking_code, access_token, checkin_code, full_name, category_name, amount, status, admin_note, payment_reference, paid_submitted_at, checked_in_at, created_at";

export type GuestBooking = {
  id: string;
  booking_code: string;
  access_token: string;
  checkin_code: string;
  full_name: string;
  category_name: string;
  amount: number;
  status: "registered" | "pending" | "confirmed" | "cancelled";
  admin_note: string | null;
  payment_reference: string | null;
  paid_submitted_at: string | null;
  checked_in_at: string | null;
  created_at: string;
};

/** Loads a booking only if the secret link token matches. */
export async function getBookingByToken(code: string, k: string): Promise<GuestBooking | null> {
  const { data } = await supabaseAdmin().from("bookings").select(GUEST_COLUMNS).eq("booking_code", code).maybeSingle();
  if (!data || !safeEqual(data.access_token, k)) return null;
  return data as GuestBooking;
}

/** What the guest may see about their own registration (no secrets). */
export function guestSummary(b: GuestBooking) {
  return {
    bookingCode: b.booking_code,
    fullName: b.full_name,
    category: b.category_name,
    amount: b.amount,
    status: b.status,
    note: b.status === "registered" || b.status === "cancelled" ? b.admin_note : null,
    paymentReference: b.payment_reference,
  };
}
