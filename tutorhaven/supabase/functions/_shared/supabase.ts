// Wires core.ts to Supabase and Paystack inside an Edge Function.
// SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY are provided
// by Supabase automatically; PAYSTACK_SECRET_KEY and APP_URLS are your secrets.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { env } from './http.ts'
import { paystackApi } from './paystack.ts'
import type { Deps, Rpc } from './core.ts'

export function deps(): Deps {
  const url = env('SUPABASE_URL')
  const secret = env('PAYSTACK_SECRET_KEY')
  if (!/^sk_(test|live)_/.test(secret)) throw new Error('PAYSTACK_SECRET_KEY must be a Paystack secret key (sk_test_… or sk_live_…)')
  // Server only. Never expose the service role key to the apps.
  const admin = createClient(url, env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } })
  return {
    paystack: paystackApi(secret),
    secret,
    appUrls: Deno.env.get('APP_URLS') ?? '',
    functionsUrl: `${url}/functions/v1`,
    service: ((fn, args) => admin.rpc(fn, args)) as Rpc,
    asUser: (req) => {
      const client = createClient(url, env('SUPABASE_ANON_KEY'), {
        global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
        auth: { persistSession: false },
      })
      return ((fn, args) => client.rpc(fn, args)) as Rpc
    },
    getPayment: async (id) => {
      const { data, error } = await admin.from('payments').select('*').eq('id', id).maybeSingle()
      if (error) throw new Error(error.message)
      return data
    },
  }
}

/** Runs a handler; a missing secret becomes a clear 500 instead of a crash. */
export function serve(handler: (req: Request, d: Deps) => Promise<Response>) {
  Deno.serve(async (req) => {
    try {
      return await handler(req, deps())
    } catch (e) {
      console.error(e)
      return new Response(JSON.stringify({ error: (e as Error).message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }
  })
}
