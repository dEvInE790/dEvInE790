import { motion } from 'motion/react'
import AnimatedNumber from '../motion/AnimatedNumber'
import { fadeUp } from '../motion/variants'

export default function StatCard({ icon: Icon, label, value, format, hint, accent = 'mint', loading }) {
  const accents = {
    mint: 'bg-mint-50 text-mint-700',
    navy: 'bg-navy-50 text-navy-700',
    amber: 'bg-amber-400/15 text-[#8a5a00]',
    cream: 'bg-cream-200 text-navy-800',
  }
  return (
    <motion.div variants={fadeUp} className="card p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-navy-500">{label}</p>
        {Icon && (
          <span className={`grid h-9 w-9 place-items-center rounded-xl ${accents[accent]}`}>
            <Icon className="h-[18px] w-[18px]" aria-hidden />
          </span>
        )}
      </div>
      {loading ? (
        <div className="skeleton mt-3 h-8 w-24 rounded-lg" />
      ) : (
        <p className="mt-2 font-display text-2xl font-bold tracking-tight break-words text-navy-950 sm:text-3xl">
          <AnimatedNumber value={value} format={format} />
        </p>
      )}
      {hint && <p className="mt-1 text-xs text-navy-400">{hint}</p>}
    </motion.div>
  )
}
