// POST { question, mode?, subject?, conversation_id? } — TutorHaven Plus AI Learning Assistant.
// Secrets: ANTHROPIC_API_KEY (required to switch it on), AI_MODEL (optional).
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { handleAiAssistant } from '../_shared/ai.ts'
import { anthropicApi, DEFAULT_MODEL } from '../_shared/anthropic.ts'
import { env } from '../_shared/http.ts'
import type { Rpc } from '../_shared/core.ts'

Deno.serve(async (req) => {
  try {
    // Server only. Never expose the service role key to the apps.
    const admin = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } })
    const key = Deno.env.get('ANTHROPIC_API_KEY') ?? ''
    return await handleAiAssistant(req, {
      service: ((fn, args) => admin.rpc(fn, args)) as Rpc,
      userId: async (r) => {
        const token = (r.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
        if (!token) return null
        const { data, error } = await admin.auth.getUser(token)
        return error ? null : data.user?.id ?? null
      },
      ai: key ? anthropicApi(key, Deno.env.get('AI_MODEL') || DEFAULT_MODEL) : null,
    })
  } catch (e) {
    console.error(e)
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  }
})
