import { motion } from 'motion/react'
import { LogoMark } from '../../motion/AnimatedLogo'

export default function FullPageLoader({ label = 'Loading' }) {
  return (
    <div className="grid min-h-dvh place-items-center bg-cream-100" role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-4">
        <motion.div animate={{ scale: [1, 1.06, 1] }} transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}>
          <LogoMark size={52} />
        </motion.div>
        <p className="text-sm text-navy-500">{label}…</p>
      </div>
    </div>
  )
}
