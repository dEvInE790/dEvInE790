import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { json, sameOrigin } from "@/lib/http";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const schema = z.object({
  capacity: z.coerce.number().int().min(0).max(10000),
  bookings_open: z.boolean(),
  bank_name: z.string().trim().min(2).max(40),
  account_number: z.string().trim().regex(/^\d{10}$/, "Account number must be 10 digits"),
  account_name: z.string().trim().min(2).max(80),
});

export async function PUT(req: Request) {
  if (!sameOrigin(req)) return json({ error: "Bad origin" }, 403);
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: parsed.error.issues[0]?.message ?? "Invalid settings" }, 400);
  const s = parsed.data;

  const { data, error } = await supabaseAdmin().rpc("kh_update_settings", {
    p_capacity: s.capacity,
    p_bookings_open: s.bookings_open,
    p_bank_name: s.bank_name,
    p_account_number: s.account_number,
    p_account_name: s.account_name,
  });
  if (error) {
    const m = error.message.match(/CAPACITY_BELOW_RESERVED:(\d+)/);
    if (m) return json({ error: `Capacity can't be lower than the ${m[1]} seats already registered.` }, 409);
    return json({ error: error.message }, 500);
  }
  return json({ settings: data });
}
