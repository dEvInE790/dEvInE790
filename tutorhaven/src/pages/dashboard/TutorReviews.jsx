import { useState } from 'react'
import { motion } from 'motion/react'
import { EyeOff, Flag, MessageSquareQuote, MessageSquareReply } from 'lucide-react'
import { PageHeader } from '../../components/layout/DashboardLayout'
import { CATEGORIES, REPORT_REASONS, ReviewSummary } from '../../components/Reviews'
import { Stars } from '../../components/ui/StarRating'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import { Select, Textarea } from '../../components/ui/Field'
import EmptyState, { ErrorState } from '../../components/ui/EmptyState'
import Skeleton from '../../components/ui/Skeleton'
import { Stagger } from '../../motion/Reveal'
import useAsync from '../../lib/useAsync'
import { deleteReviewResponse, getMyTutorReviews, getTutorReviewSummary, reportReview, respondToReview } from '../../lib/api'
import { dateLong } from '../../lib/format'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { fadeUp } from '../../motion/variants'

export default function TutorReviews() {
  const { profile } = useAuth()
  const toast = useToast()
  const reviews = useAsync(() => getMyTutorReviews(), [])
  const summary = useAsync(() => getTutorReviewSummary(profile.id), [profile.id])
  const [replying, setReplying] = useState(null)
  const [reply, setReply] = useState('')
  const [reporting, setReporting] = useState(null)
  const [reason, setReason] = useState('fake')
  const [details, setDetails] = useState('')
  const [busy, setBusy] = useState(false)

  const act = async (fn, done) => {
    setBusy(true)
    try {
      await fn()
      toast.success(done)
      setReplying(null)
      setReporting(null)
      reviews.reload({ silent: true })
    } catch (e) {
      toast.error(e.message)
    }
    setBusy(false)
  }

  return (
    <>
      <PageHeader title="Reviews" subtitle="Verified reviews from learners who completed paid lessons with you. You can reply publicly, or report a review that breaks our rules." />
      {summary.data?.count > 0 && <div className="mb-6"><ReviewSummary summary={summary.data} /></div>}
      {reviews.error ? <ErrorState message={reviews.error} onRetry={reviews.reload} /> : reviews.loading ? <Skeleton className="h-40 rounded-3xl" /> : !reviews.data.length ? (
        <div className="card"><EmptyState icon={MessageSquareQuote} title="No reviews yet">Learners are invited to review after you mark a paid lesson complete.</EmptyState></div>
      ) : (
        <Stagger as="ul" className="space-y-4" gap={0.05}>
          {reviews.data.map((r) => (
            <motion.li key={r.id} variants={fadeUp} className="card p-5" data-testid="tutor-review">
              <div className="flex flex-wrap items-center gap-2">
                <Stars value={r.rating} size={15} />
                <p className="font-semibold">{r.author_name}</p>
                <span className="text-xs text-navy-400">{r.subject} · {dateLong(r.created_at)}</span>
                {r.status === 'hidden' && <Badge tone="coral" icon={EyeOff}>Hidden by TutorHaven</Badge>}
                {r.reported && <Badge tone="amber" icon={Flag}>You reported this</Badge>}
              </div>
              {r.comment && <p className="mt-2 text-navy-700">“{r.comment}”</p>}
              <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-navy-500">{CATEGORIES.map(([k, l]) => r[k] != null && <span key={k}>{l}: <strong>{r[k]}</strong>/5</span>)}</p>
              {r.status === 'hidden' && <p className="mt-2 rounded-xl bg-coral-50 p-3 text-sm text-coral-700">Reason: {r.hidden_reason}</p>}
              {r.response && <div className="mt-3 rounded-2xl border-l-4 border-mint-400 bg-mint-50/60 p-3 text-sm"><p className="text-xs font-semibold text-mint-800">Your reply</p>{r.response}</div>}
              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" icon={MessageSquareReply} onClick={() => { setReplying(r); setReply(r.response ?? '') }}>{r.response ? 'Edit reply' : 'Reply'}</Button>
                {r.response && <Button size="sm" variant="ghost" loading={busy} onClick={() => act(() => deleteReviewResponse(r.id), 'Reply removed')}>Remove reply</Button>}
                {!r.reported && r.status === 'published' && <Button size="sm" variant="ghost" icon={Flag} className="text-coral-600" onClick={() => { setReporting(r); setReason('fake'); setDetails('') }}>Report</Button>}
              </div>
            </motion.li>
          ))}
        </Stagger>
      )}

      <Modal open={!!replying} onClose={() => setReplying(null)} title="Reply to this review" description="Your reply is shown publicly under the review. Keep it professional; you can’t change the learner’s review.">
        <Textarea rows={5} maxLength={1500} value={reply} onChange={(e) => setReply(e.target.value)} aria-label="Your reply" />
        <Button className="mt-4 w-full" loading={busy} disabled={reply.trim().length < 2} onClick={() => act(() => respondToReview(replying.id, reply), 'Reply published')}>Publish reply</Button>
      </Modal>
      <Modal open={!!reporting} onClose={() => setReporting(null)} title="Report this review" description="Our moderators check reports. Reviews are hidden only if they break our rules." size="sm">
        <Select label="Reason" value={reason} onChange={(e) => setReason(e.target.value)}>{REPORT_REASONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select>
        <Textarea className="mt-4" label="Details" rows={3} maxLength={1000} value={details} onChange={(e) => setDetails(e.target.value)} />
        <Button className="mt-5 w-full" variant="danger" loading={busy} onClick={() => act(() => reportReview(reporting.id, reason, details), 'Report sent to our moderators')}>Send report</Button>
      </Modal>
    </>
  )
}
