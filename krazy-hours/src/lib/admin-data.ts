import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const BOOKING_COLUMNS =
  "id, booking_code, category_name, amount, full_name, phone, email, payment_reference, receipt_path, paid_submitted_at, status, admin_note, verified_at, checked_in_at, created_at";

export type AdminBooking = {
  id: string;
  booking_code: string;
  category_name: string;
  amount: number;
  full_name: string;
  phone: string;
  email: string;
  payment_reference: string | null;
  receipt_path: string | null;
  paid_submitted_at: string | null;
  status: "registered" | "pending" | "confirmed" | "cancelled";
  admin_note: string | null;
  verified_at: string | null;
  checked_in_at: string | null;
  created_at: string;
};

export async function loadOverview() {
  const db = supabaseAdmin();
  const [bookings, settings, categories] = await Promise.all([
    db.from("bookings").select(BOOKING_COLUMNS).order("created_at", { ascending: false }).limit(2000),
    db.from("event_settings").select("*").eq("id", 1).single(),
    db.from("ticket_categories").select("*").order("sort_order").order("name"),
  ]);
  if (bookings.error) throw new Error(bookings.error.message);
  if (settings.error) throw new Error(settings.error.message);
  if (categories.error) throw new Error(categories.error.message);

  const list = (bookings.data ?? []) as AdminBooking[];
  const count = (s: AdminBooking["status"]) => list.filter((b) => b.status === s).length;
  const money = (s: AdminBooking["status"]) => list.filter((b) => b.status === s).reduce((n, b) => n + b.amount, 0);
  const capacity = settings.data.capacity as number;
  const taken = list.filter((b) => b.status !== "cancelled").length;

  return {
    bookings: list,
    settings: settings.data,
    categories: categories.data,
    stats: {
      capacity,
      registered: taken,
      remaining: Math.max(capacity - taken, 0),
      awaitingPayment: count("registered"),
      pendingCount: count("pending"),
      revenuePending: money("pending"),
      confirmed: count("confirmed"),
      revenueConfirmed: money("confirmed"),
      checkedIn: list.filter((b) => b.status === "confirmed" && !!b.checked_in_at).length,
      girls: list.filter((b) => b.status !== "cancelled" && b.category_name.toLowerCase() === "girls").length,
      boys: list.filter((b) => b.status !== "cancelled" && b.category_name.toLowerCase() === "boys").length,
    },
  };
}
