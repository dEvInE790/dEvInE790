import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { Check, ExternalLink, FileCheck2, X } from 'lucide-react'
import { PageHeader } from '../../components/layout/DashboardLayout'
import Avatar from '../../components/ui/Avatar'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Tabs from '../../components/ui/Tabs'
import Skeleton from '../../components/ui/Skeleton'
import { Input } from '../../components/ui/Field'
import EmptyState, { ErrorState } from '../../components/ui/EmptyState'
import useAsync from '../../lib/useAsync'
import { adminListQualifications, adminQualificationUrl, adminReviewQualification } from '../../lib/api'
import { dateShort } from '../../lib/format'
import { useToast } from '../../context/ToastContext'

const STATUS = { pending: ['amber', 'Pending'], verified: ['mint', 'Verified'], rejected: ['coral', 'Rejected'] }

/** Check tutors’ certificates (private documents, opened with a short-lived link) and verify or reject them. */
export default function Qualifications() {
  const toast = useToast()
  const [status, setStatus] = useState('pending')
  const rows = useAsync(() => adminListQualifications(status), [status])
  const [notes, setNotes] = useState({})
  const [busy, setBusy] = useState(null)

  const open = async (path) => {
    try {
      window.open(await adminQualificationUrl(path), '_blank', 'noopener')
    } catch (e) {
      toast.error(e.message)
    }
  }
  const review = async (q, next) => {
    setBusy(q.id + next)
    try {
      await adminReviewQualification(q.id, next, notes[q.id] ?? '')
      rows.setData((list) => (status ? list.filter((x) => x.id !== q.id) : list.map((x) => (x.id === q.id ? { ...x, status: next } : x))))
      toast.success(next === 'verified' ? `Verified “${q.title}”` : `Rejected “${q.title}”`)
    } catch (e) {
      toast.error(e.message)
    }
    setBusy(null)
  }

  return (
    <>
      <PageHeader title="Qualifications" subtitle="Verify tutors’ degrees and certificates. Verified ones show on their public profile." />
      <Tabs className="mb-6" value={status || 'all'} onChange={(v) => setStatus(v === 'all' ? '' : v)} tabs={[
        { value: 'pending', label: 'To review' }, { value: 'verified', label: 'Verified' }, { value: 'rejected', label: 'Rejected' }, { value: 'all', label: 'All' },
      ]} />
      {rows.error ? <ErrorState message={rows.error} onRetry={rows.reload} /> : rows.loading && !rows.data ? <Skeleton className="h-64 rounded-3xl" /> : !rows.data.length ? (
        <div className="card"><EmptyState icon={FileCheck2} title={status === 'pending' ? 'Nothing to review' : 'No qualifications here'}>Tutors add qualifications from their listing page.</EmptyState></div>
      ) : (
        <ul className="space-y-3">
          {rows.data.map((q) => {
            const [tone, label] = STATUS[q.status]
            return (
              <motion.li key={q.id} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="card flex flex-col gap-4 p-5 lg:flex-row lg:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <Avatar name={q.tutor_name} seed={q.tutor_id} size="md" />
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 font-semibold">{q.title}<Badge tone={tone}>{label}</Badge></p>
                    <p className="text-sm text-navy-500">{[q.institution, q.year].filter(Boolean).join(' · ') || 'No institution given'}</p>
                    <p className="text-xs text-navy-400"><Link to={`/tutors/${q.tutor_id}`} className="hover:underline">{q.tutor_name}</Link> · submitted {dateShort(q.created_at)}</p>
                    {q.review_note && <p className="mt-1 text-xs text-navy-500">Note: {q.review_note}</p>}
                  </div>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  {q.document_path ? <Button size="sm" variant="secondary" icon={ExternalLink} onClick={() => open(q.document_path)}>View document</Button> : <span className="text-xs text-navy-400">No document uploaded</span>}
                  {q.status === 'pending' && (
                    <>
                      <Input aria-label="Note for the tutor" placeholder="Note (optional)" value={notes[q.id] ?? ''} onChange={(e) => setNotes((n) => ({ ...n, [q.id]: e.target.value }))} className="sm:w-48" />
                      <Button size="sm" variant="danger" icon={X} loading={busy === q.id + 'rejected'} onClick={() => review(q, 'rejected')}>Reject</Button>
                      <Button size="sm" icon={Check} loading={busy === q.id + 'verified'} onClick={() => review(q, 'verified')}>Verify</Button>
                    </>
                  )}
                </div>
              </motion.li>
            )
          })}
        </ul>
      )}
    </>
  )
}
