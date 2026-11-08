// Test-only local stack: a stand-in for the Supabase HTTP APIs (Auth, PostgREST,
// Storage, Edge Functions) on top of a real Postgres with the real migrations,
// plus a Paystack simulator with its own checkout page.
//
// Payments go through the real Edge Function code (supabase/functions/_shared/core.ts):
// the simulator only replaces api.paystack.co. Nothing here is used in production.
//
//   sudo bash ../supabase/tests/db/setup.sh
//   node --experimental-strip-types e2e/stack/start.mjs
import { createServer } from 'node:http'
import { createHash, createHmac, randomUUID } from 'node:crypto'
import pg from 'pg'
import * as core from '../../supabase/functions/_shared/core.ts'
import * as aiCore from '../../supabase/functions/_shared/ai.ts'
import * as accountCore from '../../supabase/functions/_shared/account.ts'
import { handleRest, httpError } from './postgrest.mjs'

export const ANON_KEY = 'local-stack-anon-key-not-a-secret-0123456789'
const PAYSTACK_SECRET = 'sk_test_local_simulator_only'

const b64u = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
const fromB64u = (s) => JSON.parse(Buffer.from(s, 'base64url').toString())
const hash = (s) => createHash('sha256').update(s).digest('hex')

export async function startStack({ port = 54321, databaseUrl = 'postgres://postgres@localhost:5499/tutorhaven', appUrls = 'http://localhost:4173', webhookDelayMs = 300 } = {}) {
  const pool = new pg.Pool({ connectionString: databaseUrl, max: 12 })
  const base = `http://localhost:${port}`

  // -------------------------------------------------------------------------
  // Database as a role (what PostgREST does per request)
  // -------------------------------------------------------------------------
  async function as(uid, run) {
    const c = await pool.connect()
    try {
      await c.query('begin')
      const role = uid === 'service' ? 'service_role' : uid ? 'authenticated' : 'anon'
      await c.query(`select set_config('role', $1, true), set_config('request.jwt.claim.sub', $2, true), set_config('request.jwt.claim.role', $1, true)`, [role, uid && uid !== 'service' ? uid : ''])
      const out = await run((text, params) => c.query(text, params).then((r) => r.rows))
      await c.query('commit')
      return out
    } catch (e) {
      await c.query('rollback').catch(() => {})
      throw e
    } finally {
      c.release()
    }
  }
  const retset = new Map()
  async function rpc(uid, fn, args = {}) {
    if (!/^[a-z_][a-z0-9_]*$/.test(fn)) throw httpError(404, 'Function not found')
    if (!retset.has(fn)) {
      const { rows } = await pool.query(`select bool_or(proretset) s, count(*) n from pg_proc where proname = $1 and pronamespace = 'public'::regnamespace`, [fn])
      if (!Number(rows[0].n)) throw httpError(404, `Could not find the function public.${fn}`, 'PGRST202')
      retset.set(fn, !!rows[0].s)
    }
    const keys = Object.keys(args ?? {}).filter((k) => /^[a-z_][a-z0-9_]*$/.test(k))
    const values = keys.map((k) => (args[k] !== null && typeof args[k] === 'object' && !Array.isArray(args[k]) ? JSON.stringify(args[k]) : args[k]))
    const rows = await as(uid, (q) => q(`select to_jsonb(t) as r from public.${fn}(${keys.map((k, i) => `${k} => $${i + 1}`).join(', ')}) t`, values))
    return retset.get(fn) ? rows.map((r) => r.r) : rows[0]?.r ?? null
  }
  const pgError = (e) => {
    if (e.status) return e
    const status = e.code === '42501' ? 403 : e.code === 'P0001' ? 400 : e.code?.startsWith('23') ? 409 : 400
    return Object.assign(new Error(e.message), { status, body: { message: e.message, code: e.code, details: e.detail ?? null, hint: e.hint ?? null } })
  }

  // -------------------------------------------------------------------------
  // Auth (GoTrue subset). Accounts are confirmed immediately.
  // -------------------------------------------------------------------------
  const tokenFor = (u) => {
    const exp = Math.floor(Date.now() / 1000) + 3600
    const access_token = `${b64u({ alg: 'HS256', typ: 'JWT' })}.${b64u({ sub: u.id, email: u.email, role: 'authenticated', aud: 'authenticated', exp })}.local`
    return { access_token, token_type: 'bearer', expires_in: 3600, expires_at: exp, refresh_token: 'rt-' + u.id, user: authUser(u) }
  }
  const authUser = (u) => ({
    id: u.id, aud: 'authenticated', role: 'authenticated', email: u.email, email_confirmed_at: u.created_at,
    user_metadata: u.raw_user_meta_data ?? {}, app_metadata: { provider: 'email' }, created_at: u.created_at,
  })
  const uidFrom = (req) => {
    const t = (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
    const parts = t.split('.')
    if (parts.length !== 3) return null
    try { return fromB64u(parts[1]).sub ?? null } catch { return null }
  }
  const authErr = (status, msg, code = 'invalid_credentials') => Object.assign(new Error(msg), { status, body: { code, error_code: code, msg, message: msg, error: code, error_description: msg } })

  async function auth(method, path, url, body, uid) {
    const users = (q, p) => pool.query(q, p).then((r) => r.rows)
    if (path === 'signup') {
      const email = String(body.email || '').trim().toLowerCase()
      if (!/^\S+@\S+\.\S+$/.test(email)) throw authErr(400, 'Unable to validate email address: invalid format', 'validation_failed')
      if (String(body.password || '').length < 6) throw authErr(422, 'Password should be at least 6 characters.', 'weak_password')
      if ((await users('select 1 from auth.users where email = $1', [email])).length) throw authErr(422, 'User already registered', 'user_already_exists')
      const [u] = await users(`insert into auth.users (email, encrypted_password, raw_user_meta_data, email_confirmed_at) values ($1, $2, $3, now()) returning *`,
        [email, hash(body.password), JSON.stringify(body.data ?? {})])
      return tokenFor(u)
    }
    if (path === 'token') {
      const grant = url.searchParams.get('grant_type')
      if (grant === 'password') {
        const [u] = await users('select * from auth.users where email = $1 and encrypted_password = $2', [String(body.email || '').trim().toLowerCase(), hash(String(body.password || ''))])
        if (!u) throw authErr(400, 'Invalid login credentials')
        return tokenFor(u)
      }
      if (grant === 'refresh_token') {
        const [u] = await users('select * from auth.users where id::text = $1', [String(body.refresh_token || '').replace(/^rt-/, '')])
        if (!u) throw authErr(400, 'Invalid Refresh Token: Refresh Token Not Found', 'refresh_token_not_found')
        return tokenFor(u)
      }
    }
    if (path === 'user') {
      const [u] = uid ? await users('select * from auth.users where id = $1', [uid]) : []
      if (!u) throw authErr(401, 'User not found', 'user_not_found')
      if (method === 'PUT') {
        if (body.password !== undefined) {
          if (String(body.password).length < 6) throw authErr(422, 'Password should be at least 6 characters.', 'weak_password')
          await users('update auth.users set encrypted_password = $2 where id = $1', [uid, hash(body.password)])
        }
        if (body.data) await users(`update auth.users set raw_user_meta_data = coalesce(raw_user_meta_data, '{}') || $2 where id = $1`, [uid, JSON.stringify(body.data)])
        return authUser((await users('select * from auth.users where id = $1', [uid]))[0])
      }
      return authUser(u)
    }
    if (path === 'logout') return null
    if (path === 'recover' || path === 'resend') return {}
    if (path === 'settings') return { external: { email: true }, disable_signup: false, mailer_autoconfirm: true }
    throw authErr(404, 'Not found', 'not_found')
  }

  // -------------------------------------------------------------------------
  // Storage (private buckets; RLS on storage.objects decides access)
  // -------------------------------------------------------------------------
  const blobs = new Map()
  const signed = new Map()
  async function storage(method, path, req, rawBody, uid) {
    let m
    if ((m = path.match(/^object\/sign\/([^/]+)\/(.+)$/)) && method === 'POST') {
      const [, bucket, name] = m
      const rows = await as(uid, (q) => q('select name from storage.objects where bucket_id = $1 and name = $2', [bucket, decodeURIComponent(name)]))
      if (!rows.length) throw Object.assign(new Error('Object not found'), { status: 400, body: { statusCode: '404', error: 'not_found', message: 'Object not found' } })
      const token = randomUUID()
      signed.set(token, `${bucket}/${decodeURIComponent(name)}`)
      return { signedURL: `/object/sign/${bucket}/${name}?token=${token}` }
    }
    if ((m = path.match(/^object\/([^/]+)\/(.+)$/)) && (method === 'POST' || method === 'PUT')) {
      const [, bucket, name] = m
      const key = decodeURIComponent(name)
      let bytes = rawBody, type = req.headers['content-type'] || 'application/octet-stream'
      if (type.startsWith('multipart/form-data')) {
        const form = await new Request('http://x', { method: 'POST', headers: { 'content-type': type }, body: rawBody }).formData()
        const file = [...form.values()].find((v) => typeof v === 'object')
        bytes = Buffer.from(await file.arrayBuffer())
        type = file.type || 'application/octet-stream'
      }
      await as(uid, (q) => q(`insert into storage.objects (bucket_id, name, owner) values ($1, $2, $3)`, [bucket, key, uid]))
      blobs.set(`${bucket}/${key}`, { bytes, type })
      return { Key: `${bucket}/${key}`, Id: randomUUID() }
    }
    if ((m = path.match(/^object\/([^/]+)$/)) && method === 'DELETE') {
      const [, bucket] = m
      const prefixes = JSON.parse(rawBody.toString() || '{}').prefixes ?? []
      const rows = await as(uid, (q) => q('delete from storage.objects where bucket_id = $1 and name = any($2) returning name', [bucket, prefixes]))
      rows.forEach((r) => blobs.delete(`${bucket}/${r.name}`))
      return rows.map((r) => ({ name: r.name }))
    }
    throw Object.assign(new Error('Not found'), { status: 404, body: { message: 'Not found' } })
  }

  // -------------------------------------------------------------------------
  // Paystack simulator
  // -------------------------------------------------------------------------
  const tx = new Map()
  const paystack = {
    tx,
    refunds: [],
    async initialize(body) {
      if (!body.email || !Number.isInteger(body.amount) || body.amount < 100) throw new Error('Invalid amount or email')
      tx.set(body.reference, { ...body, id: Math.floor(Math.random() * 1e9), status: 'abandoned', paid_at: null, channel: null, gateway_response: 'The transaction was not completed' })
      return { authorization_url: `${base}/paystack/checkout/${body.reference}`, access_code: body.reference, reference: body.reference }
    },
    async verify(reference) {
      const t = tx.get(reference)
      if (!t) throw new Error('Transaction reference not found')
      return { id: t.id, status: t.status, reference, amount: t.amount, currency: t.currency, paid_at: t.paid_at, channel: t.channel, gateway_response: t.gateway_response }
    },
    subaccounts: new Map(),
    async listBanks() {
      return [{ name: 'Access Bank', code: '044' }, { name: 'Guaranty Trust Bank', code: '058' }, { name: 'Opay', code: '999992' }]
    },
    async resolveAccount(accountNumber) {
      // Simulator: any 10-digit number resolves, except 9999999999.
      if (accountNumber === '9999999999') throw new Error('Could not resolve account name')
      return { account_number: accountNumber, account_name: 'TEST ACCOUNT HOLDER' }
    },
    async createSubaccount(body) {
      const code = 'ACCT_local' + (paystack.subaccounts.size + 1)
      paystack.subaccounts.set(code, body)
      return { subaccount_code: code }
    },
    async updateSubaccount(code, body) {
      paystack.subaccounts.set(code, { ...paystack.subaccounts.get(code), ...body })
      return { subaccount_code: code }
    },
    async refund(reference, amount) {
      const t = tx.get(reference)
      if (!t || t.status !== 'success') throw new Error('Transaction has not been paid')
      paystack.refunds.push({ reference, amount })
      // Paystack processes refunds asynchronously and then sends refund.processed.
      setTimeout(() => sendWebhook({ event: 'refund.processed', data: { id: Math.floor(Math.random() * 1e9), status: 'processed', transaction_reference: reference, amount } }), webhookDelayMs)
      return { status: 'pending' }
    },
  }
  async function sendWebhook(event) {
    const raw = JSON.stringify(event)
    await fetch(`${base}/functions/v1/paystack-webhook`, {
      method: 'POST', body: raw,
      headers: { 'content-type': 'application/json', 'x-paystack-signature': createHmac('sha512', PAYSTACK_SECRET).update(raw).digest('hex') },
    }).catch(() => {})
  }
  const naira = (kobo) => '₦' + (kobo / 100).toLocaleString('en-NG')
  function checkoutPage(t) {
    const btn = (action, label, style) => `<form method="post" action="${base}/paystack/checkout/${t.reference}/${action}"><button style="${style}">${label}</button></form>`
    return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Paystack test checkout</title>
      <style>body{font-family:system-ui;background:#f3f5f9;display:grid;place-items:center;min-height:100vh;margin:0}main{background:#fff;padding:28px;border-radius:16px;width:min(360px,90vw);box-shadow:0 10px 30px #0002}button{width:100%;padding:14px;border-radius:10px;border:0;font-size:16px;margin-top:10px;cursor:pointer}</style></head>
      <body><main><p style="margin:0;color:#888;font-size:13px">LOCAL PAYSTACK SIMULATOR · TEST ONLY</p>
      <h1 style="margin:8px 0">${naira(t.amount)}</h1><p style="color:#555">${t.email}</p><p style="font-size:12px;color:#999">${t.reference}</p>
      ${btn('success', 'Pay with test card', 'background:#0ba4db;color:#fff')}
      ${btn('failed', 'Simulate declined card', 'background:#fde8e8;color:#b42318')}
      ${btn('cancel', 'Cancel payment', 'background:#eee;color:#333')}</main></body></html>`
  }

  // -------------------------------------------------------------------------
  // Edge Functions (real code)
  // -------------------------------------------------------------------------
  const deps = {
    paystack, secret: PAYSTACK_SECRET, appUrls, functionsUrl: `${base}/functions/v1`,
    service: async (fn, args) => { try { return { data: await rpc('service', fn, args), error: null } } catch (e) { return { data: null, error: { message: e.message } } } },
    asUser: (req) => {
      const parts = (req.headers.get('Authorization') ?? '').replace(/^Bearer /, '').split('.')
      let uid = null
      try { uid = parts.length === 3 ? fromB64u(parts[1]).sub : null } catch { /* anon */ }
      return async (fn, args) => { try { return { data: await rpc(uid, fn, args), error: null } } catch (e) { return { data: null, error: { message: e.message } } } }
    },
    getPayment: async (id) => (await as('service', (q) => q('select * from payments where id = $1', [id])))[0] ?? null,
  }
  // Test-only stand-in for the Claude API (the real one needs ANTHROPIC_API_KEY).
  const ai = {
    calls: [],
    down: false,
    async ask(input) {
      this.calls.push(input)
      if (this.down) throw new Error('simulated AI outage')
      const q = input.messages.at(-1).content
      return { text: `## Simulated answer\nYou asked: ${q}\n1. First step\n2. Second step\n\n**Key idea:** test responses only.`, inputTokens: 50, outputTokens: 40, stopReason: 'end_turn' }
    },
  }
  const aiDeps = {
    service: deps.service,
    ai,
    userId: async (req) => {
      const parts = (req.headers.get('Authorization') ?? '').replace(/^Bearer /, '').split('.')
      try { return parts.length === 3 ? fromB64u(parts[1]).sub ?? null : null } catch { return null }
    },
  }
  const FUNCTIONS = {
    'ai-assistant': (req) => aiCore.handleAiAssistant(req, aiDeps),
    'delete-account': (req) => accountCore.handleDeleteAccount(req, {
      service: deps.service, userId: aiDeps.userId,
      removeFiles: async (id) => { for (const k of [...blobs.keys()]) if (k.startsWith(`qualifications/${id}/`)) blobs.delete(k) },
      deleteUser: async (id) => { await pool.query('delete from auth.users where id = $1', [id]) },
    }),
    'paystack-init': core.handleInit, 'paystack-verify': core.handleVerify, 'paystack-callback': core.handleCallback,
    'paystack-webhook': core.handleWebhook, 'paystack-refund': core.handleRefund, 'paystack-reconcile': core.handleReconcile,
    'paystack-payout-account': core.handlePayoutAccount,
  }

  // -------------------------------------------------------------------------
  // HTTP
  // -------------------------------------------------------------------------
  const cors = {
    'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS,HEAD',
    'access-control-expose-headers': 'content-range, x-total-count',
  }
  const server = createServer(async (req, res) => {
    const chunks = []
    for await (const c of req) chunks.push(c)
    const raw = Buffer.concat(chunks)
    const url = new URL(req.url, base)
    const send = (status, body, headers = {}) => {
      res.writeHead(status, { ...cors, ...(body === null || body === undefined ? {} : { 'content-type': 'application/json' }), ...headers })
      res.end(body === null || body === undefined ? undefined : typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body))
    }
    if (req.method === 'OPTIONS') return send(204, null)
    const parse = () => { try { return raw.length ? JSON.parse(raw.toString()) : {} } catch { return {} } }
    const uid = uidFrom(req)
    try {
      const p = url.pathname
      if (p.startsWith('/auth/v1/')) {
        const out = await auth(req.method, p.slice(9), url, parse(), uid)
        return send(out === null ? 204 : 200, out)
      }
      if (p.startsWith('/rest/v1/rpc/')) {
        try { return send(200, await rpc(uid, p.slice(13), parse())) } catch (e) { throw pgError(e) }
      }
      if (p.startsWith('/rest/v1/')) {
        try {
          const out = await handleRest({ method: req.method, table: p.slice(9), searchParams: url.searchParams, body: parse(), prefer: req.headers.prefer || '', accept: req.headers.accept || '' },
            (text, params) => as(uid, (q) => q(text, params)), pool)
          return send(out.status, out.body)
        } catch (e) { throw pgError(e) }
      }
      if (p.startsWith('/storage/v1/object/sign/') && req.method === 'GET') {
        const key = signed.get(url.searchParams.get('token'))
        const blob = key && blobs.get(key)
        if (!blob) return send(400, { message: 'Invalid signature' })
        return send(200, blob.bytes, { 'content-type': blob.type })
      }
      if (p.startsWith('/storage/v1/')) {
        try { return send(200, await storage(req.method, p.slice(12), req, raw, uid)) } catch (e) { throw pgError(e) }
      }
      if (p.startsWith('/functions/v1/')) {
        const handler = FUNCTIONS[p.slice(14)]
        if (!handler) return send(404, { error: 'Function not found' })
        const request = new Request(url, { method: req.method, headers: req.headers, body: ['GET', 'HEAD'].includes(req.method) ? undefined : raw })
        const response = await handler(request, deps)
        return send(response.status, Buffer.from(await response.arrayBuffer()), Object.fromEntries(response.headers))
      }
      let m
      if ((m = p.match(/^\/paystack\/checkout\/([\w-]+)$/))) {
        const t = tx.get(m[1])
        return t ? send(200, checkoutPage(t), { 'content-type': 'text/html; charset=utf-8' }) : send(404, 'Unknown transaction', { 'content-type': 'text/plain' })
      }
      if ((m = p.match(/^\/paystack\/checkout\/([\w-]+)\/(success|failed|cancel)$/)) && req.method === 'POST') {
        const t = tx.get(m[1])
        if (!t) return send(404, 'Unknown transaction', { 'content-type': 'text/plain' })
        if (m[2] === 'cancel') return send(302, null, { location: t.metadata?.cancel_action || t.callback_url })
        Object.assign(t, m[2] === 'success'
          ? { status: 'success', paid_at: new Date().toISOString(), channel: 'card', gateway_response: 'Approved' }
          : { status: 'failed', channel: 'card', gateway_response: 'Declined by test card' })
        if (m[2] === 'success') setTimeout(() => sendWebhook({ event: 'charge.success', data: { id: t.id, reference: t.reference, status: 'success', amount: t.amount, currency: t.currency } }), webhookDelayMs)
        const back = new URL(t.callback_url)
        back.searchParams.set('reference', t.reference)
        back.searchParams.set('trxref', t.reference)
        return send(302, null, { location: back.toString() })
      }
      if (p === '/health') return send(200, { ok: true })
      return send(404, { message: 'Not found' })
    } catch (e) {
      if (!e.status) console.error('[stack]', e)
      return send(e.status ?? 500, e.body ?? { message: e.message })
    }
  })
  await new Promise((r) => server.listen(port, r))
  return {
    url: base, anonKey: ANON_KEY, pool, paystack, ai, rpc, as,
    sql: (text, params) => pool.query(text, params).then((r) => r.rows),
    close: async () => { server.closeAllConnections?.(); await new Promise((r) => server.close(r)); await pool.end() },
  }
}
