import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { CalendarPlus, CheckCheck, ClipboardPen, Clock, CreditCard, NotebookText, Star, X } from 'lucide-react'
import Avatar from './ui/Avatar'
import Button from './ui/Button'
import Modal from './ui/Modal'
import { StatusBadge } from './ui/Badge'
import { Input, Textarea } from './ui/Field'
import { ReviewFields } from './Reviews'
import { saveLessonFeedback, setBookingStatus, submitReview } from '../lib/api'
import { HOLD_MINUTES } from '../lib/constants'
import { money, relativeFromNow, time } from '../lib/format'
import { icsForBooking } from '../lib/time'
import { useToast } from '../context/ToastContext'
import { fadeUp } from '../motion/variants'

const reviewOf = (b) => (Array.isArray(b.review) ? b.review[0] : b.review)
const feedbackOf = (b) => (Array.isArray(b.feedback) ? b.feedback[0] : b.feedback)
const EMPTY_REVIEW = { rating: 0, teaching: 0, communication: 0, punctuality: 0, knowledge: 0 }

export default function SessionItem({ booking: b, me, onChange, compact = false }) {
  const toast = useToast()
  const [confirm, setConfirm] = useState(null)
  const [busy, setBusy] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [stars, setStars] = useState(EMPTY_REVIEW)
  const [comment, setComment] = useState('')
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [showFeedback, setShowFeedback] = useState(false)
  const [fb, setFb] = useState(null)

  const start = new Date(b.starts_at)
  const isTutor = b.tutor_id === me.id
  const future = start > new Date()
  const tutorName = b.tutor?.profile?.full_name ?? 'Tutor'
  const studentName = b.student?.full_name ?? 'Student'
  const forChild = !isTutor && b.student_id !== me.id
  const holdExpired = b.status === 'pending_payment' && new Date(b.created_at).getTime() + HOLD_MINUTES * 60000 < Date.now()
  const review = reviewOf(b)
  const feedback = feedbackOf(b)
  const canFeedback = isTutor && b.status === 'completed'

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
      toast.success(status === 'completed' ? 'Session marked as complete' : 'Session cancelled' + (b.status === 'confirmed' ? '. Your full refund is being processed.' : ''))
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
      if (Object.values(stars).some((v) => !v)) throw new Error('Please rate every category from 1 to 5 stars.')
      const r = await submitReview(b.id, { ...stars, comment })
      onChange?.({ ...b, review: { id: r.id, rating: r.rating } })
      toast.success('Thanks! Your review helps other learners.')
      setReviewOpen(false)
    } catch (e) {
      toast.error(e.message)
    } finally {
      setBusy(false)
    }
  }

  const openFeedback = () => {
    setFb({ summary: feedback?.summary ?? '', strengths: feedback?.strengths ?? '', improvements: feedback?.improvements ?? '', nextSteps: feedback?.next_steps ?? '', progress: feedback?.progress ?? 3 })
    setFeedbackOpen(true)
  }
  const sendFeedback = async () => {
    setBusy(true)
    try {
      const f = await saveLessonFeedback(b.id, fb)
      onChange?.({ ...b, feedback: f })
      toast.success(feedback ? 'Feedback updated' : 'Feedback shared with the learner and their parents')
      setFeedbackOpen(false)
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

      {!isTutor && feedback && showFeedback && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-4 space-y-2 rounded-2xl bg-mint-50/60 p-4 text-sm" data-testid="lesson-feedback">
          <p className="font-semibold text-mint-800">Feedback from {tutorName.split(' ')[0]}</p>
          <p className="text-navy-700">{feedback.summary}</p>
          {feedback.strengths && <p><strong className="text-navy-900">Strengths:</strong> {feedback.strengths}</p>}
          {feedback.improvements && <p><strong className="text-navy-900">To work on:</strong> {feedback.improvements}</p>}
          {feedback.next_steps && <p><strong className="text-navy-900">Next steps:</strong> {feedback.next_steps}</p>}
        </motion.div>
      )}

      {(canPay || canCancel || canComplete || canReview || ics || canFeedback || feedback) && (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-navy-900/[0.06] pt-4">
          {canPay && <Button size="sm" to={`/checkout/${b.id}`} icon={CreditCard}>Pay now</Button>}
          {canComplete && <Button size="sm" variant="mint" icon={CheckCheck} onClick={() => setConfirm('completed')}>Mark complete</Button>}
          {canReview && (review
            ? <span className="flex items-center gap-1 rounded-xl bg-amber-400/15 px-3 py-2 text-xs font-semibold text-[#8a5a00]"><Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />You rated {review.rating}/5</span>
            : <Button size="sm" variant="mint" icon={Star} onClick={() => setReviewOpen(true)}>Leave a review</Button>)}
          {canFeedback && <Button size="sm" variant={feedback ? 'secondary' : 'mint'} icon={ClipboardPen} onClick={openFeedback}>{feedback ? 'Edit feedback' : 'Add lesson feedback'}</Button>}
          {!isTutor && feedback && <Button size="sm" variant="secondary" icon={NotebookText} onClick={() => setShowFeedback((v) => !v)}>{showFeedback ? 'Hide feedback' : 'Tutor feedback'}</Button>}
          {ics && <Button size="sm" variant="secondary" icon={CalendarPlus} href={ics} download="tutorhaven-session.ics">Add to calendar</Button>}
          {canCancel && <Button size="sm" variant="ghost" icon={X} onClick={() => setConfirm('cancelled')} className="ml-auto text-coral-600 hover:bg-coral-50">Cancel</Button>}
        </div>
      )}

      <Modal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title={confirm === 'completed' ? 'Mark this session complete?' : 'Cancel this session?'}
        description={confirm === 'completed' ? 'The learner will be invited to leave a review.' : b.status === 'confirmed' ? 'You’ll get a full refund to your original payment method.' : 'This releases the time slot.'}
        size="sm"
      >
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={() => setConfirm(null)}>Keep it</Button>
          <Button variant={confirm === 'completed' ? 'primary' : 'danger'} className="flex-1" loading={busy} onClick={() => run(confirm)}>
            {confirm === 'completed' ? 'Mark complete' : 'Cancel session'}
          </Button>
        </div>
      </Modal>

      <Modal open={reviewOpen} onClose={() => setReviewOpen(false)} title={`How was ${b.subject} with ${tutorName.split(' ')[0]}?`} description="Your review is published with your first name and a verified-lesson badge. It can’t be changed after you submit it.">
        <ReviewFields value={stars} onChange={setStars} />
        <Textarea className="mt-4" rows={4} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="What went well? What could be better?" maxLength={2000} aria-label="Written feedback" />
        <Button className="mt-5 w-full" loading={busy} onClick={sendReview}>Submit review</Button>
      </Modal>

      {fb && (
        <Modal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} title={`Lesson feedback for ${studentName.split(' ')[0]}`} description="Shared with the learner and their parents. It feeds their progress page and monthly report.">
          <div className="space-y-4">
            <Textarea label="What did you cover?" rows={3} maxLength={2000} value={fb.summary} onChange={(e) => setFb({ ...fb, summary: e.target.value })} />
            <Input label="Strengths" maxLength={1000} value={fb.strengths} onChange={(e) => setFb({ ...fb, strengths: e.target.value })} />
            <Input label="Areas to work on" maxLength={1000} value={fb.improvements} onChange={(e) => setFb({ ...fb, improvements: e.target.value })} />
            <Input label="Next steps / homework" maxLength={1000} value={fb.nextSteps} onChange={(e) => setFb({ ...fb, nextSteps: e.target.value })} />
            <div>
              <p className="mb-1.5 text-sm font-medium text-navy-800">Progress this lesson</p>
              <div className="flex gap-2" role="radiogroup" aria-label="Progress">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} type="button" role="radio" aria-checked={fb.progress === n} onClick={() => setFb({ ...fb, progress: n })}
                    className={`h-10 flex-1 rounded-xl border text-sm font-semibold transition-colors ${fb.progress === n ? 'border-navy-900 bg-navy-900 text-white' : 'border-navy-900/12 bg-white text-navy-600'}`}>{n}</button>
                ))}
              </div>
              <p className="mt-1 text-xs text-navy-400">1 = struggling, 5 = excellent progress</p>
            </div>
          </div>
          <Button className="mt-5 w-full" loading={busy} onClick={sendFeedback}>Save feedback</Button>
        </Modal>
      )}
    </motion.li>
  )
}
