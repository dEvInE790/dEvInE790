import { useState } from 'react'
import { motion } from 'motion/react'
import { BadgeCheck, EyeOff, Flag, History, RotateCcw, Search, ShieldAlert, Undo2 } from 'lucide-react'
import { PageHeader } from '../../components/layout/DashboardLayout'
import { CATEGORIES } from '../../components/Reviews'
import { Stars } from '../../components/ui/StarRating'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import Tabs from '../../components/ui/Tabs'
import { Input, Textarea } from '../../components/ui/Field'
import EmptyState, { ErrorState } from '../../components/ui/EmptyState'
import Skeleton from '../../components/ui/Skeleton'
import useAsync from '../../lib/useAsync'
import { adminListReviews, adminModerateReview, adminReviewLog } from '../../lib/api'
import { dateLong, dateShort } from '../../lib/format'
import { useToast } from '../../context/ToastContext'
import { fadeUp } from '../../motion/variants'

const ACTIONS = {
  hide: ['Hide review', 'Hidden reviews disappear from the tutor’s profile and rating. The tutor sees your reason.', 'danger'],
  restore: ['Restore review', 'The review goes back on the profile and counts towards the rating again.', 'primary'],
  dismiss_reports: ['Dismiss reports', 'Close the open reports and keep the review published.', 'primary'],
  remove_response: ['Remove tutor reply', 'Deletes the tutor’s public reply. The tutor can write a new one.', 'danger'],
}

export default function Reviews() {
  const toast = useToast()
  const [filter, setFilter] = useState('reported')
  const [search, setSearch] = useState('')
  const reviews = useAsync(() => adminListReviews(filter === 'log' ? 'all' : filter, search), [filter, search], { enabled: filter !== 'log' })
  const log = useAsync(() => adminReviewLog(), [filter], { enabled: filter === 'log' })
  const [action, setAction] = useState(null)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)

  const run = async () => {
    setBusy(true)
    try {
      await adminModerateReview(action.review.id, action.kind, reason)
      toast.success('Done. The action is recorded in the moderation log.')
      setAction(null)
      reviews.reload({ silent: true })
    } catch (e) {
      toast.error(e.message)
    }
    setBusy(false)
  }

  return (
    <>
      <PageHeader title="Reviews" subtitle="Investigate reports, hide reviews that break the rules, restore them, and watch for suspicious rating patterns. Every action is logged." />
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={filter} onChange={setFilter} tabs={[{ value: 'reported', label: 'Reported' }, { value: 'flagged', label: 'Flagged' }, { value: 'hidden', label: 'Hidden' }, { value: 'all', label: 'All' }, { value: 'log', label: 'Moderation log' }]} />
        {filter !== 'log' && <Input icon={Search} aria-label="Search reviews" placeholder="Tutor, reviewer or text" value={search} onChange={(e) => setSearch(e.target.value)} className="sm:w-72" />}
      </div>

      {filter === 'log' ? (
        log.loading ? <Skeleton className="h-40 rounded-3xl" /> : !log.data?.length ? <div className="card"><EmptyState icon={History} title="No moderation actions yet" /></div> : (
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[40rem] text-sm">
              <thead><tr className="border-b border-navy-900/[0.06] text-left text-navy-500"><th className="px-4 py-3">When</th><th className="px-4 py-3">Admin</th><th className="px-4 py-3">Action</th><th className="px-4 py-3">Tutor</th><th className="px-4 py-3">Reason</th></tr></thead>
              <tbody>{log.data.map((l) => <tr key={l.id} className="border-b border-navy-900/[0.04]"><td className="px-4 py-3">{dateShort(l.created_at)}</td><td className="px-4 py-3">{l.admin_name}</td><td className="px-4 py-3 font-medium">{l.action.replace('_', ' ')}</td><td className="px-4 py-3">{l.tutor_name ?? '—'}</td><td className="px-4 py-3 text-navy-600">{l.reason || '—'}</td></tr>)}</tbody>
            </table>
          </div>
        )
      ) : reviews.error ? <ErrorState message={reviews.error} onRetry={reviews.reload} /> : reviews.loading ? <Skeleton className="h-40 rounded-3xl" /> : !reviews.data.length ? (
        <div className="card"><EmptyState icon={ShieldAlert} title={filter === 'reported' ? 'No open reports' : filter === 'flagged' ? 'No suspicious patterns' : 'No reviews'}>Nothing needs your attention here.</EmptyState></div>
      ) : (
        <ul className="space-y-4">
          {reviews.data.map((r) => (
            <motion.li key={r.id} variants={fadeUp} initial="hidden" animate="show" className="card p-5" data-testid="admin-review">
              <div className="flex flex-wrap items-center gap-2">
                <Stars value={r.rating} size={15} />
                <p className="font-semibold">{r.author_name} <span className="font-normal text-navy-400">→</span> {r.tutor_name}</p>
                <span className="text-xs text-navy-400">{r.subject} · {dateLong(r.created_at)}</span>
                {r.verified && <Badge tone="mint" icon={BadgeCheck}>Verified</Badge>}
                {r.status === 'hidden' && <Badge tone="coral" icon={EyeOff}>Hidden</Badge>}
                {r.open_reports > 0 && <Badge tone="amber" icon={Flag}>{r.open_reports} report{r.open_reports > 1 ? 's' : ''}</Badge>}
              </div>
              {r.comment && <p className="mt-2 text-navy-700">“{r.comment}”</p>}
              <p className="mt-2 flex flex-wrap gap-x-4 text-xs text-navy-500">{CATEGORIES.map(([k, l]) => r[k] != null && <span key={k}>{l}: <strong>{r[k]}</strong></span>)}</p>
              {r.response && <p className="mt-2 rounded-xl bg-mint-50/60 p-3 text-sm"><strong>Tutor reply:</strong> {r.response}</p>}
              {r.status === 'hidden' && <p className="mt-2 text-sm text-coral-700">Hidden: {r.hidden_reason}</p>}
              {(r.report_reasons.length > 0 || r.signals.length > 0) && (
                <ul className="mt-3 space-y-1 rounded-xl bg-amber-400/10 p-3 text-xs text-[#6b4700]">
                  {r.report_reasons.map((x, i) => <li key={'r' + i}>Report: {x.replace(/_/g, ' ')}</li>)}
                  {r.signals.map((x, i) => <li key={'s' + i}>Signal: {x}</li>)}
                </ul>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                {r.status === 'published'
                  ? <Button size="sm" variant="danger" icon={EyeOff} onClick={() => { setAction({ kind: 'hide', review: r }); setReason('') }}>Hide</Button>
                  : <Button size="sm" icon={Undo2} onClick={() => { setAction({ kind: 'restore', review: r }); setReason('') }}>Restore</Button>}
                {r.open_reports > 0 && r.status === 'published' && <Button size="sm" variant="secondary" icon={RotateCcw} onClick={() => { setAction({ kind: 'dismiss_reports', review: r }); setReason('') }}>Dismiss reports</Button>}
                {r.response && <Button size="sm" variant="ghost" onClick={() => { setAction({ kind: 'remove_response', review: r }); setReason('') }}>Remove tutor reply</Button>}
              </div>
            </motion.li>
          ))}
        </ul>
      )}

      <Modal open={!!action} onClose={() => setAction(null)} title={action ? ACTIONS[action.kind][0] : ''} description={action ? ACTIONS[action.kind][1] : ''} size="sm">
        <Textarea label={action?.kind === 'hide' ? 'Reason (shown to the tutor)' : 'Note for the log (optional)'} rows={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />
        <Button className="mt-5 w-full" variant={action ? ACTIONS[action.kind][2] : 'primary'} loading={busy} onClick={run}>{action ? ACTIONS[action.kind][0] : ''}</Button>
      </Modal>
    </>
  )
}
