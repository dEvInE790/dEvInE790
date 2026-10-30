import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { X } from 'lucide-react'
import { ease } from '../../motion/variants'
import useMediaQuery from '../../lib/useMediaQuery'

/**
 * Accessible modal: centred dialog on desktop, bottom sheet on mobile.
 * Handles Escape, focus restore, initial focus, Tab trapping and scroll lock.
 */
export default function Modal({ open, onClose, title, description, children, size = 'md' }) {
  const panelRef = useRef(null)
  const restoreRef = useRef(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  const isMobile = useMediaQuery('(max-width: 639px)')
  const widths = { sm: 'sm:max-w-md', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl' }

  useEffect(() => {
    if (!open) return
    restoreRef.current = document.activeElement
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    const focusTimer = setTimeout(() => {
      const el = panelRef.current?.querySelector('[data-autofocus], input, select, textarea, button:not([data-close])')
      ;(el || panelRef.current)?.focus()
    }, 60)
    const onKey = (e) => {
      if (e.key === 'Escape') closeRef.current?.()
      if (e.key === 'Tab' && panelRef.current) {
        const nodes = panelRef.current.querySelectorAll('a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])')
        if (!nodes.length) return
        const first = nodes[0]
        const last = nodes[nodes.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      clearTimeout(focusTimer)
      document.body.style.overflow = overflow
      document.removeEventListener('keydown', onKey)
      restoreRef.current?.focus?.()
    }
  }, [open])

  const panelMotion = isMobile
    ? { initial: { y: '100%' }, animate: { y: 0 }, exit: { y: '100%' }, transition: { duration: 0.4, ease } }
    : { initial: { opacity: 0, scale: 0.95, y: 12 }, animate: { opacity: 1, scale: 1, y: 0 }, exit: { opacity: 0, scale: 0.97, y: 8 }, transition: { duration: 0.3, ease } }

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-6">
          <motion.div
            className="absolute inset-0 bg-navy-950/45 backdrop-blur-[3px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            tabIndex={-1}
            className={`relative max-h-[92dvh] w-full overflow-y-auto rounded-t-[1.75rem] bg-white p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-lift outline-none sm:rounded-3xl sm:p-7 ${widths[size]}`}
            {...panelMotion}
          >
            <div className="mx-auto -mt-2 mb-4 h-1.5 w-10 rounded-full bg-navy-100 sm:hidden" aria-hidden />
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 id="modal-title" className="text-xl font-semibold">{title}</h2>
                {description && <p className="mt-1 text-sm text-navy-500">{description}</p>}
              </div>
              <button type="button" data-close onClick={onClose} className="-m-1.5 rounded-lg p-1.5 text-navy-400 transition-colors hover:bg-navy-50 hover:text-navy-800" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
