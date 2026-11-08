import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import Heart from './Heart.jsx'

/**
 * A hand-drawn-feeling envelope built from layered clip-paths.
 * Tap → wax seal pops → flap swings open → letter slides out → onOpened().
 */
export default function Envelope({ onOpened }) {
  const [stage, setStage] = useState('closed') // closed | opening | open

  const timers = useRef([])
  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  const open = () => {
    if (stage !== 'closed') return
    setStage('opening')
    timers.current.push(
      setTimeout(() => setStage('open'), 450), // flap is past 90°, tuck it behind the letter
      setTimeout(onOpened, 2100),
    )
  }
  const isOpening = stage !== 'closed'

  return (
    <motion.div
      className="flex flex-col items-center"
      initial={{ opacity: 0, y: 40, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 1.08, y: -30, filter: 'blur(6px)' }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.button
        type="button"
        onClick={open}
        aria-label="Open the envelope"
        className="relative mt-24 block w-[min(82vw,340px)] focus:outline-none focus-visible:ring-4 focus-visible:ring-cream/70 rounded-xl"
        style={{ aspectRatio: '1.45 / 1', perspective: 1200 }}
        animate={isOpening ? { y: 40 } : { y: [0, -10, 0], rotate: [-1.2, 1.2, -1.2] }}
        transition={
          isOpening
            ? { duration: 0.9, ease: 'easeInOut', delay: 0.6 }
            : { duration: 4, repeat: Infinity, ease: 'easeInOut' }
        }
        whileHover={!isOpening ? { scale: 1.03 } : undefined}
        whileTap={!isOpening ? { scale: 0.97 } : undefined}
      >
        {/* shadow */}
        <div className="absolute -bottom-6 left-1/2 h-6 w-4/5 -translate-x-1/2 rounded-[50%] bg-wine/30 blur-xl" />

        {/* inside of the envelope */}
        <div
          className="absolute inset-0 rounded-xl"
          style={{ background: 'linear-gradient(180deg, #b8435f 0%, #8f2a49 100%)' }}
        />

        {/* the letter */}
        <motion.div
          className="paper absolute inset-x-[7%] bottom-[5%] h-[90%] rounded-lg px-4 pt-4 text-center shadow-lg"
          style={{ zIndex: 2 }}
          animate={stage === 'open' ? { y: '-62%' } : { y: 0 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="font-serif text-lg italic text-burgundy sm:text-xl">For you, beautiful</p>
          <div className="mx-auto mt-2 flex items-center justify-center gap-1.5 text-rose">
            <span className="h-px w-8 bg-rose/50" />
            <Heart className="h-3 w-3" />
            <span className="h-px w-8 bg-rose/50" />
          </div>
          <div className="mx-auto mt-3 space-y-2 opacity-40">
            <div className="mx-auto h-1.5 w-4/5 rounded bg-petal" />
            <div className="mx-auto h-1.5 w-3/5 rounded bg-petal" />
          </div>
        </motion.div>

        {/* front pocket: left, right and bottom folds */}
        <div
          className="absolute inset-0 rounded-xl"
          style={{ zIndex: 3, clipPath: 'polygon(0 0, 52% 54%, 0 100%)', background: 'linear-gradient(120deg, #f6c4cf, #eda3b5)' }}
        />
        <div
          className="absolute inset-0 rounded-xl"
          style={{ zIndex: 3, clipPath: 'polygon(100% 0, 48% 54%, 100% 100%)', background: 'linear-gradient(240deg, #f6c4cf, #eda3b5)' }}
        />
        <div
          className="absolute inset-0 rounded-xl"
          style={{ zIndex: 3, clipPath: 'polygon(0 100%, 50% 46%, 100% 100%)', background: 'linear-gradient(0deg, #f9d2da, #f3b4c2)' }}
        />
        <p
          className="absolute bottom-[9%] left-0 right-0 text-center font-serif text-sm italic text-burgundy/70"
          style={{ zIndex: 3 }}
        >
          open me ♡
        </p>

        {/* top flap */}
        <motion.div
          className="absolute inset-x-0 top-0 h-[58%]"
          style={{
            zIndex: stage === 'open' ? 1 : 4,
            transformOrigin: 'top center',
            clipPath: 'polygon(0 0, 100% 0, 50% 100%)',
            background: 'linear-gradient(180deg, #f9d5dc 0%, #ee9fb2 100%)',
            borderTopLeftRadius: 12,
            borderTopRightRadius: 12,
          }}
          animate={{ rotateX: isOpening ? 180 : 0 }}
          transition={{ duration: 0.8, ease: [0.65, 0, 0.35, 1], delay: 0.15 }}
        />

        {/* wax seal */}
        <motion.div
          className="absolute left-1/2 top-[58%] grid h-14 w-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full"
          style={{
            zIndex: 5,
            background: 'radial-gradient(circle at 35% 30%, #c4466b, #7a1f3d 70%)',
            boxShadow: '0 6px 14px rgba(78,14,38,.45), inset 0 -3px 6px rgba(0,0,0,.25), inset 0 2px 3px rgba(255,255,255,.25)',
          }}
          animate={isOpening ? { scale: 0, opacity: 0, rotate: 30 } : { scale: [1, 1.08, 1] }}
          transition={isOpening ? { duration: 0.3 } : { duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Heart className="h-6 w-6 text-cream/90" />
        </motion.div>
      </motion.button>

      <motion.p
        className="mt-14 font-sans text-sm font-medium uppercase tracking-[0.3em] text-burgundy/80"
        animate={isOpening ? { opacity: 0 } : { opacity: [0.55, 1, 0.55] }}
        transition={isOpening ? { duration: 0.3 } : { duration: 2.2, repeat: Infinity }}
      >
        tap to open 💌
      </motion.p>
    </motion.div>
  )
}
