import { motion } from 'motion/react'
import Float from '../../motion/Float'

export default function EmptyState({ icon: Icon, title, children, action, className = '' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex flex-col items-center px-6 py-12 text-center ${className}`}
    >
      {Icon && (
        <Float distance={6} duration={5}>
          <div className="mb-5 grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-mint-100 to-cream-200 text-mint-700 shadow-soft">
            <Icon className="h-7 w-7" aria-hidden />
          </div>
        </Float>
      )}
      <h3 className="text-lg font-semibold">{title}</h3>
      {children && <p className="mt-1.5 max-w-sm text-sm text-navy-500">{children}</p>}
      {action && <div className="mt-6">{action}</div>}
    </motion.div>
  )
}

export function ErrorState({ message, onRetry }) {
  return (
    <div role="alert" className="rounded-2xl border border-coral-500/20 bg-coral-50 p-4 text-sm text-coral-600">
      <p>{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="mt-2 font-semibold underline underline-offset-2">
          Try again
        </button>
      )}
    </div>
  )
}
