import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { router } from 'expo-router'
import { useAuth } from './AuthContext'
import { useToast } from './ToastContext'
import { listFavouriteIds, setFavourite } from '../lib/api'

const FavouritesContext = createContext({ ids: [], toggle: () => {}, isFavourite: () => false })

export function FavouritesProvider({ children }) {
  const { user } = useAuth()
  const toast = useToast()
  const [saved, setIds] = useState([])
  const ids = useMemo(() => (user ? saved : []), [user, saved])

  useEffect(() => {
    if (!user) return
    listFavouriteIds(user.id).then(setIds).catch(() => setIds([]))
  }, [user])

  const toggle = useCallback(async (tutorId) => {
    if (!user) return router.push('/sign-in')
    const on = !ids.includes(tutorId)
    setIds((cur) => (on ? [...cur, tutorId] : cur.filter((x) => x !== tutorId)))
    try {
      await setFavourite(user.id, tutorId, on)
      toast.success(on ? 'Saved to favourites' : 'Removed from favourites')
    } catch (e) {
      setIds((cur) => (on ? cur.filter((x) => x !== tutorId) : [...cur, tutorId]))
      toast.error(e.message)
    }
  }, [user, ids, toast])

  const value = useMemo(() => ({ ids, toggle, isFavourite: (id) => ids.includes(id) }), [ids, toggle])
  return <FavouritesContext.Provider value={value}>{children}</FavouritesContext.Provider>
}

export const useFavourites = () => useContext(FavouritesContext)
