import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { createMusicBox } from '../lib/musicBox.js'

/** Music is always opt-in: nothing plays until she taps this. */
export default function MusicToggle({ innerRef }) {
  const box = useRef(null)
  const [on, setOn] = useState(false)

  const toggle = () => {
    if (!box.current) box.current = createMusicBox()
    if (on) box.current.pause()
    else box.current.play()
    setOn(!on)
  }

  return (
    <motion.button
      ref={innerRef}
      type="button"
      onClick={toggle}
      aria-pressed={on}
      aria-label={on ? 'Turn music off' : 'Play soft music'}
      className="fixed right-4 z-40 inline-flex items-center gap-2 rounded-full border border-cream/60 bg-cream/70 px-3.5 py-2 text-xs font-medium text-burgundy shadow-lg backdrop-blur-md focus:outline-none focus-visible:ring-4 focus-visible:ring-cream/70"
      style={{ top: 'max(1rem, env(safe-area-inset-top))' }}
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1, duration: 0.6 }}
      whileTap={{ scale: 0.94 }}
    >
      {on ? (
        <span className="flex h-3.5 items-end gap-[3px]" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="w-[3px] rounded-full bg-burgundy"
              animate={{ height: ['30%', '100%', '45%', '80%', '30%'] }}
              transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.18, ease: 'easeInOut' }}
            />
          ))}
        </span>
      ) : (
        <span className="text-sm leading-none" aria-hidden="true">♫</span>
      )}
      {on ? 'music on' : 'play music'}
    </motion.button>
  )
}
