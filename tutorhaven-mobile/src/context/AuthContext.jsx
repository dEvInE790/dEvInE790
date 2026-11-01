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
      if (event === 'SIGNED_OUT') setProfile(null)
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
      setProfile,
      refreshProfile: () => loadProfile(session?.user),
      async signIn(email, password) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        setSession(data.session)
        return loadProfile(data.user)
      },
      async signUp({ email, password, fullName, role }) {
        const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName, role } } })
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
