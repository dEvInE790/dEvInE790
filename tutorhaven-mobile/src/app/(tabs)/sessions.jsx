import { useMemo, useState } from 'react'
import { View } from 'react-native'
import { router } from 'expo-router'
import { CalendarDays } from 'lucide-react-native'
import Screen from '../../components/Screen'
import SessionCard from '../../components/SessionCard'
import { Button, EmptyState, Segmented, Skeleton } from '../../components/ui'
import useAsync from '../../lib/useAsync'
import { listBookings } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import { useSettings } from '../../context/SettingsContext'
import useNow from '../../lib/useNow'

export default function Sessions() {
  const { profile } = useAuth()
  const { settings } = useSettings()
  const [tab, setTab] = useState('upcoming')
  const bookings = useAsync(() => listBookings({ limit: 500 }), [])
  const now = useNow()

  const groups = useMemo(() => {
    const expired = (b) => b.status === 'pending_payment' && new Date(b.created_at).getTime() + settings.hold_minutes * 60000 < now
    const all = bookings.data ?? []
    const live = all.filter((b) => b.status !== 'cancelled' && !expired(b))
    return {
      upcoming: live.filter((b) => new Date(b.ends_at).getTime() > now && b.status !== 'completed'),
      past: live.filter((b) => new Date(b.ends_at).getTime() <= now || b.status === 'completed').reverse(),
      cancelled: all.filter((b) => b.status === 'cancelled' || expired(b)).reverse(),
    }
  }, [bookings.data, settings.hold_minutes, now])
  const replace = (nb) => bookings.setData((list) => list.map((x) => (x.id === nb.id ? nb : x)))
  const list = groups[tab]
  const learner = profile.role !== 'tutor'

  return (
    <Screen title="Sessions" subtitle="Your upcoming and past lessons." onRefresh={() => bookings.reload()} refreshing={false}>
      <Segmented value={tab} onChange={setTab} options={[
        { value: 'upcoming', label: 'Upcoming', count: bookings.data ? groups.upcoming.length : null },
        { value: 'past', label: 'Past', count: bookings.data ? groups.past.length : null },
        { value: 'cancelled', label: 'Cancelled', count: bookings.data ? groups.cancelled.length : null },
      ]} />
      {bookings.loading && !bookings.data ? [0, 1, 2].map((i) => <Skeleton key={i} style={{ height: 110, borderRadius: 24 }} />)
        : list.length === 0 ? (
          <EmptyState icon={CalendarDays} title={tab === 'upcoming' ? 'No upcoming sessions' : tab === 'past' ? 'No past sessions yet' : 'Nothing cancelled'}
            body={tab === 'upcoming' ? (learner ? 'Book a session and it will show up here.' : 'When learners book you, sessions appear here.') : undefined}
            action={tab === 'upcoming' && learner ? <Button title="Find a tutor" onPress={() => router.push('/(tabs)/explore')} /> : null} />
        ) : (
          <View key={tab} style={{ gap: 12 }}>
            {list.map((b, i) => <SessionCard key={b.id} booking={b} me={profile} onChange={replace} index={i} />)}
          </View>
        )}
    </Screen>
  )
}
