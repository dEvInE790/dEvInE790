import { useMemo } from 'react'
import { motion } from 'framer-motion'
import Heart from './Heart.jsx'

const HEART_TINTS = ['#ffffff', '#fde4e8', '#f7b6c5', '#e07a93', '#b23a5e', '#f4d6b0']

const rand = (min, max) => min + Math.random() * (max - min)

function makeHearts(count) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: rand(0, 100),
    size: rand(12, 34),
    duration: rand(11, 20),
    delay: rand(-20, 0), // negative delay = already mid-flight on first paint
    sway: rand(18, 50) * (Math.random() > 0.5 ? 1 : -1),
    opacity: rand(0.35, 0.8),
    blur: Math.random() > 0.75 ? 1.5 : 0,
    color: HEART_TINTS[i % HEART_TINTS.length],
  }))
}

function makeSparkles(count) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: rand(3, 97),
    top: rand(3, 95),
    size: rand(6, 14),
    duration: rand(2.2, 4.5),
    delay: rand(0, 4),
  }))
}

function Sparkle({ size }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <path
        d="M12 0c.6 5.6 2.4 7.4 12 12-9.6 4.6-11.4 6.4-12 12-.6-5.6-2.4-7.4-12-12C9.6 7.4 11.4 5.6 12 0Z"
        fill="#fff8ef"
      />
    </svg>
  )
}

/**
 * Gradient backdrop with hearts drifting upward and sparkles twinkling.
 * `celebrate` adds a second, denser wave of hearts.
 */
export default function Background({ celebrate = false }) {
  const isSmall = typeof window !== 'undefined' && window.innerWidth < 640
  const hearts = useMemo(() => makeHearts(isSmall ? 14 : 22), [isSmall])
  const partyHearts = useMemo(() => makeHearts(isSmall ? 18 : 30), [isSmall])
  const sparkles = useMemo(() => makeSparkles(isSmall ? 14 : 24), [isSmall])

  const renderHeart = (h, speed = 1) => (
    <motion.div
      key={h.id}
      className="absolute bottom-0"
      style={{ left: `${h.left}%`, opacity: h.opacity, filter: h.blur ? `blur(${h.blur}px)` : undefined }}
      initial={{ y: '10vh' }}
      animate={{ y: '-115vh', x: [0, h.sway, 0, -h.sway * 0.6, 0], rotate: [0, 12, -8, 10, 0] }}
      transition={{
        duration: h.duration / speed,
        delay: h.delay / speed,
        repeat: Infinity,
        ease: 'linear',
        x: { duration: h.duration / speed, repeat: Infinity, ease: 'easeInOut' },
        rotate: { duration: h.duration / speed, repeat: Infinity, ease: 'easeInOut' },
      }}
    >
      <Heart style={{ width: h.size, height: h.size, color: h.color }} />
    </motion.div>
  )

  return (
    <div className="romance-bg grain pointer-events-none fixed inset-0 -z-0 overflow-hidden" aria-hidden="true">
      {/* soft glowing orbs for depth */}
      <motion.div
        className="absolute -left-24 top-1/4 h-72 w-72 rounded-full bg-cream/40 blur-3xl"
        animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute -right-20 bottom-10 h-80 w-80 rounded-full bg-berry/30 blur-3xl"
        animate={{ scale: [1.1, 0.95, 1.1], opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }}
      />

      {sparkles.map((s) => (
        <motion.div
          key={s.id}
          className="absolute"
          style={{ left: `${s.left}%`, top: `${s.top}%` }}
          animate={{ scale: [0, 1, 0], opacity: [0, 0.9, 0], rotate: [0, 90] }}
          transition={{ duration: s.duration, delay: s.delay, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Sparkle size={s.size} />
        </motion.div>
      ))}

      {hearts.map((h) => renderHeart(h))}
      {celebrate && partyHearts.map((h) => renderHeart({ ...h, id: `p${h.id}` }, 1.8))}
    </div>
  )
}
