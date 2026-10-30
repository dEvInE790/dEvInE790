import { motion } from 'motion/react'
import { ease } from './variants'

/** Wraps a routed page so it fades/slides in and out with AnimatePresence. */
export default function PageTransition({ children, className = '' }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0, transition: { duration: 0.45, ease } }}
      exit={{ opacity: 0, y: -8, transition: { duration: 0.2, ease } }}
    >
      {children}
    </motion.div>
  )
}
