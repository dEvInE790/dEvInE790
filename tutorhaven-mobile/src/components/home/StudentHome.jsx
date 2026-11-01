import { useMemo } from 'react'
import { View } from 'react-native'
import { router } from 'expo-router'
import { BookOpenCheck, CalendarClock, Hourglass, Search, Users } from 'lucide-react-native'
import Screen from '../Screen'
import NextSession from '../NextSession'
import SessionCard from '../SessionCard'
import TutorCard, { TutorCardSkeleton } from '../TutorCard'
import { BarChart, StatCard } from '../Stats'
import { Button, Card, Skeleton, Text } from '../ui'
import useAsync from '../../lib/useAsync'
import { getRecommendedTutors, listBookings } from '../../lib/api'
import { hours, hoursFmt, isUpcoming, weeklySeries } from '../../lib/stats'
import { firstName, greeting } from '../../lib/format'
import { useAuth } from '../../context/AuthContext'

const reviewOf = (b) => (Array.isArray(b.review) ? b.review[0] : b.review)

export default function StudentHome() {
  const { profile } = useAuth()
  const bookings = useAsync(() => listBookings({ limit: 500 }), [])
  const recommended = useAsync(() => getRecommendedTutors(profile.subjects ?? [], 3), [profile.subjects?.join()])

  const s = useMemo(() => {
    const all = (bookings.data ?? []).filter((b) => b.student_id === profile.id)
    const completed = all.filter((b) => b.status === 'completed')
    return {
      completed,
      upcoming: all.filter(isUpcoming),
      hours: completed.reduce((t, b) => t + hours(b), 0),
      tutors: new Set(all.filter((b) => b.status !== 'cancelled').map((b) => b.tutor_id)).size,
      toReview: completed.filter((b) => !reviewOf(b)),
      chart: weeklySeries(completed, { value: hours }),
    }
  }, [bookings.data, profile.id])
  const replace = (nb) => bookings.setData((list) => list.map((x) => (x.id === nb.id ? nb : x)))
  const refresh = () => { bookings.reload(); recommended.reload() }

  return (
    <Screen eyebrow={greeting()} title={`Hi, ${firstName(profile.full_name)}`} subtitle="Here’s your learning at a glance." onRefresh={refresh} refreshing={bookings.loading && !!bookings.data}>
      {bookings.loading && !bookings.data ? <Skeleton style={{ height: 190, borderRadius: 28 }} /> : (
        <NextSession booking={s.upcoming[0]} emptyTitle="Your next breakthrough starts here" emptyBody="No sessions booked yet. Find a tutor and pick a time that suits you."
          emptyAction={<Button title="Find a tutor" variant="mint" size="sm" icon={Search} style={{ alignSelf: 'flex-start', marginTop: 16 }} onPress={() => router.push('/(tabs)/explore')} />} />
      )}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        <StatCard icon={Hourglass} label="Learning hours" value={s.hours} format={hoursFmt} loading={bookings.loading} delay={60} />
        <StatCard icon={BookOpenCheck} label="Completed" value={s.completed.length} accent="navy" loading={bookings.loading} delay={120} />
        <StatCard icon={CalendarClock} label="Upcoming" value={s.upcoming.length} accent="amber" loading={bookings.loading} delay={180} />
        <StatCard icon={Users} label="Tutors" value={s.tutors} accent="cream" loading={bookings.loading} delay={240} />
      </View>
      <Card delay={200}>
        <Text variant="h3">Learning hours</Text>
        <Text variant="small" style={{ marginBottom: 6 }}>Completed sessions, last 8 weeks</Text>
        {bookings.loading ? <Skeleton style={{ height: 170 }} /> : <BarChart data={s.chart} format={(v) => `${hoursFmt(v)}h`} />}
      </Card>
      {s.toReview.length > 0 && (
        <View style={{ gap: 12 }}>
          <Text variant="h2">Rate your sessions</Text>
          {s.toReview.slice(0, 2).map((b, i) => <SessionCard key={b.id} booking={b} me={profile} onChange={replace} compact index={i} />)}
        </View>
      )}
      <View style={{ gap: 12 }}>
        <Text variant="h2">Recommended for you</Text>
        <Text variant="muted" style={{ marginTop: -8 }}>{profile.subjects?.length ? `Based on ${profile.subjects.slice(0, 3).join(', ')}` : 'Top-rated tutors on TutorHaven'}</Text>
        {recommended.loading ? [0, 1].map((i) => <TutorCardSkeleton key={i} />) : (recommended.data ?? []).map((t, i) => <TutorCard key={t.id} tutor={t} index={i} />)}
      </View>
    </Screen>
  )
}
