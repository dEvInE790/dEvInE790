import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { json, sameOrigin } from "@/lib/http";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { bookingErrorMessage } from "@/lib/validation";
import { BOOKING_COLUMNS } from "@/lib/admin-data";

export const dynamic = "force-dynamic";

const schema = z.object({
  action: z.enum(["confirm", "reject", "cancel", "reopen", "checkin", "undo-checkin"]),
  note: z.string().trim().max(300).optional(),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(req)) return json({ error: "Bad origin" }, 403);
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;

  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) return json({ error: "Invalid booking id" }, 400);
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "Invalid action" }, 400);
  const { action, note } = parsed.data;
  const db = supabaseAdmin();

  if (action === "checkin" || action === "undo-checkin") {
    const { data: current } = await db.from("bookings").select("status").eq("id", id).maybeSingle();
    if (!current) return json({ error: "Booking not found" }, 404);
    if (current.status !== "confirmed") return json({ error: "Only confirmed tickets can be checked in." }, 409);
    const { data, error } = await db
      .from("bookings")
      .update(
        action === "checkin"
          ? { checked_in_at: new Date().toISOString(), checked_in_by: admin.id, updated_at: new Date().toISOString() }
          : { checked_in_at: null, checked_in_by: null, updated_at: new Date().toISOString() },
      )
      .eq("id", id)
      .select(BOOKING_COLUMNS)
      .single();
    if (error) return json({ error: error.message }, 500);
    return json({ booking: data });
  }

  const status = { confirm: "confirmed", reject: "rejected", cancel: "cancelled", reopen: "pending" }[action];
  const { error } = await db.rpc("kh_set_booking_status", {
    p_booking_id: id,
    p_status: status,
    p_admin: admin.id,
    p_note: note || null,
  });
  if (error) {
    if (error.message.includes("NOT_FOUND")) return json({ error: "Booking not found" }, 404);
    const m = bookingErrorMessage(error.message);
    return json({ error: m.status === 500 ? error.message : m.message }, m.status);
  }
  const { data } = await db.from("bookings").select(BOOKING_COLUMNS).eq("id", id).single();
  return json({ booking: data });
}
