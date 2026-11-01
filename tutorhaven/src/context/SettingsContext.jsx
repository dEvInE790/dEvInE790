import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { getSettings, listPlans } from '../lib/api'
import { DEFAULT_SETTINGS, PAY_AS_YOU_GO, toPlan } from '../lib/constants'
import { isSupabaseConfigured } from '../lib/supabase'

const SettingsContext = createContext({
  settings: DEFAULT_SETTINGS, plans: [PAY_AS_YOU_GO], learnerPlans: [], tutorPlans: [], allPlans: [], plansLoaded: false, reload: () => {},
})

/** Platform settings and subscription plans, both managed in the admin panel. */
export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [rows, setRows] = useState([])
  const [plansLoaded, setPlansLoaded] = useState(false)
  const reload = useCallback(() => {
    if (!isSupabaseConfigured) return
    getSettings().then((s) => s && setSettings(s)).catch(() => {})
    listPlans().then((r) => setRows(r ?? [])).catch(() => {}).finally(() => setPlansLoaded(true))
  }, [])
  useEffect(reload, [reload])
  const value = useMemo(() => {
    const allPlans = rows.map(toPlan)
    const live = allPlans.filter((p) => p.is_active)
    const learnerPlans = live.filter((p) => p.audience === 'learner')
    const tutorPlans = live.filter((p) => p.audience === 'tutor')
    return { settings, setSettings, reload, allPlans, learnerPlans, tutorPlans, plans: [PAY_AS_YOU_GO, ...learnerPlans], plansLoaded }
  }, [settings, rows, reload, plansLoaded])
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export const useSettings = () => useContext(SettingsContext)
