import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { json, sameOrigin } from "@/lib/http";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const fields = {
  name: z.string().trim().min(1).max(40),
  price: z.coerce.number().int().min(0).max(10_000_000),
  description: z.string().trim().max(120).nullable().optional(),
  active: z.boolean(),
  sort_order: z.coerce.number().int().min(0).max(999),
};
const createSchema = z.object(fields);
const updateSchema = z.object({ id: z.uuid(), ...fields });

function slugify(name: string) {
  return (
    name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 24) ||
    "ticket"
  ) + "-" + Math.random().toString(36).slice(2, 6);
}

export async function POST(req: Request) {
  if (!sameOrigin(req)) return json({ error: "Bad origin" }, 403);
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;
  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: parsed.error.issues[0]?.message ?? "Invalid category" }, 400);
  const { data, error } = await supabaseAdmin()
    .from("ticket_categories")
    .insert({ ...parsed.data, slug: slugify(parsed.data.name) })
    .select()
    .single();
  if (error) return json({ error: error.message }, 500);
  return json({ category: data }, 201);
}

/** Price changes apply to NEW bookings only — existing bookings keep their snapshot price. */
export async function PATCH(req: Request) {
  if (!sameOrigin(req)) return json({ error: "Bad origin" }, 403);
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;
  const parsed = updateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: parsed.error.issues[0]?.message ?? "Invalid category" }, 400);
  const { id, ...rest } = parsed.data;
  const { data, error } = await supabaseAdmin().from("ticket_categories").update(rest).eq("id", id).select().single();
  if (error) return json({ error: error.message }, 500);
  return json({ category: data });
}
