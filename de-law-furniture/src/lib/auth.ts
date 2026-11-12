import "server-only";
import { cookies, headers } from "next/headers";
import { getDb } from "./db";

/**
 * Admin authentication: one shared password (the ADMIN_PASSWORD secret).
 * A successful login sets an HttpOnly cookie holding an expiry time signed
 * with HMAC-SHA256, using a key derived from the password, so changing the
 * password signs everyone out. Failed logins are rate-limited per IP in D1.
 */

export const SESSION_COOKIE = "dl_admin";
const SESSION_DAYS = 7;
const MAX_FAILURES = 5;
const LOCKOUT_MINUTES = 15;

const enc = new TextEncoder();

const b64url = (buf: ArrayBuffer) =>
  btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

export function adminPassword(): string | null {
  const p = process.env.ADMIN_PASSWORD?.trim();
  return p && p.length >= 8 ? p : null;
}

async function hmac(secret: string, message: string) {
  const key = await crypto.subtle.importKey("raw", enc.encode(`de-law-admin:${secret}`), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(await crypto.subtle.sign("HMAC", key, enc.encode(message)));
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Constant-time password check (compares HMACs, so timing reveals nothing about the password). */
export async function passwordMatches(candidate: string) {
  const real = adminPassword();
  if (!real) return false;
  const [a, b] = await Promise.all([hmac("pw-check", candidate), hmac("pw-check", real)]);
  return safeEqual(a, b);
}

export async function createSessionToken() {
  const real = adminPassword()!;
  const exp = Date.now() + SESSION_DAYS * 86_400_000;
  return { token: `${exp}.${await hmac(real, `session:${exp}`)}`, maxAge: SESSION_DAYS * 86_400 };
}

export async function verifySessionToken(token: string | undefined) {
  const real = adminPassword();
  if (!real || !token) return false;
  const [expStr, sig] = token.split(".");
  const exp = Number(expStr);
  if (!exp || !sig || exp < Date.now()) return false;
  return safeEqual(sig, await hmac(real, `session:${exp}`));
}

export async function isAdmin() {
  const jar = await cookies();
  return verifySessionToken(jar.get(SESSION_COOKIE)?.value);
}

/** Throws unless the request comes from a signed-in admin. Use at the top of every admin action. */
export async function requireAdmin() {
  if (!(await isAdmin())) throw new Error("Your admin session has expired. Please sign in again.");
}

export async function clientIp() {
  const h = await headers();
  return h.get("cf-connecting-ip") || h.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

/** Returns minutes remaining in a lockout, or 0 if this IP may try to log in. */
export async function lockoutMinutes(ip: string) {
  const db = await getDb();
  if (!db) return 0;
  const since = Date.now() - LOCKOUT_MINUTES * 60_000;
  const row = await db
    .prepare("SELECT COUNT(*) AS n, MIN(ts) AS first FROM login_attempts WHERE ip = ? AND ts > ?")
    .bind(ip, since)
    .first<{ n: number; first: number | null }>();
  if (!row || row.n < MAX_FAILURES) return 0;
  return Math.max(1, Math.ceil(((row.first ?? Date.now()) + LOCKOUT_MINUTES * 60_000 - Date.now()) / 60_000));
}

export async function recordLogin(ip: string, ok: boolean) {
  const db = await getDb();
  if (!db) return;
  if (ok) {
    await db.prepare("DELETE FROM login_attempts WHERE ip = ? OR ts < ?").bind(ip, Date.now() - 86_400_000).run();
  } else {
    await db.prepare("INSERT INTO login_attempts (ip, ts) VALUES (?, ?)").bind(ip, Date.now()).run();
  }
}

/** Rejects cross-site requests to admin endpoints (CSRF defence in addition to SameSite cookies). */
export async function sameOrigin() {
  const h = await headers();
  const origin = h.get("origin");
  const host = h.get("x-forwarded-host") || h.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
