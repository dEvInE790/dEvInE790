import { AnimatePresence, motion } from 'motion/react'
import { Heart } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useFavourites } from '../context/FavouritesContext'
import { useAuth } from '../context/AuthContext'

export default function FavouriteButton({ tutorId, className = '' }) {
  const { isFavourite, toggle } = useFavourites()
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const on = isFavourite(tutorId)

  const onClick = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!user) return navigate('/signin', { state: { from: location.pathname } })
    toggle(tutorId)
  }

  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.85 }}
      aria-pressed={on}
      aria-label={on ? 'Remove from favourites' : 'Save to favourites'}
      className={`relative grid h-10 w-10 place-items-center rounded-full border border-navy-900/8 bg-white/90 backdrop-blur transition-colors hover:border-coral-500/30 ${className}`}
    >
      <motion.span key={on ? 'on' : 'off'} initial={{ scale: on ? 0.4 : 1 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 15 }}>
        <Heart className={`h-[18px] w-[18px] ${on ? 'fill-coral-500 text-coral-500' : 'text-navy-400'}`} aria-hidden />
      </motion.span>
      <AnimatePresence>
        {on && (
          <motion.span
            key="burst"
            className="absolute inset-0 rounded-full border-2 border-coral-500"
            initial={{ scale: 0.6, opacity: 0.7 }}
            animate={{ scale: 1.6, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          />
        )}
      </AnimatePresence>
    </motion.button>
  )
}
