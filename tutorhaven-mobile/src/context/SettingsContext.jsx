import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { getSettings } from '../lib/api'
import { buildPlans, DEFAULT_SETTINGS } from '../lib/constants'
import { isSupabaseConfigured } from '../lib/supabase'

const SettingsContext = createContext({ settings: DEFAULT_SETTINGS, plans: buildPlans(), reload: () => {} })

/** Membership prices, discounts and checkout rules set by admins on the web panel. */
export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const reload = useCallback(() => {
    if (!isSupabaseConfigured) return
    getSettings().then((s) => s && setSettings(s)).catch(() => {})
  }, [])
  useEffect(() => {
    reload()
  }, [reload])
  const value = useMemo(() => ({ settings, plans: buildPlans(settings), reload }), [settings, reload])
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export const useSettings = () => useContext(SettingsContext)
