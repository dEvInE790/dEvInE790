import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { AppState } from 'react-native'
import { getUnreadCounts } from '../lib/api'
import { useAuth } from './AuthContext'

const UnreadContext = createContext({ messages: 0, notifications: 0, refresh: () => {} })

/** Unread message and notification counts (refreshed every 30s and when the app returns to the foreground). */
export function UnreadProvider({ children }) {
  const { user } = useAuth()
  const [counts, setCounts] = useState({ messages: 0, notifications: 0 })
  const refresh = useCallback(() => {
    if (!user) return
    getUnreadCounts().then((c) => c && setCounts(c)).catch(() => {})
  }, [user])
  useEffect(() => {
    refresh()
    const t = setInterval(refresh, 30000)
    const sub = AppState.addEventListener('change', (s) => s === 'active' && refresh())
    return () => {
      clearInterval(t)
      sub.remove()
    }
  }, [refresh])
  return <UnreadContext.Provider value={{ ...counts, refresh }}>{children}</UnreadContext.Provider>
}

export const useUnread = () => useContext(UnreadContext)
