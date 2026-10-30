import { useMemo } from 'react'
import { motion } from 'motion/react'
import { ArrowRight, BookOpenCheck, CalendarClock, Hourglass, Search, Users } from 'lucide-react'
import { PageHeader } from '../../components/layout/DashboardLayout'
import NextSessionCard from '../../components/NextSessionCard'
import StatCard from '../../components/StatCard'
import BarChart from '../../components/charts/BarChart'
import SessionItem from '../../components/SessionItem'
import TutorCard, { TutorCardSkeleton } from '../../components/TutorCard'
import Button from '../../components/ui/Button'
import Skeleton from '../../components/ui/Skeleton'
import { CardHeader } from '../../components/ui/Card'
import { ErrorState } from '../../components/ui/EmptyState'
import { Reveal, Stagger } from '../../motion/Reveal'
import useAsync from '../../lib/useAsync'
import { getRecommendedTutors, listBookings, searchTutors } from '../../lib/api'
import { hours, hoursFmt, isUpcoming, weeklySeries } from '../../lib/stats'
import { firstName, greeting } from '../../lib/format'
import { useAuth } from '../../context/AuthContext'
import { useFavourites } from '../../context/FavouritesContext'
import { stagger } from '../../motion/variants'

const reviewOf = (b) => (Array.isArray(b.review) ? b.review[0] : b.review)

export default function StudentHome() {
  const { profile } = useAuth()
  const { ids: favIds } = useFavourites()
  const bookings = useAsync(() => listBookings({ limit: 500 }), [])
  const recommended = useAsync(() => getRecommendedTutors(profile.subjects ?? [], 3), [profile.subjects?.join()])
  const favourites = useAsync(() => searchTutors({ ids: favIds, limit: 6 }), [favIds.join()], { enabled: favIds.length > 0 })

  const s = useMemo(() => {
    const all = (bookings.data ?? []).filter((b) => b.student_id === profile.id)
    const completed = all.filter((b) => b.status === 'completed')
    const upcoming = all.filter(isUpcoming)
    return {
      completed,
      upcoming,
      hours: completed.reduce((t, b) => t + hours(b), 0),
      tutors: new Set(all.filter((b) => b.status !== 'cancelled').map((b) => b.tutor_id)).size,
      toReview: completed.filter((b) => !reviewOf(b)),
      chart: weeklySeries(completed, { value: hours }),
    }
  }, [bookings.data, profile.id])

  const replace = (nb) => bookings.setData((list) => list.map((x) => (x.id === nb.id ? nb : x)))

  return (
    <>
      <PageHeader
        eyebrow={greeting()}
        title={`Welcome back, ${firstName(profile.full_name)}`}
        subtitle="Here’s your learning at a glance."
        action={<Button to="/tutors" icon={Search}>Book a session</Button>}
      />
      {bookings.error && <div className="mb-6"><ErrorState message={bookings.error} onRetry={bookings.reload} /></div>}

      <Stagger onMount className="grid gap-5" gap={0.06}>
        {bookings.loading ? <Skeleton className="h-52 rounded-3xl" /> : (
          <NextSessionCard
            booking={s.upcoming[0]}
            emptyTitle="Your next breakthrough starts here"
            emptyBody="You don’t have any sessions booked. Find a tutor and pick a time that suits you."
          />
        )}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard icon={Hourglass} label="Learning hours" value={s.hours} format={hoursFmt} loading={bookings.loading} hint="From completed sessions" />
          <StatCard icon={BookOpenCheck} label="Sessions completed" value={s.completed.length} loading={bookings.loading} accent="navy" />
          <StatCard icon={CalendarClock} label="Upcoming" value={s.upcoming.length} loading={bookings.loading} accent="amber" />
          <StatCard icon={Users} label="Tutors" value={s.tutors} loading={bookings.loading} accent="cream" />
        </div>
      </Stagger>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Reveal className="card p-6">
          <CardHeader title="Learning hours" subtitle="Completed sessions, last 8 weeks" />
          <div className="mt-6">
            {bookings.loading ? <Skeleton className="h-[220px]" /> : <BarChart data={s.chart} format={(v) => `${hoursFmt(v)}h`} title="Learning hours per week" />}
          </div>
        </Reveal>
        <Reveal className="card p-6" delay={0.05}>
          <CardHeader
            title={s.toReview.length ? 'Rate your sessions' : 'Coming up'}
            subtitle={s.toReview.length ? 'Your feedback helps tutors and other learners' : 'Your next confirmed lessons'}
            action={<Button to="/dashboard/sessions" variant="ghost" size="sm" iconRight={ArrowRight}>All</Button>}
          />
          {bookings.loading ? <Skeleton className="mt-5 h-28" /> : (
            <motion.ul className="mt-5 space-y-3" variants={stagger(0.05)} initial="hidden" animate="show">
              {(s.toReview.length ? s.toReview : s.upcoming).slice(0, 3).map((b) => <SessionItem key={b.id} booking={b} me={profile} onChange={replace} compact />)}
              {!s.toReview.length && !s.upcoming.length && <p className="rounded-2xl bg-cream-100 p-4 text-sm text-navy-500">Nothing scheduled yet.</p>}
            </motion.ul>
          )}
        </Reveal>
      </div>

      {favIds.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-5 text-xl font-semibold">Your favourite tutors</h2>
          <Stagger className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {favourites.loading ? [0, 1, 2].map((i) => <TutorCardSkeleton key={i} />) : (favourites.data ?? []).map((t) => <TutorCard key={t.id} tutor={t} />)}
          </Stagger>
        </section>
      )}

      <section className="mt-10">
        <div className="mb-5 flex items-end justify-between">
          <div>
            <h2 className="text-xl font-semibold">Recommended for you</h2>
            <p className="text-sm text-navy-500">{profile.subjects?.length ? `Based on your interest in ${profile.subjects.slice(0, 3).join(', ')}` : 'Top-rated tutors on TutorHaven'}</p>
          </div>
          <Button to="/tutors" variant="ghost" size="sm" iconRight={ArrowRight}>Browse</Button>
        </div>
        <Stagger className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {recommended.loading ? [0, 1, 2].map((i) => <TutorCardSkeleton key={i} />) : (recommended.data ?? []).map((t) => <TutorCard key={t.id} tutor={t} />)}
        </Stagger>
      </section>
    </>
  )
}
