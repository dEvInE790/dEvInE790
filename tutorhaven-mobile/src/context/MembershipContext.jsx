import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { getMembership } from '../lib/api'
import { useAuth } from './AuthContext'

const MembershipContext = createContext({ membership: null, isPlus: false, loading: false, reload: () => {} })

/**
 * The signed-in learner's tier (Standard or Plus), straight from the database.
 * Used only to shape the UI; every Plus feature is also enforced on the server.
 */
export function MembershipProvider({ children }) {
  const { user, profile } = useAuth()
  const learner = profile?.role === 'student' || profile?.role === 'parent'
  const key = user && learner ? user.id : null
  const [state, setState] = useState({ key: null, membership: null, loaded: false })
  const reload = useCallback(async () => {
    if (!key) return
    let membership = null
    try {
      membership = await getMembership()
    } catch {
      membership = null
    }
    setState({ key, membership, loaded: true })
  }, [key])
  useEffect(() => {
    let cancelled = false
    if (!key) return undefined
    getMembership().then((m) => !cancelled && setState({ key, membership: m, loaded: true })).catch(() => !cancelled && setState({ key, membership: null, loaded: true }))
    return () => { cancelled = true }
  }, [key])
  const current = state.key === key ? state.membership : null
  const value = useMemo(() => ({
    membership: current, isPlus: current?.tier === 'plus', loading: !!key && (state.key !== key || !state.loaded), reload,
  }), [current, key, state.key, state.loaded, reload])
  return <MembershipContext.Provider value={value}>{children}</MembershipContext.Provider>
}

export const useMembership = () => useContext(MembershipContext)
