import { useId } from 'react'
import { motion } from 'motion/react'
import { spring } from '../../motion/variants'

/** Segmented control with a sliding active pill. */
export default function Tabs({ tabs, value, onChange, className = '', size = 'md' }) {
  const id = useId()
  return (
    <div role="tablist" className={`scrollbar-none inline-flex max-w-full overflow-x-auto rounded-2xl bg-navy-900/[0.05] p-1 ${className}`}>
      {tabs.map((t) => {
        const on = t.value === value
        return (
          <button
            key={t.value}
            role="tab"
            type="button"
            aria-selected={on}
            onClick={() => onChange(t.value)}
            className={`relative flex shrink-0 items-center gap-1.5 rounded-xl font-semibold whitespace-nowrap transition-colors ${size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-3 py-2 text-sm sm:px-4'} ${on ? 'text-navy-950' : 'text-navy-500 hover:text-navy-800'}`}
          >
            {on && <motion.span layoutId={`tab-pill-${id}`} className="absolute inset-0 rounded-xl bg-white shadow-soft" transition={spring} />}
            <span className="relative">{t.label}</span>
            {t.count != null && (
              <span className={`relative rounded-full px-1.5 text-[0.7rem] tabular-nums ${on ? 'bg-mint-100 text-mint-700' : 'bg-navy-900/5'}`}>{t.count}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
