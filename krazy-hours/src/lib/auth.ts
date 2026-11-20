import "server-only";
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export type AdminUser = { id: string; email: string | null };

/**
 * Returns the signed-in user only if they are listed in public.admins.
 * getUser() re-validates the JWT with Supabase Auth (not just the cookie).
 */
export async function getAdmin(): Promise<AdminUser | null> {
  try {
    const supabase = await supabaseServer();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return null;
    const { data: row } = await supabaseAdmin()
      .from("admins")
      .select("user_id")
      .eq("user_id", data.user.id)
      .maybeSingle();
    if (!row) return null;
    return { id: data.user.id, email: data.user.email ?? null };
  } catch (e) {
    console.error("admin check failed:", (e as Error).message);
    return null;
  }
}

/** For API routes: returns the admin or a 401/403 response. */
export async function requireAdmin(): Promise<AdminUser | NextResponse> {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Not authorised" }, { status: 401 });
  return admin;
}
