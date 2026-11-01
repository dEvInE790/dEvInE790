import { useMemo, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { router } from 'expo-router'
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated'
import { CalendarClock, Crown, Hourglass, Plus, Search, Wallet } from 'lucide-react-native'
import Screen from '../Screen'
import NextSession from '../NextSession'
import SessionCard from '../SessionCard'
import Sheet from '../Sheet'
import { BarChart, StatCard } from '../Stats'
import { Avatar, Button, Card, Field, Skeleton, Tappable, Text } from '../ui'
import useAsync from '../../lib/useAsync'
import { getSubscription, linkChild, listBookings, listChildren, listPayments } from '../../lib/api'
import { hours, hoursFmt, isThisMonth, isUpcoming, monthlySeries } from '../../lib/stats'
import { firstName, greeting, money } from '../../lib/format'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useSettings } from '../../context/SettingsContext'
import { colors, radius } from '../../theme'

export default function ParentHome() {
  const { profile } = useAuth()
  const toast = useToast()
  const { plans } = useSettings()
  const children = useAsync(() => listChildren(profile.id), [profile.id])
  const bookings = useAsync(() => listBookings({ limit: 500 }), [])
  const payments = useAsync(() => listPayments(profile.id), [profile.id])
  const sub = useAsync(() => getSubscription(profile.id), [profile.id])
  const [linkOpen, setLinkOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [linking, setLinking] = useState(false)

  const s = useMemo(() => {
    const all = bookings.data ?? []
    const paid = (payments.data ?? []).filter((p) => p.status === 'succeeded')
    const upcoming = all.filter(isUpcoming)
    return {
      upcoming,
      monthHours: all.filter((b) => b.status === 'completed' && isThisMonth(b.starts_at)).reduce((t, b) => t + hours(b), 0),
      monthSpend: paid.filter((p) => isThisMonth(p.created_at)).reduce((t, p) => t + Number(p.amount), 0),
      chart: monthlySeries(paid),
      per: (id) => ({ upcoming: upcoming.filter((b) => b.student_id === id).length, hours: all.filter((b) => b.student_id === id && b.status === 'completed').reduce((t, b) => t + hours(b), 0) }),
    }
  }, [bookings.data, payments.data])
  const plan = sub.data && new Date(sub.data.current_period_end) > new Date() ? plans.find((p) => p.id === sub.data.plan) : plans[0]
  const replace = (nb) => bookings.setData((list) => list.map((x) => (x.id === nb.id ? nb : x)))

  const onLink = async () => {
    setLinking(true)
    try {
      const child = await linkChild(email)
      children.setData((list) => (list.some((c) => c.id === child.id) ? list : [...list, child]))
      bookings.reload({ silent: true })
      toast.success(`${child.full_name} is now linked to your account`)
      setLinkOpen(false)
      setEmail('')
    } catch (e) {
      toast.error(e.message)
    } finally {
      setLinking(false)
    }
  }

  return (
    <Screen eyebrow={greeting()} title={`Hello, ${firstName(profile.full_name)}`} subtitle="Everything your family is learning." onRefresh={() => { children.reload(); bookings.reload(); payments.reload() }} refreshing={false}>
      <Text variant="h2">Your learners</Text>
      {children.loading ? <Skeleton style={{ height: 110, borderRadius: 24 }} /> : (
        <Animated.View layout={LinearTransition} style={{ gap: 12 }}>
          {(children.data ?? []).map((c, i) => {
            const st = s.per(c.id)
            return (
              <Animated.View key={c.id} entering={FadeInDown.delay(i * 60)} style={styles.child}>
                <Avatar name={c.full_name} seed={c.id} size={46} />
                <View style={{ flex: 1 }}>
                  <Text variant="h3">{c.full_name}</Text>
                  <Text variant="small">{c.grade_level || 'Student'}</Text>
                </View>
                <View style={styles.pill}><Text variant="label">{st.upcoming}</Text><Text variant="small">upcoming</Text></View>
                <View style={styles.pill}><Text variant="label">{hoursFmt(st.hours)}h</Text><Text variant="small">learned</Text></View>
              </Animated.View>
            )
          })}
          <Tappable onPress={() => setLinkOpen(true)} accessibilityRole="button" style={styles.add}>
            <View style={styles.addIcon}><Plus size={18} color={colors.navy700} /></View>
            <Text variant="label">Link a child</Text>
          </Tappable>
        </Animated.View>
      )}
      {bookings.loading && !bookings.data ? <Skeleton style={{ height: 190, borderRadius: 28 }} /> : (
        <NextSession booking={s.upcoming[0]} viewer="parent" emptyTitle={children.data?.length ? 'No sessions booked yet' : 'Link your first learner'}
          emptyBody={children.data?.length ? 'Find a tutor and book a session for your child.' : 'Your child signs up as a student, then you link them with their email.'}
          emptyAction={<Button title={children.data?.length ? 'Find a tutor' : 'Link a child'} variant="mint" size="sm" icon={children.data?.length ? Search : Plus} style={{ alignSelf: 'flex-start', marginTop: 16 }} onPress={() => (children.data?.length ? router.push('/(tabs)/explore') : setLinkOpen(true))} />} />
      )}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        <StatCard icon={CalendarClock} label="Upcoming" value={s.upcoming.length} loading={bookings.loading} />
        <StatCard icon={Hourglass} label="Hours this month" value={s.monthHours} format={hoursFmt} accent="navy" loading={bookings.loading} />
        <StatCard icon={Wallet} label="Spent this month" value={s.monthSpend} format={money} accent="amber" loading={payments.loading} />
        <StatCard icon={Crown} label="Plan" value={Math.round((plan?.discount ?? 0) * 100)} format={(v) => (v ? `${Math.round(v)}% off` : 'Free')} hint={plan?.name} accent="cream" loading={sub.loading} />
      </View>
      <Card delay={150}>
        <Text variant="h3">Family spending</Text>
        <Text variant="small" style={{ marginBottom: 6 }}>Successful payments, last 6 months</Text>
        {payments.loading ? <Skeleton style={{ height: 170 }} /> : <BarChart data={s.chart} format={money} />}
      </Card>
      {s.upcoming.length > 0 && (
        <View style={{ gap: 12 }}>
          <Text variant="h2">Coming up</Text>
          {s.upcoming.slice(0, 3).map((b, i) => <SessionCard key={b.id} booking={b} me={profile} onChange={replace} compact index={i} />)}
        </View>
      )}
      <Sheet visible={linkOpen} onClose={() => setLinkOpen(false)} title="Link a child" subtitle="Enter the email your child used for their TutorHaven student account.">
        <Field label="Child’s email" value={email} onChangeText={setEmail} placeholder="child@example.com" autoCapitalize="none" keyboardType="email-address" />
        <Button title="Link account" loading={linking} disabled={!email} onPress={onLink} full />
      </Sheet>
    </Screen>
  )
}

const styles = StyleSheet.create({
  child: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.white, borderRadius: radius.xl, padding: 14, borderWidth: 1, borderColor: 'rgba(15,28,54,0.06)' },
  pill: { alignItems: 'center', backgroundColor: colors.cream100, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6 },
  add: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: radius.xl, borderWidth: 2, borderStyle: 'dashed', borderColor: 'rgba(15,28,54,0.14)', paddingVertical: 16 },
  addIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
})
