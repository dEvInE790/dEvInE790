// Payment logic shared by the Paystack Edge Functions. It is kept free of Deno-
// and Supabase-specific imports, so the same code runs in the integration
// tests (supabase/tests) against a real Postgres and a Paystack simulator.
//
// Rules this file enforces:
// * The browser or app never decides whether a payment succeeded. Every
//   outcome comes from Paystack's verify API, called from the server.
// * Webhooks are accepted only with a valid HMAC-SHA512 signature, and each
//   event is processed once (payment_events.idempotency_key).
// * Fulfilment itself is idempotent in the database (fulfill_payment), so a
//   callback, a verify call and a webhook racing each other are all safe.
import type { VerifyData } from './paystack.ts'
import { verifySignature } from './paystack.ts'
import { isAllowedRedirect, withParams } from './redirect.ts'

export type RpcResult<T = any> = { data: T | null; error: { message: string } | null }
export type Rpc = <T = any>(fn: string, args?: Record<string, unknown>) => Promise<RpcResult<T>>

export type PaystackApi = {
  initialize(body: Record<string, unknown>): Promise<{ authorization_url: string; access_code: string; reference: string }>
  verify(reference: string): Promise<VerifyData>
  refund(reference: string, amountKobo?: number): Promise<{ status: string }>
}

export type Deps = {
  paystack: PaystackApi
  /** PAYSTACK_SECRET_KEY, only used here to check webhook signatures. */
  secret: string
  /** APP_URLS: web origins allowed as return addresses. */
  appUrls: string
  /** Public URL of the Functions endpoint, e.g. https://<ref>.supabase.co/functions/v1 */
  functionsUrl: string
  /** Acts as the signed-in caller (row level security applies). */
  asUser: (req: Request) => Rpc
  /** Service role: the only identity allowed to fulfil payments. */
  service: Rpc
  /** Reads one payment row with the service role. */
  getPayment: (id: string) => Promise<Record<string, any> | null>
}

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
const fail = (message: string, status = 400) => json({ error: message }, status)

type Source = 'checkout' | 'callback' | 'verify' | 'webhook' | 'refund' | 'maintenance' | 'admin'

async function logEvent(deps: Deps, reference: string | null, event: string, source: Source, outcome = '', error: string | null = null, payload: unknown = {}, key: string | null = null) {
  const { data, error: e } = await deps.service<boolean>('log_payment_event', {
    p_reference: reference, p_event: event, p_source: source, p_idempotency_key: key,
    p_outcome: outcome, p_error: error, p_payload: payload ?? {},
  })
  if (e) console.error('could not log payment event', e.message)
  return data !== false
}

/** What we keep from Paystack's verify response (no card or customer details). */
const summary = (v: VerifyData, source: Source) => ({
  id: v.id, status: v.status, channel: v.channel, paid_at: v.paid_at, gateway_response: v.gateway_response ?? null, source,
})

export type Settled = { status: 'succeeded' | 'refund_pending' | 'failed' | 'abandoned' | 'pending'; reason?: string; kind?: string; booking_id?: string | null; plan_id?: string | null }

/**
 * Asks Paystack what happened to a reference and records the outcome.
 * Paystack statuses: success, failed, reversed, abandoned (opened but not
 * paid), ongoing / pending / processing / queued (still in progress).
 */
export async function settle(deps: Deps, reference: string, source: Source): Promise<Settled> {
  let v: VerifyData
  try {
    v = await deps.paystack.verify(reference)
  } catch (e) {
    const msg = (e as Error).message
    await logEvent(deps, reference, 'verify.error', source, 'pending', msg)
    return { status: 'pending', reason: 'We couldn’t reach Paystack to confirm this payment yet.' }
  }
  const payload = summary(v, source)

  if (v.status === 'success') {
    const { data, error } = await deps.service<any>('fulfill_payment', {
      p_reference: reference, p_amount_kobo: v.amount, p_currency: v.currency, p_payload: payload,
    })
    if (error) throw new Error(error.message)
    return { status: data.status, reason: data.reason || data.note || undefined, kind: data.kind, booking_id: data.booking_id, plan_id: data.plan_id }
  }

  if (v.status === 'failed' || v.status === 'reversed' || v.status === 'abandoned') {
    const status = v.status === 'abandoned' ? 'abandoned' : 'failed'
    const reason = status === 'abandoned' ? 'Checkout was closed before payment was completed' : (v.gateway_response || 'The payment was declined')
    const { data, error } = await deps.service<any>('mark_payment_unsuccessful', {
      p_reference: reference, p_status: status, p_paystack_status: v.status, p_reason: reason, p_payload: payload,
    })
    if (error) throw new Error(error.message)
    // A webhook may have confirmed it in the meantime.
    if (data?.status === 'succeeded') return { status: 'succeeded' }
    return { status, reason, kind: data?.kind, booking_id: data?.booking_id }
  }

  await logEvent(deps, reference, 'payment.pending', source, 'pending', null, payload)
  return { status: 'pending', reason: 'Paystack is still processing this payment.' }
}

// ---------------------------------------------------------------------------
// paystack-init: POST { kind, booking_id?, plan_id?, redirect_url }
// ---------------------------------------------------------------------------
export async function handleInit(req: Request, deps: Deps): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return fail('Method not allowed', 405)
  let body: any
  try { body = await req.json() } catch { return fail('Invalid request') }
  const { kind, booking_id = null, plan_id = null, redirect_url } = body ?? {}
  if (kind !== 'session' && kind !== 'subscription') return fail('Unknown checkout type')
  if (!isAllowedRedirect(redirect_url, deps.appUrls)) return fail('This return address is not allowed')

  // Prices are worked out in the database from the booking or plan; the client sends no amounts.
  const { data: intent, error } = await deps.asUser(req)<any>('start_checkout', { p_kind: kind, p_booking: booking_id, p_plan_id: plan_id })
  if (error) return fail(error.message)

  const callback = new URL(`${deps.functionsUrl}/paystack-callback`)
  callback.searchParams.set('redirect', redirect_url)
  try {
    const init = await deps.paystack.initialize({
      email: intent.email,
      amount: Math.round(Number(intent.amount) * 100),
      currency: 'NGN',
      reference: intent.reference,
      callback_url: callback.toString(),
      metadata: { kind, booking_id, plan_id, cancel_action: withParams(redirect_url, { reference: intent.reference, status: 'abandoned' }) },
    })
    await logEvent(deps, intent.reference, 'checkout.initialized', 'checkout', 'pending')
    return json({ authorization_url: init.authorization_url, reference: intent.reference, amount: intent.amount, description: intent.description })
  } catch (e) {
    const msg = (e as Error).message
    await deps.service('mark_payment_unsuccessful', {
      p_reference: intent.reference, p_status: 'failed', p_paystack_status: null, p_reason: 'Could not start Paystack checkout: ' + msg, p_payload: {},
    })
    return fail('Paystack could not start the checkout. Please try again.', 502)
  }
}

// ---------------------------------------------------------------------------
// paystack-verify: POST { reference } (signed-in owner, or an admin)
// ---------------------------------------------------------------------------
export async function handleVerify(req: Request, deps: Deps): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return fail('Method not allowed', 405)
  let reference = ''
  try { reference = String((await req.json())?.reference ?? '') } catch { return fail('Invalid request') }
  if (!reference) return fail('Missing reference')
  // payment_status only answers for the caller's own payments (or an admin).
  const { data: current, error } = await deps.asUser(req)<any>('payment_status', { p_reference: reference })
  if (error) return fail(error.message)
  if (!current) return fail('Payment not found', 404)
  if (current.status === 'succeeded') return json({ ...current, status: 'succeeded' })
  try {
    return json(await settle(deps, reference, 'verify'))
  } catch (e) {
    return fail((e as Error).message, 500)
  }
}

// ---------------------------------------------------------------------------
// paystack-callback: Paystack sends the browser here (GET ?reference=&redirect=)
// ---------------------------------------------------------------------------
export async function handleCallback(req: Request, deps: Deps): Promise<Response> {
  const url = new URL(req.url)
  const reference = url.searchParams.get('reference') ?? url.searchParams.get('trxref') ?? ''
  const redirect = url.searchParams.get('redirect')
  if (!isAllowedRedirect(redirect, deps.appUrls)) return new Response('Invalid return address', { status: 400 })
  let status = 'pending'
  let message = ''
  try {
    const r = await settle(deps, reference, 'callback')
    status = r.status
    message = r.reason ?? ''
  } catch (e) {
    message = (e as Error).message
  }
  // The app shows this as a hint only, and asks paystack-verify for the real status.
  return new Response(null, { status: 302, headers: { Location: withParams(redirect!, { reference, status, message }) } })
}

// ---------------------------------------------------------------------------
// paystack-webhook: Paystack → server events (POST, signed)
// ---------------------------------------------------------------------------
export async function handleWebhook(req: Request, deps: Deps): Promise<Response> {
  if (req.method !== 'POST') return new Response('ok')
  const raw = await req.text()
  if (!(await verifySignature(deps.secret, raw, req.headers.get('x-paystack-signature')))) {
    await logEvent(deps, null, 'webhook.rejected', 'webhook', 'bad_signature', 'Invalid or missing x-paystack-signature')
    return new Response('Invalid signature', { status: 401 })
  }
  let event: any
  try { event = JSON.parse(raw) } catch { return new Response('Invalid body', { status: 400 }) }
  const name = String(event?.event ?? 'unknown')
  const data = event?.data ?? {}
  const reference: string | null = data.reference ?? data.transaction_reference ?? data.transaction?.reference ?? null
  const eventId = data.id ?? data.refund_reference ?? reference
  const key = `${name}:${eventId}:${data.status ?? ''}`

  // Duplicate delivery? Paystack retries until it gets a 200, and may deliver twice.
  const { data: seen } = await deps.service<boolean>('payment_event_seen', { p_key: key })
  if (seen) return json({ ok: true, duplicate: true })

  try {
    let outcome = 'ignored'
    if (name === 'charge.success' && reference) {
      // Re-verify with the API rather than trusting the webhook body.
      const r = await settle(deps, reference, 'webhook')
      outcome = r.status
    } else if ((name === 'refund.processed' || name === 'refund.failed') && reference) {
      const { data: n, error } = await deps.service<number>('apply_refund_webhook', {
        p_reference: reference, p_success: name === 'refund.processed', p_note: name === 'refund.failed' ? String(data.status ?? 'failed') : '',
      })
      if (error) throw new Error(error.message)
      outcome = n ? (name === 'refund.processed' ? 'refunded' : 'refund_failed') : 'no_matching_payment'
    }
    await logEvent(deps, reference, 'webhook.' + name, 'webhook', outcome, null, { id: data.id ?? null, status: data.status ?? null }, key)
    return json({ ok: true, outcome })
  } catch (e) {
    const msg = (e as Error).message
    if (/Unknown payment reference/.test(msg)) {
      // A payment from another app on the same Paystack account: acknowledge it.
      await logEvent(deps, reference, 'webhook.' + name, 'webhook', 'unknown_reference', null, {}, key)
      return json({ ok: true, outcome: 'unknown_reference' })
    }
    // Not recorded as processed, so Paystack's retry will be handled.
    await logEvent(deps, reference, 'webhook.' + name, 'webhook', 'error', msg)
    return new Response('Temporary error', { status: 500 })
  }
}

// ---------------------------------------------------------------------------
// paystack-refund: POST { payment_id } (admins)
// ---------------------------------------------------------------------------
export async function handleRefund(req: Request, deps: Deps): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return fail('Method not allowed', 405)
  const { data: isAdmin } = await deps.asUser(req)<boolean>('is_admin')
  if (!isAdmin) return fail('Admins only', 403)
  let paymentId = ''
  try { paymentId = String((await req.json())?.payment_id ?? '') } catch { return fail('Invalid request') }
  const payment = await deps.getPayment(paymentId)
  if (!payment) return fail('Payment not found', 404)
  if (!['succeeded', 'refund_pending'].includes(payment.status)) {
    return fail(payment.status === 'refund_processing' ? 'This refund is already being processed' : 'Already refunded')
  }
  if (payment.provider !== 'paystack') return fail('Only Paystack payments can be refunded here. Use “Mark refunded” for money returned another way.')
  let refundStatus: string
  try {
    refundStatus = (await deps.paystack.refund(payment.provider_ref, Math.round(Number(payment.amount) * 100))).status
  } catch (e) {
    const msg = (e as Error).message
    await logEvent(deps, payment.provider_ref, 'refund.error', 'refund', 'error', msg)
    return fail('Paystack refused the refund: ' + msg, 502)
  }
  const finalStatus = refundStatus === 'processed' ? 'refunded' : 'refund_processing'
  const { data, error } = await deps.service('record_refund', { p_payment: paymentId, p_status: finalStatus, p_note: `Paystack refund ${refundStatus}` })
  if (error) return fail(error.message)
  return json(data)
}

// ---------------------------------------------------------------------------
// paystack-reconcile: POST {} (admins) — re-checks pending payments with Paystack,
// in case a webhook never arrived.
// ---------------------------------------------------------------------------
export async function handleReconcile(req: Request, deps: Deps): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return fail('Method not allowed', 405)
  const { data: isAdmin } = await deps.asUser(req)<boolean>('is_admin')
  if (!isAdmin) return fail('Admins only', 403)
  const { data: refs, error } = await deps.service<string[]>('pending_payment_references', { p_limit: 50 })
  if (error) return fail(error.message)
  const results: Record<string, string> = {}
  for (const ref of refs ?? []) {
    try {
      results[ref] = (await settle(deps, ref, 'admin')).status
    } catch (e) {
      results[ref] = 'error: ' + (e as Error).message
    }
  }
  return json({ checked: Object.keys(results).length, results })
}
