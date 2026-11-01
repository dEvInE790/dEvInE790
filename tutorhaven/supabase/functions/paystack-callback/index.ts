// Paystack sends the browser here after checkout (deploy with --no-verify-jwt).
// We verify the payment server-side, record it, then send the user back to the app.
import { verifyTransaction } from '../_shared/paystack.ts'
import { isAllowedRedirect, withParams } from '../_shared/redirect.ts'
import { env } from '../_shared/http.ts'
import { fulfilFromPaystack } from '../_shared/supabase.ts'

Deno.serve(async (req) => {
  const url = new URL(req.url)
  const reference = url.searchParams.get('reference') ?? url.searchParams.get('trxref') ?? ''
  const redirect = url.searchParams.get('redirect')
  if (!isAllowedRedirect(redirect, Deno.env.get('APP_URLS') ?? '')) return new Response('Invalid return address', { status: 400 })

  let status = 'failed'
  let message = ''
  try {
    const verified = await verifyTransaction(env('PAYSTACK_SECRET_KEY'), reference)
    const result = await fulfilFromPaystack(reference, verified, { id: verified.id, channel: verified.channel, paid_at: verified.paid_at })
    status = result.status
    message = result.note ?? ''
  } catch (e) {
    message = (e as Error).message
  }
  return new Response(null, { status: 302, headers: { Location: withParams(redirect!, { reference, status, message }) } })
})
