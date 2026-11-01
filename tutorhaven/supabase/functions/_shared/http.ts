export function env(name: string): string {
  const v = Deno.env.get(name)
  if (!v) throw new Error(`Missing ${name}. Set it with: supabase secrets set ${name}=...`)
  return v
}
