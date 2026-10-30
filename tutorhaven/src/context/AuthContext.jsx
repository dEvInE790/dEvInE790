import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { getProfile } from '../lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(isSupabaseConfigured)

  const loadProfile = useCallback(async (user) => {
    if (!user) {
      setProfile(null)
      return null
    }
    try {
      const p = await getProfile(user.id)
      setProfile(p)
      return p
    } catch {
      setProfile(null)
      return null
    }
  }, [])

  useEffect(() => {
    if (!isSupabaseConfigured) return
    let mounted = true
    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return
      setSession(data.session)
      await loadProfile(data.session?.user)
      if (mounted) setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next)
      // Defer Supabase calls out of the auth callback to avoid deadlocks.
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'SIGNED_OUT') {
        setTimeout(() => loadProfile(next?.user), 0)
      }
    })
    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [loadProfile])

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      loading,
      configured: isSupabaseConfigured,
      refreshProfile: () => loadProfile(session?.user),
      setProfile,
      async signIn(email, password) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        setSession(data.session)
        const p = await loadProfile(data.user)
        return p
      },
      async signUp({ email, password, fullName, role }) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName, role }, emailRedirectTo: `${window.location.origin}/onboarding` },
        })
        if (error) throw error
        if (data.session) {
          setSession(data.session)
          await loadProfile(data.user)
        }
        return data
      },
      async signOut() {
        await supabase.auth.signOut()
        setSession(null)
        setProfile(null)
      },
    }),
    [session, profile, loading, loadProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
