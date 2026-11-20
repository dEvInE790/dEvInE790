import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { json } from "@/lib/http";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/** Short-lived signed URL so receipts are never publicly reachable. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;
  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) return json({ error: "Invalid booking id" }, 400);

  const db = supabaseAdmin();
  const { data: b } = await db.from("bookings").select("receipt_path").eq("id", id).maybeSingle();
  if (!b) return json({ error: "Booking not found" }, 404);
  if (!b.receipt_path) return json({ error: "No receipt uploaded yet." }, 404);
  const { data, error } = await db.storage.from("receipts").createSignedUrl(b.receipt_path, 120);
  if (error || !data) return json({ error: "Could not load receipt" }, 500);
  return json({ url: data.signedUrl, isPdf: b.receipt_path.endsWith(".pdf") });
}
