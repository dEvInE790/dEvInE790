// End-to-end API checks against a running app + LOCAL Supabase (creates real rows!).
// Usage: npm run test:e2e   (BASE defaults to http://localhost:3000)
import { randomBytes } from "node:crypto";

const BASE = process.env.BASE ?? "http://localhost:3000";
const SB = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
let pass = 0, fail = 0;
const ok = (cond, name, extra = "") => { cond ? pass++ : fail++; console.log(`${cond ? "✓" : "✗"} ${name}${extra ? " — " + extra : ""}`); };

const png = () => Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), randomBytes(200)]);
let n = 0;
const phone = () => "0803" + String(1000000 + ++n * 7919 + Math.floor(Math.random() * 999)).slice(-7);
const status = async () => (await fetch(`${BASE}/api/status`)).json();
const s0 = await status();
const cat = (slug) => s0.categories.find((c) => c.slug === slug)?.id;

async function register(over = {}) {
  const body = { categoryId: cat("girls"), fullName: "Test Guest", phone: phone(), email: `g${Date.now()}${randomBytes(3).toString("hex")}@example.com`, ...over };
  const r = await fetch(`${BASE}/api/register`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return { r, d: await r.json(), body };
}
async function pay(reg, over = {}, file = png(), type = "image/png") {
  const fd = new FormData();
  const f = { code: reg.bookingCode, k: reg.k, paymentReference: "REF" + randomBytes(5).toString("hex"), ...over };
  for (const [k, v] of Object.entries(f)) fd.set(k, v);
  if (file) fd.set("receipt", new Blob([file], { type }), "r.png");
  const r = await fetch(`${BASE}/api/payments`, { method: "POST", body: fd });
  return { r, d: await r.json(), f };
}

ok(s0.account_name === "Awal Ayomide Balogun" && s0.account_number === "8141276327", "status exposes PalmPay details");
ok(s0.capacity === 35, "registration limit is 35", String(s0.capacity));
ok(s0.categories.some((c) => c.name === "Girls" && c.price === 3000) && s0.categories.some((c) => c.name === "Boys" && c.price === 4000), "prices Girls ₦3,000 / Boys ₦4,000");

// register
let { r, d } = await register({ categoryId: cat("boys"), amount: 1 });
ok(r.status === 201 && d.status === "registered" && d.amount === 4000, "registration saved as REGISTERED with server-side price", `${r.status} ${d.status} ${d.amount}`);
const first = d;
const st = await (await fetch(`${BASE}/api/registration?code=${first.bookingCode}&k=${first.k}`)).json();
ok(st.status === "registered" && st.amount === 4000, "guest can read their own registration");
ok((await fetch(`${BASE}/api/registration?code=${first.bookingCode}&k=${"0".repeat(48)}`)).status === 404, "wrong link token refused");
const tp = await (await fetch(`${BASE}/ticket/${first.bookingCode}?k=${first.k}`)).text();
ok(/Pay (<!-- -->)?₦4,000(<!-- -->)? now/.test(tp) && !tp.includes("Check-in code"), "unpaid ticket page asks for payment, shows no QR");

// registration validation + duplicates
({ r, d } = await register({ phone: "123" }));
ok(r.status === 400 && d.fieldErrors?.phone, "invalid phone rejected");
({ r, d } = await register({ categoryId: "not-a-uuid" }));
ok(r.status === 400, "missing category rejected");
({ r, d } = await register({ website: "spam" }));
ok(r.status === 400, "honeypot blocks bots");
const dupEmail = await register();
const again = await register({ email: dupEmail.body.email.toUpperCase() });
ok(again.r.status === 409 && /already registered/.test(again.d.error), "same email can't register twice");
const againPhone = await register({ phone: "+234" + dupEmail.body.phone.slice(1) });
ok(againPhone.r.status === 409, "same phone (other format) can't register twice");

// payment
({ r, d } = await pay(first, {}, null));
ok(r.status === 400 && d.fieldErrors?.receipt, "payment without receipt rejected");
({ r, d } = await pay(first, {}, Buffer.from("GIF89a not allowed"), "image/png"));
ok(r.status === 400 && d.fieldErrors?.receipt, "fake image rejected (magic bytes)");
({ r, d } = await pay(first, {}, Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47]), Buffer.alloc(6 * 1024 * 1024)])));
ok(r.status === 400, "receipt over 5 MB rejected");
({ r, d } = await pay({ ...first, k: "f".repeat(48) }));
ok(r.status === 404, "payment with wrong token refused");
const receipt = png();
const p1 = await pay(first, {}, receipt);
ok(p1.r.status === 201 && p1.d.status === "pending", "payment submitted → PENDING (not confirmed)");
({ r, d } = await pay(first));
ok(r.status === 409 && /already submitted/.test(d.error), "can't submit payment twice");
const other = dupEmail.d;
({ r, d } = await pay(other, {}, receipt));
ok(r.status === 409 && /receipt/.test(d.error), "same receipt can't be reused by someone else");
({ r, d } = await pay(other, { paymentReference: p1.f.paymentReference.toLowerCase() }));
ok(r.status === 409 && /reference/.test(d.error), "same payment reference can't be reused");

// capacity rush
const before = await status();
const left = before.remaining;
const results = await Promise.all(Array.from({ length: left + 10 }, () => register()));
const created = results.filter((x) => x.r.status === 201).length;
const after = await status();
ok(created === left && after.remaining === 0 && after.registered === 35, `concurrent rush: ${left} spots → ${created} registered, ${results.length - created} refused, total ${after.registered}/35`);
({ r, d } = await register());
ok(r.status === 409 && /full/.test(d.error), "registration closes at 35", d.error);

// lockdown
const direct = await fetch(`${SB}/rest/v1/bookings?select=*`, { headers: { apikey: ANON, Authorization: `Bearer ${ANON}` } });
ok(direct.status >= 400 || (await direct.text()) === "[]", "anon key cannot read registrations table", `${direct.status}`);
const rpc = await fetch(`${SB}/rest/v1/rpc/kh_register`, { method: "POST", headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, "Content-Type": "application/json" }, body: "{}" });
ok(rpc.status >= 400, "anon key cannot call register function directly", `${rpc.status}`);
for (const [m, u] of [["GET", "/api/admin/overview"], ["GET", "/api/admin/export"], ["PATCH", "/api/admin/bookings/00000000-0000-0000-0000-000000000000"], ["PUT", "/api/admin/settings"], ["POST", "/api/admin/checkin"]]) {
  const x = await fetch(BASE + u, { method: m, headers: { "Content-Type": "application/json" }, body: m === "GET" ? undefined : JSON.stringify({ action: "confirm" }) });
  ok(x.status === 401, `${m} ${u} without login → 401`);
}
const lk = await fetch(`${BASE}/api/tickets/lookup`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: first.bookingCode, contact: "nobody@example.com" }) });
ok(lk.status === 404, "lookup with wrong email refused");

console.log(`\n${pass} passed, ${fail} failed`);
console.log(JSON.stringify({ pending: first.bookingCode, unpaid: other.bookingCode }));
process.exit(fail ? 1 : 0);
