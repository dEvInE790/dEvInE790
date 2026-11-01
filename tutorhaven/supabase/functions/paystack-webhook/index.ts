// Paystack → Supabase webhook (deploy with --no-verify-jwt). Set the URL in
// Paystack Dashboard → Settings → API Keys & Webhooks. Guarantees bookings are
// confirmed even if the customer closes the checkout before returning.
import { env } from '../_shared/http.ts'
import { verifySignature, verifyTransaction } from '../_shared/paystack.ts'
import { fulfilFromPaystack } from '../_shared/supabase.ts'

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('ok')
  const raw = await req.text()
  const secret = env('PAYSTACK_SECRET_KEY')
  if (!(await verifySignature(secret, raw, req.headers.get('x-paystack-signature')))) {
    return new Response('Invalid signature', { status: 401 })
  }
  const event = JSON.parse(raw)
  if (event.event === 'charge.success' && event.data?.reference) {
    try {
      // Re-verify with the API rather than trusting the payload alone.
      const verified = await verifyTransaction(secret, event.data.reference)
      await fulfilFromPaystack(event.data.reference, verified, { id: verified.id, channel: verified.channel, paid_at: verified.paid_at, via: 'webhook' })
    } catch (e) {
      console.error('webhook fulfilment failed', (e as Error).message)
      // Unknown references (e.g. payments from other apps on the same account) are acknowledged.
    }
  }
  return new Response('ok')
})
