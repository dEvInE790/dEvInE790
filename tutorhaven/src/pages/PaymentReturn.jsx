import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion } from 'motion/react'
import { AlertCircle, ArrowRight, Hourglass, RotateCcw, XCircle } from 'lucide-react'
import PublicLayout from '../components/layout/PublicLayout'
import PageTransition from '../motion/PageTransition'
import Button from '../components/ui/Button'
import Skeleton, { LoadingRegion } from '../components/ui/Skeleton'
import { SuccessMark } from './Checkout'
import { getBooking, verifyPaystack } from '../lib/api'
import { dateLong, money, time } from '../lib/format'
import { useAuth } from '../context/AuthContext'
import { ease } from '../motion/variants'

const POLL_MS = 4000
const MAX_POLLS = 30

/**
 * Paystack sends the customer here after checkout. The `status` in the URL is
 * ignored: the result shown always comes from our server, which asks Paystack.
 */
export default function PaymentReturn() {
  const [params] = useSearchParams()
  const reference = params.get('reference') || params.get('trxref') || ''
  const { profile } = useAuth()
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [booking, setBooking] = useState(null)
  const polls = useRef(0)

  useEffect(() => {
    if (!reference) return
    let cancelled = false
    let timer
    const check = async () => {
      try {
        const r = await verifyPaystack(reference)
        if (cancelled) return
        setResult(r)
        setError(null)
        if (r.booking_id) getBooking(r.booking_id).then((b) => !cancelled && setBooking(b)).catch(() => {})
        if (r.status === 'pending' && ++polls.current < MAX_POLLS) timer = setTimeout(check, POLL_MS)
      } catch (e) {
        if (!cancelled) setError(e.message)
      }
    }
    check()
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [reference])

  const isSession = result?.kind === 'session'
  const retryTo = isSession && result?.booking_id ? `/checkout/${result.booking_id}` : profile?.role === 'tutor' ? '/dashboard/subscription' : '/pricing'
  const doneTo = isSession ? '/dashboard/sessions' : profile?.role === 'tutor' ? '/dashboard/subscription' : '/dashboard/billing'
  const tutorName = booking?.tutor?.profile?.full_name

  let body
  if (!reference) {
    body = <State icon={AlertCircle} tone="coral" title="No payment to check" text="This page is opened by Paystack after a payment." action={<Button to="/dashboard">Go to dashboard</Button>} />
  } else if (error) {
    body = <State icon={AlertCircle} tone="coral" title="We couldn’t check this payment" text={error} action={<Button onClick={() => window.location.reload()} icon={RotateCcw}>Try again</Button>} reference={reference} />
  } else if (!result) {
    body = (
      <LoadingRegion label="Confirming your payment">
        <div className="card px-6 py-12 text-center">
          <Skeleton className="mx-auto h-16 w-16 rounded-full" />
          <p className="mt-6 font-semibold">Confirming your payment with Paystack…</p>
          <p className="mt-1 text-sm text-navy-500">This usually takes a few seconds.</p>
        </div>
      </LoadingRegion>
    )
  } else if (result.status === 'succeeded') {
    body = (
      <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, ease }} className="card px-6 py-12 text-center sm:px-12">
        <SuccessMark />
        <h1 className="mt-6 text-3xl font-bold">{isSession ? 'You’re booked!' : 'Your plan is active'}</h1>
        <p className="mx-auto mt-3 max-w-md text-navy-600">
          {isSession && booking
            ? <>{booking.subject}{tutorName ? ` with ${tutorName}` : ''} on <strong className="text-navy-900">{dateLong(booking.starts_at)}</strong> at <strong className="text-navy-900">{time(booking.starts_at)}</strong>.</>
            : isSession ? 'Paystack confirmed your payment and your session is booked.' : 'Paystack confirmed your payment. Your benefits apply right away.'}
        </p>
        {booking?.amount_paid != null && <p className="mt-2 text-sm text-navy-400">{money(booking.amount_paid)} paid · Ref {reference}</p>}
        <div className="mt-8 flex justify-center"><Button to={doneTo} iconRight={ArrowRight}>{isSession ? 'View my sessions' : 'View subscription'}</Button></div>
      </motion.div>
    )
  } else if (result.status === 'refund_pending') {
    body = <State icon={AlertCircle} tone="amber" title="Payment received, but the slot was taken" text={`${result.reason || 'Someone else booked this time while you were paying'}. We’ll refund you in full; you’ll see it under Billing.`} action={<Button to="/tutors">Choose another time</Button>} reference={reference} />
  } else if (result.status === 'pending') {
    body = <State icon={Hourglass} tone="amber" title="Payment is still processing" text="Paystack hasn’t confirmed this payment yet (bank transfers and USSD can take a few minutes). We’ll keep checking, and you’ll get a notification when it’s confirmed." action={<Button variant="secondary" to={doneTo}>Continue</Button>} reference={reference} spinning={polls.current < MAX_POLLS} />
  } else if (result.status === 'abandoned') {
    body = <State icon={XCircle} tone="neutral" title="Payment not completed" text="The Paystack checkout was closed before paying. You haven’t been charged." action={<Button to={retryTo} icon={RotateCcw}>Try again</Button>} reference={reference} />
  } else {
    body = <State icon={XCircle} tone="coral" title="Payment failed" text={`${result.reason || 'Your payment was declined'}. You haven’t been charged for this booking.`} action={<Button to={retryTo} icon={RotateCcw}>Try again</Button>} reference={reference} />
  }

  return (
    <PublicLayout footer={false}>
      <PageTransition className="container-page max-w-2xl pt-28 pb-24">{body}</PageTransition>
    </PublicLayout>
  )
}

const TONES = { coral: 'bg-coral-50 text-coral-600', amber: 'bg-amber-400/15 text-[#8a5a00]', neutral: 'bg-cream-200 text-navy-700' }

function State({ icon: Icon, tone, title, text, action, reference, spinning }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease }} className="card px-6 py-12 text-center sm:px-12" role="status">
      <motion.span
        className={`mx-auto grid h-16 w-16 place-items-center rounded-2xl ${TONES[tone]}`}
        animate={spinning ? { rotate: [0, 180, 180, 360] } : {}}
        transition={spinning ? { duration: 2.4, repeat: Infinity, ease: 'easeInOut' } : {}}
      >
        <Icon className="h-8 w-8" aria-hidden />
      </motion.span>
      <h1 className="mt-6 text-2xl font-bold sm:text-3xl">{title}</h1>
      <p className="mx-auto mt-3 max-w-md text-navy-600">{text}</p>
      {reference && <p className="mt-2 text-xs text-navy-400">Reference {reference}</p>}
      {action && <div className="mt-8 flex justify-center">{action}</div>}
    </motion.div>
  )
}
