import { useEffect } from 'react'
import { motion } from 'framer-motion'
import Card, { rise, stagger } from './Card.jsx'
import ShareButtons from './ShareButtons.jsx'
import { whatsappLink } from '../config.js'
import { buildAnswerMessage, formatLong, timeOption } from '../lib/dates.js'
import { celebrate } from '../lib/heartConfetti.js'

/** "It's a date" ticket showing her picks, plus the WhatsApp send button. */
export default function DateConfirmed({ plan, onEdit }) {
  const t = timeOption(plan.time)
  const note = plan.note.trim()
  const message = buildAnswerMessage(plan)
  const wa = whatsappLink(message, { required: true })

  useEffect(() => {
    const id = setTimeout(celebrate, 200)
    return () => clearTimeout(id)
  }, [])

  const rows = [
    ['📅', 'Date', formatLong(plan.date)],
    ['🕰️', 'Time', `${t.label} ${t.icon}`],
    ...(note ? [['💭', 'Let’s plan', note]] : []),
  ]

  return (
    <Card>
      <motion.div variants={stagger} initial="hidden" animate="show">
        <motion.div
          variants={rise}
          className="text-5xl"
          aria-hidden="true"
          animate={{ rotate: [0, -8, 8, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 1 }}
        >
          💌
        </motion.div>
        <motion.h1 variants={rise} className="mt-3 font-serif text-[clamp(1.9rem,8vw,2.5rem)] font-bold italic leading-tight text-burgundy">
          It’s a date, <span className="whitespace-nowrap">Hiqmoh! <span className="not-italic">❤️</span></span>
        </motion.h1>

        {/* the date ticket */}
        <motion.div
          variants={rise}
          className="relative mx-auto mt-6 max-w-sm rounded-2xl border border-dashed border-rose/50 bg-cream/80 px-5 py-4 text-left"
          style={{ rotate: -1 }}
        >
          <span className="absolute -left-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full border border-dashed border-rose/50 bg-[#fdeee9]" aria-hidden="true" />
          <span className="absolute -right-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full border border-dashed border-rose/50 bg-[#fdeee9]" aria-hidden="true" />
          <p className="text-center text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-rose">admit one · Hiqmoh</p>
          <dl className="mt-3 space-y-3">
            {rows.map(([icon, label, value], i) => (
              <motion.div
                key={label}
                className="flex gap-3"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 + i * 0.15 }}
              >
                <span className="text-lg leading-6" aria-hidden="true">
                  {icon}
                </span>
                <div className="min-w-0">
                  <dt className="text-[0.65rem] font-medium uppercase tracking-widest text-burgundy/50">{label}</dt>
                  <dd className="break-words text-[0.95rem] font-medium text-burgundy">{value}</dd>
                </div>
              </motion.div>
            ))}
          </dl>
        </motion.div>

        <motion.p variants={rise} className="mt-6 font-serif text-[1.2rem] leading-snug text-wine">
          Can’t wait to spend some time with you, beautiful. I’m already looking forward to it.{' '}
          <span aria-hidden="true">🥹</span>
        </motion.p>

        <motion.div variants={rise} className="mt-7 flex flex-col items-center gap-3">
          <motion.a
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-yes w-full focus:outline-none focus-visible:ring-4 focus-visible:ring-rose/50 sm:w-auto"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            animate={{ y: [0, -4, 0] }}
            transition={{ y: { duration: 1.8, repeat: Infinity, ease: 'easeInOut' } }}
          >
            Send My Answer <span aria-hidden="true">💌</span>
          </motion.a>
          <ShareButtons text={message} title="It’s a date 💌" />
          <button
            type="button"
            onClick={onEdit}
            className="mt-2 text-sm text-burgundy/60 underline decoration-rose/40 underline-offset-4 hover:text-burgundy"
          >
            Change something ✏️
          </button>
        </motion.div>
      </motion.div>
    </Card>
  )
}
