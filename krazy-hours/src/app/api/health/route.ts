import { createClient } from "@supabase/supabase-js";
import { json } from "@/lib/http";

export const dynamic = "force-dynamic";

/**
 * Setup diagnostics. Never returns key values — only whether they are present,
 * what kind of key it is, and the database's response.
 */
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const kind = (k: string) =>
    !k ? "missing" : k.startsWith("sb_secret_") ? "secret key" : k.startsWith("sb_publishable_") ? "PUBLISHABLE key (wrong one)" : k.startsWith("eyJ") ? "legacy JWT key" : "unrecognised";

  const report: Record<string, unknown> = {
    supabaseUrl: url ? new URL(url).host : "missing",
    publicKey: kind(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""),
    serverKey: kind(key),
    serverKeyLength: key.length,
    serverKeyHasSpaces: /\s/.test(key),
  };

  if (url && key) {
    try {
      const db = createClient(url, key.trim(), { auth: { persistSession: false } });
      const { error } = await db.rpc("kh_public_status");
      report.database = error ? `ERROR: ${error.message}` : "ok";
      const { count, error: aErr } = await db.from("admins").select("*", { count: "exact", head: true });
      report.organisers = aErr ? `ERROR: ${aErr.message}` : count;
    } catch (e) {
      report.database = `ERROR: ${(e as Error).message}`;
    }
  }
  return json(report, 200);
}
