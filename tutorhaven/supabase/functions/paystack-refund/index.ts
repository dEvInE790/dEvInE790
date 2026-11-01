// POST { payment_id } — admins only. Issues the refund through Paystack and records it.
import { corsHeaders, env, fail, json } from '../_shared/http.ts'
import { refundTransaction } from '../_shared/paystack.ts'
import { adminClient, userClient } from '../_shared/supabase.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const { payment_id } = await req.json()
    const { data: isAdmin } = await userClient(req).rpc('is_admin')
    if (!isAdmin) return fail('Admins only', 403)

    const admin = adminClient()
    const { data: payment, error } = await admin.from('payments').select('*').eq('id', payment_id).maybeSingle()
    if (error) return fail(error.message)
    if (!payment) return fail('Payment not found', 404)
    if (payment.status === 'refunded') return fail('Already refunded')

    let note = 'Refunded'
    if (payment.provider === 'paystack') {
      const refund = await refundTransaction(env('PAYSTACK_SECRET_KEY'), payment.provider_ref)
      note = `Paystack refund ${refund.status}`
    }
    const { data, error: recErr } = await admin.rpc('record_refund', { p_payment: payment_id, p_note: note })
    if (recErr) return fail(recErr.message)
    return json(data)
  } catch (e) {
    return fail((e as Error).message, 500)
  }
})
