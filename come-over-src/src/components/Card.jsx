import { motion } from 'framer-motion'
import Heart from './Heart.jsx'

export const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.14, delayChildren: 0.25 } },
}
export const rise = {
  hidden: { opacity: 0, y: 18, filter: 'blur(4px)' },
  show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
}

/** The love-letter paper: cream card, washi tape, tiny corner hearts. */
export default function Card({ children, className = '' }) {
  return (
    <motion.section
      className={`paper relative w-full max-w-md rounded-[2rem] border border-white/70 px-6 pb-6 pt-9 text-center shadow-card sm:px-10 sm:pb-10 sm:pt-12 ${className}`}
      initial={{ opacity: 0, y: 40, scale: 0.94, rotate: -1 }}
      animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
      exit={{ opacity: 0, y: -30, scale: 0.96, filter: 'blur(6px)', transition: { duration: 0.4 } }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* washi tape */}
      <div
        className="absolute -top-4 left-1/2 h-8 w-32 -translate-x-1/2 -rotate-3 rounded-sm opacity-90 shadow-sm"
        style={{
          background:
            'repeating-linear-gradient(45deg, rgba(224,122,147,.55) 0 8px, rgba(249,215,221,.75) 8px 16px)',
        }}
        aria-hidden="true"
      />
      {/* inner hairline border, like letter paper */}
      <div className="pointer-events-none absolute inset-3 rounded-[1.5rem] border border-rose/20" aria-hidden="true" />
      <Heart className="absolute left-6 top-6 h-3 w-3 text-rose/40" />
      <Heart className="absolute bottom-6 right-6 h-3 w-3 text-rose/40" />
      <div className="relative">{children}</div>
    </motion.section>
  )
}
