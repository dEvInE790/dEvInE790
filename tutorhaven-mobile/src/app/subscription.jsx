import { useState } from 'react'
import { View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { BadgeCheck, Check, EyeOff } from 'lucide-react-native'
import Screen from '../components/Screen'
import PaymentResult from '../components/PaymentResult'
import { Badge, Button, Card, EmptyState, Skeleton, Text } from '../components/ui'
import useAsync from '../lib/useAsync'
import { cancelSubscription, getMyPayoutAccount, getOwnTutor, getSubscription, isSubscriptionLive, isTutorListed } from '../lib/api'
import { PLAN_PURCHASES_IN_APP } from '../lib/storeRules'
import { router } from 'expo-router'
import { payPlan } from '../lib/pay'
import { per } from '../lib/constants'
import { dateLong, money } from '../lib/format'
import { useAuth } from '../context/AuthContext'
import { useSettings } from '../context/SettingsContext'
import { useToast } from '../context/ToastContext'
import { colors, fonts, radius, shadow } from '../theme'

const STATUS = { active: ['mint', 'Active'], cancelled: ['amber', 'Cancelled'], expired: ['coral', 'Expired'], pending: ['neutral', 'Awaiting payment'] }

/** Tutors subscribe to be listed in search and take paid bookings. */
export default function TutorSubscription() {
  const { profile } = useAuth()
  const toast = useToast()
  const { tutorPlans, settings, plansLoaded } = useSettings()
  const sub = useAsync(() => getSubscription(profile.id, 'tutor'), [profile.id])
  const own = useAsync(() => getOwnTutor(profile.id), [profile.id])
  const listedNow = useAsync(() => isTutorListed(profile.id), [profile.id])
  const payout = useAsync(() => getMyPayoutAccount(profile.id), [profile.id])
  const [busy, setBusy] = useState('')
  const [result, setResult] = useState(null)

  const live = isSubscriptionLive(sub.data)
  const approved = own.data?.tutor?.status === 'approved'
  const listed = listedNow.data ?? (approved && (settings.tutor_subscription_required === false || live))
  const needsPayout = settings.payout_account_required !== false && payout.data === null
  const [tone, label] = STATUS[sub.data?.status] ?? ['neutral', 'No subscription']

  const pay = async (plan) => {
    setBusy(plan.id)
    setResult(null)
    try {
      const r = await payPlan(plan.id)
      if (r.status === 'succeeded') toast.success('Paystack confirmed your payment. You’re listed!')
      else setResult(r)
      await sub.reload({ silent: true })
    } catch (e) {
      toast.error(e.message)
    }
    setBusy('')
  }
  const cancel = async () => {
    setBusy('cancel')
    try {
      const s = await cancelSubscription('tutor')
      sub.setData((d) => ({ ...d, ...s }))
      toast.success(`Cancelled. You stay listed until ${dateLong(s.current_period_end)}.`)
    } catch (e) {
      toast.error(e.message)
    }
    setBusy('')
  }

  return (
    <Screen back title="Subscription" subtitle="Keeps your profile in search and lets learners book and pay you." onRefresh={() => { sub.reload(); own.reload() }}>
      <PaymentResult result={result} kind="subscription" onDismiss={() => setResult(null)} />
      {sub.loading || own.loading ? <Skeleton style={{ height: 170, borderRadius: 24 }} /> : (
        <Animated.View entering={FadeInDown.duration(400)}>
          <LinearGradient colors={[colors.navy950, colors.navy900]} style={{ borderRadius: radius.xl, padding: 20, gap: 8, ...shadow.lift }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ width: 44, height: 44, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' }}>
                {listed ? <BadgeCheck size={22} color={colors.mint300} /> : <EyeOff size={22} color={colors.mint300} />}
              </View>
              <Badge tone={tone}>{label}</Badge>
            </View>
            <Text style={{ fontFamily: fonts.display, fontSize: 24, color: colors.white, marginTop: 8 }}>{listed ? 'You’re listed' : 'You’re not listed yet'}</Text>
            <Text style={{ color: colors.navy200, fontSize: 14, lineHeight: 20 }}>
              {!approved
                ? 'Your profile is waiting for admin approval. You can subscribe now; your listing goes live once you’re approved.'
                : live
                  ? sub.data.status === 'cancelled'
                    ? `Cancelled. You stay listed until ${dateLong(sub.data.current_period_end)}.`
                    : `Active until ${dateLong(sub.data.current_period_end)}. Nothing renews automatically; we’ll remind you 3 days before.`
                  : settings.tutor_subscription_required === false
                    ? 'Subscriptions are currently optional, so your profile is visible.'
                    : sub.data?.status === 'expired'
                      ? `Expired on ${dateLong(sub.data.current_period_end)}. Learners can’t find or book you until you renew.`
                      : 'Subscribe to appear in search and accept paid bookings.'}
            </Text>
            {needsPayout && approved && <Button title="Add your bank account" variant="mint" size="sm" style={{ alignSelf: 'flex-start', marginTop: 6 }} onPress={() => router.push('/payouts')} />}
            {live && sub.data.status === 'active' && <Button title="Cancel subscription" variant="light" size="sm" loading={busy === 'cancel'} onPress={cancel} style={{ alignSelf: 'flex-start', marginTop: 6 }} />}
          </LinearGradient>
        </Animated.View>
      )}

      {PLAN_PURCHASES_IN_APP && <Text variant="h2">{live ? 'Renew' : 'Choose a plan'}</Text>}
      {!PLAN_PURCHASES_IN_APP ? null : !plansLoaded ? <Skeleton style={{ height: 140, borderRadius: 20 }} /> : !tutorPlans.length ? (
        <EmptyState icon={BadgeCheck} title="No tutor plans available" body="An admin hasn’t published a tutor plan yet. Please check back soon." />
      ) : tutorPlans.map((p, i) => (
        <Card key={p.id} delay={i * 80} style={{ gap: 8 }}>
          <Text variant="h3">{p.name}</Text>
          {!!p.description && <Text variant="muted">{p.description}</Text>}
          <Text style={{ fontFamily: fonts.displayHeavy, fontSize: 30, color: colors.navy950 }}>{money(p.price)}<Text style={{ fontSize: 14, color: colors.navy400 }}> / {per(p)}</Text></Text>
          {p.features.map((f) => (
            <View key={f} style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}><Check size={15} color={colors.mint600} /><Text style={{ fontSize: 14, color: colors.navy700, flex: 1 }}>{f}</Text></View>
          ))}
          <Button title={live ? `Renew for ${money(p.price)}` : `Pay ${money(p.price)} with Paystack`} loading={busy === p.id} disabled={!!busy && busy !== p.id} onPress={() => pay(p)} full style={{ marginTop: 6 }} />
        </Card>
      ))}
      {PLAN_PURCHASES_IN_APP && <Text variant="small" style={{ textAlign: 'center' }}>Payments are processed by Paystack. You’re listed once Paystack confirms the payment to us.</Text>}
    </Screen>
  )
}
