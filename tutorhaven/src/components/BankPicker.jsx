import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Check, ChevronDown, Landmark, Search } from 'lucide-react'
import { searchBanks } from '../lib/banks'
import { ease } from '../motion/variants'

/** Searchable bank list (combobox): popular banks first, nicknames like GTB or UBA work. */
export default function BankPicker({ banks = [], value, onChange, loading }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const ref = useRef(null)
  const inputRef = useRef(null)
  const listRef = useRef(null)
  const id = useId()
  const selected = banks.find((b) => b.code === value)

  const { popular, rest } = useMemo(() => searchBanks(banks, query), [banks, query])
  const options = useMemo(() => [...popular, ...rest], [popular, rest])

  useEffect(() => {
    if (!open) return
    const onDoc = (e) => !ref.current?.contains(e.target) && setOpen(false)
    document.addEventListener('pointerdown', onDoc)
    return () => document.removeEventListener('pointerdown', onDoc)
  }, [open])
  useEffect(() => setActive(0), [query])
  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [active])

  const choose = (b) => {
    onChange(b.code)
    setOpen(false)
    setQuery('')
  }
  const onKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive((a) => Math.min(options.length - 1, a + 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(0, a - 1)) }
    else if (e.key === 'Enter' && open && options[active]) { e.preventDefault(); choose(options[active]) }
    else if (e.key === 'Escape') setOpen(false)
  }

  const row = (b, i) => (
    <li
      key={b.code}
      id={`${id}-opt-${i}`}
      data-index={i}
      role="option"
      aria-selected={b.code === value}
      onPointerDown={(e) => { e.preventDefault(); choose(b) }}
      onMouseEnter={() => setActive(i)}
      className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm ${i === active ? 'bg-cream-100 text-navy-950' : 'text-navy-700'}`}
    >
      <span className="truncate">{b.name}</span>
      {b.code === value && <Check className="h-4 w-4 shrink-0 text-mint-600" />}
    </li>
  )

  return (
    <div ref={ref} className="relative">
      <label htmlFor={`${id}-input`} className="mb-1.5 block text-sm font-medium text-navy-800">Bank</label>
      <div className={`flex h-11 items-center gap-2 rounded-xl border bg-white px-3.5 shadow-soft transition-colors ${open ? 'border-mint-500 ring-4 ring-mint-400/20' : 'border-navy-900/12 hover:border-navy-900/25'}`}>
        {open ? <Search className="h-4 w-4 shrink-0 text-navy-400" /> : <Landmark className="h-4 w-4 shrink-0 text-navy-400" />}
        <input
          ref={inputRef}
          id={`${id}-input`}
          role="combobox"
          aria-expanded={open}
          aria-controls={`${id}-list`}
          aria-autocomplete="list"
          aria-activedescendant={open && options[active] ? `${id}-opt-${active}` : undefined}
          autoComplete="off"
          disabled={loading}
          value={open ? query : selected?.name ?? ''}
          placeholder={loading ? 'Loading banks…' : open ? 'Search for your bank (e.g. GTB, Opay)' : 'Choose your bank'}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onKeyDown={onKey}
          className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-navy-300"
        />
        <ChevronDown className={`h-4 w-4 shrink-0 text-navy-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </div>
      <AnimatePresence>
        {open && (
          <motion.ul
            ref={listRef}
            id={`${id}-list`}
            role="listbox"
            aria-label="Banks"
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15, ease }}
            className="absolute z-40 mt-2 max-h-72 w-full overflow-y-auto rounded-2xl border border-navy-900/[0.08] bg-white p-1.5 shadow-lift"
          >
            {!options.length && <li className="px-3 py-3 text-sm text-navy-500">{loading ? 'Loading banks…' : 'No bank matches that search.'}</li>}
            {popular.length > 0 && <li role="presentation" className="px-3 pt-2 pb-1 text-[0.7rem] font-semibold tracking-wide text-navy-400 uppercase">Popular</li>}
            {popular.map((b, i) => row(b, i))}
            {popular.length > 0 && rest.length > 0 && <li role="presentation" className="px-3 pt-3 pb-1 text-[0.7rem] font-semibold tracking-wide text-navy-400 uppercase">All banks ({banks.length})</li>}
            {rest.map((b, i) => row(b, popular.length + i))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}
