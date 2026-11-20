import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { json } from "@/lib/http";
import { loadOverview } from "@/lib/admin-data";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;
  try {
    return json(await loadOverview());
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
}
