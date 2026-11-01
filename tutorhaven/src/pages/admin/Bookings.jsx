import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, Search } from 'lucide-react'
import { PageHeader } from '../../components/layout/DashboardLayout'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import Tabs from '../../components/ui/Tabs'
import Skeleton from '../../components/ui/Skeleton'
import { StatusBadge } from '../../components/ui/Badge'
import EmptyState, { ErrorState } from '../../components/ui/EmptyState'
import useAsync from '../../lib/useAsync'
import { listBookings, setBookingStatus } from '../../lib/api'
import { dateShort, money, time } from '../../lib/format'
import { useToast } from '../../context/ToastContext'

const TABS = ['upcoming', 'pending_payment', 'completed', 'cancelled', 'all']
const TAB_LABEL = { upcoming: 'Upcoming', pending_payment: 'Awaiting payment', completed: 'Completed', cancelled: 'Cancelled', all: 'All' }

export default function Bookings() {
  const toast = useToast()
  const bookings = useAsync(() => listBookings({ limit: 1000 }), [])
  const [tab, setTab] = useState('upcoming')
  const [q, setQ] = useState('')
  const [confirm, setConfirm] = useState(null)
  const [busy, setBusy] = useState(false)

  const match = (b, t) => (t === 'all' ? true : t === 'upcoming' ? b.status === 'confirmed' : b.status === t)
  const list = useMemo(() => {
    const term = q.trim().toLowerCase()
    const rows = (bookings.data ?? []).filter((b) => match(b, tab))
      .filter((b) => !term || [b.subject, b.tutor?.profile?.full_name, b.student?.full_name].join(' ').toLowerCase().includes(term))
    return tab === 'upcoming' ? rows : [...rows].reverse()
  }, [bookings.data, tab, q])

  const act = async () => {
    setBusy(true)
    try {
      const nb = await setBookingStatus(confirm.booking.id, confirm.action)
      bookings.setData((all) => all.map((x) => (x.id === nb.id ? { ...x, ...nb } : x)))
      toast.success(confirm.action === 'cancelled' ? 'Booking cancelled. Any payment is now in the refund queue.' : 'Marked as completed')
      setConfirm(null)
    } catch (e) {
      toast.error(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <PageHeader title="Bookings" subtitle="Every session on the platform." />
      <div className="mb-6 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <Tabs value={tab} onChange={setTab} tabs={TABS.map((t) => ({ value: t, label: TAB_LABEL[t], count: bookings.data ? bookings.data.filter((b) => match(b, t)).length : null }))} />
        <div className="relative xl:w-72">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-navy-400" aria-hidden />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search subject, tutor, student" aria-label="Search bookings" className="h-11 w-full rounded-xl border border-navy-900/12 bg-white pr-3 pl-10 text-sm shadow-soft outline-none focus:border-mint-500 focus:ring-4 focus:ring-mint-400/20" />
        </div>
      </div>

      {bookings.error ? <ErrorState message={bookings.error} onRetry={bookings.reload} /> : bookings.loading ? <Skeleton className="h-80 rounded-3xl" /> : list.length === 0 ? (
        <div className="card"><EmptyState icon={CalendarDays} title="No bookings here" /></div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[56rem] text-left text-sm">
            <thead className="text-xs text-navy-400 uppercase">
              <tr><th className="px-5 py-3 font-semibold">When</th><th className="px-3 py-3 font-semibold">Session</th><th className="px-3 py-3 font-semibold">Tutor</th><th className="px-3 py-3 font-semibold">Learner</th><th className="px-3 py-3 font-semibold">Price</th><th className="px-3 py-3 font-semibold">Status</th><th className="px-5 py-3 text-right font-semibold">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-navy-900/[0.05]">
              {list.map((b) => {
                const started = new Date(b.starts_at) <= new Date()
                return (
                  <tr key={b.id} className="transition-colors hover:bg-cream-50">
                    <td className="px-5 py-3 whitespace-nowrap text-navy-600">{dateShort(b.starts_at)}<br /><span className="text-xs text-navy-400">{time(b.starts_at)} · {b.duration_minutes} min</span></td>
                    <td className="px-3 py-3 font-medium">{b.subject}</td>
                    <td className="px-3 py-3"><Link to={`/tutors/${b.tutor_id}`} className="hover:underline">{b.tutor?.profile?.full_name ?? '—'}</Link></td>
                    <td className="px-3 py-3">{b.student?.full_name ?? '—'}</td>
                    <td className="px-3 py-3 tabular-nums">{money(b.amount_paid ?? b.price)}</td>
                    <td className="px-3 py-3"><StatusBadge status={b.status} /></td>
                    <td className="px-5 py-3 text-right whitespace-nowrap">
                      {b.status === 'confirmed' && started && <Button size="sm" variant="secondary" onClick={() => setConfirm({ booking: b, action: 'completed' })}>Complete</Button>}
                      {(b.status === 'confirmed' || b.status === 'pending_payment') && !started && <Button size="sm" variant="ghost" className="text-coral-600 hover:bg-coral-50" onClick={() => setConfirm({ booking: b, action: 'cancelled' })}>Cancel</Button>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={!!confirm} onClose={() => setConfirm(null)} size="sm"
        title={confirm?.action === 'cancelled' ? 'Cancel this booking?' : 'Mark as completed?'}
        description={confirm?.action === 'cancelled' ? 'The learner and tutor will see it as cancelled. Paid sessions move to the refund queue in Payments.' : 'The learner will be able to leave a review.'}>
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={() => setConfirm(null)}>Back</Button>
          <Button variant={confirm?.action === 'cancelled' ? 'danger' : 'primary'} className="flex-1" loading={busy} onClick={act}>{confirm?.action === 'cancelled' ? 'Cancel booking' : 'Mark completed'}</Button>
        </div>
      </Modal>
    </>
  )
}
