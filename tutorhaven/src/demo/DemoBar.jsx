import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { FlaskConical, RotateCcw, X } from 'lucide-react'
import { resetDemo } from './backend'

/** Floating indicator that this is the demo build, with a one-click data reset. */
export default function DemoBar() {
  const [open, setOpen] = useState(false)
  const reset = () => {
    resetDemo()
    window.location.hash = '#/'
    window.location.reload()
  }
  return (
    <div className="fixed top-[4.5rem] right-3 z-40 lg:top-auto lg:right-4 lg:bottom-4">
      <AnimatePresence mode="wait" initial={false}>
        {open ? (
          <motion.div
            key="panel"
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            className="w-72 rounded-2xl bg-navy-950 p-4 text-sm text-navy-100 shadow-lift"
            role="dialog"
            aria-label="Demo mode"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="font-semibold text-white">Demo mode</p>
              <button type="button" onClick={() => setOpen(false)} className="-m-1 rounded-md p-1 text-navy-300 hover:text-white" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-1.5 text-navy-300">Everything works, but data is simulated and saved only in this browser. No emails are sent and no cards are charged.</p>
            <button type="button" onClick={reset} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-mint-400 py-2 font-semibold text-navy-950 hover:bg-mint-300">
              <RotateCcw className="h-4 w-4" />Reset demo data
            </button>
          </motion.div>
        ) : (
          <motion.button
            key="pill"
            type="button"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            whileHover={{ y: -2 }}
            onClick={() => setOpen(true)}
            className="flex items-center gap-1.5 rounded-full bg-navy-950/90 px-3 py-1.5 text-xs font-semibold text-mint-300 shadow-lift backdrop-blur"
          >
            <FlaskConical className="h-3.5 w-3.5" />Demo
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}
