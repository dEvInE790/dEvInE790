// POST { reference } — the app calls this after the checkout window closes.
import { corsHeaders, env, fail, json } from '../_shared/http.ts'
import { verifyTransaction } from '../_shared/paystack.ts'
import { fulfilFromPaystack, userClient } from '../_shared/supabase.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const { reference } = await req.json()
    // Row level security: users can only see their own payment intents.
    const { data: intent, error } = await userClient(req).from('payment_intents').select('reference, status').eq('reference', reference).maybeSingle()
    if (error) return fail(error.message)
    if (!intent) return fail('Payment not found', 404)
    if (intent.status === 'succeeded') return json({ status: 'succeeded' })

    const verified = await verifyTransaction(env('PAYSTACK_SECRET_KEY'), reference)
    const result = await fulfilFromPaystack(reference, verified, { id: verified.id, channel: verified.channel, paid_at: verified.paid_at })
    return json(result)
  } catch (e) {
    return fail((e as Error).message, 500)
  }
})
