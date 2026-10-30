import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ease } from './variants'

/** The TutorHaven mark: a sheltering roof over an open book. */
export function LogoMark({ size = 36, animated = false, className = '', dark = false }) {
  const draw = animated
    ? { initial: { pathLength: 0, opacity: 0 }, animate: { pathLength: 1, opacity: 1 } }
    : {}
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" className={className} aria-hidden="true">
      <motion.rect
        width="40" height="40" rx="11"
        fill={dark ? '#fdfcf9' : '#0f1c36'}
        {...(animated ? { initial: { scale: 0.6, opacity: 0 }, animate: { scale: 1, opacity: 1 }, transition: { duration: 0.6, ease } } : {})}
        style={{ transformOrigin: 'center' }}
      />
      <motion.path
        d="M10 19.5 20 11l10 8.5" fill="none" stroke="#4cc897" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"
        {...draw} transition={{ duration: 0.7, delay: 0.25, ease }}
      />
      <motion.path
        d="M12 22.5c2.8-1 5.4-.6 8 1.2 2.6-1.8 5.2-2.2 8-1.2v7.3c-2.8-1-5.4-.6-8 1.2-2.6-1.8-5.2-2.2-8-1.2z"
        fill="none" stroke={dark ? '#0f1c36' : '#faf7f0'} strokeWidth="2.4" strokeLinejoin="round"
        {...draw} transition={{ duration: 0.8, delay: 0.45, ease }}
      />
    </svg>
  )
}

export function Wordmark({ className = '', light = false }) {
  return (
    <span className={`font-display text-[1.2rem] font-bold tracking-tight ${light ? 'text-white' : 'text-navy-950'} ${className}`}>
      Tutor<span className={light ? 'text-mint-300' : 'text-mint-600'}>Haven</span>
    </span>
  )
}

const INTRO_KEY = 'th:intro-seen'

/** First-visit brand intro. Skipped for reduced motion and after the first view per session. */
export function LogoIntro() {
  const reduce = useReducedMotion()
  const [show, setShow] = useState(() => {
    try {
      return !sessionStorage.getItem(INTRO_KEY)
    } catch {
      return false
    }
  })

  useEffect(() => {
    if (!show) return
    try {
      sessionStorage.setItem(INTRO_KEY, '1')
    } catch {
      /* storage unavailable — intro simply plays again next time */
    }
    if (reduce) {
      setShow(false)
      return
    }
    const t = setTimeout(() => setShow(false), 1900)
    return () => clearTimeout(t)
  }, [show, reduce])

  const letters = 'TutorHaven'.split('')
  return (
    <AnimatePresence>
      {show && !reduce && (
        <motion.div
          key="intro"
          className="fixed inset-0 z-[100] grid place-items-center bg-navy-950"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.55, ease } }}
          onClick={() => setShow(false)}
          role="presentation"
        >
          <motion.div
            className="flex flex-col items-center gap-5"
            exit={{ scale: 0.96, y: -12, transition: { duration: 0.5, ease } }}
          >
            <LogoMark size={76} animated dark />
            <div className="flex font-display text-3xl font-bold tracking-tight text-white" aria-label="TutorHaven">
              {letters.map((l, i) => (
                <motion.span
                  key={i}
                  className={i >= 5 ? 'text-mint-300' : ''}
                  initial={{ opacity: 0, y: 14, filter: 'blur(6px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  transition={{ delay: 0.55 + i * 0.04, duration: 0.5, ease }}
                >
                  {l}
                </motion.span>
              ))}
            </div>
            <motion.p
              className="text-sm text-navy-200"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.05, duration: 0.5 }}
            >
              Find the right tutor. Unlock your potential.
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
