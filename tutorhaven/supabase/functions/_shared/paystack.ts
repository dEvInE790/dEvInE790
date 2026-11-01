// Minimal Paystack client. Amounts are in kobo (₦1 = 100 kobo).
// Docs: https://paystack.com/docs/api/transaction/

export const PAYSTACK_BASE = 'https://api.paystack.co'

type PaystackResponse<T> = { status: boolean; message: string; data: T }

async function call<T>(secret: string, path: string, init: RequestInit = {}, base = PAYSTACK_BASE): Promise<T> {
  const res = await fetch(base + path, {
    ...init,
    headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  })
  const body = (await res.json().catch(() => null)) as PaystackResponse<T> | null
  if (!res.ok || !body?.status) throw new Error(body?.message || `Paystack request failed (${res.status})`)
  return body.data
}

export type InitData = { authorization_url: string; access_code: string; reference: string }
export type VerifyData = {
  status: string
  reference: string
  amount: number
  currency: string
  id: number
  paid_at: string | null
  channel: string
  gateway_response?: string
}

export const initializeTransaction = (secret: string, body: Record<string, unknown>, base?: string) =>
  call<InitData>(secret, '/transaction/initialize', { method: 'POST', body: JSON.stringify(body) }, base)

export const verifyTransaction = (secret: string, reference: string, base?: string) =>
  call<VerifyData>(secret, `/transaction/verify/${encodeURIComponent(reference)}`, { method: 'GET' }, base)

export const refundTransaction = (secret: string, reference: string, amountKobo?: number, base?: string) =>
  call<{ status: string }>(secret, '/refund', { method: 'POST', body: JSON.stringify({ transaction: reference, amount: amountKobo }) }, base)

/** The Paystack API bound to one secret key, in the shape core.ts expects. */
export const paystackApi = (secret: string, base = PAYSTACK_BASE) => ({
  initialize: (body: Record<string, unknown>) => initializeTransaction(secret, body, base),
  verify: (reference: string) => verifyTransaction(secret, reference, base),
  refund: (reference: string, amountKobo?: number) => refundTransaction(secret, reference, amountKobo, base),
})

/** Paystack signs webhooks with HMAC-SHA512 of the raw body using your secret key. */
export async function verifySignature(secret: string, rawBody: string, signature: string | null): Promise<boolean> {
  if (!signature) return false
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-512' }, false, ['sign'])
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody))
  const hex = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, '0')).join('')
  if (hex.length !== signature.length) return false
  let diff = 0
  for (let i = 0; i < hex.length; i++) diff |= hex.charCodeAt(i) ^ signature.charCodeAt(i)
  return diff === 0
}
