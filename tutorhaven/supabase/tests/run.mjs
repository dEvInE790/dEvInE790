// Payment and subscription integration tests.
//
// Runs the real Edge Function logic (functions/_shared/core.ts) against a real
// Postgres with every migration applied, and a Paystack simulator that behaves
// like Paystack's API (initialize → checkout → verify / webhook / refund).
//
//   sudo bash db/setup.sh            # throwaway local Postgres 16 with the migrations
//   npm install && npm test          # or: DATABASE_URL=postgres://… npm test
//
// These tests never contact Paystack. Use your Paystack *test* keys and the
// checklist in TESTING.md for the end-to-end run against Paystack itself.
import pg from 'pg'
import { createHmac } from 'node:crypto'
import { createServer } from 'node:http'
import * as core from '../functions/_shared/core.ts'
import { paystackApi } from '../functions/_shared/paystack.ts'
import * as aiCore from '../functions/_shared/ai.ts'

const DB = process.env.DATABASE_URL ?? 'postgres://postgres@localhost:5499/tutorhaven'
const pool = new pg.Pool({ connectionString: DB, max: 8 })
const SECRET = 'sk_test_simulator_only_not_a_real_key'
const APP = 'http://localhost:5173'

// ---------------------------------------------------------------------------
// Database access as a given identity (mirrors PostgREST: SET ROLE + JWT claims)
// ---------------------------------------------------------------------------
const retset = new Map()
async function isSetReturning(fn) {
  if (!retset.has(fn)) {
    const { rows } = await pool.query(`select bool_or(proretset) s from pg_proc where proname = $1 and pronamespace = 'public'::regnamespace`, [fn])
    retset.set(fn, !!rows[0]?.s)
  }
  return retset.get(fn)
}

async function asIdentity(who, run) {
  const c = await pool.connect()
  try {
    await c.query('begin')
    if (who !== 'postgres') {
      await c.query(`select set_config('role', $1, true), set_config('request.jwt.claim.sub', $2, true), set_config('request.jwt.claim.role', $1, true)`,
        [who === 'service' ? 'service_role' : who === 'anon' ? 'anon' : 'authenticated', typeof who === 'string' ? '' : who.id])
    }
    const out = await run(c)
    await c.query('commit')
    return out
  } catch (e) {
    await c.query('rollback').catch(() => {})
    throw e
  } finally {
    c.release()
  }
}

/** Calls public.<fn>(named args) the way supabase-js .rpc() does. Never throws. */
async function rpc(who, fn, args = {}) {
  const keys = Object.keys(args)
  const call = `public.${fn}(${keys.map((k, i) => `${k} => $${i + 1}`).join(', ')})`
  const values = keys.map((k) => (args[k] !== null && typeof args[k] === 'object' && !Array.isArray(args[k]) ? JSON.stringify(args[k]) : args[k]))
  try {
    const rows = await asIdentity(who, async (c) => (await c.query(`select to_jsonb(t) as r from ${call} t`, values)).rows)
    const data = (await isSetReturning(fn)) ? rows.map((r) => r.r) : rows[0]?.r ?? null
    return { data, error: null }
  } catch (e) {
    return { data: null, error: { message: e.message } }
  }
}
const sql = (who, text, params = []) => asIdentity(who, async (c) => (await c.query(text, params)).rows)
const one = async (text, params = []) => (await sql('postgres', text, params))[0]

// ---------------------------------------------------------------------------
// Paystack simulator
// ---------------------------------------------------------------------------
const paystack = {
  tx: new Map(),
  refunds: [],
  down: false,
  calls: [],
  async initialize(body) {
    this.calls.push(['initialize', body])
    if (this.down) throw new Error('Paystack is unavailable')
    if (!body.email || !Number.isInteger(body.amount) || body.amount <= 0) throw new Error('Invalid initialize body')
    if (this.tx.has(body.reference)) throw new Error('Duplicate Transaction Reference')
    this.tx.set(body.reference, { ...body, id: Math.floor(Math.random() * 1e9), status: 'abandoned', paid_at: null, channel: null, gateway_response: 'The transaction was not completed' })
    return { authorization_url: `https://checkout.paystack.com/sim${body.reference}`, access_code: 'sim', reference: body.reference }
  },
  async verify(reference) {
    this.calls.push(['verify', reference])
    if (this.down) throw new Error('Paystack is unavailable')
    const t = this.tx.get(reference)
    if (!t) throw new Error('Transaction reference not found')
    return { id: t.id, status: t.status, reference, amount: t.paidAmount ?? t.amount, currency: t.paidCurrency ?? t.currency, paid_at: t.paid_at, channel: t.channel, gateway_response: t.gateway_response }
  },
  banks: [{ name: 'Access Bank', code: '044' }, { name: 'Guaranty Trust Bank', code: '058' }],
  accounts: { '044:0123456789': 'TOBI TUTOR', '058:1111111111': 'TOBI TUTOR' },
  subaccounts: new Map(),
  async listBanks() {
    this.calls.push(['banks'])
    return this.banks
  },
  async resolveAccount(accountNumber, bankCode) {
    const name = this.accounts[`${bankCode}:${accountNumber}`]
    if (!name) throw new Error('Could not resolve account name. Check parameters or try again.')
    return { account_number: accountNumber, account_name: name }
  },
  async createSubaccount(body) {
    const code = 'ACCT_sim' + (this.subaccounts.size + 1)
    this.subaccounts.set(code, body)
    this.calls.push(['createSubaccount', body])
    return { subaccount_code: code }
  },
  async updateSubaccount(code, body) {
    this.subaccounts.set(code, { ...this.subaccounts.get(code), ...body })
    this.calls.push(['updateSubaccount', code, body])
    return { subaccount_code: code }
  },
  async refund(reference, amount) {
    this.calls.push(['refund', reference, amount])
    if (!this.tx.get(reference) || this.tx.get(reference).status !== 'success') throw new Error('Transaction has not been paid')
    this.refunds.push({ reference, amount })
    return { status: 'pending' }
  },
  /** What happens on Paystack's checkout page. */
  complete(reference, { status = 'success', amount, currency, gateway_response } = {}) {
    const t = this.tx.get(reference)
    if (!t) throw new Error('no such tx ' + reference)
    Object.assign(t, { status, paid_at: status === 'success' ? new Date().toISOString() : null, channel: 'card',
      gateway_response: gateway_response ?? (status === 'success' ? 'Approved' : status === 'failed' ? 'Declined' : t.gateway_response),
      paidAmount: amount, paidCurrency: currency })
  },
}

const deps = {
  paystack,
  secret: SECRET,
  appUrls: APP,
  functionsUrl: 'https://project.supabase.co/functions/v1',
  service: (fn, args) => rpc('service', fn, args),
  asUser: (req) => {
    const id = (req.headers.get('Authorization') ?? '').replace(/^Bearer /, '')
    return (fn, args) => rpc(id ? { id } : 'anon', fn, args)
  },
  getPayment: async (id) => (await sql('service', 'select * from payments where id = $1', [id]))[0] ?? null,
}

// Requests as the apps / Paystack would send them.
const post = (user, body) => new Request('https://project.supabase.co/functions/v1/x', {
  method: 'POST', headers: { Authorization: user ? `Bearer ${user.id}` : '', 'content-type': 'application/json' }, body: JSON.stringify(body),
})
const signed = (event, secret = SECRET) => {
  const raw = JSON.stringify(event)
  return new Request('https://project.supabase.co/functions/v1/paystack-webhook', {
    method: 'POST', headers: { 'x-paystack-signature': createHmac('sha512', secret).update(raw).digest('hex'), 'content-type': 'application/json' }, body: raw,
  })
}
const callback = (reference, extra = '') => new Request(
  `https://project.supabase.co/functions/v1/paystack-callback?redirect=${encodeURIComponent(APP + '/checkout/return')}&reference=${reference}${extra}`)
const body = async (res) => ({ status: res.status, ...(await res.json()) })
const chargeSuccess = (ref) => ({ event: 'charge.success', data: { id: paystack.tx.get(ref).id, reference: ref, status: 'success', amount: paystack.tx.get(ref).amount, currency: 'NGN' } })

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
let n = 0
async function user(role, name) {
  const email = `${name.toLowerCase().replace(/\W+/g, '.')}.${++n}@example.test`
  const { id } = await one(`insert into auth.users (email, raw_user_meta_data) values ($1, $2) returning id`,
    [email, JSON.stringify({ role: role === 'admin' ? 'student' : role, full_name: name })])
  if (role === 'admin') await sql('postgres', `update profiles set role = 'admin' where id = $1`, [id])
  return { id, email, name }
}
async function approvedTutor(name, rate = 10000, { payout = true } = {}) {
  const t = await user('tutor', name)
  await sql('postgres', `update tutors set status = 'approved', hourly_rate = $2, subjects = '{Mathematics,Physics}', timezone = 'Africa/Lagos' where id = $1`, [t.id, rate])
  await sql('postgres', `insert into availability (tutor_id, weekday, start_minute, end_minute) select $1, d, 360, 1320 from generate_series(0, 6) d`, [t.id])
  if (payout) {
    await sql('postgres', `insert into tutor_payout_accounts (tutor_id, bank_code, bank_name, account_number_last4, account_name, subaccount_code)
      values ($1, '044', 'Access Bank', '0000', $2, $3)`, [t.id, name.toUpperCase(), 'ACCT_fixture_' + t.id.slice(0, 8)])
  }
  return t
}
let slot = 0
/** A free hour on a future day, inside every test tutor's availability. */
async function nextSlot() {
  slot++
  const { at } = await one(`select ((date_trunc('day', now() at time zone 'Africa/Lagos') + make_interval(days => 2 + $1 / 10, hours => 8 + $1 % 10)) at time zone 'Africa/Lagos') as at`, [slot])
  return at
}
async function book(learner, tutor, at) {
  const r = await rpc(learner, 'create_booking', { p_tutor: tutor.id, p_student: learner.id, p_subject: 'Mathematics', p_starts_at: at ?? await nextSlot(), p_duration: 60 })
  if (r.error) throw new Error('create_booking: ' + r.error.message)
  return r.data
}
const plan = async (code) => one('select * from subscription_plans where code = $1', [code])
async function checkout(u, payload) {
  const res = await body(await core.handleInit(post(u, { redirect_url: APP + '/checkout/return', ...payload }), deps))
  if (res.status !== 200) throw new Error('init failed: ' + res.error)
  return res
}
async function subscribe(u, code) {
  const { reference } = await checkout(u, { kind: 'subscription', plan_id: (await plan(code)).id })
  paystack.complete(reference)
  const res = await body(await core.handleVerify(post(u, { reference }), deps))
  return { reference, res }
}

// ---------------------------------------------------------------------------
// Tiny test runner
// ---------------------------------------------------------------------------
const results = []
async function test(name, fn) {
  try {
    await fn()
    results.push(['PASS', name])
  } catch (e) {
    results.push(['FAIL', name, e.stack?.split('\n').slice(0, 3).join(' | ') ?? String(e)])
  }
}
function eq(actual, expected, what = '') {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`${what}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
}
function ok(cond, what) { if (!cond) throw new Error(what) }
function denied(r, pattern, what) {
  ok(r.error, `${what}: expected an error, got ${JSON.stringify(r.data)}`)
  if (pattern) ok(pattern.test(r.error.message), `${what}: unexpected error "${r.error.message}"`)
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
await sql('postgres', `delete from auth.users where email like '%@example.test'`)
await sql('postgres', `update platform_settings set tutor_subscription_required = true, hold_minutes = 30 where id = 1`)

const admin = await user('admin', 'Ada Admin')
const student = await user('student', 'Sola Student')
const student2 = await user('student', 'Bisi Learner')
const parent = await user('parent', 'Pat Parent')
const tutor = await approvedTutor('Tobi Tutor', 10000, { payout: false })

await test('demo mode is gone: no test_mode setting, no simulated payment functions', async () => {
  const cols = await sql('postgres', `select column_name from information_schema.columns where table_name = 'platform_settings'`)
  ok(!cols.some((c) => c.column_name === 'test_mode'), 'test_mode column still exists')
  const fns = await sql('postgres', `select proname from pg_proc where proname in ('pay_for_booking', 'subscribe') and pronamespace = 'public'::regnamespace`)
  eq(fns.length, 0, 'simulated payment functions')
})

await test('plans are public; only admins manage them', async () => {
  const r = await sql('anon', 'select code, price from subscription_plans order by audience, sort_order')
  eq(r.map((p) => p.code), ['plus', 'family', 'tutor_pro'], 'plans visible to anon')
  denied(await rpc(student, 'admin_upsert_plan', { p: { id: (await plan('plus')).id, price: 1 } }), /Admins only/, 'student edits plan')
  const up = await rpc(admin, 'admin_upsert_plan', { p: { id: (await plan('tutor_pro')).id, price: 6000 } })
  eq(Number(up.data?.price), 6000, 'admin sets tutor plan price')
  denied(await rpc(admin, 'admin_upsert_plan', { p: { id: (await plan('tutor_pro')).id, price: 50 } }), /check/, 'price below ₦100')
  const hidden = await rpc(admin, 'admin_upsert_plan', { p: { code: 'old_plan', audience: 'learner', name: 'Old', price: 1000, is_active: false } })
  ok(hidden.data?.id, 'admin creates plan')
  eq((await sql({ id: student.id }, `select count(*)::int c from subscription_plans where code = 'old_plan'`))[0].c, 0, 'inactive plan hidden from users')
})

await test('server-only payment functions cannot be called by users', async () => {
  for (const [fn, args] of [
    ['fulfill_payment', { p_reference: 'x', p_amount_kobo: 1, p_currency: 'NGN', p_payload: {} }],
    ['mark_payment_unsuccessful', { p_reference: 'x', p_status: 'failed' }],
    ['record_refund', { p_payment: '00000000-0000-0000-0000-000000000000', p_status: 'refunded' }],
    ['apply_refund_webhook', { p_reference: 'x', p_success: true }],
    ['log_payment_event', { p_reference: 'x', p_event: 'x', p_source: 'admin' }],
    ['payment_event_seen', { p_key: 'x' }],
    ['notify', { p_user: student.id, p_kind: 'x', p_title: 'x' }],
    ['run_maintenance', {}],
    ['has_active_subscription', { p_user: student.id, p_audience: 'learner' }],
    ['is_suspended', { p_user: student.id }],
  ]) {
    denied(await rpc(student, fn, args), /permission denied/, `student → ${fn}`)
    denied(await rpc('anon', fn, args), /permission denied/, `anon → ${fn}`)
  }
})

await test('payout account: tutors verify their bank and get a Paystack subaccount', async () => {
  const call = async (u, payload) => body(await core.handlePayoutAccount(post(u, payload), deps))
  eq((await call(student, { action: 'banks' })).status, 403, 'learners cannot add payout accounts')
  const banks = await call(tutor, { action: 'banks' })
  eq(banks.banks.map((b) => b.code), ['044', '058'], 'bank list')
  eq((await call(tutor, { action: 'resolve', bank_code: '044', account_number: '01234' })).error, 'Enter your 10-digit account number', 'short number')
  eq((await call(tutor, { action: 'resolve', bank_code: '999', account_number: '0123456789' })).error, 'Choose your bank from the list', 'unknown bank')
  ok(/couldn’t verify/.test((await call(tutor, { action: 'resolve', bank_code: '044', account_number: '9999999999' })).error), 'unresolvable account')
  eq((await call(tutor, { action: 'resolve', bank_code: '044', account_number: '0123456789' })).account_name, 'TOBI TUTOR', 'resolved name')
  const saved = await call(tutor, { action: 'save', bank_code: '044', account_number: '0123456789' })
  eq([saved.bank_name, saved.account_number_last4, saved.account_name, saved.subaccount_code], ['Access Bank', '6789', 'TOBI TUTOR', 'ACCT_sim1'], 'saved account')
  const created = paystack.calls.find((c) => c[0] === 'createSubaccount')[1]
  eq([created.settlement_bank, created.account_number, created.percentage_charge], ['044', '0123456789', 0], 'subaccount created with no default charge')
  eq((await sql({ id: tutor.id }, 'select account_number_last4 from tutor_payout_accounts'))[0]?.account_number_last4, '6789', 'tutor sees own account')
  eq((await sql({ id: student.id }, 'select * from tutor_payout_accounts')).length, 0, 'others cannot see it')
  eq((await sql('anon', 'select * from tutor_payout_accounts').catch(() => [])).length, 0, 'anon cannot see it')
  denied(await rpc(tutor, 'save_payout_account', { p_tutor: tutor.id, p_bank_code: '1', p_bank_name: 'x', p_account_last4: '0000', p_account_name: 'x', p_subaccount_code: 'x' }), /permission denied/, 'cannot write directly')
  // Changing bank updates the same Paystack subaccount.
  const again = await call(tutor, { action: 'save', bank_code: '058', account_number: '1111111111' })
  eq([again.subaccount_code, again.bank_name], ['ACCT_sim1', 'Guaranty Trust Bank'], 'updated account')
  ok(paystack.calls.some((c) => c[0] === 'updateSubaccount' && c[1] === 'ACCT_sim1'), 'subaccount updated, not duplicated')
  eq((await one(`select count(*)::int c from notifications where user_id = $1 and kind = 'payout_account'`, [tutor.id])).c, 2, 'tutor notified')
})

await test('unsubscribed tutor is hidden and cannot be booked', async () => {
  eq((await sql('anon', 'select id from tutor_directory where id = $1', [tutor.id])).length, 0, 'listed without subscription')
  denied(await rpc(student, 'create_booking', { p_tutor: tutor.id, p_student: student.id, p_subject: 'Maths', p_starts_at: await nextSlot(), p_duration: 60 }),
    /not taking bookings/, 'booking unlisted tutor')
  eq((await sql('anon', 'select json_extract_path_text(public_stats(), \'tutors\') t'))[0].t, '0', 'public stats count')
})

await test('learners cannot buy tutor plans and vice versa', async () => {
  const a = await body(await core.handleInit(post(student, { kind: 'subscription', plan_id: (await plan('tutor_pro')).id, redirect_url: APP }), deps))
  eq([a.status, a.error], [400, 'This plan is for tutors'], 'student buys tutor plan')
  const b = await body(await core.handleInit(post(tutor, { kind: 'subscription', plan_id: (await plan('plus')).id, redirect_url: APP }), deps))
  eq([b.status, b.error], [400, 'This plan is for students and parents'], 'tutor buys learner plan')
})

await test('return addresses are restricted (no open redirects)', async () => {
  const a = await body(await core.handleInit(post(tutor, { kind: 'subscription', plan_id: (await plan('tutor_pro')).id, redirect_url: 'https://evil.example/steal' }), deps))
  eq(a.status, 400, 'init with foreign redirect')
  const res = await core.handleCallback(new Request('https://x/functions/v1/paystack-callback?reference=TH-1&redirect=https://evil.example'), deps)
  eq(res.status, 400, 'callback with foreign redirect')
})

let tutorRef
await test('tutor subscription: pending → paid via callback → active and listed', async () => {
  const init = await checkout(tutor, { kind: 'subscription', plan_id: (await plan('tutor_pro')).id })
  tutorRef = init.reference
  eq(Number(init.amount), 6000, 'server-side price')
  ok(init.authorization_url.startsWith('https://checkout.paystack.com/'), 'checkout url')
  const sent = paystack.tx.get(tutorRef)
  eq([sent.amount, sent.currency, sent.email], [600000, 'NGN', tutor.email], 'Paystack initialize body (kobo)')
  eq((await one('select status from subscriptions where user_id = $1', [tutor.id])).status, 'pending', 'subscription pending before payment')

  paystack.complete(tutorRef)
  const res = await core.handleCallback(callback(tutorRef, '&status=success'), deps)
  eq(res.status, 302, 'callback redirects')
  const loc = new URL(res.headers.get('Location'))
  eq([loc.origin + loc.pathname, loc.searchParams.get('status')], [APP + '/checkout/return', 'succeeded'], 'redirect target')

  const sub = await one(`select status, current_period_end > now() + interval '27 days' and current_period_end < now() + interval '32 days' as month from subscriptions where user_id = $1 and audience = 'tutor'`, [tutor.id])
  eq([sub.status, sub.month], ['active', true], 'subscription active for a month')
  eq((await sql('anon', 'select id from tutor_directory where id = $1', [tutor.id])).length, 1, 'listed after payment')
  const pay = await one(`select kind, amount, status, audience, provider from payments where provider_ref = $1`, [tutorRef])
  eq([pay.kind, Number(pay.amount), pay.status, pay.audience, pay.provider], ['subscription', 6000, 'succeeded', 'tutor', 'paystack'], 'payment row')
  eq((await one(`select platform_fee, tutor_share from payments where provider_ref = $1`, [tutorRef])), { platform_fee: '6000.00', tutor_share: '0.00' }, 'subscriptions are all platform revenue')
  ok(!sent.subaccount, 'subscriptions are not split')
  ok((await one(`select count(*)::int c from notifications where user_id = $1 and kind = 'subscription_active'`, [tutor.id])).c === 1, 'notification sent')
})

await test('verify after webhook already fulfilled is a no-op', async () => {
  const r = await body(await core.handleVerify(post(tutor, { reference: tutorRef }), deps))
  eq(r.status, 'succeeded', 'status')
  eq((await one('select count(*)::int c from payments where provider_ref = $1', [tutorRef])).c, 1, 'single payment row')
})

let bookingA, refA
await test('session: forged "success" from the browser does not confirm anything', async () => {
  bookingA = await book(student, tutor)
  eq(bookingA.status, 'pending_payment', 'booking status')
  const init = await checkout(student, { kind: 'session', booking_id: bookingA.id })
  refA = init.reference
  eq(Number(init.amount), 10000, 'price from tutor rate')
  // The user lands on the callback URL by hand, claiming success. Paystack says otherwise.
  const res = await core.handleCallback(callback(refA, '&status=success&trxref=' + refA), deps)
  eq(new URL(res.headers.get('Location')).searchParams.get('status'), 'abandoned', 'callback status')
  eq((await one('select status from bookings where id = $1', [bookingA.id])).status, 'pending_payment', 'booking unchanged')
  eq((await one('select status from payment_intents where reference = $1', [refA])).status, 'abandoned', 'intent abandoned')
  // Users can't update their own payment records directly either.
  await sql({ id: student.id }, `update payment_intents set status = 'succeeded' where reference = $1`, [refA])
  await sql({ id: student.id }, `update bookings set status = 'confirmed' where id = $1`, [bookingA.id]).catch(() => {})
  eq((await one('select status from payment_intents where reference = $1', [refA])).status, 'abandoned', 'intent not writable by user')
  eq((await one('select status from bookings where id = $1', [bookingA.id])).status, 'pending_payment', 'booking not writable by user')
  denied(await rpc(student, 'fulfill_payment', { p_reference: refA, p_amount_kobo: 1000000, p_currency: 'NGN', p_payload: {} }), /permission denied/, 'fulfil directly')
})

await test('session: abandoned checkout completed later is confirmed by the webhook', async () => {
  paystack.complete(refA)
  const res = await body(await core.handleWebhook(signed(chargeSuccess(refA)), deps))
  eq([res.status, res.outcome], [200, 'succeeded'], 'webhook outcome')
  const b = await one('select status, amount_paid from bookings where id = $1', [bookingA.id])
  eq([b.status, Number(b.amount_paid)], ['confirmed', 10000], 'booking confirmed')
  eq((await one(`select status from payment_intents where reference = $1`, [refA])).status, 'succeeded', 'intent succeeded')
  const sent = paystack.tx.get(refA)
  eq([sent.subaccount, sent.transaction_charge, sent.bearer], ['ACCT_sim1', 150000, 'account'], 'Paystack split: 15% to TutorHaven, rest to the tutor')
  const pay = await one(`select tutor_id, platform_fee, tutor_share, split_subaccount from payments where provider_ref = $1`, [refA])
  eq([pay.tutor_id, pay.platform_fee, pay.tutor_share, pay.split_subaccount], [tutor.id, '1500.00', '8500.00', 'ACCT_sim1'], 'payment split recorded')
  eq((await rpc(tutor, 'my_earnings')).data.total, 8500, 'tutor earnings')
  const notes = await sql('postgres', `select user_id, kind from notifications where kind in ('booking_confirmed', 'new_booking') order by kind`)
  eq(notes.map((x) => x.kind), ['booking_confirmed', 'new_booking'], 'student and tutor notified')
})

await test('duplicate webhook delivery is processed once', async () => {
  const again = await body(await core.handleWebhook(signed(chargeSuccess(refA)), deps))
  eq(again.duplicate, true, 'second delivery flagged duplicate')
  eq((await one('select count(*)::int c from payments where provider_ref = $1', [refA])).c, 1, 'one payment row')
  eq((await one(`select count(*)::int c from notifications where kind = 'booking_confirmed'`)).c, 1, 'one notification')
  eq((await one(`select count(*)::int c from payment_events where reference = $1 and event = 'webhook.charge.success'`, [refA])).c, 1, 'one processed event')
})

await test('webhooks with a bad or missing signature are rejected and logged', async () => {
  const b = await bookAndInit(student2)
  paystack.complete(b.reference)
  const forged = signed(chargeSuccess(b.reference), 'sk_test_wrong_key')
  eq((await core.handleWebhook(forged, deps)).status, 401, 'bad signature')
  const missing = new Request('https://x/paystack-webhook', { method: 'POST', body: JSON.stringify(chargeSuccess(b.reference)) })
  eq((await core.handleWebhook(missing, deps)).status, 401, 'missing signature')
  eq((await one('select status from bookings where id = $1', [b.booking.id])).status, 'pending_payment', 'booking untouched')
  ok((await one(`select count(*)::int c from payment_events where event = 'webhook.rejected'`)).c >= 2, 'rejections logged')
  // Clean up: verify for real.
  eq((await body(await core.handleVerify(post(student2, { reference: b.reference }), deps))).status, 'succeeded', 'real verify')
})

async function bookAndInit(learner, at) {
  const booking = await book(learner, tutor, at)
  const { reference, amount } = await checkout(learner, { kind: 'session', booking_id: booking.id })
  return { booking, reference, amount }
}

await test('failed payment leaves the booking unpaid, and a retry succeeds', async () => {
  const b = await bookAndInit(student)
  paystack.complete(b.reference, { status: 'failed', gateway_response: 'Insufficient Funds' })
  const r = await body(await core.handleVerify(post(student, { reference: b.reference }), deps))
  eq([r.status, r.reason], ['failed', 'Insufficient Funds'], 'verify result')
  const i = await one('select status, failure_reason, paystack_status from payment_intents where reference = $1', [b.reference])
  eq([i.status, i.failure_reason, i.paystack_status], ['failed', 'Insufficient Funds', 'failed'], 'intent')
  eq((await one('select status from bookings where id = $1', [b.booking.id])).status, 'pending_payment', 'booking still unpaid')
  const retry = await checkout(student, { kind: 'session', booking_id: b.booking.id })
  ok(retry.reference !== b.reference, 'new reference for retry')
  paystack.complete(retry.reference)
  eq((await body(await core.handleVerify(post(student, { reference: retry.reference }), deps))).status, 'succeeded', 'retry verify')
  eq((await one('select status from bookings where id = $1', [b.booking.id])).status, 'confirmed', 'booking confirmed')
})

await test('payment still processing stays pending', async () => {
  const b = await bookAndInit(student2)
  paystack.complete(b.reference, { status: 'ongoing' })
  eq((await body(await core.handleVerify(post(student2, { reference: b.reference }), deps))).status, 'pending', 'verify')
  eq((await one('select status from payment_intents where reference = $1', [b.reference])).status, 'pending', 'intent pending')
  paystack.down = true
  eq((await body(await core.handleVerify(post(student2, { reference: b.reference }), deps))).status, 'pending', 'Paystack unreachable → pending, not failed')
  paystack.down = false
  await sql('postgres', `update bookings set status = 'cancelled' where id = $1`, [b.booking.id])
})

await test('underpayment or wrong currency is never fulfilled', async () => {
  const b = await bookAndInit(student2)
  paystack.complete(b.reference, { amount: 100 })
  const r = await body(await core.handleVerify(post(student2, { reference: b.reference }), deps))
  eq(r.status, 'failed', 'short amount')
  ok(/did not match/.test(r.reason), 'reason: ' + r.reason)
  eq((await one('select status from bookings where id = $1', [b.booking.id])).status, 'pending_payment', 'not confirmed')
  ok((await one(`select count(*)::int c from payment_events where reference = $1 and event = 'fulfil.rejected'`, [b.reference])).c === 1, 'logged')

  const c = await checkout(student2, { kind: 'session', booking_id: b.booking.id })
  paystack.complete(c.reference, { currency: 'USD' })
  const r2 = await body(await core.handleVerify(post(student2, { reference: c.reference }), deps))
  eq(r2.status, 'failed', 'wrong currency')
  eq((await one('select count(*)::int c from payments where booking_id = $1', [b.booking.id])).c, 0, 'no payment recorded')
  await sql('postgres', `update bookings set status = 'cancelled' where id = $1`, [b.booking.id])
})

await test('callback and webhook racing each other fulfil once', async () => {
  const b = await bookAndInit(student)
  paystack.complete(b.reference)
  const [x, y, z] = await Promise.all([
    core.handleCallback(callback(b.reference), deps),
    core.handleWebhook(signed(chargeSuccess(b.reference)), deps),
    core.handleVerify(post(student, { reference: b.reference }), deps),
  ])
  eq([x.status, y.status, z.status], [302, 200, 200], 'responses')
  eq((await one('select count(*)::int c from payments where provider_ref = $1', [b.reference])).c, 1, 'one payment row')
})

await test('payment status is private to its owner', async () => {
  eq((await rpc(student2, 'payment_status', { p_reference: refA })).data, null, 'other user')
  eq((await body(await core.handleVerify(post(student2, { reference: refA }), deps))).status, 404, 'verify someone else’s payment')
  eq((await rpc(admin, 'payment_status', { p_reference: refA })).data?.status, 'succeeded', 'admin sees it')
  eq((await sql({ id: student2.id }, 'select * from payment_intents where reference = $1', [refA])).length, 0, 'RLS on intents')
})

await test('slot taken while paying → automatic refund queue', async () => {
  const at = await nextSlot()
  const late = await bookAndInit(student, at)
  // Hold expires; maintenance frees the slot; someone else books and pays.
  await sql('postgres', `update bookings set created_at = now() - interval '2 hours' where id = $1`, [late.booking.id])
  await sql('postgres', `update payment_intents set created_at = now() - interval '2 hours' where reference = $1`, [late.reference])
  ok((await rpc('service', 'run_maintenance')).data.released >= 1, 'hold released')
  const other = await bookAndInit(student2, at)
  paystack.complete(other.reference)
  eq((await body(await core.handleVerify(post(student2, { reference: other.reference }), deps))).status, 'succeeded', 'second learner pays')
  // The first learner's payment finally goes through.
  paystack.complete(late.reference)
  const r = await body(await core.handleVerify(post(student, { reference: late.reference }), deps))
  eq(r.status, 'refund_pending', 'late payment queued for refund')
  eq((await one('select status from bookings where id = $1', [late.booking.id])).status, 'cancelled', 'late booking stays cancelled')
  eq((await one(`select count(*)::int c from notifications where user_id = $1 and kind = 'refund_due'`, [student.id])).c, 1, 'learner told about refund')
})

await test('cancel → refund through Paystack → refund webhooks', async () => {
  const pay = await one(`select id from payments where provider_ref = $1`, [refA])
  const can = await rpc(student, 'set_booking_status', { p_booking: bookingA.id, p_status: 'cancelled' })
  ok(!can.error, 'cancel: ' + can.error?.message)
  eq((await one('select status from payments where id = $1', [pay.id])).status, 'refund_pending', 'queued')
  eq((await body(await core.handleRefund(post(student, { payment_id: pay.id }), deps))).status, 403, 'students cannot refund')
  const r = await body(await core.handleRefund(post(admin, { payment_id: pay.id }), deps))
  eq([r.id, r.status], [pay.id, 'refund_processing'], 'admin refund')
  eq(paystack.refunds.at(-1), { reference: refA, amount: 1000000 }, 'Paystack refund call (kobo)')
  eq((await one('select status from payments where id = $1', [pay.id])).status, 'refund_processing', 'processing')
  eq((await body(await core.handleRefund(post(admin, { payment_id: pay.id }), deps))).error, 'This refund is already being processed', 'double refund blocked')

  await core.handleWebhook(signed({ event: 'refund.failed', data: { id: 77, status: 'failed', transaction_reference: refA } }), deps)
  eq((await one('select status from payments where id = $1', [pay.id])).status, 'refund_pending', 'failed refund back in queue')
  await core.handleRefund(post(admin, { payment_id: pay.id }), deps)
  const done = await body(await core.handleWebhook(signed({ event: 'refund.processed', data: { id: 78, status: 'processed', transaction_reference: refA } }), deps))
  eq(done.outcome, 'refunded', 'webhook outcome')
  const p = await one('select status, refunded_at is not null as at from payments where id = $1', [pay.id])
  eq([p.status, p.at], ['refunded', true], 'refunded')
  eq((await one(`select count(*)::int c from notifications where user_id = $1 and kind = 'refund'`, [student.id])).c, 1, 'learner notified')
})

await test('learner subscription: discount, cancel keeps access, renewal extends', async () => {
  const { res } = await subscribe(student, 'plus')
  eq(res.status, 'succeeded', 'verify')
  const s1 = await one(`select status, current_period_end from subscriptions where user_id = $1 and audience = 'learner'`, [student.id])
  eq(s1.status, 'active', 'active')
  const b = await bookAndInit(student)
  eq(Number(b.amount), 9000, '10% member discount on ₦10,000')
  eq(paystack.tx.get(b.reference).transaction_charge, 50000, 'discount comes out of the commission, tutor still gets ₦8,500')
  await sql('postgres', `update bookings set status = 'cancelled' where id = $1`, [b.booking.id])

  eq((await rpc(student, 'cancel_subscription', { p_audience: 'learner' })).data?.status, 'cancelled', 'cancel')
  eq((await one('select member_discount($1) d', [student.id])).d, '0.100', 'discount until period end')
  // Paying again renews from the end of the current period.
  await subscribe(student, 'plus')
  const s2 = await one(`select status, cancelled_at, current_period_end from subscriptions where user_id = $1 and audience = 'learner'`, [student.id])
  eq([s2.status, s2.cancelled_at], ['active', null], 'reactivated')
  const days = (s2.current_period_end - s1.current_period_end) / 864e5
  ok(days > 27 && days < 32, `renewal extends by a month (got ${days} days)`)
  eq((await one(`select count(*)::int c from payments where user_id = $1 and kind = 'subscription'`, [student.id])).c, 2, 'two payments')
})

await test('reminders, expiry and access restrictions', async () => {
  await sql('postgres', `update subscriptions set current_period_end = now() + interval '2 days' where user_id = $1`, [tutor.id])
  const m1 = (await rpc('service', 'run_maintenance')).data
  ok(m1.reminded >= 1, 'reminder sent')
  const m2 = (await rpc('service', 'run_maintenance')).data
  eq(m2.reminded, 0, 'reminder only once per period')
  eq((await one(`select count(*)::int c from notifications where user_id = $1 and kind = 'renewal_reminder'`, [tutor.id])).c, 1, 'one reminder')

  await sql('postgres', `update subscriptions set current_period_end = now() - interval '1 minute' where user_id = $1`, [tutor.id])
  ok((await rpc('service', 'run_maintenance')).data.expired >= 1, 'expired')
  eq((await one(`select status from subscriptions where user_id = $1`, [tutor.id])).status, 'expired', 'status')
  eq((await sql('anon', 'select id from tutor_directory where id = $1', [tutor.id])).length, 0, 'tutor hidden after expiry')
  denied(await rpc(student2, 'create_booking', { p_tutor: tutor.id, p_student: student2.id, p_subject: 'Maths', p_starts_at: await nextSlot(), p_duration: 60 }), /not taking bookings/, 'no new bookings')
  eq((await sql({ id: student.id }, 'select id from tutors where id = $1', [tutor.id])).length, 1, 'past learners still see the tutor')
  eq((await one(`select count(*)::int c from notifications where user_id = $1 and kind = 'subscription_expired'`, [tutor.id])).c, 1, 'expiry notice')

  // Renewing restores the listing, starting from now.
  const { res } = await subscribe(tutor, 'tutor_pro')
  eq(res.status, 'succeeded', 'renewal paid')
  eq((await sql('anon', 'select id from tutor_directory where id = $1', [tutor.id])).length, 1, 'listed again')
})

await test('admins can waive the tutor subscription requirement', async () => {
  const t2 = await approvedTutor('Kemi Free', 5000)
  eq((await sql('anon', 'select id from tutor_directory where id = $1', [t2.id])).length, 0, 'hidden by default')
  denied(await rpc(student, 'admin_update_settings', { p: { tutor_subscription_required: false } }), /Admins only/, 'student')
  await rpc(admin, 'admin_update_settings', { p: { tutor_subscription_required: false } })
  eq((await sql('anon', 'select id from tutor_directory where id = $1', [t2.id])).length, 1, 'listed when not required')
  const t3 = await approvedTutor('No Bank Yet', 5000, { payout: false })
  eq((await sql('anon', 'select id from tutor_directory where id = $1', [t3.id])).length, 0, 'hidden without a payout account')
  await rpc(admin, 'admin_update_settings', { p: { payout_account_required: false } })
  eq((await sql('anon', 'select id from tutor_directory where id = $1', [t3.id])).length, 1, 'listed when payout accounts are optional')
  await rpc(admin, 'admin_update_settings', { p: { tutor_subscription_required: true, payout_account_required: true } })
  const b = await rpc(admin, 'admin_update_settings', { p: { commission_rate: 0.2 } })
  eq(b.data.commission_rate, 0.2, 'commission editable')
  denied(await rpc(admin, 'admin_update_settings', { p: { commission_rate: 0.9 } }), /check/, 'commission capped at 50%')
  await rpc(admin, 'admin_update_settings', { p: { commission_rate: 0.15 } })
})

await test('business details and policies: public to read, admins only to change', async () => {
  const pub = (await sql('anon', 'select business_name, operator_name, support_email, support_phone, whatsapp_number, business_city, business_state, business_country, refund_text from platform_settings where id = 1'))[0]
  eq(pub, {
    business_name: 'TutorHaven', operator_name: 'Ojigbani Divine', support_email: 'tutorhaven737@gmail.com',
    support_phone: '+2348028139086', whatsapp_number: '+2348028139086', business_city: 'Lagos', business_state: 'Lagos State', business_country: 'Nigeria', refund_text: null,
  }, 'confirmed details are the defaults, readable by anyone')
  denied(await rpc(student, 'admin_update_settings', { p: { support_email: 'evil@example.com' } }), /Admins only/, 'learner')
  denied(await rpc(tutor, 'admin_update_settings', { p: { refund_text: 'All sales final' } }), /Admins only/, 'tutor')
  for (const who of ['anon', student, tutor]) {
    await sql(who, `update platform_settings set support_email = 'x@y.z', refund_text = 'All sales final'`).catch(() => {})
  }
  eq(Object.values(await one('select support_email, refund_text from platform_settings')), ['tutorhaven737@gmail.com', null], 'direct writes by non-admins change nothing')
  const before = (await one('select policies_updated_at from platform_settings')).policies_updated_at
  const r = await rpc(admin, 'admin_update_settings', { p: { support_phone: '0802 813 9086', support_email: ' Help@TutorHaven.ng ' } })
  denied(r, /check/, 'local phone format rejected')
  const r2 = await rpc(admin, 'admin_update_settings', { p: { support_phone: '+234 802 813 9086', support_email: ' Help@Example.ng ', business_name: '  ' } })
  eq([r2.data.support_phone, r2.data.support_email, r2.data.business_name], ['+2348028139086', 'help@example.ng', 'TutorHaven'], 'spaces removed, email lower-cased, blanks ignored')
  denied(await rpc(admin, 'admin_update_settings', { p: { support_email: 'not-an-email' } }), /check/, 'invalid email rejected')
  eq(String((await one('select policies_updated_at from platform_settings')).policies_updated_at), String(before), 'contact changes keep the policy date')
  const r3 = await rpc(admin, 'admin_update_settings', { p: { refund_text: '## Custom\n- Item' } })
  eq(r3.data.refund_text, '## Custom\n- Item', 'policy saved')
  ok(new Date(r3.data.policies_updated_at) > new Date(before), 'policy date bumped')
  const r4 = await rpc(admin, 'admin_update_settings', { p: { refund_text: '  ', support_email: 'tutorhaven737@gmail.com' } })
  eq([r4.data.refund_text, r4.data.terms_text, r4.data.support_email], [null, null, 'tutorhaven737@gmail.com'], 'empty text resets to the built-in policy')
  const log = await one(`select payload from payment_events where event = 'settings.saved' order by created_at desc limit 1`)
  ok(log && !('refund_text' in log.payload) && log.payload.policies_changed === true, 'change logged without the policy text')
})

await test('stale checkouts are marked abandoned', async () => {
  const b = await bookAndInit(student2)
  await sql('postgres', `update payment_intents set created_at = now() - interval '25 hours' where reference = $1`, [b.reference])
  ok((await rpc('service', 'run_maintenance')).data.abandoned >= 1, 'abandoned count')
  const i = await one('select status, failure_reason from payment_intents where reference = $1', [b.reference])
  eq(i.status, 'abandoned', 'status')
  await sql('postgres', `update bookings set status = 'cancelled' where id = $1`, [b.booking.id])
})

await test('reconcile picks up a payment whose webhook never arrived', async () => {
  const b = await bookAndInit(student2)
  await sql('postgres', `update payment_intents set created_at = now() - interval '10 minutes' where reference = $1`, [b.reference])
  paystack.complete(b.reference)
  eq((await body(await core.handleReconcile(post(student2, {}), deps))).status, 403, 'admins only')
  const r = await body(await core.handleReconcile(post(admin, {}), deps))
  eq(r.results[b.reference], 'succeeded', 'reconciled')
  eq((await one('select status from bookings where id = $1', [b.booking.id])).status, 'confirmed', 'booking confirmed')
})

await test('Paystack outage during checkout start marks the attempt failed', async () => {
  const booking = await book(student2, tutor)
  paystack.down = true
  const r = await body(await core.handleInit(post(student2, { kind: 'session', booking_id: booking.id, redirect_url: APP }), deps))
  paystack.down = false
  eq(r.status, 502, 'status')
  const i = await one(`select status, failure_reason from payment_intents where booking_id = $1`, [booking.id])
  eq(i.status, 'failed', 'intent failed')
  await sql('postgres', `update bookings set status = 'cancelled' where id = $1`, [booking.id])
})

await test('webhook for another app’s payment is acknowledged, not processed', async () => {
  paystack.tx.set('OTHER-APP-1', { id: 999, reference: 'OTHER-APP-1', amount: 5000, currency: 'NGN', status: 'success' })
  const r = await body(await core.handleWebhook(signed({ event: 'charge.success', data: { id: 999, reference: 'OTHER-APP-1', status: 'success' } }), deps))
  eq([r.status, r.outcome], [200, 'unknown_reference'], 'ack')
})

await test('suspension blocks bookings, checkout and messages; users cannot lift it', async () => {
  denied(await rpc(admin, 'admin_set_suspended', { p_user: admin.id, p_suspend: true }), /your own account/, 'self-suspend')
  denied(await rpc(student, 'admin_set_suspended', { p_user: student2.id, p_suspend: true }), /Admins only/, 'student suspends')
  const pending = await book(student2, tutor)
  await rpc(admin, 'admin_set_suspended', { p_user: student2.id, p_suspend: true, p_reason: 'Chargeback' })
  eq((await one('select status from bookings where id = $1', [pending.id])).status, 'cancelled', 'holds released')
  denied(await rpc(student2, 'create_booking', { p_tutor: tutor.id, p_student: student2.id, p_subject: 'Maths', p_starts_at: await nextSlot(), p_duration: 60 }), /suspended/, 'book')
  denied(await rpc(student2, 'start_checkout', { p_kind: 'subscription', p_plan_id: (await plan('plus')).id }), /suspended/, 'checkout')
  denied(await rpc(student2, 'send_message', { p_to: tutor.id, p_body: 'hi' }), /suspended/, 'message')
  await sql({ id: student2.id }, `update profiles set suspended_at = null, suspended_reason = '' where id = $1`, [student2.id])
  eq((await one('select suspended_reason from profiles where id = $1', [student2.id])).suspended_reason, 'Chargeback', 'cannot unsuspend self')
  await sql({ id: student2.id }, `update profiles set role = 'admin' where id = $1`, [student2.id])
  eq((await one('select role from profiles where id = $1', [student2.id])).role, 'student', 'cannot self-promote')
  // Suspended tutors drop out of search.
  await rpc(admin, 'admin_set_suspended', { p_user: tutor.id, p_suspend: true })
  eq((await sql('anon', 'select id from tutor_directory where id = $1', [tutor.id])).length, 0, 'tutor hidden')
  await rpc(admin, 'admin_set_suspended', { p_user: tutor.id, p_suspend: false })
  await rpc(admin, 'admin_set_suspended', { p_user: student2.id, p_suspend: false })
  eq((await sql('anon', 'select id from tutor_directory where id = $1', [tutor.id])).length, 1, 'tutor back')
})

await test('messages: who can contact whom', async () => {
  const stranger = await user('student', 'Nobody Yet')
  const lonely = await approvedTutor('Unlisted Uche')
  denied(await rpc(tutor, 'send_message', { p_to: stranger.id, p_body: 'Hello' }), /can’t message/, 'tutor cold-messages a student')
  denied(await rpc(stranger, 'send_message', { p_to: lonely.id, p_body: 'Hello' }), /can’t message/, 'unlisted tutor')
  const m = await rpc(stranger, 'send_message', { p_to: tutor.id, p_body: '  Do you teach WAEC physics?  ' })
  eq(m.data?.body, 'Do you teach WAEC physics?', 'trimmed message')
  ok(!(await rpc(tutor, 'send_message', { p_to: stranger.id, p_body: 'Yes, I do!' })).error, 'tutor replies')
  const convs = (await rpc(tutor, 'my_conversations')).data
  eq([convs[0].other_id, convs[0].unread, convs[0].last_from_me], [stranger.id, 1, true], 'tutor conversation list')
  eq((await rpc(tutor, 'my_unread_counts')).data.messages, 1, 'unread badge')
  eq((await rpc(tutor, 'conversation_messages', { p_other: stranger.id })).data.map((x) => x.body), ['Do you teach WAEC physics?', 'Yes, I do!'], 'thread in order')
  eq((await rpc(student2, 'conversation_messages', { p_other: stranger.id })).data.length, 0, 'outsiders get nothing')
  eq((await rpc(tutor, 'mark_conversation_read', { p_other: stranger.id })).data, 1, 'marked read')
  eq((await rpc(tutor, 'my_unread_counts')).data.messages, 0, 'badge cleared')
  eq((await sql({ id: student2.id }, 'select count(*)::int c from messages'))[0].c, 0, 'others cannot read the thread')
  denied(await rpc(stranger, 'send_message', { p_to: tutor.id, p_body: '   ' }), /write a message/, 'empty message')
  ok(!(await rpc(student, 'send_message', { p_to: tutor.id, p_body: 'Thanks for the lesson' })).error, 'past learner messages tutor')
})

await test('qualifications: tutors submit, admins verify, edits need re-review', async () => {
  await sql({ id: tutor.id }, `insert into tutor_qualifications (tutor_id, title, institution, year, status) values ($1, 'B.Sc. Physics', 'University of Lagos', 2018, 'verified')`, [tutor.id])
  const q = await one('select id, status from tutor_qualifications where tutor_id = $1', [tutor.id])
  eq(q.status, 'pending', 'self-verification ignored')
  eq((await rpc('anon', 'tutor_public_qualifications', { p_tutor: tutor.id })).data.length, 0, 'not public yet')
  denied(await rpc(tutor, 'admin_review_qualification', { p_id: q.id, p_status: 'verified' }), /Admins only/, 'tutor verifies')
  eq((await rpc(admin, 'admin_list_qualifications', { p_status: 'pending' })).data.map((x) => x.title), ['B.Sc. Physics'], 'admin queue')
  await rpc(admin, 'admin_review_qualification', { p_id: q.id, p_status: 'verified', p_note: 'Certificate checked' })
  eq((await rpc('anon', 'tutor_public_qualifications', { p_tutor: tutor.id })).data.map((x) => x.title), ['B.Sc. Physics'], 'public after review')
  eq((await sql('anon', 'select verified_qualifications from tutor_directory where id = $1', [tutor.id]))[0].verified_qualifications, 1, 'directory count')
  await sql({ id: tutor.id }, `update tutor_qualifications set title = 'M.Sc. Physics' where id = $1`, [q.id])
  eq((await one('select status from tutor_qualifications where id = $1', [q.id])).status, 'pending', 'edit resets review')
  eq((await sql({ id: student.id }, 'select * from tutor_qualifications')).length, 0, 'documents private')
  // Deleting the reviewing admin keeps the review.
  const tempAdmin = await user('admin', 'Temp Admin')
  await rpc(tempAdmin, 'admin_review_qualification', { p_id: q.id, p_status: 'verified' })
  await sql('postgres', 'delete from auth.users where id = $1', [tempAdmin.id])
  eq((await one('select status, reviewed_by from tutor_qualifications where id = $1', [q.id])), { status: 'verified', reviewed_by: null }, 'review kept after admin deletion')
})

await test('qualification documents: tutors upload to their own folder only', async () => {
  await sql({ id: tutor.id }, `insert into storage.objects (bucket_id, name) values ('qualifications', $1)`, [`${tutor.id}/degree.pdf`])
  let blocked = false
  await sql({ id: tutor.id }, `insert into storage.objects (bucket_id, name) values ('qualifications', $1)`, [`${student.id}/fake.pdf`]).catch(() => { blocked = true })
  ok(blocked, 'upload into someone else’s folder')
  eq((await sql({ id: student.id }, `select name from storage.objects where bucket_id = 'qualifications'`)).length, 0, 'students cannot read')
  eq((await sql({ id: admin.id }, `select name from storage.objects where bucket_id = 'qualifications'`)).length, 1, 'admins can read')
})

await test('admin reporting: revenue split, payment attempts, event log', async () => {
  const o = (await rpc(admin, 'admin_overview')).data
  ok(Number(o.revenue_tutor_subscriptions) === 12000, 'tutor subscription revenue ' + o.revenue_tutor_subscriptions)
  ok(Number(o.revenue_learner_subscriptions) === 15000, 'learner subscription revenue ' + o.revenue_learner_subscriptions)
  ok(Number(o.revenue_sessions) > 0 && Number(o.refunded_total) === 10000, 'sessions / refunds')
  ok(o.payments_failed_30d >= 3, 'failed attempts counted')
  eq(o.tutors_listed, 1, 'listed tutors')
  ok(Number(o.session_commission) > 0 && Number(o.tutor_earnings) > Number(o.session_commission), 'commission and tutor earnings')
  const payouts = (await rpc(admin, 'admin_payout_accounts')).data
  ok(payouts.some((x) => x.tutor_id === tutor.id && x.subaccount_code === 'ACCT_sim1' && Number(x.earned) > 0), 'payout overview')
  denied(await rpc(student, 'admin_payout_accounts'), /Admins only/, 'student payout overview')
  denied(await rpc(student, 'admin_overview'), /Admins only/, 'student overview')
  const intents = (await rpc(admin, 'admin_list_payment_intents', { p_status: 'failed' })).data
  ok(intents.some((i) => i.failure_reason === 'Insufficient Funds'), 'failed attempt with reason')
  const events = (await rpc(admin, 'admin_payment_events', { p_reference: refA })).data.map((e) => e.event)
  for (const e of ['checkout.started', 'checkout.initialized', 'payment.abandoned', 'payment.fulfilled', 'webhook.charge.success', 'refund.refund_processing']) ok(events.includes(e), 'event log has ' + e)
  eq((await sql({ id: student.id }, 'select count(*)::int c from payment_events'))[0].c, 0, 'event log is admin-only')
  const users = (await rpc(admin, 'admin_list_users', { p_search: 'Tobi' })).data
  eq([users[0].subscription_status], ['active'], 'user list shows subscription')
  const subs = (await rpc(admin, 'admin_list_subscriptions', { p_status: 'active', p_audience: 'tutor' })).data
  eq(subs.length, 1, 'subscription list')
})

await test('Paystack HTTP client sends the right requests', async () => {
  const seen = []
  const server = createServer((req, res) => {
    let raw = ''
    req.on('data', (c) => (raw += c))
    req.on('end', () => {
      seen.push({ method: req.method, url: req.url, auth: req.headers.authorization, body: raw ? JSON.parse(raw) : null })
      res.setHeader('content-type', 'application/json')
      if (req.url.startsWith('/transaction/verify/BAD')) { res.statusCode = 400; return res.end(JSON.stringify({ status: false, message: 'Transaction reference not found' })) }
      const data = req.url === '/transaction/initialize' ? { authorization_url: 'https://checkout.paystack.com/abc', access_code: 'abc', reference: 'TH-1' }
        : req.url === '/refund' ? { status: 'pending' } : { status: 'success', reference: 'TH-1', amount: 500000, currency: 'NGN', id: 1 }
      res.end(JSON.stringify({ status: true, message: 'ok', data }))
    })
  })
  await new Promise((r) => server.listen(0, r))
  const api = paystackApi('sk_test_abc', `http://localhost:${server.address().port}`)
  eq((await api.initialize({ email: 'a@b.c', amount: 500000, currency: 'NGN', reference: 'TH-1' })).authorization_url, 'https://checkout.paystack.com/abc', 'initialize')
  eq((await api.verify('TH-1')).status, 'success', 'verify')
  eq((await api.refund('TH-1', 500000)).status, 'pending', 'refund')
  let err = ''
  await api.verify('BAD-REF').catch((e) => { err = e.message })
  eq(err, 'Transaction reference not found', 'error message')
  server.close()
  eq(seen.map((s) => `${s.method} ${s.url}`), ['POST /transaction/initialize', 'GET /transaction/verify/TH-1', 'POST /refund', 'GET /transaction/verify/BAD-REF'], 'endpoints')
  ok(seen.every((s) => s.auth === 'Bearer sk_test_abc'), 'secret sent as bearer token')
  eq(seen[2].body, { transaction: 'TH-1', amount: 500000 }, 'refund body')
})

await test('migration can be re-run safely', async () => {
  const { readFileSync } = await import('node:fs')
  for (const f of ['20261102000000_production_payments.sql', '20261103000000_tutor_payouts.sql', '20261104000000_business_info.sql', '20261106000000_plus_reviews_learning.sql']) {
    await sql('postgres', readFileSync(new URL('../migrations/' + f, import.meta.url), 'utf8'))
  }
  eq((await sql('anon', 'select id from tutor_directory where id = $1', [tutor.id])).length, 1, 'data intact after re-run')
  eq((await one(`select count(*)::int c from subscriptions where status = 'active'`)).c, 2, 'subscriptions intact')
})


// ===========================================================================
// TutorHaven Plus, reviews, recommendations and learning data
// ===========================================================================
async function listTutor(t) {
  await sql('postgres', `insert into subscriptions (user_id, audience, plan_id, status, current_period_start, current_period_end)
    values ($1, 'tutor', (select id from subscription_plans where code = 'tutor_pro'), 'active', now(), now() + interval '30 days')
    on conflict (user_id, audience) do update set status = 'active', current_period_end = now() + interval '30 days'`, [t.id])
  return t
}
let past = 0
/** A session that was booked, paid through (simulated) Paystack, held and completed. */
async function paidCompleted(learner, tutor, { student = learner, subject = 'Mathematics' } = {}) {
  const r = await rpc(learner, 'create_booking', { p_tutor: tutor.id, p_student: student.id, p_subject: subject, p_starts_at: await nextSlot(), p_duration: 60 })
  if (r.error) throw new Error('create_booking: ' + r.error.message)
  const { reference } = await checkout(learner, { kind: 'session', booking_id: r.data.id })
  paystack.complete(reference)
  const v = await body(await core.handleVerify(post(learner, { reference }), deps))
  if (v.status !== 'succeeded') throw new Error('verify: ' + JSON.stringify(v))
  past++
  await sql('postgres', `update bookings set starts_at = now() - make_interval(hours => 3 * $2), ends_at = now() - make_interval(hours => 3 * $2) + interval '1 hour' where id = $1`, [r.data.id, past])
  const done = await rpc(tutor, 'set_booking_status', { p_booking: r.data.id, p_status: 'completed' })
  if (done.error) throw new Error('complete: ' + done.error.message)
  return r.data
}
const stars = (b, overall = 5, cats = [5, 5, 5, 5], comment = '') => ({
  p_booking: b.id, p_rating: overall, p_teaching: cats[0], p_communication: cats[1], p_punctuality: cats[2], p_knowledge: cats[3], p_comment: comment,
})
const membership = async (u) => (await rpc(u, 'my_membership')).data

await test('plans: no invented prices; unpriced plans cannot be sold; admins set prices and AI allowances', async () => {
  const annual = await plan('plus_annual')
  eq([annual.price, annual.is_active, annual.interval_months, annual.audience], [null, false, 12, 'learner'], 'annual plan starts unpriced and off sale')
  const s1 = await user('student', 'Annie Annual')
  const r = await body(await core.handleInit(post(s1, { kind: 'subscription', plan_id: annual.id, redirect_url: APP + '/x' }), deps))
  eq([r.status, r.error], [400, 'This plan is not available'], 'cannot buy an unpriced plan')
  denied(await rpc(admin, 'admin_upsert_plan', { p: { id: annual.id, is_active: true } }), /Set a price/, 'cannot sell without a price')
  denied(await rpc(s1, 'admin_upsert_plan', { p: { id: annual.id, price: 1 } }), /Admins only/, 'learner cannot set prices')
  const saved = await rpc(admin, 'admin_upsert_plan', { p: { id: annual.id, price: 70000, is_active: true, ai_monthly_limit: 300 } })
  eq([Number(saved.data.price), saved.data.is_active, saved.data.ai_monthly_limit], [70000, true, 300], 'admin sets price and allowance')
  const { res } = await subscribe(s1, 'plus_annual')
  eq(res.status, 'succeeded', 'annual Plus bought')
  const m = await membership(s1)
  eq([m.tier, m.interval_months, m.ai_limit], ['plus', 12, 300], 'annual membership active')
  const sub = await one(`select current_period_end - current_period_start as len from subscriptions where user_id = $1 and audience = 'learner'`, [s1.id])
  ok(sub.len.days >= 365 || sub.len.months === 12 || sub.len.years === 1, 'one year paid: ' + JSON.stringify(sub.len))
})

await test('Plus: standard users are refused Plus features; upgrade, family cover, cancel and expiry', async () => {
  const s = await user('student', 'Stella Standard')
  eq((await membership(s)).tier, 'standard', 'starts on Standard')
  denied(await rpc(s, 'learning_analytics', {}), /TutorHaven Plus feature/, 'analytics')
  denied(await rpc(s, 'recommend_tutors', {}), /TutorHaven Plus feature/, 'personal recommendations')
  denied(await rpc(s, 'save_learning_goal', { p: { title: 'Pass WAEC maths' } }), /TutorHaven Plus feature/, 'goals')
  denied(await rpc(s, 'request_learning_report', { p_student: s.id }), /TutorHaven Plus feature/, 'reports')
  // A failed payment activates nothing.
  const { reference } = await checkout(s, { kind: 'subscription', plan_id: (await plan('plus')).id })
  paystack.complete(reference, { status: 'failed' })
  const failedPay = await body(await core.handleVerify(post(s, { reference }), deps))
  eq([failedPay.status, (await membership(s)).tier], ['failed', 'standard'], 'failed payment keeps Standard')
  // A forged activation is impossible.
  await sql(s, `update subscriptions set status = 'active', current_period_end = now() + interval '1 year' where user_id = $1`, [s.id]).catch(() => {})
  eq((await membership(s)).tier, 'standard', 'still Standard')
  // Upgrade.
  const { res } = await subscribe(s, 'plus')
  eq(res.status, 'succeeded', 'paid')
  const m = await membership(s)
  eq([m.tier, m.source, m.ai_limit], ['plus', 'own', 100], 'Plus active')
  eq((await rpc(s, 'learning_analytics', {})).error, null, 'analytics unlocked')
  // Family cover: a Plus parent's linked children get Plus.
  const mum = await user('parent', 'Mama Plus')
  const kid = await user('student', 'Kiddo Plus')
  await rpc(mum, 'link_child', { p_email: kid.email })
  eq((await membership(kid)).tier, 'standard', 'child without a family plan')
  await subscribe(mum, 'family')
  const km = await membership(kid)
  eq([km.tier, km.source, km.paid_by], ['plus', 'parent', 'Mama Plus'], 'child covered by parent')
  // Cancel keeps access until the period ends; expiry removes it.
  await rpc(s, 'cancel_subscription', { p_audience: 'learner' })
  eq((await membership(s)).tier, 'plus', 'cancelled but paid period continues')
  await sql('postgres', `update subscriptions set current_period_end = now() - interval '1 minute' where user_id = $1 and audience = 'learner'`, [s.id])
  await rpc('service', 'run_maintenance')
  eq((await membership(s)).tier, 'standard', 'expired → Standard')
  denied(await rpc(s, 'learning_analytics', {}), /TutorHaven Plus feature/, 'Plus features locked after expiry')
})

await test('AI assistant: Plus only, server-side allowance, real answers stored privately, failures not counted', async () => {
  const calls = []
  let behaviour = 'ok'
  const fakeAi = {
    async ask(input) {
      calls.push(input)
      if (behaviour === 'down') throw new Error('upstream 529')
      if (behaviour === 'refuse') return { text: '', inputTokens: 10, outputTokens: 0, stopReason: 'refusal' }
      return { text: `Answer #${calls.length}`, inputTokens: 100, outputTokens: 50, stopReason: 'end_turn' }
    },
  }
  const aiDeps = { service: deps.service, ai: fakeAi, userId: async (req) => (req.headers.get('Authorization') ?? '').replace(/^Bearer /, '') || null }
  const ask = async (u, payload, d = aiDeps) => body(await aiCore.handleAiAssistant(post(u, payload), d))
  const free = await user('student', 'Freddie Free')
  const plus = await user('student', 'Priya Plus')
  await subscribe(plus, 'plus')

  eq((await ask(null, { question: 'hi' })).status, 401, 'signed out')
  const r0 = await ask(free, { question: 'What is photosynthesis?' })
  eq([r0.status, r0.code, calls.length], [403, 'plus_required', 0], 'Standard user refused before any AI call')
  eq((await ask(plus, { question: 'What is a noun?' }, { ...aiDeps, ai: null })).code, 'not_configured', 'no key → clear message, no fake answer')
  denied(await rpc(plus, 'ai_begin', { p_user: plus.id, p_conversation: null, p_mode: 'explain', p_subject: '', p_question: 'sneaky' }), /permission denied/, 'apps cannot record questions directly')

  const r1 = await ask(plus, { question: 'Explain fractions', mode: 'simplify', subject: 'Mathematics' })
  eq([r1.status, r1.answer.content, r1.usage.used, r1.usage.limit], [200, 'Answer #1', 1, 100], 'answered by the AI')
  ok(calls[0].system.includes('very simple language') && calls[0].system.includes('Mathematics'), 'mode and subject in the system prompt')
  const r2 = await ask(plus, { question: 'Give me an example', conversation_id: r1.conversation_id, mode: 'steps' })
  eq(calls[1].messages.map((m) => m.role + ':' + m.content), ['user:Explain fractions', 'assistant:Answer #1', 'user:Give me an example'], 'history sent with follow-ups')
  eq(r2.usage.used, 2, 'counted')

  behaviour = 'down'
  const r3 = await ask(plus, { question: 'Will this fail?' })
  eq([r3.status, r3.code], [502, 'ai_unavailable'], 'AI outage reported honestly')
  behaviour = 'refuse'
  eq((await ask(plus, { question: 'Something declined' })).code, 'declined', 'refusal reported, no made-up answer')
  behaviour = 'ok'
  eq((await membership(plus)).ai_used, 2, 'failed and declined questions are not counted')

  await sql('postgres', `update subscription_plans set ai_monthly_limit = 3 where code = 'plus'`)
  eq((await ask(plus, { question: 'Third question' })).status, 200, 'third within limit')
  const over = await ask(plus, { question: 'Fourth question' })
  eq([over.status, over.code], [403, 'limit_reached'], 'monthly allowance enforced')
  await sql('postgres', `update subscription_plans set ai_monthly_limit = 100 where code = 'plus'`)

  const other = await user('student', 'Nosy Neighbour')
  await subscribe(other, 'plus')
  eq((await sql(other, 'select * from ai_messages')).length, 0, 'others cannot read the conversation')
  eq((await ask(other, { question: 'continue theirs', conversation_id: r1.conversation_id })).error, 'Conversation not found', 'cannot post into another user’s conversation')
  eq((await sql(plus, 'select role from ai_messages where conversation_id = $1 order by created_at', [r1.conversation_id])).map((m) => m.role), ['user', 'assistant', 'user', 'assistant'], 'owner sees the conversation')
  ok((await sql('postgres', `select count(*)::int c from learning_activity where student_id = $1 and kind = 'ai_question'`, [plus.id]))[0].c === 3, 'questions logged as learning activity')
})

await test('reviews: only verified, completed bookings; one per booking; no self or outsider reviews', async () => {
  const t = await listTutor(await approvedTutor('Rita Reviewed'))
  const learner = await user('student', 'Lola Learner')
  const outsider = await user('student', 'Oscar Outsider')
  const b = await paidCompleted(learner, t)
  const unpaid = await book(learner, t)
  denied(await rpc(learner, 'submit_review', stars(unpaid)), /completed/, 'unfinished session')
  denied(await rpc(outsider, 'submit_review', stars(b)), /Only the learner/, 'never booked')
  denied(await rpc(t, 'submit_review', stars(b)), /Only the learner/, 'tutor reviewing themselves')
  denied(await rpc(learner, 'submit_review', stars(b, 5, [5, 5, null, 5])), /every rating/, 'all categories required')
  denied(await rpc(learner, 'submit_review', stars(b, 6)), /every rating/, 'out of range')
  const ok1 = await rpc(learner, 'submit_review', stars(b, 5, [5, 4, 5, 5], 'Explained algebra really clearly, very patient.'))
  eq(ok1.error, null, 'verified learner reviews')
  denied(await rpc(learner, 'submit_review', stars(b, 1)), /already been reviewed/, 'duplicate')
  denied(await sql(learner, `update reviews set rating = 1 where id = $1`, [ok1.data.id]).then(() => ({ data: 1 }), (e) => ({ error: e })), /permission/, 'author cannot edit')
  denied(await sql(t, `delete from reviews where id = $1`, [ok1.data.id]).then(() => ({ data: 1 }), (e) => ({ error: e })), /permission/, 'tutor cannot delete')
  // Manually paid booking (no Paystack payment) is not verified.
  const fake = await book(learner, t)
  await sql('postgres', `update bookings set status = 'completed', amount_paid = 1, starts_at = now() - interval '400 hours', ends_at = now() - interval '399 hours' where id = $1`, [fake.id])
  denied(await rpc(learner, 'submit_review', stars(fake)), /paid, completed/, 'no Paystack payment → not reviewable')
  const list = (await rpc('anon', 'tutor_reviews', { p_tutor: t.id })).data
  eq([list.length, list[0].verified, list[0].author_name, list[0].teaching], [1, true, 'Lola', 5], 'public list with verified badge and first name only')
  eq((await sql('anon', 'select * from reviews')).length, 0, 'reviews table itself is not public')
})

await test('ratings: every reviewer counts once; categories and distribution are real averages', async () => {
  const t = await listTutor(await approvedTutor('Avery Average'))
  const fan = await user('student', 'Frankie Fan')
  const critic = await user('student', 'Cleo Critic')
  for (let i = 0; i < 3; i++) await rpc(fan, 'submit_review', stars(await paidCompleted(fan, t), 5, [5, 5, 5, 5]))
  await rpc(critic, 'submit_review', stars(await paidCompleted(critic, t), 1, [1, 2, 1, 2]))
  const tutor = await one('select rating, review_count from tutors where id = $1', [t.id])
  eq([Number(tutor.rating), tutor.review_count], [3, 4], 'average of reviewers (5 and 1), 4 reviews')
  const s = (await rpc('anon', 'tutor_review_summary', { p_tutor: t.id })).data
  eq([s.count, s.reviewers, s.verified, Number(s.teaching), Number(s.communication), s.distribution['5'], s.distribution['1']], [4, 2, 4, 4, 4.3, 3, 1], 'summary')
})

await test('review responses, reports and admin moderation with an audit log', async () => {
  const t = await listTutor(await approvedTutor('Tess Responds'))
  const other = await listTutor(await approvedTutor('Otto Other'))
  const l = await user('student', 'Remy Reviewer')
  const r = (await rpc(l, 'submit_review', stars(await paidCompleted(l, t), 1, [5, 5, 5, 5], 'Rude and late, call me on 0803 000 0000'))).data
  denied(await rpc(other, 'respond_to_review', { p_review: r.id, p_body: 'Not mine' }), /Only the reviewed tutor/, 'other tutor')
  eq((await rpc(t, 'respond_to_review', { p_review: r.id, p_body: 'Sorry to hear this; I was on time per our messages.' })).error, null, 'tutor responds')
  eq((await rpc(t, 'respond_to_review', { p_review: r.id, p_body: 'Updated reply.' })).data.body, 'Updated reply.', 'tutor edits own response')
  eq((await rpc('anon', 'tutor_reviews', { p_tutor: t.id })).data[0].response, 'Updated reply.', 'response shown publicly')
  denied(await rpc(l, 'report_review', { p_review: r.id, p_reason: 'fake' }), /own review/, 'author cannot report own review')
  eq((await rpc(t, 'report_review', { p_review: r.id, p_reason: 'personal_info', p_details: 'Contains a phone number' })).error, null, 'tutor reports')
  denied(await rpc(t, 'admin_list_reviews', { p_filter: 'reported' }), /Admins only/, 'tutor cannot moderate')
  const reported = (await rpc(admin, 'admin_list_reviews', { p_filter: 'reported' })).data
  const row = reported.find((x) => x.id === r.id)
  ok(row && row.open_reports === 1 && row.signals.some((sg) => sg.startsWith('inconsistent')), 'reported and flagged as inconsistent: ' + JSON.stringify(row?.signals))
  denied(await rpc(admin, 'admin_moderate_review', { p_review: r.id, p_action: 'hide', p_reason: '' }), /reason/, 'hiding needs a reason')
  await rpc(admin, 'admin_moderate_review', { p_review: r.id, p_action: 'hide', p_reason: 'Contains personal contact details' })
  eq((await rpc('anon', 'tutor_reviews', { p_tutor: t.id })).data.length, 0, 'hidden from the profile')
  eq((await one('select review_count from tutors where id = $1', [t.id])).review_count, 0, 'excluded from ratings')
  const mine = (await rpc(t, 'my_tutor_reviews')).data
  eq([mine[0].status, mine[0].hidden_reason], ['hidden', 'Contains personal contact details'], 'tutor sees why')
  eq((await one(`select status from review_reports where review_id = $1`, [r.id])).status, 'actioned', 'report closed')
  await rpc(admin, 'admin_moderate_review', { p_review: r.id, p_action: 'restore', p_reason: 'Reviewer removed the number' })
  eq((await rpc('anon', 'tutor_reviews', { p_tutor: t.id })).data.length, 1, 'restored')
  const log = (await rpc(admin, 'admin_review_log', { p_review: r.id })).data
  eq(log.map((x) => x.action), ['restore', 'hide'], 'audit log')
  eq((await sql(t, 'select * from review_moderation_log')).length, 0, 'log is admin-only')
})

await test('lesson feedback, goals, activity, monthly reports and family dashboard permissions', async () => {
  const t = await listTutor(await approvedTutor('Fiona Feedback'))
  const t2 = await listTutor(await approvedTutor('Gus Guest'))
  const mum = await user('parent', 'Mum Family')
  const kid1 = await user('student', 'Ada Family')
  const kid2 = await user('student', 'Bayo Family')
  const stranger = await user('parent', 'Stranger Parent')
  await rpc(mum, 'link_child', { p_email: kid1.email })
  await rpc(mum, 'link_child', { p_email: kid2.email })
  const b = await paidCompleted(mum, t, { student: kid1, subject: 'Physics' })
  denied(await rpc(t2, 'save_lesson_feedback', { p_booking: b.id, p_summary: 'Not my lesson at all' }), /Only the session/, 'other tutor')
  eq((await rpc(t, 'save_lesson_feedback', { p_booking: b.id, p_summary: 'Covered Newton’s laws with worked examples.', p_strengths: 'Quick with formulas',
    p_improvements: 'Units in final answers', p_next_steps: 'Practise 5 motion questions', p_progress: 4 })).error, null, 'tutor writes feedback')
  eq((await sql(kid1, 'select summary from lesson_feedback')).length, 1, 'learner reads feedback')
  eq((await sql(mum, 'select summary from lesson_feedback')).length, 1, 'parent reads feedback')
  eq((await sql(stranger, 'select summary from lesson_feedback')).length, 0, 'stranger cannot')
  denied(await rpc(mum, 'family_overview'), /TutorHaven Plus feature/, 'family dashboard is Plus')
  await subscribe(mum, 'family')
  const fam = (await rpc(mum, 'family_overview')).data
  eq(fam.map((c) => c.name), ['Ada Family', 'Bayo Family'], 'both children')
  eq([fam[0].all_time.lessons_completed, fam[0].latest_feedback.subject, fam[1].all_time.lessons_completed], [1, 'Physics', 0], 'per-child progress')
  denied(await rpc(stranger, 'learning_analytics', { p_student: kid1.id }), /yourself or your linked children/, 'stranger analytics')
  denied(await rpc(kid2, 'learning_analytics', { p_student: kid1.id }), /yourself or your linked children/, 'sibling analytics')
  eq((await rpc(mum, 'save_learning_goal', { p: { student_id: kid1.id, title: 'Score A1 in Physics', subject: 'Physics' } })).error, null, 'parent sets a goal')
  const goal = (await sql(kid1, 'select * from learning_goals'))[0]
  await rpc(kid1, 'save_learning_goal', { p: { id: goal.id, student_id: kid1.id, status: 'achieved' } })
  denied(await rpc(stranger, 'save_learning_goal', { p: { student_id: kid1.id, title: 'Hack' } }), /linked children/, 'stranger goal')
  eq((await rpc(mum, 'update_child_profile', { p_child: kid1.id, p: { grade_level: 'SSS 2', subjects: ['Physics', 'Chemistry'] } })).data.grade_level, 'SSS 2', 'parent edits child profile')
  denied(await rpc(stranger, 'update_child_profile', { p_child: kid1.id, p: { grade_level: 'X' } }), /linked children/, 'stranger edits profile')
  const a = (await rpc(kid1, 'learning_analytics', {})).data
  eq([a.all_time.lessons_completed, a.all_time.minutes, a.recommendations[0].text, a.all_time.goals[0].status], [1, 60, 'Practise 5 motion questions', 'achieved'], 'analytics')
  const kinds = (await sql(kid1, 'select kind from learning_activity order by id')).map((x) => x.kind)
  eq(kinds, ['lesson_completed', 'feedback_received', 'goal_created', 'goal_achieved'], 'activity log')
  eq((await sql(stranger, 'select * from learning_activity')).length, 0, 'activity private')
  const month = (await one(`select date_trunc('month', starts_at at time zone 'Africa/Lagos')::date m from bookings where id = $1`, [b.id])).m
  const rep = (await rpc(mum, 'request_learning_report', { p_student: kid1.id, p_month: month })).data
  eq([rep.data.summary.lessons_completed, rep.data.strengths[0].text, rep.data.improvements[0].text], [1, 'Quick with formulas', 'Units in final answers'], 'monthly report from real feedback')
  eq((await rpc(mum, 'list_learning_reports', { p_student: kid1.id })).data.length, 1, 'parent lists reports')
  denied(await rpc(stranger, 'list_learning_reports', { p_student: kid1.id }), /linked children/, 'stranger reports')
  eq((await sql(stranger, 'select * from learning_reports')).length, 0, 'reports private')
})

await test('recommendations: balanced scores, new tutors not buried, personal matches for Plus only', async () => {
  // Isolate this test's tutors.
  const earlier = (await sql('postgres', `select id from tutors where status = 'approved'`)).map((x) => x.id)
  await sql('postgres', `update tutors set status = 'rejected' where id = any ($1)`, [earlier])
  const veteran = await listTutor(await approvedTutor('Vera Veteran'))
  const newbie = await listTutor(await approvedTutor('Nia Newbie'))
  const weak = await listTutor(await approvedTutor('Wes Weak'))
  const chem = await listTutor(await approvedTutor('Chidi Chemistry'))
  await sql('postgres', `update tutors set subjects = '{Chemistry}' where id = $1`, [chem.id])
  await sql('postgres', `update tutors set approved_at = now() - interval '200 days' where id = any ($1)`, [[veteran.id, weak.id, chem.id]])
  await sql('postgres', `insert into tutor_qualifications (tutor_id, title, status) values ($1, 'B.Sc. Mathematics', 'verified')`, [veteran.id])
  for (let i = 0; i < 4; i++) {
    const l = await user('student', 'Happy ' + i)
    await rpc(l, 'submit_review', stars(await paidCompleted(l, veteran), 5))
    const m = await user('student', 'Unhappy ' + i)
    await rpc(m, 'submit_review', stars(await paidCompleted(m, weak), 2, [2, 2, 2, 2]))
  }
  await rpc('service', 'refresh_tutor_scores', {})
  const score = async (t) => Number((await one('select quality from tutor_scores where tutor_id = $1', [t.id])).quality)
  const [v, n, w] = [await score(veteran), await score(newbie), await score(weak)]
  ok(v > n && n > w, `veteran ${v} > newbie ${n} > weak ${w}`)
  const sec = (await rpc('anon', 'tutor_sections', { p_limit: 6 })).data
  eq(sec.top_rated.map((x) => x.full_name), ['Vera Veteran', 'Wes Weak'], 'top rated needs reviews, best first')
  ok(sec.newly_verified.some((x) => x.full_name === 'Nia Newbie') && !sec.newly_verified.some((x) => x.full_name === 'Vera Veteran'), 'newly verified')
  eq(sec.most_reviewed.length, 2, 'most reviewed only lists reviewed tutors')
  ok(sec.popular[0].reasons[0].includes('learners'), 'popular explained')
  const learner = await user('student', 'Chem Learner')
  await sql('postgres', `update profiles set subjects = '{Chemistry}' where id = $1`, [learner.id])
  denied(await rpc(learner, 'recommend_tutors', {}), /TutorHaven Plus feature/, 'personal matching is Plus')
  await subscribe(learner, 'plus')
  const recs = (await rpc(learner, 'recommend_tutors', { p_limit: 4 })).data
  eq(recs[0].full_name, 'Chidi Chemistry', 'subject match first')
  ok(recs[0].reasons.includes('Teaches Chemistry'), 'reasons: ' + JSON.stringify(recs[0].reasons))
  ok(recs.some((x) => x.full_name === 'Nia Newbie'), 'new tutor still recommended')
  await sql('postgres', `update tutors set status = 'approved' where id = any ($1)`, [earlier])
})

await test('priority support: Plus requests are marked priority and listed first', async () => {
  const s = await user('student', 'Sam Support')
  const p = await user('student', 'Pam Priority')
  await subscribe(p, 'plus')
  const a = (await rpc(s, 'create_support_request', { p_category: 'booking', p_subject: 'Need help', p_message: 'My tutor did not show up.' })).data
  const b = (await rpc(p, 'create_support_request', { p_category: 'payment', p_subject: 'Refund question', p_message: 'When will my refund arrive?' })).data
  eq([a.priority, b.priority], ['standard', 'priority'], 'priority from membership')
  denied(await sql(s, `update support_requests set priority = 'priority' where id = $1`, [a.id]).then(() => ({ data: 1 }), (e) => ({ error: e })), /permission/, 'cannot upgrade own priority')
  const queue = (await rpc(admin, 'admin_list_support', { p_status: 'open' })).data.filter((x) => [a.id, b.id].includes(x.id))
  eq(queue.map((x) => x.id), [b.id, a.id], 'priority first')
  await rpc(admin, 'admin_update_support', { p_id: b.id, p_status: 'resolved', p_reply: 'It is on its way.' })
  eq((await sql(p, 'select status, admin_reply from support_requests'))[0].status, 'resolved', 'user sees the reply')
  eq((await sql(s, 'select * from support_requests where id = $1', [b.id])).length, 0, 'others cannot see it')
})

await pool.end()
for (const [s, name, err] of results) console.log(`${s}  ${name}${err ? '\n      ' + err : ''}`)
const failed = results.filter((r) => r[0] === 'FAIL').length
console.log(`\n${results.length - failed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
