import { useCallback, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Card, { rise, stagger } from './Card.jsx'
import NoButton from './NoButton.jsx'
import { NO_ATTEMPTS_BEFORE_SURRENDER, NO_MESSAGES } from '../config.js'

/** Hands out the funny lines in random order without repeating back-to-back. */
function useMessageBag(messages) {
  const bag = useRef([])
  const lastMsg = useRef(null)
  return useCallback(() => {
    if (!bag.current.length) {
      bag.current = [...messages].sort(() => Math.random() - 0.5)
      if (bag.current[0] === lastMsg.current) bag.current.push(bag.current.shift())
    }
    lastMsg.current = bag.current.shift()
    return lastMsg.current
  }, [messages])
}

export default function Question({ onYes, onNo, musicRef }) {
  const yesRef = useRef(null)
  const hintRef = useRef(null)
  const questionRef = useRef(null)
  const [attempts, setAttempts] = useState(0)
  const [hint, setHint] = useState(null)
  const nextMessage = useMessageBag(NO_MESSAGES)

  const avoid = useMemo(
    () => [
      { ref: yesRef, pad: 36 },
      { ref: hintRef, pad: 6 },
      { ref: questionRef, pad: 4 },
      { ref: musicRef, pad: 10 },
    ],
    [musicRef],
  )

  const onAttempt = useCallback(
    (n) => {
      setAttempts(n)
      setHint({ id: n, text: nextMessage() })
    },
    [nextMessage],
  )
  const onSurrender = useCallback(() => {
    setHint({ id: 'done', text: 'Okay okay, I’ll stop running 🙈 It works now…' })
  }, [])

  // YES gets a little more tempting every time she goes for NO.
  const yesScale = 1 + Math.min(attempts, 6) * 0.045

  return (
    <Card>
      <motion.div variants={stagger} initial="hidden" animate="show">
        <motion.p variants={rise} className="text-[0.65rem] font-medium uppercase tracking-[0.28em] text-rose sm:text-[0.7rem] sm:tracking-[0.35em]">
          a little question for you
        </motion.p>

        <motion.h1
          variants={rise}
          className="mt-3 font-serif text-[clamp(1.75rem,8.5vw,2.75rem)] font-bold italic leading-tight text-burgundy"
        >
          Hey <span className="whitespace-nowrap">Beautiful{' '}
          <motion.span
            className="inline-block not-italic"
            animate={{ scale: [1, 1.18, 1, 1.12, 1] }}
            transition={{ duration: 1.4, repeat: Infinity, repeatDelay: 0.6 }}
          >
            ❤️
          </motion.span></span>
        </motion.h1>

        <motion.div variants={rise} className="mx-auto my-4 flex items-center justify-center gap-2 text-rose/70" aria-hidden="true">
          <span className="h-px w-12 bg-gradient-to-r from-transparent to-rose/60" />
          <span className="text-xs">✦</span>
          <span className="h-px w-12 bg-gradient-to-l from-transparent to-rose/60" />
        </motion.div>

        <motion.p variants={rise} className="text-[0.98rem] font-light leading-relaxed text-burgundy/85">
          So… I’ve been thinking about something, and I thought I’d ask you personally.
        </motion.p>

        <motion.p
          ref={questionRef}
          variants={rise}
          className="mt-4 font-serif text-[clamp(1.25rem,6.2vw,1.65rem)] font-medium leading-snug text-wine"
        >
          Would you like to come over and spend some time with me?{' '}
          <motion.span
            className="inline-block"
            animate={attempts ? { rotate: [0, -14, 14, -8, 0] } : {}}
            key={attempts}
            transition={{ duration: 0.5 }}
          >
            🥺
          </motion.span>
        </motion.p>

        <motion.div variants={rise} className="mt-7 flex flex-wrap items-center justify-center gap-4">
          <motion.button
            ref={yesRef}
            type="button"
            onClick={onYes}
            className="btn-yes focus:outline-none focus-visible:ring-4 focus-visible:ring-rose/50"
            animate={{ scale: yesScale }}
            whileHover={{ scale: yesScale * 1.06, boxShadow: '0 16px 40px -10px rgba(122,31,61,.9)' }}
            whileTap={{ scale: yesScale * 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 18 }}
          >
            {/* soft pulse ring to draw the eye */}
            <motion.span
              className="absolute inset-0 rounded-full border-2 border-berry/60"
              animate={{ scale: [1, 1.35], opacity: [0.7, 0] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
              aria-hidden="true"
            />
            YES <span aria-hidden="true">❤️</span>
          </motion.button>

          <NoButton
            avoidRefs={avoid}
            surrenderAfter={NO_ATTEMPTS_BEFORE_SURRENDER}
            onAttempt={onAttempt}
            onSurrender={onSurrender}
            onRealNo={onNo}
          />
        </motion.div>

        <div ref={hintRef} className="mx-auto mt-5 flex min-h-[3rem] max-w-xs items-center justify-center" aria-live="polite">
          <AnimatePresence mode="wait">
            {hint && (
              <motion.p
                key={hint.id}
                className="rounded-2xl bg-blush/70 px-4 py-2 font-serif text-[1.05rem] italic text-burgundy"
                initial={{ opacity: 0, y: 10, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 400, damping: 26 }}
              >
                {hint.text}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </Card>
  )
}
