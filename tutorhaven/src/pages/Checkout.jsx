import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ArrowRight, CalendarDays, CalendarPlus, Clock, CreditCard, FlaskConical, ShieldCheck, Timer } from 'lucide-react'
import PublicLayout from '../components/layout/PublicLayout'
import PageTransition from '../motion/PageTransition'
import Avatar from '../components/ui/Avatar'
import Button from '../components/ui/Button'
import Skeleton, { LoadingRegion } from '../components/ui/Skeleton'
import EmptyState, { ErrorState } from '../components/ui/EmptyState'
import { StatusBadge } from '../components/ui/Badge'
import useAsync from '../lib/useAsync'
import { activeDiscount, getBooking, getSubscription, payForBooking } from '../lib/api'
import { HOLD_MINUTES, PLANS } from '../lib/constants'
import { dateLong, money, time } from '../lib/format'
import { icsForBooking } from '../lib/time'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { ease } from '../motion/variants'

function useCountdown(deadline) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  return Math.max(0, deadline - now)
}

export function SuccessMark() {
  const reduce = useReducedMotion()
  return (
    <div className="relative mx-auto h-28 w-28">
      {!reduce && Array.from({ length: 12 }).map((_, i) => {
        const angle = (i / 12) * Math.PI * 2
        return (
          <motion.span
            key={i}
            className={`absolute top-1/2 left-1/2 h-2 w-2 rounded-full ${i % 3 === 0 ? 'bg-amber-400' : i % 3 === 1 ? 'bg-mint-400' : 'bg-navy-300'}`}
            initial={{ x: 0, y: 0, opacity: 1, scale: 0 }}
            animate={{ x: Math.cos(angle) * 72, y: Math.sin(angle) * 72, opacity: 0, scale: 1 }}
            transition={{ duration: 0.9, delay: 0.35, ease }}
          />
        )
      })}
      <motion.svg viewBox="0 0 100 100" className="h-full w-full" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 18 }}>
        <circle cx="50" cy="50" r="46" fill="#4cc897" />
        <motion.path d="M30 52 L44 65 L71 37" fill="none" stroke="#0a1428" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5, delay: 0.25, ease }} />
      </motion.svg>
    </div>
  )
}

export default function Checkout() {
  const { bookingId } = useParams()
  const { profile } = useAuth()
  const toast = useToast()
  const booking = useAsync(() => getBooking(bookingId), [bookingId])
  const sub = useAsync(() => getSubscription(profile.id), [profile?.id])
  const [paying, setPaying] = useState(false)
  const [paid, setPaid] = useState(null)

  const b = booking.data
  const deadline = b ? new Date(b.created_at).getTime() + HOLD_MINUTES * 60000 : Date.now()
  const remaining = useCountdown(deadline)
  const expired = b?.status === 'pending_payment' && remaining === 0
  const discount = activeDiscount(sub.data, PLANS)
  const total = b ? Math.round(b.price * (1 - discount) * 100) / 100 : 0
  const tutorName = b?.tutor?.profile?.full_name ?? 'your tutor'
  const icsUrl = useMemo(() => (b ? icsForBooking({ ...b, withName: tutorName }) : null), [b, tutorName])
  useEffect(() => () => icsUrl && URL.revokeObjectURL(icsUrl), [icsUrl])

  const onPay = async () => {
    setPaying(true)
    try {
      const payment = await payForBooking(bookingId)
      setPaid(payment)
      booking.setData((d) => ({ ...d, status: 'confirmed', amount_paid: payment.amount }))
    } catch (e) {
      toast.error(e.message)
      booking.reload({ silent: true })
    } finally {
      setPaying(false)
    }
  }

  return (
    <PublicLayout footer={false}>
      <PageTransition className="container-page max-w-3xl pt-24 pb-24 lg:pt-28">
        {booking.error ? (
          <ErrorState message={booking.error} onRetry={booking.reload} />
        ) : booking.loading ? (
          <LoadingRegion label="Loading checkout">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="mt-6 h-72 rounded-3xl" />
          </LoadingRegion>
        ) : !b ? (
          <EmptyState title="Booking not found" action={<Button to="/dashboard/sessions">View your sessions</Button>} />
        ) : (
          <AnimatePresence mode="wait">
            {paid || b.status === 'confirmed' ? (
              <motion.div key="done" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, ease }} className="card px-6 py-12 text-center sm:px-12">
                <SuccessMark />
                <h1 className="mt-6 text-3xl font-bold">You’re booked!</h1>
                <p className="mx-auto mt-3 max-w-md text-navy-600">
                  {b.subject} with {tutorName} on <strong className="text-navy-900">{dateLong(b.starts_at)}</strong> at <strong className="text-navy-900">{time(b.starts_at)}</strong>.
                </p>
                {paid && <p className="mt-2 text-sm text-navy-400">Payment of {money(paid.amount)} received.</p>}
                <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                  <Button to="/dashboard/sessions" iconRight={ArrowRight}>View my sessions</Button>
                  <Button
                    variant="secondary"
                    icon={CalendarPlus}
                    href={icsUrl}
                    download="tutorhaven-session.ics"
                  >
                    Add to calendar
                  </Button>
                </div>
              </motion.div>
            ) : b.status !== 'pending_payment' || expired ? (
              <motion.div key="unavailable" className="card p-8">
                <EmptyState icon={Timer} title={expired ? 'This checkout expired' : 'This booking can’t be paid'} action={<Button to={`/book/${b.tutor_id}`}>Choose a new time</Button>}>
                  {expired ? `We hold slots for ${HOLD_MINUTES} minutes. Pick a time again and you’ll be all set.` : <>Current status: <StatusBadge status={b.status} /></>}
                </EmptyState>
              </motion.div>
            ) : (
              <motion.div key="pay" exit={{ opacity: 0, y: -10 }}>
                <h1 className="text-3xl font-bold sm:text-4xl">Checkout</h1>
                <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-amber-400/15 px-3 py-1.5 text-sm font-medium text-[#6b4700]">
                  <Timer className="h-4 w-4" />
                  Slot held for <span className="tabular-nums">{Math.floor(remaining / 60000)}:{String(Math.floor((remaining % 60000) / 1000)).padStart(2, '0')}</span>
                </div>

                <div className="mt-8 grid gap-6 md:grid-cols-[1fr_1fr]">
                  <div className="card p-6">
                    <h2 className="text-sm font-semibold tracking-wide text-navy-400 uppercase">Your session</h2>
                    <div className="mt-4 flex items-center gap-3">
                      <Avatar name={tutorName} seed={b.tutor_id} size="md" />
                      <div>
                        <p className="font-semibold">{b.subject}</p>
                        <p className="text-sm text-navy-500">with {tutorName}</p>
                      </div>
                    </div>
                    <ul className="mt-5 space-y-2.5 text-sm text-navy-700">
                      <li className="flex items-center gap-2.5"><CalendarDays className="h-4 w-4 text-navy-400" />{dateLong(b.starts_at)}</li>
                      <li className="flex items-center gap-2.5"><Clock className="h-4 w-4 text-navy-400" />{time(b.starts_at)} – {time(b.ends_at)} ({b.duration_minutes} min)</li>
                      {b.student && b.student.id !== profile.id && <li className="flex items-center gap-2.5"><Avatar name={b.student.full_name} seed={b.student.id} size="xs" />For {b.student.full_name}</li>}
                    </ul>
                  </div>

                  <div className="card p-6">
                    <h2 className="text-sm font-semibold tracking-wide text-navy-400 uppercase">Payment</h2>
                    <div className="mt-4 flex items-center gap-3 rounded-2xl border-2 border-mint-400 bg-mint-50/60 p-4">
                      <CreditCard className="h-5 w-5 text-navy-700" />
                      <div className="flex-1">
                        <p className="text-sm font-semibold">Card</p>
                        <p className="text-xs text-navy-500">Secure checkout</p>
                      </div>
                      <span className="h-4 w-4 rounded-full border-4 border-navy-900" aria-hidden />
                    </div>
                    <p className="mt-3 flex items-start gap-2 rounded-xl bg-cream-100 p-3 text-xs text-navy-600">
                      <FlaskConical className="mt-0.5 h-4 w-4 shrink-0 text-navy-400" />
                      Test mode: no card is charged. Payments are recorded so you can try the full flow before connecting a payment provider.
                    </p>
                    <dl className="mt-5 space-y-2 text-sm">
                      <div className="flex justify-between"><dt className="text-navy-500">Session</dt><dd>{money(b.price)}</dd></div>
                      {discount > 0 && <div className="flex justify-between"><dt className="text-navy-500">Member discount</dt><dd className="text-mint-700">−{money(b.price - total)}</dd></div>}
                      <div className="flex items-end justify-between border-t border-navy-900/[0.06] pt-3"><dt className="font-semibold">Total</dt><dd className="font-display text-2xl font-bold">{money(total)}</dd></div>
                    </dl>
                    <Button size="lg" className="mt-5 w-full" loading={paying} onClick={onPay}>Pay {money(total)}</Button>
                    <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-navy-400"><ShieldCheck className="h-3.5 w-3.5" />Free cancellation up to {discount ? '2' : '24'} hours before</p>
                  </div>
                </div>
                <p className="mt-6 text-center text-sm text-navy-500">Changed your mind? <Link to="/dashboard/sessions" className="font-semibold text-navy-800 underline-offset-2 hover:underline">Manage your sessions</Link></p>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </PageTransition>
    </PublicLayout>
  )
}
