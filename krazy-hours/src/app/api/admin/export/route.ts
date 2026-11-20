import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { BOOKING_COLUMNS, type AdminBooking } from "@/lib/admin-data";

export const dynamic = "force-dynamic";

function cell(v: unknown) {
  let s = v == null ? "" : String(v);
  // Neutralise spreadsheet formula injection
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return `"${s.replace(/"/g, '""')}"`;
}

export async function GET(req: Request) {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;
  const status = new URL(req.url).searchParams.get("status");

  let q = supabaseAdmin().from("bookings").select(BOOKING_COLUMNS).order("created_at", { ascending: true });
  if (status && ["registered", "pending", "confirmed", "cancelled"].includes(status)) q = q.eq("status", status);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const header = [
    "Booking ID", "Name", "Phone", "Email", "Category", "Amount (NGN)", "Status",
    "Payment reference", "Registered at", "Payment submitted at", "Verified at", "Checked in at", "Admin note",
  ];
  const rows = (data as AdminBooking[]).map((b) =>
    [
      b.booking_code, b.full_name, b.phone, b.email, b.category_name, b.amount,
      b.status === "registered" ? "registered (unpaid)" : b.status === "pending" ? "payment to verify" : b.status,
      b.payment_reference, b.created_at, b.paid_submitted_at, b.verified_at, b.checked_in_at, b.admin_note,
    ].map(cell).join(","),
  );
  const csv = "﻿" + [header.map(cell).join(","), ...rows].join("\r\n");
  const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="krazy-hours-bookings-${status ?? "all"}-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
