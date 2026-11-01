// POST { kind: 'session' | 'subscription', booking_id?, plan?, redirect_url }
// Creates a server-priced payment intent and a Paystack checkout link.
import { corsHeaders, env, fail, json } from '../_shared/http.ts'
import { initializeTransaction } from '../_shared/paystack.ts'
import { isAllowedRedirect } from '../_shared/redirect.ts'
import { userClient } from '../_shared/supabase.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return fail('Method not allowed', 405)
  try {
    const { kind, booking_id = null, plan = null, redirect_url } = await req.json()
    if (!isAllowedRedirect(redirect_url, Deno.env.get('APP_URLS') ?? '')) return fail('This return address is not allowed')

    const { data: intent, error } = await userClient(req).rpc('start_checkout', { p_kind: kind, p_booking: booking_id, p_plan: plan })
    if (error) return fail(error.message)

    const callback = new URL(`${env('SUPABASE_URL')}/functions/v1/paystack-callback`)
    callback.searchParams.set('redirect', redirect_url)

    const init = await initializeTransaction(env('PAYSTACK_SECRET_KEY'), {
      email: intent.email,
      amount: Math.round(Number(intent.amount) * 100),
      currency: 'NGN',
      reference: intent.reference,
      callback_url: callback.toString(),
      metadata: { kind, booking_id, plan, cancel_action: redirect_url },
    })
    return json({ authorization_url: init.authorization_url, reference: intent.reference, amount: intent.amount, description: intent.description })
  } catch (e) {
    return fail((e as Error).message, 500)
  }
})
