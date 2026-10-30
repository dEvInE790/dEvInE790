import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { CalendarPlus, CheckCheck, Clock, CreditCard, Star, X } from 'lucide-react'
import Avatar from './ui/Avatar'
import Button from './ui/Button'
import Modal from './ui/Modal'
import { StatusBadge } from './ui/Badge'
import { RatingInput } from './ui/StarRating'
import { Textarea } from './ui/Field'
import { setBookingStatus, submitReview } from '../lib/api'
import { HOLD_MINUTES } from '../lib/constants'
import { money, relativeFromNow, time } from '../lib/format'
import { icsForBooking } from '../lib/time'
import { useToast } from '../context/ToastContext'
import { fadeUp } from '../motion/variants'

const reviewOf = (b) => (Array.isArray(b.review) ? b.review[0] : b.review)

export default function SessionItem({ booking: b, me, onChange, compact = false }) {
  const toast = useToast()
  const [confirm, setConfirm] = useState(null)
  const [busy, setBusy] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')

  const start = new Date(b.starts_at)
  const isTutor = b.tutor_id === me.id
  const future = start > new Date()
  const tutorName = b.tutor?.profile?.full_name ?? 'Tutor'
  const studentName = b.student?.full_name ?? 'Student'
  const forChild = !isTutor && b.student_id !== me.id
  const holdExpired = b.status === 'pending_payment' && new Date(b.created_at).getTime() + HOLD_MINUTES * 60000 < Date.now()
  const review = reviewOf(b)

  const canPay = b.status === 'pending_payment' && b.booked_by === me.id && !holdExpired
  const canCancel = (b.status === 'confirmed' || b.status === 'pending_payment') && future && !holdExpired
  const canComplete = isTutor && b.status === 'confirmed' && !future
  const canReview = !isTutor && b.status === 'completed' && (b.student_id === me.id || b.booked_by === me.id)
  const ics = useMemo(() => (b.status === 'confirmed' && future ? icsForBooking({ ...b, withName: isTutor ? studentName : tutorName }) : null), [b, future, isTutor, studentName, tutorName])

  const run = async (status) => {
    setBusy(true)
    try {
      const updated = await setBookingStatus(b.id, status)
      onChange?.({ ...b, ...updated })
      toast.success(status === 'completed' ? 'Session marked as complete' : 'Session cancelled' + (b.status === 'confirmed' ? '. A refund has been issued.' : ''))
      setConfirm(null)
    } catch (e) {
      toast.error(e.message)
    } finally {
      setBusy(false)
    }
  }

  const sendReview = async () => {
    setBusy(true)
    try {
      const r = await submitReview(b.id, rating, comment)
      onChange?.({ ...b, review: { id: r.id, rating: r.rating } })
      toast.success('Thanks! Your review helps other learners.')
      setReviewOpen(false)
    } catch (e) {
      toast.error(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <motion.li layout variants={fadeUp} className="card p-4 sm:p-5">
      <div className="flex gap-4">
        <div className={`flex w-14 shrink-0 flex-col items-center justify-center rounded-2xl py-2 ${future && b.status === 'confirmed' ? 'bg-navy-900 text-white' : 'bg-cream-200 text-navy-800'}`}>
          <span className={`text-[0.65rem] font-bold uppercase ${future && b.status === 'confirmed' ? 'text-mint-300' : 'text-navy-400'}`}>{start.toLocaleDateString(undefined, { month: 'short' })}</span>
          <span className="font-display text-xl leading-tight font-bold">{start.getDate()}</span>
          <span className="text-[0.65rem] opacity-70">{start.toLocaleDateString(undefined, { weekday: 'short' })}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate font-semibold">{b.subject}</h3>
            <StatusBadge status={holdExpired ? 'cancelled' : b.status} />
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-sm text-navy-500">
            <Avatar name={isTutor ? studentName : tutorName} seed={isTutor ? b.student_id : b.tutor_id} size="xs" />
            <p className="min-w-0">
              {isTutor ? <>with {studentName}</> : <>with <Link to={`/tutors/${b.tutor_id}`} className="font-medium text-navy-700 hover:underline">{tutorName}</Link>{forChild && <> · for {studentName}</>}</>}
            </p>
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 text-sm text-navy-500">
            <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{time(b.starts_at)} – {time(b.ends_at)}</span>
            {future && b.status === 'confirmed' && <span className="font-medium text-mint-700">{relativeFromNow(b.starts_at)}</span>}
            {!compact && <span>{money(b.amount_paid ?? b.price)}</span>}
          </p>
          {!compact && b.notes && <p className="mt-2 line-clamp-2 rounded-xl bg-cream-100 px-3 py-2 text-sm text-navy-600">“{b.notes}”</p>}
        </div>
      </div>

      {(canPay || canCancel || canComplete || canReview || ics) && (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-navy-900/[0.06] pt-4">
          {canPay && <Button size="sm" to={`/checkout/${b.id}`} icon={CreditCard}>Pay now</Button>}
          {canComplete && <Button size="sm" variant="mint" icon={CheckCheck} onClick={() => setConfirm('completed')}>Mark complete</Button>}
          {canReview && (review
            ? <span className="flex items-center gap-1 rounded-xl bg-amber-400/15 px-3 py-2 text-xs font-semibold text-[#8a5a00]"><Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />You rated {review.rating}/5</span>
            : <Button size="sm" variant="mint" icon={Star} onClick={() => setReviewOpen(true)}>Leave a review</Button>)}
          {ics && <Button size="sm" variant="secondary" icon={CalendarPlus} href={ics} download="tutorhaven-session.ics">Add to calendar</Button>}
          {canCancel && <Button size="sm" variant="ghost" icon={X} onClick={() => setConfirm('cancelled')} className="ml-auto text-coral-600 hover:bg-coral-50">Cancel</Button>}
        </div>
      )}

      <Modal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title={confirm === 'completed' ? 'Mark this session complete?' : 'Cancel this session?'}
        description={confirm === 'completed' ? 'The learner will be invited to leave a review.' : b.status === 'confirmed' ? 'Payment will be refunded in full.' : 'This releases the time slot.'}
        size="sm"
      >
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={() => setConfirm(null)}>Keep it</Button>
          <Button variant={confirm === 'completed' ? 'primary' : 'danger'} className="flex-1" loading={busy} onClick={() => run(confirm)}>
            {confirm === 'completed' ? 'Mark complete' : 'Cancel session'}
          </Button>
        </div>
      </Modal>

      <Modal open={reviewOpen} onClose={() => setReviewOpen(false)} title={`How was ${b.subject} with ${tutorName.split(' ')[0]}?`} size="sm">
        <RatingInput value={rating} onChange={setRating} />
        <Textarea className="mt-4" rows={4} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="What went well? What could be better?" maxLength={2000} aria-label="Review" />
        <Button className="mt-5 w-full" loading={busy} onClick={sendReview}>Submit review</Button>
      </Modal>
    </motion.li>
  )
}
