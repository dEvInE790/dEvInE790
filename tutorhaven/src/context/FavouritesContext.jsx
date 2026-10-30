import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useAuth } from './AuthContext'
import { useToast } from './ToastContext'
import { listFavouriteIds, setFavourite } from '../lib/api'

const FavouritesContext = createContext(null)

export function FavouritesProvider({ children }) {
  const { user } = useAuth()
  const toast = useToast()
  const [ids, setIds] = useState([])

  useEffect(() => {
    if (!user) return setIds([])
    listFavouriteIds(user.id).then(setIds).catch(() => setIds([]))
  }, [user])

  const toggle = useCallback(
    async (tutorId) => {
      if (!user) return false
      const on = !ids.includes(tutorId)
      setIds((cur) => (on ? [...cur, tutorId] : cur.filter((x) => x !== tutorId)))
      try {
        await setFavourite(user.id, tutorId, on)
        toast.success(on ? 'Saved to your favourites' : 'Removed from favourites')
      } catch (e) {
        setIds((cur) => (on ? cur.filter((x) => x !== tutorId) : [...cur, tutorId]))
        toast.error(e.message)
      }
      return true
    },
    [user, ids, toast],
  )

  const value = useMemo(() => ({ ids, toggle, isFavourite: (id) => ids.includes(id) }), [ids, toggle])
  return <FavouritesContext.Provider value={value}>{children}</FavouritesContext.Provider>
}

export const useFavourites = () => useContext(FavouritesContext)
