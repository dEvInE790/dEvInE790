import "server-only";

export type SupabaseConfig = { url: string; anonKey: string };

/**
 * Supabase connection details, read at request time so they can be set as
 * ordinary Cloudflare Worker variables (no rebuild needed):
 *   SUPABASE_URL       e.g. https://abcdefgh.supabase.co
 *   SUPABASE_ANON_KEY  the project's "anon"/"publishable" key — designed to be
 *                      public; all protection comes from row-level security.
 */
export function supabaseConfig(): SupabaseConfig | null {
  const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim().replace(/\/+$/, "");
  const anonKey = (process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim();
  if (!/^https?:\/\/[^\s/]+$/.test(url) || anonKey.length < 20) return null;
  return { url, anonKey };
}
