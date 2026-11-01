import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL ?? ''
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''

// The committed .env holds placeholders; treat them as "not configured" so the
// UI can explain what to do instead of failing with network errors.
export const isSupabaseConfigured =
  /^https?:\/\//.test(url) && !url.includes('your-project-ref') && anonKey.length > 20 && anonKey !== 'your-anon-key'

export const supabase = createClient(
  isSupabaseConfigured ? url : 'https://placeholder.supabase.co',
  isSupabaseConfigured ? anonKey : 'placeholder-anon-key',
  { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } },
)
