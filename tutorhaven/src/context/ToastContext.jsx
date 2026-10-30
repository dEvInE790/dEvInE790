import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { CircleAlert, CircleCheck, Info, X } from 'lucide-react'
import { spring } from '../motion/variants'

const ToastContext = createContext(null)
const icons = { success: CircleCheck, error: CircleAlert, info: Info }
const tone = { success: 'text-mint-500', error: 'text-coral-500', info: 'text-navy-300' }

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), [])
  const push = useCallback(
    (type, message) => {
      const id = Math.random().toString(36).slice(2)
      setToasts((t) => [...t.slice(-2), { id, type, message }])
      setTimeout(() => dismiss(id), type === 'error' ? 6000 : 4000)
    },
    [dismiss],
  )
  const api = useMemo(
    () => ({ success: (m) => push('success', m), error: (m) => push('error', m), info: (m) => push('info', m) }),
    [push],
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[90] flex flex-col items-center gap-2 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:items-end sm:p-6" aria-live="polite">
        <AnimatePresence initial={false}>
          {toasts.map((t) => {
            const Icon = icons[t.type]
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: 24, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: 40, transition: { duration: 0.2 } }}
                transition={spring}
                role={t.type === 'error' ? 'alert' : 'status'}
                className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl bg-navy-950 px-4 py-3.5 text-sm text-white shadow-lift"
              >
                <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${tone[t.type]}`} aria-hidden />
                <p className="flex-1 leading-snug">{t.message}</p>
                <button type="button" onClick={() => dismiss(t.id)} className="-m-1 rounded-md p-1 text-navy-300 hover:text-white" aria-label="Dismiss">
                  <X className="h-4 w-4" />
                </button>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
