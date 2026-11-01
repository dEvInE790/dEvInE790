import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { BadgeCheck, Ban, ExternalLink, GraduationCap, RotateCcw, Search } from 'lucide-react'
import { PageHeader } from '../../components/layout/DashboardLayout'
import Avatar from '../../components/ui/Avatar'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Tabs from '../../components/ui/Tabs'
import Skeleton from '../../components/ui/Skeleton'
import { Stars } from '../../components/ui/StarRating'
import EmptyState, { ErrorState } from '../../components/ui/EmptyState'
import useAsync from '../../lib/useAsync'
import { adminListTutors, adminSetTutorStatus } from '../../lib/api'
import { dateShort, money } from '../../lib/format'
import { useToast } from '../../context/ToastContext'

const TONE = { pending: 'amber', approved: 'mint', rejected: 'coral' }
const LABEL = { pending: 'Pending review', approved: 'Live', rejected: 'Suspended / rejected' }

export default function Tutors() {
  const toast = useToast()
  const tutors = useAsync(() => adminListTutors(), [])
  const [tab, setTab] = useState('pending')
  const [q, setQ] = useState('')
  const [acting, setActing] = useState(null)

  const counts = useMemo(() => {
    const all = tutors.data ?? []
    return { pending: all.filter((t) => t.status === 'pending').length, approved: all.filter((t) => t.status === 'approved').length, rejected: all.filter((t) => t.status === 'rejected').length, all: all.length }
  }, [tutors.data])

  const list = useMemo(() => {
    const term = q.trim().toLowerCase()
    return (tutors.data ?? [])
      .filter((t) => tab === 'all' || t.status === tab)
      .filter((t) => !term || [t.profile?.full_name, t.headline, t.location, ...t.subjects].join(' ').toLowerCase().includes(term))
  }, [tutors.data, tab, q])

  const setStatus = async (t, status) => {
    setActing(t.id)
    try {
      await adminSetTutorStatus(t.id, status)
      tutors.setData((all) => all.map((x) => (x.id === t.id ? { ...x, status } : x)))
      toast.success(`${t.profile?.full_name ?? 'Tutor'} is now ${status === 'approved' ? 'live' : status === 'rejected' ? 'hidden from learners' : 'pending'}`)
    } catch (e) {
      toast.error(e.message)
    } finally {
      setActing(null)
    }
  }

  return (
    <>
      <PageHeader title="Tutors" subtitle="Review applications and control who appears to learners." />
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={tab} onChange={setTab} tabs={[
          { value: 'pending', label: 'Pending', count: tutors.data ? counts.pending : null },
          { value: 'approved', label: 'Live', count: tutors.data ? counts.approved : null },
          { value: 'rejected', label: 'Suspended', count: tutors.data ? counts.rejected : null },
          { value: 'all', label: 'All', count: tutors.data ? counts.all : null },
        ]} />
        <div className="relative sm:w-72">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-navy-400" aria-hidden />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, subject, city" aria-label="Search tutors" className="h-11 w-full rounded-xl border border-navy-900/12 bg-white pr-3 pl-10 text-sm shadow-soft outline-none focus:border-mint-500 focus:ring-4 focus:ring-mint-400/20" />
        </div>
      </div>

      {tutors.error ? <ErrorState message={tutors.error} onRetry={tutors.reload} /> : tutors.loading ? (
        <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-32 rounded-3xl" />)}</div>
      ) : list.length === 0 ? (
        <div className="card"><EmptyState icon={GraduationCap} title={tab === 'pending' ? 'No applications waiting' : 'No tutors here'}>{tab === 'pending' ? 'New tutor sign-ups will appear here for review.' : 'Try another tab or search.'}</EmptyState></div>
      ) : (
        <ul className="space-y-3">
          <AnimatePresence initial={false}>
            {list.map((t) => (
              <motion.li key={t.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 40 }} className="card p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-start">
                  <Avatar name={t.profile?.full_name} seed={t.id} size="md" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{t.profile?.full_name}</p>
                      <Badge tone={TONE[t.status]}>{LABEL[t.status]}</Badge>
                      {t.review_count > 0 && <span className="flex items-center gap-1 text-xs text-navy-500"><Stars value={Number(t.rating)} size={12} />{Number(t.rating).toFixed(1)} ({t.review_count})</span>}
                    </div>
                    <p className="mt-1 text-sm text-navy-600">{t.headline || <span className="text-navy-400 italic">No headline yet</span>}</p>
                    <p className="mt-1 text-xs text-navy-400">
                      {t.subjects.join(', ') || 'No subjects'} · {money(t.hourly_rate)}/hr · {t.years_experience} yrs · {t.location || 'No location'} · {t.sessions_completed} sessions · joined {dateShort(t.created_at)}
                    </p>
                    {t.bio && <p className="mt-2 line-clamp-2 text-sm text-navy-500">{t.bio}</p>}
                  </div>
                  <div className="flex flex-wrap gap-2 md:justify-end">
                    {t.status === 'approved' && <Link to={`/tutors/${t.id}`} className="inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-navy-600 hover:bg-navy-900/5"><ExternalLink className="h-4 w-4" />Profile</Link>}
                    {t.status !== 'approved' && <Button size="sm" variant="mint" icon={t.status === 'rejected' ? RotateCcw : BadgeCheck} loading={acting === t.id} onClick={() => setStatus(t, 'approved')}>{t.status === 'rejected' ? 'Reinstate' : 'Approve'}</Button>}
                    {t.status !== 'rejected' && <Button size="sm" variant="ghost" icon={Ban} disabled={acting === t.id} onClick={() => setStatus(t, 'rejected')} className="text-coral-600 hover:bg-coral-50">{t.status === 'approved' ? 'Suspend' : 'Reject'}</Button>}
                  </div>
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </>
  )
}
