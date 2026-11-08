// Account deletion (Google Play / App Store requirement). Free of Deno and
// Supabase imports so the integration tests run this exact code.
//
// The database decides whether the account can go (no upcoming sessions or
// refunds in progress, not an admin) and keeps an anonymous copy of payments.
// Then the uploaded documents and the auth user are deleted; every row linked
// to the user is removed by "on delete cascade".
import type { Rpc } from './core.ts'
import { corsHeaders } from './core.ts'

export type AccountDeps = {
  service: Rpc
  userId: (req: Request) => Promise<string | null>
  /** Deletes the user's private files (qualification documents). */
  removeFiles: (userId: string) => Promise<void>
  /** Deletes the auth user (Supabase Auth admin API). */
  deleteUser: (userId: string) => Promise<void>
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

/** POST { confirm: "DELETE", reason? } — permanently deletes the signed-in account. */
export async function handleDeleteAccount(req: Request, deps: AccountDeps): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const userId = await deps.userId(req)
  if (!userId) return json({ error: 'Please sign in first' }, 401)
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid request' }, 400)
  }
  if (body.confirm !== 'DELETE') return json({ error: 'Type DELETE to confirm' }, 400)

  const prep = await deps.service<{ ok: boolean; deleted_account_id: string }>('prepare_account_deletion', {
    p_user: userId, p_reason: typeof body.reason === 'string' ? body.reason.slice(0, 500) : '',
  })
  if (prep.error || !prep.data?.ok) return json({ error: prep.error?.message ?? 'This account can’t be deleted right now' }, 409)

  try {
    await deps.removeFiles(userId)
  } catch (e) {
    console.error('could not remove files for deleted account', (e as Error).message)
  }
  try {
    await deps.deleteUser(userId)
  } catch (e) {
    console.error('could not delete auth user', (e as Error).message)
    return json({ error: 'We couldn’t finish deleting your account. Please try again or contact support.' }, 500)
  }
  return json({ deleted: true })
}
