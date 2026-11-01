import { createClient } from 'npm:@supabase/supabase-js@2'
import { env } from './http.ts'

/** Acts as the signed-in user (row level security applies). */
export const userClient = (req: Request) =>
  createClient(env('SUPABASE_URL'), env('SUPABASE_ANON_KEY'), {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    auth: { persistSession: false },
  })

/** Server-only client; used to fulfil verified payments. Never expose this key. */
export const adminClient = () =>
  createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } })

/** Verify a reference with Paystack, then record it. Shared by verify, callback and webhook. */
export async function fulfilFromPaystack(reference: string, verified: { status: string; amount: number; currency: string }, payload: unknown) {
  if (verified.status !== 'success') return { status: verified.status === 'abandoned' ? 'abandoned' : 'failed' }
  if (verified.currency !== 'NGN') throw new Error('Unexpected currency')
  const { data, error } = await adminClient().rpc('fulfill_payment', {
    p_reference: reference,
    p_amount_kobo: verified.amount,
    p_payload: payload ?? {},
  })
  if (error) throw new Error(error.message)
  return data as { status: string; kind: string; booking_id: string | null; plan: string | null; note?: string }
}
