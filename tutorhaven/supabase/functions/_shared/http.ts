export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

export const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

export const fail = (message: string, status = 400) => json({ error: message }, status)

export function env(name: string): string {
  const v = Deno.env.get(name)
  if (!v) throw new Error(`Missing ${name}. Set it with: supabase secrets set ${name}=...`)
  return v
}
