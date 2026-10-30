import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { CalendarDays, Search } from 'lucide-react'
import { PageHeader } from '../../components/layout/DashboardLayout'
import Tabs from '../../components/ui/Tabs'
import Button from '../../components/ui/Button'
import Skeleton, { LoadingRegion } from '../../components/ui/Skeleton'
import EmptyState, { ErrorState } from '../../components/ui/EmptyState'
import SessionItem from '../../components/SessionItem'
import useAsync from '../../lib/useAsync'
import { listBookings } from '../../lib/api'
import { HOLD_MINUTES } from '../../lib/constants'
import { useAuth } from '../../context/AuthContext'
import { stagger } from '../../motion/variants'

const isExpiredHold = (b) => b.status === 'pending_payment' && new Date(b.created_at).getTime() + HOLD_MINUTES * 60000 < Date.now()

export default function Sessions() {
  const { profile } = useAuth()
  const [tab, setTab] = useState('upcoming')
  const bookings = useAsync(() => listBookings({ limit: 500 }), [])

  const groups = useMemo(() => {
    const now = new Date()
    const all = bookings.data ?? []
    const live = all.filter((b) => b.status !== 'cancelled' && !isExpiredHold(b))
    return {
      upcoming: live.filter((b) => new Date(b.ends_at) > now && b.status !== 'completed'),
      past: live.filter((b) => new Date(b.ends_at) <= now || b.status === 'completed').reverse(),
      cancelled: all.filter((b) => b.status === 'cancelled' || isExpiredHold(b)).reverse(),
    }
  }, [bookings.data])

  const replace = (nb) => bookings.setData((list) => list.map((x) => (x.id === nb.id ? nb : x)))
  const list = groups[tab]
  const canBook = profile.role === 'student' || profile.role === 'parent'

  return (
    <>
      <PageHeader
        title="Sessions"
        subtitle={profile.role === 'admin' ? 'Every booking on the platform.' : 'Your upcoming and past lessons.'}
        action={canBook && <Button to="/tutors" icon={Search}>Book a session</Button>}
      />
      <Tabs
        className="mb-6"
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'upcoming', label: 'Upcoming', count: bookings.data ? groups.upcoming.length : null },
          { value: 'past', label: 'Past', count: bookings.data ? groups.past.length : null },
          { value: 'cancelled', label: 'Cancelled', count: bookings.data ? groups.cancelled.length : null },
        ]}
      />
      {bookings.error ? (
        <ErrorState message={bookings.error} onRetry={bookings.reload} />
      ) : bookings.loading ? (
        <LoadingRegion label="Loading sessions">
          <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-28 rounded-3xl" />)}</div>
        </LoadingRegion>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
            {list.length === 0 ? (
              <div className="card">
                <EmptyState
                  icon={CalendarDays}
                  title={tab === 'upcoming' ? 'No upcoming sessions' : tab === 'past' ? 'No past sessions yet' : 'Nothing cancelled'}
                  action={tab === 'upcoming' && canBook && <Button to="/tutors">Find a tutor</Button>}
                >
                  {tab === 'upcoming' && (profile.role === 'tutor' ? 'When students book you, sessions will appear here.' : 'Book a session and it will show up here.')}
                </EmptyState>
              </div>
            ) : (
              <motion.ul className="space-y-3" variants={stagger(0.05)} initial="hidden" animate="show">
                {list.map((b) => <SessionItem key={b.id} booking={b} me={profile} onChange={replace} />)}
              </motion.ul>
            )}
          </motion.div>
        </AnimatePresence>
      )}
    </>
  )
}
