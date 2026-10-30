import { motion, useReducedMotion } from 'motion/react'

/** Gentle, endless bobbing for decorative illustration pieces. */
export default function Float({ children, className = '', distance = 10, duration = 6, delay = 0, rotate = 0 }) {
  const reduce = useReducedMotion()
  if (reduce) return <div className={className}>{children}</div>
  return (
    <motion.div
      className={className}
      animate={{ y: [0, -distance, 0], rotate: rotate ? [0, rotate, 0] : 0 }}
      transition={{ duration, delay, repeat: Infinity, ease: 'easeInOut' }}
      style={{ willChange: 'transform' }}
    >
      {children}
    </motion.div>
  )
}
