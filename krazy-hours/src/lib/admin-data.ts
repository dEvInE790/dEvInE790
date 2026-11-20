import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const BOOKING_COLUMNS =
  "id, booking_code, category_name, unit_price, quantity, amount, full_name, phone, email, payment_reference, receipt_path, status, admin_note, verified_at, checked_in_at, created_at";

export type AdminBooking = {
  id: string;
  booking_code: string;
  category_name: string;
  unit_price: number;
  quantity: number;
  amount: number;
  full_name: string;
  phone: string;
  email: string;
  payment_reference: string;
  receipt_path: string;
  status: "pending" | "confirmed" | "rejected" | "cancelled";
  admin_note: string | null;
  verified_at: string | null;
  checked_in_at: string | null;
  created_at: string;
};

export async function loadOverview() {
  const db = supabaseAdmin();
  const [bookings, settings, categories] = await Promise.all([
    db.from("bookings").select(BOOKING_COLUMNS).order("created_at", { ascending: false }).limit(1000),
    db.from("event_settings").select("*").eq("id", 1).single(),
    db.from("ticket_categories").select("*").order("sort_order").order("name"),
  ]);
  if (bookings.error) throw new Error(bookings.error.message);
  if (settings.error) throw new Error(settings.error.message);
  if (categories.error) throw new Error(categories.error.message);

  const list = (bookings.data ?? []) as AdminBooking[];
  const sum = (f: (b: AdminBooking) => boolean, k: "quantity" | "amount") =>
    list.filter(f).reduce((n, b) => n + b[k], 0);

  const stats = {
    capacity: settings.data.capacity as number,
    ticketsConfirmed: sum((b) => b.status === "confirmed", "quantity"),
    ticketsPending: sum((b) => b.status === "pending", "quantity"),
    revenueConfirmed: sum((b) => b.status === "confirmed", "amount"),
    revenuePending: sum((b) => b.status === "pending", "amount"),
    checkedIn: sum((b) => b.status === "confirmed" && !!b.checked_in_at, "quantity"),
    pendingCount: list.filter((b) => b.status === "pending").length,
  };
  return {
    bookings: list,
    settings: settings.data,
    categories: categories.data,
    stats: { ...stats, remaining: Math.max(stats.capacity - stats.ticketsConfirmed - stats.ticketsPending, 0) },
  };
}
