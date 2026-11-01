import { useState } from 'react'
import useNow from '../../lib/useNow'
import { View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated'
import { CalendarDays, Clock, FlaskConical, ShieldCheck, Timer } from 'lucide-react-native'
import Screen from '../../components/Screen'
import { Avatar, Button, Card, EmptyState, Skeleton, StatusBadge, Text } from '../../components/ui'
import useAsync from '../../lib/useAsync'
import { activeDiscount, getBooking, getSubscription } from '../../lib/api'
import { payBooking } from '../../lib/pay'
import { dateLong, money, time } from '../../lib/format'
import { useAuth } from '../../context/AuthContext'
import { useSettings } from '../../context/SettingsContext'
import { useToast } from '../../context/ToastContext'
import { colors, fonts } from '../../theme'


export default function Checkout() {
  const { id } = useLocalSearchParams()
  const { profile } = useAuth()
  const { settings, plans } = useSettings()
  const toast = useToast()
  const booking = useAsync(() => getBooking(id), [id])
  const sub = useAsync(() => getSubscription(profile.id), [profile.id])
  const [paying, setPaying] = useState(false)
  const b = booking.data
  const now = useNow(1000)
  const remaining = b ? Math.max(0, new Date(b.created_at).getTime() + settings.hold_minutes * 60000 - now) : 0
  const discount = activeDiscount(sub.data, plans)
  const total = b ? Math.round(b.price * (1 - discount)) : 0
  const tutorName = b?.tutor?.profile?.full_name ?? 'your tutor'
  const expired = b?.status === 'pending_payment' && remaining === 0

  const pay = async () => {
    setPaying(true)
    try {
      const r = await payBooking(id, settings.test_mode)
      if (r.status === 'succeeded') toast.success('Payment received. You’re booked!')
      else if (r.status === 'refund_pending') toast.error(`${r.note || 'We couldn’t confirm this booking'}. You’ll be refunded in full.`)
      else toast.info('Payment not completed. You can try again.')
    } catch (e) {
      toast.error(e.message)
    } finally {
      await booking.reload({ silent: true })
      setPaying(false)
    }
  }

  if (booking.loading) return <Screen back title="Checkout"><Skeleton style={{ height: 320, borderRadius: 24 }} /></Screen>
  if (!b) return <Screen back title="Checkout"><EmptyState title="Booking not found" /></Screen>

  if (b.status === 'confirmed') {
    return (
      <Screen>
        <Animated.View entering={FadeIn.duration(400)} style={{ alignItems: 'center', paddingTop: 40, gap: 12 }}>
          <Animated.View entering={ZoomIn.springify().damping(12)} style={{ width: 104, height: 104, borderRadius: 52, backgroundColor: colors.mint400, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 50, color: colors.navy950, fontFamily: fonts.displayHeavy }}>✓</Text>
          </Animated.View>
          <Text variant="h1" style={{ marginTop: 12 }}>You’re booked!</Text>
          <Text variant="muted" style={{ textAlign: 'center', fontSize: 16, lineHeight: 24 }}>{b.subject} with {tutorName}{'\n'}{dateLong(b.starts_at)} at {time(b.starts_at)}</Text>
          {b.amount_paid != null && <Text variant="small">Paid {money(b.amount_paid)}</Text>}
          <Button title="View my sessions" size="lg" style={{ marginTop: 20 }} onPress={() => router.replace('/(tabs)/sessions')} />
        </Animated.View>
      </Screen>
    )
  }

  if (b.status !== 'pending_payment' || expired) {
    return (
      <Screen back title="Checkout">
        <EmptyState icon={Timer} title={expired ? 'This checkout expired' : 'This booking can’t be paid'}
          body={expired ? `We hold slots for ${settings.hold_minutes} minutes. Pick a time again and you’ll be all set.` : undefined}
          action={<Button title="Choose a new time" onPress={() => router.replace(`/book/${b.tutor_id}`)} />} />
        {!expired && <View style={{ alignItems: 'center' }}><StatusBadge status={b.status} /></View>}
      </Screen>
    )
  }

  return (
    <Screen back title="Checkout" footer={
      <View style={{ padding: 20, paddingBottom: 34, backgroundColor: colors.white, borderTopWidth: 1, borderColor: colors.line, gap: 8 }}>
        <Button title={`Pay ${money(total)}`} size="lg" loading={paying} onPress={pay} full />
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6 }}><ShieldCheck size={14} color={colors.mint600} /><Text variant="small">Free cancellation up to {discount ? '2' : '24'} hours before</Text></View>
      </View>
    }>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', backgroundColor: colors.amberBg, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999 }}>
        <Timer size={15} color={colors.amberInk} />
        <Text style={{ color: colors.amberInk, fontFamily: fonts.semibold, fontSize: 13 }}>Slot held for {Math.floor(remaining / 60000)}:{String(Math.floor((remaining % 60000) / 1000)).padStart(2, '0')}</Text>
      </View>
      <Card style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Avatar name={tutorName} seed={b.tutor_id} size={46} />
          <View><Text variant="h3">{b.subject}</Text><Text variant="muted">with {tutorName}</Text></View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><CalendarDays size={16} color={colors.navy400} /><Text>{dateLong(b.starts_at)}</Text></View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Clock size={16} color={colors.navy400} /><Text>{time(b.starts_at)} – {time(b.ends_at)} ({b.duration_minutes} min)</Text></View>
        {b.student && b.student.id !== profile.id && <Text variant="muted">For {b.student.full_name}</Text>}
      </Card>
      <Card delay={80} style={{ gap: 10 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text variant="muted">Session</Text><Text>{money(b.price)}</Text></View>
        {discount > 0 && <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text variant="muted">Member discount</Text><Text style={{ color: colors.mint700 }}>−{money(b.price - total)}</Text></View>}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', borderTopWidth: 1, borderColor: colors.line, paddingTop: 10 }}>
          <Text variant="label">Total</Text>
          <Text style={{ fontFamily: fonts.display, fontSize: 26, color: colors.navy950 }}>{money(total)}</Text>
        </View>
      </Card>
      <View style={{ flexDirection: 'row', gap: 10, backgroundColor: colors.cream200, borderRadius: 16, padding: 14 }}>
        {settings.test_mode ? <FlaskConical size={18} color={colors.navy500} /> : <ShieldCheck size={18} color={colors.mint600} />}
        <Text variant="muted" style={{ flex: 1, fontSize: 13 }}>
          {settings.test_mode ? 'Test mode is on: no money is charged.' : 'You’ll pay securely with Paystack (card, bank transfer or USSD), then return to the app.'}
        </Text>
      </View>
    </Screen>
  )
}
