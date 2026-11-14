import "server-only";

export type SupabaseConfig = { url: string; anonKey: string };
export type VarStatus = "ok" | "missing" | "invalid";

/**
 * Supabase connection details, read at request time so they can be set as
 * ordinary Cloudflare Worker variables (no rebuild needed):
 *   SUPABASE_URL       e.g. https://abcdefgh.supabase.co
 *   SUPABASE_ANON_KEY  the project's "anon"/"publishable" key — designed to be
 *                      public; all protection comes from row-level security.
 * Common alternative names and copy-paste slips (quotes, spaces, a trailing
 * path such as /rest/v1, a missing https://) are tolerated.
 */

const URL_NAMES = ["SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_PROJECT_URL"];
const KEY_NAMES = [
  "SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_KEY",
];

const clean = (v: string | undefined) => (v ?? "").trim().replace(/^["'`]+|["'`]+$/g, "").trim();
const firstSet = (names: string[]) => names.map((n) => clean(process.env[n])).find(Boolean) ?? "";

function parseUrl(raw: string): string | null {
  if (!raw) return null;
  try {
    const u = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    if (!u.hostname.includes(".") && u.hostname !== "localhost" && u.hostname !== "127.0.0.1") return null;
    return u.origin;
  } catch {
    return null;
  }
}

const validKey = (k: string) => k.length >= 20 && !/\s/.test(k);

/** Whether each variable was found and looks right — shown on /admin when not connected (never the values). */
export function supabaseStatus(): { url: VarStatus; key: VarStatus; keyLooksSecret: boolean } {
  const rawUrl = firstSet(URL_NAMES);
  const key = firstSet(KEY_NAMES);
  return {
    url: !rawUrl ? "missing" : parseUrl(rawUrl) ? "ok" : "invalid",
    key: !key ? "missing" : validKey(key) ? "ok" : "invalid",
    keyLooksSecret: key.startsWith("sb_secret_") || /"role"\s*:\s*"service_role"/.test(decodeJwtPayload(key)),
  };
}

function decodeJwtPayload(k: string) {
  try {
    const part = k.split(".")[1];
    return part ? atob(part.replace(/-/g, "+").replace(/_/g, "/")) : "";
  } catch {
    return "";
  }
}

export function supabaseConfig(): SupabaseConfig | null {
  const url = parseUrl(firstSet(URL_NAMES));
  const anonKey = firstSet(KEY_NAMES);
  if (!url || !validKey(anonKey)) return null;
  // Never run the public site or the browser admin with a secret/service key.
  if (supabaseStatus().keyLooksSecret) return null;
  return { url, anonKey };
}
