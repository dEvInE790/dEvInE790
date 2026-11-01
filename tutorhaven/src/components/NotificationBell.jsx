import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { Bell, BellOff } from 'lucide-react'
import { listNotifications, markNotificationsRead } from '../lib/api'
import { relativeFromNow } from '../lib/format'
import { useUnread } from '../context/UnreadContext'
import { ease, spring } from '../motion/variants'

/** Header bell with the latest notifications (payments, bookings, renewals, reviews). */
export default function NotificationBell({ className = '', align = 'right' }) {
  const { notifications: unread, refresh } = useUnread()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState(null)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e) => !ref.current?.contains(e.target) && setOpen(false)
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', onDoc)
    document.addEventListener('keydown', onKey)
    listNotifications()
      .then((rows) => {
        setItems(rows)
        if (rows.some((n) => !n.read_at)) markNotificationsRead().then(refresh).catch(() => {})
      })
      .catch(() => setItems([]))
    return () => {
      document.removeEventListener('pointerdown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, refresh])

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
        className="relative grid h-10 w-10 place-items-center rounded-xl text-navy-600 transition-colors hover:bg-navy-900/[0.05] hover:text-navy-950"
      >
        <motion.span animate={unread ? { rotate: [0, -14, 12, -8, 0] } : { rotate: 0 }} transition={{ duration: 0.7, ease }} key={unread}>
          <Bell className="h-5 w-5" />
        </motion.span>
        <AnimatePresence>
          {unread > 0 && (
            <motion.span
              initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={spring}
              className="absolute top-1 right-1 grid min-w-[1.1rem] place-items-center rounded-full bg-coral-500 px-1 text-[0.65rem] font-bold text-white tabular-nums"
            >
              {unread > 9 ? '9+' : unread}
            </motion.span>
          )}
        </AnimatePresence>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.98 }} transition={{ duration: 0.18, ease }}
            className={`absolute top-12 z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-navy-900/[0.08] bg-white shadow-lift ${align === 'right' ? 'right-0' : 'left-0'}`}
            role="dialog" aria-label="Notifications"
          >
            <p className="border-b border-navy-900/[0.06] px-4 py-3 text-sm font-semibold">Notifications</p>
            <div className="max-h-[22rem] overflow-y-auto">
              {items === null ? (
                <div className="space-y-2 p-4">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-10 rounded-xl" />)}</div>
              ) : !items.length ? (
                <div className="flex flex-col items-center px-6 py-10 text-center text-sm text-navy-500">
                  <BellOff className="mb-3 h-6 w-6 text-navy-300" />
                  You’re all caught up. Payment confirmations, bookings and renewal reminders will show up here.
                </div>
              ) : (
                <ul className="divide-y divide-navy-900/[0.05]">
                  {items.map((n) => {
                    const body = (
                      <>
                        <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.read_at ? 'bg-transparent' : 'bg-mint-500'}`} />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold text-navy-900">{n.title}</span>
                          {n.body && <span className="mt-0.5 block text-xs text-navy-500">{n.body}</span>}
                          <span className="mt-1 block text-[0.7rem] text-navy-400">{relativeFromNow(n.created_at)}</span>
                        </span>
                      </>
                    )
                    return (
                      <li key={n.id}>
                        {n.link ? (
                          <Link to={n.link} onClick={() => setOpen(false)} className="flex gap-3 px-4 py-3 transition-colors hover:bg-cream-50">{body}</Link>
                        ) : (
                          <div className="flex gap-3 px-4 py-3">{body}</div>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
