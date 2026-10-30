import { useEffect, useId, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Check, ChevronDown } from 'lucide-react'
import { ease } from '../../motion/variants'

/**
 * Listbox-style dropdown. `options`: [{ value, label, icon? }].
 * Keyboard: Enter/Space/ArrowDown open; arrows move; Enter selects; Escape closes.
 */
export default function Dropdown({ value, onChange, options, label, align = 'left', className = '', buttonClassName = '' }) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const ref = useRef(null)
  const listRef = useRef(null)
  const id = useId()
  const current = options.find((o) => o.value === value) ?? options[0]

  useEffect(() => {
    if (!open) return
    const onDoc = (e) => !ref.current?.contains(e.target) && setOpen(false)
    document.addEventListener('pointerdown', onDoc)
    setActive(Math.max(0, options.findIndex((o) => o.value === value)))
    requestAnimationFrame(() => listRef.current?.focus())
    return () => document.removeEventListener('pointerdown', onDoc)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const select = (o) => {
    onChange(o.value)
    setOpen(false)
  }

  const onListKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(options.length - 1, a + 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(0, a - 1)) }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(options[active]) }
    else if (e.key === 'Escape' || e.key === 'Tab') { setOpen(false) }
  }

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => e.key === 'ArrowDown' && (e.preventDefault(), setOpen(true))}
        className={`flex h-11 w-full items-center justify-between gap-2 rounded-xl border border-navy-900/12 bg-white px-3.5 text-sm font-medium text-navy-800 shadow-soft transition-colors hover:border-navy-900/25 ${buttonClassName}`}
      >
        <span className="truncate">
          {label && <span className="font-normal text-navy-400">{label} </span>}
          {current?.label}
        </span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.25, ease }}>
          <ChevronDown className="h-4 w-4 text-navy-400" aria-hidden />
        </motion.span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.ul
            ref={listRef}
            id={id}
            role="listbox"
            tabIndex={-1}
            aria-activedescendant={`${id}-${active}`}
            onKeyDown={onListKey}
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.18, ease }}
            className={`absolute z-40 mt-2 max-h-72 min-w-full overflow-auto rounded-2xl border border-navy-900/8 bg-white p-1.5 shadow-lift outline-none ${align === 'right' ? 'right-0 origin-top-right' : 'left-0 origin-top-left'}`}
          >
            {options.map((o, i) => {
              const selected = o.value === value
              return (
                <li
                  key={o.value}
                  id={`${id}-${i}`}
                  role="option"
                  aria-selected={selected}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => select(o)}
                  className={`flex cursor-pointer items-center justify-between gap-6 rounded-xl px-3 py-2.5 text-sm whitespace-nowrap ${i === active ? 'bg-navy-50' : ''} ${selected ? 'font-semibold text-navy-950' : 'text-navy-700'}`}
                >
                  <span className="flex items-center gap-2">
                    {o.icon && <o.icon className="h-4 w-4 text-navy-400" aria-hidden />}
                    {o.label}
                  </span>
                  {selected && <Check className="h-4 w-4 text-mint-600" aria-hidden />}
                </li>
              )
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}
