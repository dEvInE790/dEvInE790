import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Card, { rise, stagger } from './Card.jsx'
import Heart from './Heart.jsx'
import { MAX_MONTHS_AHEAD, TIME_OPTIONS } from '../config.js'
import { fromKey, toKey, todayKey } from '../lib/dates.js'

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const NOTE_LIMIT = 280

const monthStart = (d) => new Date(d.getFullYear(), d.getMonth(), 1)
const addMonths = (d, n) => new Date(d.getFullYear(), d.getMonth() + n, 1)
const sameMonth = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()

/** Month-view calendar. Past days are disabled; she can look up to MAX_MONTHS_AHEAD ahead. */
function Calendar({ value, onChange }) {
  const today = todayKey()
  const firstMonth = useMemo(() => monthStart(new Date()), [])
  const lastMonth = useMemo(() => addMonths(firstMonth, MAX_MONTHS_AHEAD), [firstMonth])
  const [view, setView] = useState(() => (value ? monthStart(fromKey(value)) : firstMonth))
  const [dir, setDir] = useState(0)

  const canPrev = !sameMonth(view, firstMonth)
  const canNext = !sameMonth(view, lastMonth)
  const go = (n) => {
    setDir(n)
    setView((v) => addMonths(v, n))
  }

  const cells = useMemo(() => {
    const blanks = Array.from({ length: view.getDay() }, () => null)
    const count = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate()
    const days = Array.from({ length: count }, (_, i) => toKey(new Date(view.getFullYear(), view.getMonth(), i + 1)))
    return [...blanks, ...days]
  }, [view])

  // Arrow keys move between days; crossing a month edge flips the page.
  const onKeyDown = (e, key) => {
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key]
    if (!step) return
    e.preventDefault()
    const d = fromKey(key)
    d.setDate(d.getDate() + step)
    const next = toKey(d)
    if (next < today || monthStart(d) > lastMonth) return
    if (!sameMonth(d, view)) go(step > 0 ? 1 : -1)
    requestAnimationFrame(() => setTimeout(() => document.querySelector(`[data-day="${next}"]`)?.focus(), 40))
  }

  const monthLabel = view.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })

  return (
    <div className="rounded-3xl border border-rose/20 bg-white/60 p-3 shadow-[0_10px_30px_-18px_rgba(122,31,61,0.5)] sm:p-4">
      <div className="mb-2 flex items-center justify-between px-1">
        <NavButton label="Previous month" disabled={!canPrev} onClick={() => go(-1)}>
          ‹
        </NavButton>
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={monthLabel}
            className="font-serif text-lg italic text-burgundy"
            initial={{ opacity: 0, y: dir >= 0 ? 8 : -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: dir >= 0 ? -8 : 8 }}
            transition={{ duration: 0.2 }}
            aria-live="polite"
          >
            {monthLabel}
          </motion.p>
        </AnimatePresence>
        <NavButton label="Next month" disabled={!canNext} onClick={() => go(1)}>
          ›
        </NavButton>
      </div>

      <div className="grid grid-cols-7 text-[0.65rem] font-medium uppercase tracking-wider text-rose/80" aria-hidden="true">
        {WEEKDAYS.map((d) => (
          <span key={d} className="py-1.5">
            {d}
          </span>
        ))}
      </div>

      <AnimatePresence mode="wait" initial={false} custom={dir}>
        <motion.div
          key={toKey(view)}
          role="grid"
          aria-label={monthLabel}
          className="grid grid-cols-7 gap-y-1"
          initial={{ opacity: 0, x: dir * 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: dir * -40 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        >
          {cells.map((key, i) => {
            if (!key) return <span key={`b${i}`} />
            const past = key < today
            const selected = key === value
            const isToday = key === today
            const day = Number(key.slice(-2))
            return (
              <button
                key={key}
                type="button"
                data-day={key}
                disabled={past}
                onClick={() => onChange(key)}
                onKeyDown={(e) => onKeyDown(e, key)}
                aria-pressed={selected}
                aria-label={fromKey(key).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }) + (isToday ? ' (today)' : '')}
                className={`relative mx-auto grid aspect-square w-full max-w-[2.75rem] place-items-center rounded-full text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-berry/60 ${
                  past
                    ? 'cursor-not-allowed text-burgundy/25 line-through decoration-rose/30'
                    : selected
                      ? 'font-semibold text-cream'
                      : 'text-burgundy hover:bg-blush/80 active:scale-95'
                }`}
              >
                {selected && (
                  <motion.span
                    layoutId="selected-day"
                    className="absolute inset-0.5 rounded-full shadow-glow"
                    style={{ background: 'linear-gradient(135deg, #e07a93, #9b2a4f 60%, #7a1f3d)' }}
                    transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                  />
                )}
                {isToday && !selected && <span className="absolute inset-1 rounded-full border border-dashed border-rose/60" />}
                <span className="relative">{day}</span>
                {selected && (
                  <motion.span
                    className="absolute -top-1 right-0 text-rose"
                    initial={{ scale: 0, y: 4 }}
                    animate={{ scale: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                  >
                    <Heart className="h-3 w-3 drop-shadow" />
                  </motion.span>
                )}
              </button>
            )
          })}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

function NavButton({ label, disabled, onClick, children }) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      whileTap={disabled ? undefined : { scale: 0.88 }}
      className="grid h-10 w-10 place-items-center rounded-full text-2xl leading-none text-burgundy transition-colors hover:bg-blush/80 disabled:cursor-not-allowed disabled:opacity-25 focus:outline-none focus-visible:ring-2 focus-visible:ring-berry/60"
    >
      <span className="-mt-0.5">{children}</span>
    </motion.button>
  )
}

function TimePicker({ value, onChange }) {
  return (
    <div role="radiogroup" aria-label="Preferred time" className="grid grid-cols-3 gap-2 rounded-full bg-blush/50 p-1.5">
      {TIME_OPTIONS.map((t) => {
        const active = value === t.id
        return (
          <button
            key={t.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(t.id)}
            className={`relative flex flex-col items-center justify-center rounded-full px-2 py-2 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-berry/60 sm:flex-row sm:gap-1.5 sm:text-sm ${
              active ? 'text-cream' : 'text-burgundy hover:bg-white/50'
            }`}
          >
            {active && (
              <motion.span
                layoutId="time-pill"
                className="absolute inset-0 rounded-full shadow-glow"
                style={{ background: 'linear-gradient(135deg, #c2456b, #7a1f3d)' }}
                transition={{ type: 'spring', stiffness: 420, damping: 32 }}
              />
            )}
            <span className="relative text-base leading-none" aria-hidden="true">
              {t.icon}
            </span>
            <span className="relative mt-0.5 sm:mt-0">{t.label}</span>
          </button>
        )
      })}
    </div>
  )
}

export default function DatePicker({ plan, onChange, onConfirm }) {
  const set = (patch) => onChange({ ...plan, ...patch })
  const ready = plan.date && plan.time
  const missing = !plan.date && !plan.time ? 'a date and a time' : !plan.date ? 'a date' : 'a time'

  return (
    <Card>
      <motion.div variants={stagger} initial="hidden" animate="show">
        <motion.p variants={rise} className="text-[0.65rem] font-medium uppercase tracking-[0.28em] text-rose sm:text-[0.7rem]">
          when can I see you, Hiqmoh? ❤️
        </motion.p>
        <motion.h1
          variants={rise}
          className="mt-3 font-serif text-[clamp(1.55rem,7vw,2.1rem)] font-bold italic leading-tight text-burgundy"
        >
          Okay, Hiqmoh, one more little <span className="whitespace-nowrap">question… <span className="not-italic">🥹❤️</span></span>
        </motion.h1>
        <motion.p variants={rise} className="mt-3 text-[0.98rem] font-light text-burgundy/85">
          When would you like to come over, pretty girl?
        </motion.p>

        <motion.div variants={rise} className="mt-5">
          <Calendar value={plan.date} onChange={(date) => set({ date })} />
        </motion.div>

        <motion.div variants={rise} className="mt-5 text-left">
          <p className="mb-2 px-1 font-serif text-[1.05rem] italic text-wine">What time works best?</p>
          <TimePicker value={plan.time} onChange={(time) => set({ time })} />
        </motion.div>

        <motion.div variants={rise} className="mt-5 text-left">
          <label htmlFor="date-note" className="mb-2 block px-1 font-serif text-[1.05rem] italic text-wine">
            Anything you’d like us to plan? <span className="not-italic">👀</span>{' '}
            <span className="font-sans text-xs not-italic text-burgundy/50">(optional)</span>
          </label>
          <textarea
            id="date-note"
            rows={3}
            maxLength={NOTE_LIMIT}
            value={plan.note}
            onChange={(e) => set({ note: e.target.value })}
            placeholder="Movies, food, a long chat… anything 🥰"
            className="w-full resize-none rounded-2xl border border-rose/25 bg-white/70 px-4 py-3 text-base text-burgundy placeholder:text-burgundy/40 focus:border-berry/50 focus:outline-none focus:ring-4 focus:ring-rose/20"
          />
          <p className="mt-1 px-1 text-right text-[0.7rem] text-burgundy/45">
            {plan.note.length}/{NOTE_LIMIT}
          </p>
        </motion.div>

        <motion.div variants={rise} className="mt-3">
          <motion.button
            type="button"
            onClick={onConfirm}
            disabled={!ready}
            className="btn-yes w-full transition-opacity disabled:cursor-not-allowed disabled:opacity-45 focus:outline-none focus-visible:ring-4 focus-visible:ring-rose/50 sm:w-auto"
            whileHover={ready ? { scale: 1.04 } : undefined}
            whileTap={ready ? { scale: 0.96 } : undefined}
          >
            That’s Our Date <span aria-hidden="true">❤️</span>
          </motion.button>
          <AnimatePresence>
            {!ready && (
              <motion.p
                className="mt-3 text-xs text-burgundy/60"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                Just pick {missing} first, pretty girl 🥺
              </motion.p>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </Card>
  )
}
