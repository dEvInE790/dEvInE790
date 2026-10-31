import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL ?? ''
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''

/** Demo mode (VITE_DEMO=true) swaps Supabase for an in-browser backend with seeded data. */
export const isDemo = import.meta.env.VITE_DEMO === 'true'

// The committed .env holds placeholders; treat them as "not configured" so the
// UI can explain what to do instead of failing with network errors.
export const isSupabaseConfigured =
  isDemo || (/^https?:\/\//.test(url) && !url.includes('your-project-ref') && anonKey.length > 20 && anonKey !== 'your-anon-key')

const auth = { persistSession: true, autoRefreshToken: true, detectSessionInUrl: !isDemo }

export const supabase = import.meta.env.VITE_DEMO === 'true'
  ? createClient('https://demo.tutorhaven.local', 'demo-anon-key-not-a-secret', {
      auth,
      global: { fetch: (...args) => import('../demo/backend').then((m) => m.demoFetch(...args)) },
    })
  : createClient(
      isSupabaseConfigured ? url : 'https://placeholder.supabase.co',
      isSupabaseConfigured ? anonKey : 'placeholder-anon-key',
      { auth },
    )
