import { forwardRef, useId } from 'react'
import { AnimatePresence, motion } from 'motion/react'

const base =
  'w-full rounded-xl border border-navy-900/12 bg-white px-3.5 text-[0.95rem] text-navy-950 placeholder:text-navy-300 shadow-[inset_0_1px_2px_rgb(15_28_54/0.04)] transition-[border-color,box-shadow] duration-200 outline-none focus:border-mint-500 focus:ring-4 focus:ring-mint-400/20 disabled:bg-navy-50'

export function Field({ label, hint, error, children, className = '', id }) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-navy-800">
          {label}
        </label>
      )}
      {children}
      <AnimatePresence initial={false}>
        {error ? (
          <motion.p
            key="err"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="text-sm text-coral-600"
            role="alert"
          >
            {error}
          </motion.p>
        ) : hint ? (
          <p className="text-xs text-navy-400">{hint}</p>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

export const Input = forwardRef(function Input({ label, hint, error, className = '', icon: Icon, ...rest }, ref) {
  const id = useId()
  return (
    <Field label={label} hint={hint} error={error} id={rest.id ?? id} className={className}>
      <div className="relative">
        {Icon && <Icon className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-navy-400" aria-hidden />}
        <input ref={ref} id={rest.id ?? id} aria-invalid={!!error || undefined} className={`${base} h-11 ${Icon ? 'pl-10' : ''}`} {...rest} />
      </div>
    </Field>
  )
})

export const Textarea = forwardRef(function Textarea({ label, hint, error, className = '', rows = 4, ...rest }, ref) {
  const id = useId()
  return (
    <Field label={label} hint={hint} error={error} id={rest.id ?? id} className={className}>
      <textarea ref={ref} id={rest.id ?? id} rows={rows} aria-invalid={!!error || undefined} className={`${base} resize-y py-2.5 leading-relaxed`} {...rest} />
    </Field>
  )
})

export const Select = forwardRef(function Select({ label, hint, error, className = '', children, ...rest }, ref) {
  const id = useId()
  return (
    <Field label={label} hint={hint} error={error} id={rest.id ?? id} className={className}>
      <select ref={ref} id={rest.id ?? id} className={`${base} h-11 appearance-none bg-[url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='none' stroke='%234a5f8f' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m4 6 4 4 4-4'/%3E%3C/svg%3E")] bg-[position:right_0.85rem_center] bg-no-repeat pr-10`} {...rest}>
        {children}
      </select>
    </Field>
  )
})

/** Multi/single select rendered as toggle chips. */
export function ChipGroup({ options, value, onChange, multiple = true, label, className = '', size = 'md' }) {
  const selected = multiple ? value : [value]
  const toggle = (opt) => {
    if (!multiple) return onChange(opt)
    onChange(selected.includes(opt) ? selected.filter((v) => v !== opt) : [...selected, opt])
  }
  return (
    <div className={className} role="group" aria-label={label}>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const on = selected.includes(opt)
          return (
            <motion.button
              key={opt}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(opt)}
              whileTap={{ scale: 0.95 }}
              className={`relative rounded-full border font-medium transition-colors duration-200 ${size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm'} ${
                on ? 'border-navy-900 bg-navy-900 text-white' : 'border-navy-900/12 bg-white text-navy-700 hover:border-navy-900/30'
              }`}
            >
              {opt}
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
