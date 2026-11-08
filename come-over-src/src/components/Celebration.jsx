import { motion } from 'framer-motion'
import Card, { rise, stagger } from './Card.jsx'
import Heart from './Heart.jsx'
import { fireHearts } from '../lib/heartConfetti.js'

function BeatingHeart() {
  return (
    <div className="relative mx-auto grid h-24 w-24 place-items-center" aria-hidden="true">
      {[0, 1].map((i) => (
        <motion.span
          key={i}
          className="absolute inset-0 rounded-full bg-rose/30"
          animate={{ scale: [0.6, 1.6], opacity: [0.6, 0] }}
          transition={{ duration: 2, repeat: Infinity, delay: i, ease: 'easeOut' }}
        />
      ))}
      <motion.div
        initial={{ scale: 0, rotate: -30 }}
        animate={{ scale: [1, 1.14, 1, 1.1, 1], rotate: 0 }}
        transition={{
          scale: { duration: 1.2, repeat: Infinity, repeatDelay: 0.3 },
          rotate: { type: 'spring', stiffness: 200, damping: 12 },
        }}
      >
        <Heart className="h-16 w-16 drop-shadow-lg" fill="url(#heartGrad)" />
        <svg width="0" height="0" className="absolute">
          <defs>
            <linearGradient id="heartGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#e07a93" />
              <stop offset="100%" stopColor="#7a1f3d" />
            </linearGradient>
          </defs>
        </svg>
      </motion.div>
    </div>
  )
}

export default function Celebration({ onNext }) {
  const makeItHappen = (e) => {
    const r = e.currentTarget.getBoundingClientRect()
    fireHearts({
      origin: { x: (r.left + r.width / 2) / window.innerWidth, y: r.top / window.innerHeight },
      count: 45,
      spread: 100,
      power: 12,
    })
    setTimeout(onNext, 450) // let the hearts burst before the page changes
  }

  return (
    <Card>
      <motion.div variants={stagger} initial="hidden" animate="show">
        <motion.div variants={rise}>
          <BeatingHeart />
        </motion.div>

        <motion.h1
          variants={rise}
          className="mt-4 font-serif text-[2.1rem] font-bold leading-[1.1] text-burgundy sm:text-[2.6rem]"
        >
          HIQMOHHH <span className="italic text-berry">SAID YESSS!</span>{' '}
          <span className="whitespace-nowrap" aria-hidden="true">❤️😭</span>
        </motion.h1>

        <motion.p variants={rise} className="mt-4 text-[0.98rem] font-light leading-relaxed text-burgundy/85">
          You just made me the happiest person. Can’t wait to see you, beautiful. <span aria-hidden="true">❤️</span>
        </motion.p>

        <motion.div variants={rise} className="mx-auto my-6 flex items-center justify-center gap-2 text-rose/70" aria-hidden="true">
          <span className="h-px w-12 bg-gradient-to-r from-transparent to-rose/60" />
          <Heart className="h-3 w-3" />
          <span className="h-px w-12 bg-gradient-to-l from-transparent to-rose/60" />
        </motion.div>

        <motion.div variants={rise}>
          <p className="font-serif text-xl italic text-wine">Now, let’s plan our little date.</p>
          <motion.button
            type="button"
            onClick={makeItHappen}
            className="btn-yes mt-6 focus:outline-none focus-visible:ring-4 focus-visible:ring-rose/50"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            animate={{ y: [0, -4, 0] }}
            transition={{ y: { duration: 1.8, repeat: Infinity, ease: 'easeInOut' } }}
          >
            Let’s make it happen <span aria-hidden="true">❤️</span>
          </motion.button>
        </motion.div>
      </motion.div>
    </Card>
  )
}
