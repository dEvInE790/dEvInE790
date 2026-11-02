import { useMemo } from 'react'
import { View } from 'react-native'
import { router } from 'expo-router'
import { CalendarClock, Circle, CircleCheck, Clock, EyeOff, Landmark, Star, Users, Wallet } from 'lucide-react-native'
import Screen from '../Screen'
import NextSession from '../NextSession'
import SessionCard from '../SessionCard'
import { BarChart, StatCard } from '../Stats'
import { Button, Card, Skeleton, Text } from '../ui'
import useAsync from '../../lib/useAsync'
import { getMyEarnings, getMyPayoutAccount, getOwnTutor, getSubscription, isSubscriptionLive, listBookings } from '../../lib/api'
import { PLAN_PURCHASES_IN_APP } from '../../lib/storeRules'
import { useSettings } from '../../context/SettingsContext'
import { isLive, isThisMonth, isUpcoming, weeklySeries } from '../../lib/stats'
import { firstName, greeting, money } from '../../lib/format'
import { useAuth } from '../../context/AuthContext'
import { colors } from '../../theme'

export default function TutorHome() {
  const { profile } = useAuth()
  const bookings = useAsync(() => listBookings({ limit: 500 }), [])
  const own = useAsync(() => getOwnTutor(profile.id), [profile.id])
  const sub = useAsync(() => getSubscription(profile.id, 'tutor'), [profile.id])
  const { settings } = useSettings()
  const listed = settings.tutor_subscription_required === false || isSubscriptionLive(sub.data)
  const payout = useAsync(() => getMyPayoutAccount(profile.id), [profile.id])
  const earnings = useAsync(getMyEarnings, [])
  const needsPayout = settings.payout_account_required !== false && payout.data === null

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
  const checklist = t ? [
    ['Headline', t.headline.trim().length >= 10], ['Bio of 40+ characters', t.bio.trim().length >= 40],
    ['Subjects & levels', t.subjects.length > 0 && t.levels.length > 0], ['Weekly availability', own.data.availability.length > 0],
    ['Location & languages', !!t.location && t.languages.length > 0],
  ] : []
  const replace = (nb) => bookings.setData((list) => list.map((x) => (x.id === nb.id ? nb : x)))

  return (
    <Screen eyebrow={greeting()} title={`Hi, ${firstName(profile.full_name)}`} subtitle="Your teaching business at a glance." onRefresh={() => { bookings.reload(); own.reload(); sub.reload(); payout.reload(); earnings.reload() }} refreshing={false}>
      {t && t.status !== 'approved' && (
        <View style={{ flexDirection: 'row', gap: 10, borderRadius: 18, padding: 14, backgroundColor: t.status === 'rejected' ? colors.coralBg : colors.amberBg }}>
          <Clock size={18} color={t.status === 'rejected' ? colors.coralInk : colors.amberInk} />
          <Text style={{ flex: 1, fontSize: 14, color: t.status === 'rejected' ? colors.coralInk : colors.amberInk }}>
            {t.status === 'rejected' ? 'Your listing isn’t visible to learners right now. Update your profile and contact support for another review.' : 'Your listing is being reviewed. Learners can book you once it’s approved.'}
          </Text>
        </View>
      )}
      {t?.status === 'approved' && needsPayout && (
        <View style={{ borderRadius: 20, padding: 16, backgroundColor: colors.mint50, gap: 10 }}>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <Landmark size={18} color={colors.mint700} />
            <Text style={{ flex: 1, color: colors.navy900, fontSize: 14 }}>Add the bank account your earnings should be paid into. Learners can only book you once it’s connected.</Text>
          </View>
          <Button title="Add bank account" size="sm" style={{ alignSelf: 'flex-start' }} onPress={() => router.push('/payouts')} />
        </View>
      )}
      {t?.status === 'approved' && sub.data !== undefined && !listed && (
        <View style={{ borderRadius: 20, padding: 16, backgroundColor: colors.navy950, gap: 10 }}>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <EyeOff size={18} color={colors.mint300} />
            <Text style={{ flex: 1, color: colors.navy100, fontSize: 14 }}>
              {sub.data?.status === 'expired' ? 'Your subscription has expired, so learners can’t find or book you.'
                : PLAN_PURCHASES_IN_APP ? 'You’re approved! Subscribe to appear in search and take paid bookings.' : 'You’re approved! Your profile appears in search once your subscription is active.'}
            </Text>
          </View>
          <Button title={!PLAN_PURCHASES_IN_APP ? 'View subscription' : sub.data?.status === 'expired' ? 'Renew now' : 'Subscribe'} variant="mint" size="sm" style={{ alignSelf: 'flex-start' }} onPress={() => router.push('/subscription')} />
        </View>
      )}
      {bookings.loading && !bookings.data ? <Skeleton style={{ height: 190, borderRadius: 28 }} /> : (
        <NextSession booking={s.upcoming[0]} viewer="tutor" emptyTitle="No upcoming sessions" emptyBody="Keep your availability up to date. Learners can book any open slot instantly."
          emptyAction={<Button title="Update availability" variant="mint" size="sm" style={{ alignSelf: 'flex-start', marginTop: 16 }} onPress={() => router.push('/(tabs)/listing')} />} />
      )}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        <StatCard icon={Wallet} label="Earned this month" value={Number(earnings.data?.this_month ?? 0)} format={money} hint="After commission" loading={earnings.loading} />
        <StatCard icon={CalendarClock} label="Upcoming" value={s.upcoming.length} accent="navy" loading={bookings.loading} />
        <StatCard icon={Users} label="Students" value={s.students} accent="cream" loading={bookings.loading} />
        <StatCard icon={Star} label="Rating" value={Number(t?.rating ?? 0)} format={(v) => (t?.review_count ? v.toFixed(1) : '—')} hint={t ? `${t.review_count} reviews` : ''} accent="amber" loading={own.loading} />
      </View>
      {s.needsAction.length > 0 && (
        <View style={{ gap: 12 }}>
          <Text variant="h2">Ready to complete</Text>
          {s.needsAction.map((b, i) => <SessionCard key={b.id} booking={b} me={profile} onChange={replace} compact index={i} />)}
        </View>
      )}
      <Card delay={150}>
        <Text variant="h3">Earnings</Text>
        <Text variant="small" style={{ marginBottom: 6 }}>Confirmed and completed sessions, last 8 weeks</Text>
        {bookings.loading ? <Skeleton style={{ height: 170 }} /> : <BarChart data={s.chart} format={money} />}
      </Card>
      {t && (
        <Card delay={200}>
          <Text variant="h3">Profile strength</Text>
          <View style={{ gap: 8, marginTop: 12 }}>
            {checklist.map(([label, done]) => (
              <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {done ? <CircleCheck size={18} color={colors.mint600} /> : <Circle size={18} color={colors.navy300} />}
                <Text style={{ fontSize: 14, color: done ? colors.navy800 : colors.navy400 }}>{label}</Text>
              </View>
            ))}
          </View>
          <Button title="Edit listing" variant="secondary" size="sm" style={{ marginTop: 14 }} onPress={() => router.push('/(tabs)/listing')} />
        </Card>
      )}
    </Screen>
  )
}
