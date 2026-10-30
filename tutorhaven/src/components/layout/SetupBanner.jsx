import { isSupabaseConfigured } from '../../lib/supabase'

/** Shown only until real Supabase keys are added to .env. */
export default function SetupBanner() {
  if (isSupabaseConfigured) return null
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-amber-500/30 bg-[#fff8e8] px-4 py-2.5 text-center text-xs text-[#6b4700] sm:text-sm">
      <strong>Setup needed:</strong> add your Supabase URL and anon key to <code className="rounded bg-white/70 px-1">tutorhaven/.env</code> and run the SQL in <code className="rounded bg-white/70 px-1">supabase/migrations</code> to load live data.
    </div>
  )
}
