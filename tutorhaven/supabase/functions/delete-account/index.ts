// POST { confirm: "DELETE", reason? } — deletes the signed-in user's account and data.
// Payment records are kept anonymously for financial and tax rules.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { handleDeleteAccount } from '../_shared/account.ts'
import { env } from '../_shared/http.ts'
import type { Rpc } from '../_shared/core.ts'

Deno.serve(async (req) => {
  try {
    // Server only. Never expose the service role key to the apps.
    const admin = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } })
    return await handleDeleteAccount(req, {
      service: ((fn, args) => admin.rpc(fn, args)) as Rpc,
      userId: async (r) => {
        const token = (r.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
        if (!token) return null
        const { data, error } = await admin.auth.getUser(token)
        return error ? null : data.user?.id ?? null
      },
      removeFiles: async (userId) => {
        const bucket = admin.storage.from('qualifications')
        const { data } = await bucket.list(userId, { limit: 1000 })
        if (data?.length) await bucket.remove(data.map((f) => `${userId}/${f.name}`))
      },
      deleteUser: async (userId) => {
        const { error } = await admin.auth.admin.deleteUser(userId)
        if (error) throw new Error(error.message)
      },
    })
  } catch (e) {
    console.error(e)
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  }
})
