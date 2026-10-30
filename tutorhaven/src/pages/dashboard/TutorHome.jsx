import { useMemo } from 'react'
import { motion } from 'motion/react'
import { ArrowRight, CalendarClock, CircleAlert, CircleCheck, Circle, Clock, Eye, Star, Users, Wallet } from 'lucide-react'
import { PageHeader } from '../../components/layout/DashboardLayout'
import NextSessionCard from '../../components/NextSessionCard'
import StatCard from '../../components/StatCard'
import BarChart from '../../components/charts/BarChart'
import SessionItem from '../../components/SessionItem'
import Button from '../../components/ui/Button'
import Skeleton from '../../components/ui/Skeleton'
import { CardHeader } from '../../components/ui/Card'
import { ErrorState } from '../../components/ui/EmptyState'
import { Reveal, Stagger } from '../../motion/Reveal'
import useAsync from '../../lib/useAsync'
import { getOwnTutor, listBookings } from '../../lib/api'
import { isLive, isThisMonth, isUpcoming, weeklySeries } from '../../lib/stats'
import { firstName, greeting, money } from '../../lib/format'
import { useAuth } from '../../context/AuthContext'
import { ease, stagger } from '../../motion/variants'

function ProgressRing({ value }) {
  const r = 34
  const c = 2 * Math.PI * r
  return (
    <svg width="88" height="88" viewBox="0 0 88 88" className="-rotate-90" aria-hidden>
      <circle cx="44" cy="44" r={r} fill="none" stroke="#e4eaf5" strokeWidth="8" />
      <motion.circle cx="44" cy="44" r={r} fill="none" stroke="#1a8d64" strokeWidth="8" strokeLinecap="round" strokeDasharray={c}
        initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - value) }} transition={{ duration: 1.1, ease, delay: 0.2 }} />
    </svg>
  )
}

export default function TutorHome() {
  const { profile } = useAuth()
  const bookings = useAsync(() => listBookings({ limit: 500 }), [])
  const own = useAsync(() => getOwnTutor(profile.id), [profile.id])

  const s = useMemo(() => {
    const all = (bookings.data ?? []).filter((b) => b.tutor_id === profile.id)
    const live = all.filter(isLive)
    return {
      upcoming: all.filter(isUpcoming),
      needsAction: all.filter((b) => b.status === 'confirmed' && new Date(b.starts_at) <= new Date()),
      monthEarnings: live.filter((b) => isThisMonth(b.starts_at)).reduce((t, b) => t + Number(b.price), 0),
      students: new Set(live.map((b) => b.student_id)).size,
      chart: weeklySeries(live, { value: (b) => Number(b.price) }),
    }
  }, [bookings.data, profile.id])

  const t = own.data?.tutor
  const checklist = t
    ? [
        { label: 'Headline', done: t.headline.trim().length >= 10 },
        { label: 'Bio of 40+ characters', done: t.bio.trim().length >= 40 },
        { label: 'Subjects & levels', done: t.subjects.length > 0 && t.levels.length > 0 },
        { label: 'Weekly availability', done: own.data.availability.length > 0 },
        { label: 'Location & languages', done: !!t.location && t.languages.length > 0 },
      ]
    : []
  const completeness = checklist.length ? checklist.filter((c) => c.done).length / checklist.length : 0
  const replace = (nb) => bookings.setData((list) => list.map((x) => (x.id === nb.id ? nb : x)))

  return (
    <>
      <PageHeader
        eyebrow={greeting()}
        title={`Welcome back, ${firstName(profile.full_name)}`}
        subtitle="Your teaching business at a glance."
        action={t?.status === 'approved' && <Button to={`/tutors/${profile.id}`} variant="secondary" icon={Eye}>View public profile</Button>}
      />

      {t && t.status !== 'approved' && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className={`mb-6 flex items-start gap-3 rounded-2xl p-4 text-sm ${t.status === 'rejected' ? 'bg-coral-50 text-coral-600' : 'bg-amber-400/15 text-[#6b4700]'}`}>
          {t.status === 'rejected' ? <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" /> : <Clock className="mt-0.5 h-5 w-5 shrink-0" />}
          <p>
            {t.status === 'rejected'
              ? 'Your listing wasn’t approved. Update your profile with more detail and contact support to request another review.'
              : 'Your listing is being reviewed. Students will be able to find and book you once it’s approved. Meanwhile, make your profile shine.'}
          </p>
        </motion.div>
      )}
      {(bookings.error || own.error) && <div className="mb-6"><ErrorState message={bookings.error || own.error} onRetry={() => { bookings.reload(); own.reload() }} /></div>}

      <Stagger onMount className="grid gap-5" gap={0.06}>
        {bookings.loading ? <Skeleton className="h-52 rounded-3xl" /> : (
          <NextSessionCard
            booking={s.upcoming[0]}
            viewer="tutor"
            emptyTitle="No upcoming sessions"
            emptyBody="Keep your availability up to date. Students can book any open slot instantly."
            emptyAction={<Button to="/dashboard/listing" variant="mint" size="sm" className="mt-6" iconRight={ArrowRight}>Update availability</Button>}
          />
        )}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard icon={Wallet} label="Earnings this month" value={s.monthEarnings} format={money} loading={bookings.loading} />
          <StatCard icon={CalendarClock} label="Upcoming sessions" value={s.upcoming.length} loading={bookings.loading} accent="navy" />
          <StatCard icon={Users} label="Students" value={s.students} loading={bookings.loading} accent="cream" />
          <StatCard icon={Star} label="Rating" value={Number(t?.rating ?? 0)} format={(v) => (t?.review_count ? v.toFixed(1) : '—')} hint={t ? `${t.review_count} reviews` : ''} loading={own.loading} accent="amber" />
        </div>
      </Stagger>

      {s.needsAction.length > 0 && (
        <Reveal className="card mt-6 border-mint-500/30 p-6">
          <CardHeader title="Ready to complete" subtitle="Mark finished sessions complete so learners can leave a review" />
          <motion.ul className="mt-5 space-y-3" variants={stagger(0.05)} initial="hidden" animate="show">
            {s.needsAction.map((b) => <SessionItem key={b.id} booking={b} me={profile} onChange={replace} compact />)}
          </motion.ul>
        </Reveal>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Reveal className="card p-6">
          <CardHeader title="Earnings" subtitle="Confirmed and completed sessions, last 8 weeks" />
          <div className="mt-6">{bookings.loading ? <Skeleton className="h-[220px]" /> : <BarChart data={s.chart} format={money} title="Earnings per week" />}</div>
        </Reveal>
        <Reveal className="card p-6" delay={0.05}>
          <CardHeader title="Profile strength" subtitle="Complete profiles get booked more" />
          {own.loading ? <Skeleton className="mt-5 h-40" /> : (
            <>
              <div className="mt-5 flex items-center gap-5">
                <div className="relative">
                  <ProgressRing value={completeness} />
                  <span className="absolute inset-0 grid place-items-center font-display text-lg font-bold">{Math.round(completeness * 100)}%</span>
                </div>
                <ul className="flex-1 space-y-2 text-sm">
                  {checklist.map((c) => (
                    <li key={c.label} className={`flex items-center gap-2 ${c.done ? 'text-navy-700' : 'text-navy-400'}`}>
                      {c.done ? <CircleCheck className="h-4 w-4 text-mint-600" /> : <Circle className="h-4 w-4" />}{c.label}
                    </li>
                  ))}
                </ul>
              </div>
              <Button to="/dashboard/listing" variant="secondary" size="sm" className="mt-6 w-full">Edit listing</Button>
            </>
          )}
        </Reveal>
      </div>

      <Reveal className="card mt-6 p-6">
        <CardHeader title="Upcoming schedule" action={<Button to="/dashboard/sessions" variant="ghost" size="sm" iconRight={ArrowRight}>All sessions</Button>} />
        {bookings.loading ? <Skeleton className="mt-5 h-28" /> : (
          <motion.ul className="mt-5 space-y-3" variants={stagger(0.05)} initial="hidden" animate="show">
            {s.upcoming.slice(0, 5).map((b) => <SessionItem key={b.id} booking={b} me={profile} onChange={replace} />)}
            {!s.upcoming.length && <p className="rounded-2xl bg-cream-100 p-4 text-sm text-navy-500">No sessions booked yet.</p>}
          </motion.ul>
        )}
      </Reveal>
    </>
  )
}
