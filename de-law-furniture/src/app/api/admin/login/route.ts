import { NextResponse } from "next/server";
import { SESSION_COOKIE, adminPassword, clientIp, createSessionToken, lockoutMinutes, passwordMatches, recordLogin, sameOrigin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!(await sameOrigin())) return NextResponse.json({ ok: false, message: "Invalid request." }, { status: 403 });
  if (!adminPassword()) {
    return NextResponse.json(
      { ok: false, message: "The admin password has not been set up yet. Add an ADMIN_PASSWORD secret (at least 8 characters) in Cloudflare." },
      { status: 503 }
    );
  }
  const ip = await clientIp();
  const wait = await lockoutMinutes(ip);
  if (wait) return NextResponse.json({ ok: false, message: `Too many attempts. Try again in ${wait} minute${wait > 1 ? "s" : ""}.` }, { status: 429 });

  const body = (await req.json().catch(() => ({}))) as { password?: unknown };
  const password = typeof body.password === "string" ? body.password : "";
  const ok = await passwordMatches(password);
  await recordLogin(ip, ok);
  if (!ok) return NextResponse.json({ ok: false, message: "That password is not correct." }, { status: 401 });

  const { token, maxAge } = await createSessionToken();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: new URL(req.url).protocol === "https:",
    sameSite: "lax",
    path: "/",
    maxAge,
  });
  return res;
}
