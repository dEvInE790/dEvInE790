import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { getUnreadCounts } from '../lib/api'
import { useAuth } from './AuthContext'

const UnreadContext = createContext({ messages: 0, notifications: 0, refresh: () => {} })

/** Unread message and notification counts for the signed-in user (refreshed every 30s and on navigation). */
export function UnreadProvider({ children }) {
  const { user } = useAuth()
  const location = useLocation()
  const [counts, setCounts] = useState({ messages: 0, notifications: 0 })
  const refresh = useCallback(() => {
    if (!user) return
    getUnreadCounts().then((c) => c && setCounts(c)).catch(() => {})
  }, [user])
  useEffect(() => {
    refresh()
    const t = setInterval(() => document.visibilityState === 'visible' && refresh(), 30000)
    return () => clearInterval(t)
  }, [refresh])
  useEffect(refresh, [location.pathname, refresh])
  return <UnreadContext.Provider value={{ ...counts, refresh }}>{children}</UnreadContext.Provider>
}

export const useUnread = () => useContext(UnreadContext)
