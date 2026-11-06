import { useState } from 'react'
import { motion } from 'motion/react'
import { BadgeCheck, Flag, MessageSquareReply, Star } from 'lucide-react'
import Avatar from './ui/Avatar'
import Button from './ui/Button'
import Modal from './ui/Modal'
import { Select, Textarea } from './ui/Field'
import { RatingInput, Stars } from './ui/StarRating'
import { reportReview } from '../lib/api'
import { dateLong } from '../lib/format'
import { useToast } from '../context/ToastContext'
import { fadeUp, spring } from '../motion/variants'

export const CATEGORIES = [
  ['teaching', 'Teaching quality'],
  ['communication', 'Communication'],
  ['punctuality', 'Punctuality'],
  ['knowledge', 'Subject knowledge'],
]

export const REPORT_REASONS = [
  ['fake', 'Looks fake or not from a real lesson'],
  ['offensive', 'Offensive or abusive'],
  ['personal_info', 'Shares personal information'],
  ['not_about_tutor', 'Not about this tutor or lesson'],
  ['conflict_of_interest', 'Conflict of interest'],
  ['other', 'Something else'],
]

/** Overall stars plus the four category ratings. */
export function ReviewFields({ value, onChange }) {
  const set = (k) => (v) => onChange({ ...value, [k]: v })
  return (
    <div>
      <p className="text-sm font-semibold text-navy-800">Overall</p>
      <RatingInput value={value.rating} onChange={set('rating')} />
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {CATEGORIES.map(([k, label]) => (
          <div key={k} className="rounded-2xl bg-cream-100 p-3">
            <p className="text-xs font-semibold text-navy-600">{label}</p>
            <SmallRating label={label} value={value[k]} onChange={set(k)} />
          </div>
        ))}
      </div>
    </div>
  )
}

function SmallRating({ label, value, onChange }) {
  const [hover, setHover] = useState(0)
  const shown = hover || value
  return (
    <div className="mt-1 flex gap-0.5" role="radiogroup" aria-label={label} onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((i) => (
        <motion.button key={i} type="button" role="radio" aria-checked={value === i} aria-label={`${label}: ${i} star${i > 1 ? 's' : ''}`}
          onMouseEnter={() => setHover(i)} onClick={() => onChange(i)} whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }} className="rounded p-0.5">
          <Star className={`h-6 w-6 transition-colors ${i <= shown ? 'text-amber-400' : 'text-navy-200'}`} fill="currentColor" strokeWidth={0} />
        </motion.button>
      ))}
    </div>
  )
}

const Bar = ({ label, value, max = 5, right }) => (
  <div className="flex items-center gap-3 text-sm">
    <span className="w-32 shrink-0 text-navy-600">{label}</span>
    <span className="h-2 flex-1 overflow-hidden rounded-full bg-navy-900/[0.06]">
      <motion.span className="block h-full rounded-full bg-amber-400" initial={{ width: 0 }} whileInView={{ width: `${Math.min(100, ((value || 0) / max) * 100)}%` }}
        viewport={{ once: true }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }} />
    </span>
    <span className="w-10 text-right font-semibold tabular-nums">{right ?? (value ? Number(value).toFixed(1) : '–')}</span>
  </div>
)

/** Rating summary for a tutor profile. */
export function ReviewSummary({ summary }) {
  if (!summary?.count) return null
  const avg = Number(summary.average) || 0
  return (
    <div className="grid gap-6 rounded-3xl bg-cream-100 p-5 sm:grid-cols-[auto_1fr] sm:p-6" data-testid="review-summary">
      <div className="text-center sm:pr-6 sm:text-left">
        <p className="font-display text-5xl font-bold">{avg.toFixed(1)}</p>
        <Stars value={avg} size={18} className="mt-1" />
        <p className="mt-2 text-sm text-navy-500">{summary.count} verified review{summary.count === 1 ? '' : 's'}</p>
        <p className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-mint-700"><BadgeCheck className="h-3.5 w-3.5" />From paid, completed lessons</p>
      </div>
      <div className="space-y-2">
        {CATEGORIES.map(([k, label]) => <Bar key={k} label={label} value={summary[k]} />)}
        <div className="mt-3 space-y-1.5 border-t border-navy-900/[0.06] pt-3">
          {[5, 4, 3, 2, 1].map((n) => <Bar key={n} label={`${n} star${n > 1 ? 's' : ''}`} value={summary.distribution?.[n] ?? 0} max={summary.count} right={summary.distribution?.[n] ?? 0} />)}
        </div>
      </div>
    </div>
  )
}

/** One review with category scores, verified badge and the tutor's reply. */
export function ReviewCard({ review: r, tutorName, canReport = false }) {
  const toast = useToast()
  const [reporting, setReporting] = useState(false)
  const [reason, setReason] = useState('fake')
  const [details, setDetails] = useState('')
  const [busy, setBusy] = useState(false)
  const send = async () => {
    setBusy(true)
    try {
      await reportReview(r.id, reason, details)
      toast.success('Thanks. Our team will look at this review.')
      setReporting(false)
    } catch (e) {
      toast.error(e.message)
    }
    setBusy(false)
  }
  return (
    <motion.li variants={fadeUp} className="card p-5" data-testid="review-card">
      <div className="flex items-start gap-3">
        <Avatar name={r.author_name} seed={r.id} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="font-semibold">{r.author_name}</p>
            {r.verified && <span className="inline-flex items-center gap-1 rounded-full bg-mint-50 px-2 py-0.5 text-[0.7rem] font-semibold text-mint-700"><BadgeCheck className="h-3 w-3" />Verified lesson</span>}
            <span className="text-xs text-navy-400">{r.subject} · {dateLong(r.created_at)}</span>
          </div>
          <Stars value={r.rating} size={15} className="mt-1" />
        </div>
        {canReport && (
          <button type="button" onClick={() => setReporting(true)} className="rounded-lg p-1.5 text-navy-300 transition-colors hover:bg-coral-50 hover:text-coral-600" aria-label="Report this review">
            <Flag className="h-4 w-4" />
          </button>
        )}
      </div>
      {r.comment && <p className="mt-3 text-navy-700">“{r.comment}”</p>}
      {r.teaching != null && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {CATEGORIES.map(([k, label]) => (
            <span key={k} className="inline-flex items-center gap-1 rounded-full bg-cream-100 px-2.5 py-1 text-xs text-navy-600">
              {label} <strong className="text-navy-900">{r[k]}</strong><Star className="h-3 w-3 fill-amber-400 text-amber-400" />
            </span>
          ))}
        </div>
      )}
      {r.response && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={spring} className="mt-4 rounded-2xl border-l-4 border-mint-400 bg-mint-50/60 p-3.5">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-mint-800"><MessageSquareReply className="h-3.5 w-3.5" />Response from {tutorName ?? 'the tutor'}</p>
          <p className="mt-1 text-sm text-navy-700">{r.response}</p>
        </motion.div>
      )}
      <Modal open={reporting} onClose={() => setReporting(false)} title="Report this review" description="Reports go to TutorHaven’s moderation team. The reviewer isn’t told who reported it." size="sm">
        <Select label="Reason" value={reason} onChange={(e) => setReason(e.target.value)}>
          {REPORT_REASONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </Select>
        <Textarea className="mt-4" label="Details (optional)" rows={3} maxLength={1000} value={details} onChange={(e) => setDetails(e.target.value)} />
        <Button className="mt-5 w-full" variant="danger" loading={busy} onClick={send}>Send report</Button>
      </Modal>
    </motion.li>
  )
}
