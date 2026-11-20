// End-to-end API checks against a running app + local Supabase.
// Usage: BASE=http://localhost:3000 node scripts/e2e-api.mjs   (needs .env.local loaded)
import { randomBytes } from "node:crypto";

const BASE = process.env.BASE ?? "http://localhost:3000";
const SB = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
let pass = 0, fail = 0;
const ok = (cond, name, extra = "") => { cond ? pass++ : fail++; console.log(`${cond ? "✓" : "✗"} ${name}${extra ? " — " + extra : ""}`); };

const png = () => Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), randomBytes(200)]);
let n = 0;
const phone = () => "0803" + String(1000000 + ++n * 7919).slice(-7);

async function book(over = {}, file = png(), type = "image/png") {
  const status = await (await fetch(`${BASE}/api/status`)).json();
  const cat = status.categories.find((c) => c.slug === (over.slug ?? "girls"));
  const fd = new FormData();
  const f = {
    categoryId: cat?.id ?? over.categoryId, quantity: "1", fullName: "Test Guest",
    phone: phone(), email: `guest${Date.now()}${Math.random().toString(36).slice(2, 6)}@example.com`,
    paymentReference: "REF" + randomBytes(5).toString("hex"), ...over,
  };
  delete f.slug;
  for (const [k, v] of Object.entries(f)) fd.set(k, v);
  if (file) fd.set("receipt", new Blob([file], { type }), "r.png");
  const r = await fetch(`${BASE}/api/bookings`, { method: "POST", body: fd });
  return { r, d: await r.json(), f };
}

const s0 = await (await fetch(`${BASE}/api/status`)).json();
ok(s0.account_name === "Awal Ayomide Balogun" && s0.account_number === "8141276327", "status exposes PalmPay details");
ok(s0.categories.some((c) => c.name === "Girls" && c.price === 3000) && s0.categories.some((c) => c.name === "Boys" && c.price === 4000), "prices Girls ₦3,000 / Boys ₦4,000");

// basic booking → pending, amount computed server-side
let { r, d } = await book({ slug: "boys", quantity: "2", amount: "1" });
ok(r.status === 201 && d.status === "pending" && d.amount === 8000, "booking created as PENDING with server-side total", JSON.stringify(d).slice(0, 90));
const first = d;

// ticket page for pending booking shows no QR
const tp = await (await fetch(BASE + first.ticketUrl)).text();
ok(tp.includes("Pending verification") && !tp.includes("<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0"), "pending ticket page has no QR code");
ok((await fetch(`${BASE}/ticket/${first.bookingCode}?k=${"0".repeat(48)}`).then((x) => x.text())).includes("Ticket not found"), "wrong ticket token is refused");

// validation
({ r, d } = await book({ phone: "123" }));
ok(r.status === 400 && d.fieldErrors?.phone, "invalid phone rejected");
({ r, d } = await book({}, null));
ok(r.status === 400 && d.fieldErrors?.receipt, "missing receipt rejected");
({ r, d } = await book({}, Buffer.from("GIF89a fake not allowed"), "image/png"));
ok(r.status === 400 && d.fieldErrors?.receipt, "non-image disguised as PNG rejected (magic bytes)");
({ r, d } = await book({}, Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47]), Buffer.alloc(6 * 1024 * 1024)])));
ok(r.status === 400, "receipt over 5 MB rejected");
({ r, d } = await book({ quantity: "6" }));
ok(r.status === 400, "quantity above per-booking max rejected");
({ r, d } = await book({ website: "spam" }));
ok(r.status === 400, "honeypot blocks bots");

// duplicates
const dupFile = png();
const a = await book({}, dupFile);
const b = await book({}, dupFile);
ok(a.r.status === 201 && b.r.status === 409 && /receipt/.test(b.d.error), "same receipt can't be reused", b.d.error);
const c = await book({ paymentReference: a.f.paymentReference.toLowerCase() });
ok(c.r.status === 409 && /reference/.test(c.d.error), "same payment reference can't be reused (case-insensitive)");
const e = await book({ email: a.f.email.toUpperCase() });
ok(e.r.status === 409 && /active booking/.test(e.d.error), "same email can't hold two live bookings");
const p = await book({ phone: "+234" + a.f.phone.slice(1) });
ok(p.r.status === 409, "same phone (different format) can't hold two live bookings");

// overbooking under concurrency
const before = await (await fetch(`${BASE}/api/status`)).json();
const left = before.remaining;
const results = await Promise.all(Array.from({ length: left + 8 }, () => book({ quantity: "1" })));
const created = results.filter((x) => x.r.status === 201).length;
const soldOut = results.filter((x) => x.r.status === 409 && /spot/.test(x.d.error)).length;
const after = await (await fetch(`${BASE}/api/status`)).json();
ok(created === left && after.remaining === 0 && after.reserved === after.capacity, `concurrent rush: ${left} spots → ${created} booked, ${soldOut} refused, 0 oversold`);
({ r, d } = await book({}));
ok(r.status === 409 && /taken/.test(d.error), "sold-out message once full", d.error);

// direct database access with the public anon key is blocked
const direct = await fetch(`${SB}/rest/v1/bookings?select=*`, { headers: { apikey: ANON, Authorization: `Bearer ${ANON}` } });
const directBody = await direct.text();
ok(direct.status >= 400 || directBody === "[]", "anon key cannot read bookings table", `${direct.status}`);
const rpc = await fetch(`${SB}/rest/v1/rpc/kh_create_booking`, { method: "POST", headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, "Content-Type": "application/json" }, body: "{}" });
ok(rpc.status >= 400, "anon key cannot call booking function directly", `${rpc.status}`);
const recv = await fetch(`${SB}/storage/v1/object/list/receipts`, { method: "POST", headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, "Content-Type": "application/json" }, body: JSON.stringify({ prefix: "" }) });
const recvBody = await recv.text();
ok(recv.status >= 400 || recvBody === "[]", "anon key cannot list receipts", `${recv.status}`);

// admin APIs need a session
for (const [m, u] of [["GET", "/api/admin/overview"], ["GET", "/api/admin/export"], ["PATCH", `/api/admin/bookings/${"00000000-0000-0000-0000-000000000000"}`], ["PUT", "/api/admin/settings"], ["POST", "/api/admin/checkin"]]) {
  const x = await fetch(BASE + u, { method: m, headers: { "Content-Type": "application/json" }, body: m === "GET" ? undefined : JSON.stringify({ action: "confirm" }) });
  ok(x.status === 401, `${m} ${u} without login → 401`);
}

// lookup
const lk = await fetch(`${BASE}/api/tickets/lookup`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: first.bookingCode, contact: "nobody@example.com" }) });
ok(lk.status === 404, "ticket lookup with wrong email refused");

console.log(`\n${pass} passed, ${fail} failed`);
console.log(JSON.stringify({ firstBooking: first }));
process.exit(fail ? 1 : 0);
