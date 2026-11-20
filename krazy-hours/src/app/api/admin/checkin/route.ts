import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { json, sameOrigin } from "@/lib/http";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { BOOKING_COLUMNS } from "@/lib/admin-data";

export const dynamic = "force-dynamic";

/**
 * Door check-in. Accepts the raw QR payload ("KH1|KH-XXXXXX|CHECKINCODE"),
 * the check-in code alone, or a booking ID. Looking up only — the door staff
 * then confirms with action "commit".
 */
const schema = z.object({ code: z.string().trim().min(4).max(80), commit: z.boolean().optional() });

export async function POST(req: Request) {
  if (!sameOrigin(req)) return json({ error: "Bad origin" }, 403);
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "Enter a check-in code or booking ID" }, 400);

  const raw = parsed.data.code.toUpperCase();
  const parts = raw.split("|");
  const db = supabaseAdmin();
  let query = db.from("bookings").select(BOOKING_COLUMNS);
  if (parts.length === 3 && parts[0] === "KH1") query = query.eq("booking_code", parts[1]).eq("checkin_code", parts[2]);
  else if (/^KH-[A-Z0-9]{6}$/.test(raw)) query = query.eq("booking_code", raw);
  else query = query.eq("checkin_code", raw.replace(/[^A-Z0-9]/g, ""));

  const { data: b } = await query.maybeSingle();
  if (!b) return json({ error: "No ticket matches that code." }, 404);
  if (b.status !== "confirmed") return json({ error: b.status === "registered" ? "Registered but NOT PAID — do not admit." : b.status === "pending" ? "Payment NOT VERIFIED yet — do not admit." : "Registration CANCELLED — do not admit.", booking: b }, 409);
  if (!parsed.data.commit) return json({ booking: b, alreadyCheckedIn: !!b.checked_in_at });
  if (b.checked_in_at) return json({ booking: b, alreadyCheckedIn: true });

  const { data, error } = await db
    .from("bookings")
    .update({ checked_in_at: new Date().toISOString(), checked_in_by: admin.id, updated_at: new Date().toISOString() })
    .eq("id", b.id)
    .is("checked_in_at", null)
    .select(BOOKING_COLUMNS)
    .maybeSingle();
  if (error) return json({ error: error.message }, 500);
  return json({ booking: data ?? b, alreadyCheckedIn: !data });
}
