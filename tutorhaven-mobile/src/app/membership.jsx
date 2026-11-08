import { useState } from 'react'
import { View } from 'react-native'
import { router } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { BarChart3, Bot, Check, Crown, FileText, Headphones, Minus, Sparkles, Users } from 'lucide-react-native'
import RefundNotice from '../components/RefundNotice'
import Screen from '../components/Screen'
import { PlusBadge } from '../components/PlusGate'
import { Button, Card, Text } from '../components/ui'
import { payPlan } from '../lib/pay'
import PaymentResult from '../components/PaymentResult'
import { PLAN_PURCHASES_IN_APP } from '../lib/storeRules'
import { dateLong, money } from '../lib/format'
import { useMembership } from '../context/MembershipContext'
import { useSettings } from '../context/SettingsContext'
import { useToast } from '../context/ToastContext'
import { colors, fonts, radius, shadow } from '../theme'

const PLUS_FEATURES = [
  [Bot, 'AI Learning Assistant', 'Simple explanations, worked steps, practice questions and revision notes, any time.'],
  [BarChart3, 'Learning analytics and goals', 'Lessons, subjects, goals and progress over time, with tutor feedback.'],
  [FileText, 'Monthly reports', 'Lessons attended, strengths and areas to work on, every month.'],
  [Sparkles, 'Personal tutor matching', 'Tutors matched to your subjects, goals and level, with the reasons.'],
  [Users, 'Family dashboard', 'Each child’s bookings, tutors and progress for parents.'],
  [Headphones, 'Priority support', 'Your requests go to the front of the queue.'],
]

const COMPARE = [
  ['Find, book and pay for tutors', true, true],
  ['Verified reviews and messaging', true, true],
  ['AI Learning Assistant', false, true],
  ['Analytics, goals and monthly reports', false, true],
  ['Personal tutor matching', false, true],
  ['Family dashboard and priority support', false, true],
  ['Free cancellation window', '24 hours', '2 hours'],
]

const per = (p) => (p.interval_months === 12 ? 'year' : p.interval_months > 1 ? `${p.interval_months} months` : 'month')

/** Standard vs TutorHaven Plus. Store builds show plans and status; plans are bought on the website. */
export default function Membership() {
  const { learnerPlans, plansLoaded } = useSettings()
  const { membership, isPlus, reload } = useMembership()
  const toast = useToast()
  const [busy, setBusy] = useState('')
  const [result, setResult] = useState(null)

  const buy = async (plan) => {
    setBusy(plan.id)
    setResult(null)
    try {
      const r = await payPlan(plan.id)
      if (r.status === 'succeeded') toast.success(`${plan.name} is active. Welcome to TutorHaven Plus!`)
      else setResult(r)
      await reload()
    } catch (e) {
      toast.error(e.message)
    } finally {
      setBusy('')
    }
  }

  return (
    <Screen back title="TutorHaven Plus" subtitle="Everything in Standard, plus tools that help you learn faster.">
      <PaymentResult result={result} kind="subscription" onDismiss={() => setResult(null)} />

      <LinearGradient colors={[colors.navy950, colors.navy900]} style={{ borderRadius: radius.xl, padding: 20, gap: 8, ...shadow.lift }}>
        <PlusBadge />
        {isPlus && membership ? (
          <>
            <Text style={{ fontFamily: fonts.display, fontSize: 22, color: colors.white }}>You’re on {membership.plan_name}</Text>
            <Text style={{ color: colors.navy200, fontSize: 14 }}>
              {membership.source === 'parent' ? `Through ${membership.paid_by}. ` : ''}
              {membership.status === 'cancelled' ? 'Cancelled; benefits continue' : 'Active'} until {dateLong(membership.current_period_end)}.
              {membership.ai_limit ? ` AI questions this month: ${membership.ai_used} of ${membership.ai_limit}.` : ''}
            </Text>
          </>
        ) : (
          <>
            <Text style={{ fontFamily: fonts.display, fontSize: 22, color: colors.white }}>You’re on Standard</Text>
            <Text style={{ color: colors.navy200, fontSize: 14 }}>Standard is free: find tutors, book and pay per lesson, message tutors and leave reviews.</Text>
          </>
        )}
      </LinearGradient>

      <Text variant="h2" style={{ marginTop: 6 }}>What Plus includes</Text>
      {PLUS_FEATURES.map(([Icon, title, body], i) => (
        <Animated.View key={title} entering={FadeInDown.delay(i * 60).duration(400)}>
          <Card animated={false} style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
            <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: colors.amberBg, alignItems: 'center', justifyContent: 'center' }}><Icon size={20} color={colors.amberInk} /></View>
            <View style={{ flex: 1 }}>
              <Text variant="label">{title}</Text>
              <Text variant="muted" style={{ fontSize: 13 }}>{body}</Text>
            </View>
          </Card>
        </Animated.View>
      ))}

      <Text variant="h2" style={{ marginTop: 6 }}>Standard and Plus</Text>
      <Card style={{ paddingVertical: 6 }}>
        <View style={{ flexDirection: 'row', paddingVertical: 8 }}>
          <Text variant="small" style={{ flex: 1 }}>Feature</Text>
          <Text variant="small" style={{ width: 70, textAlign: 'center' }}>Standard</Text>
          <Text variant="small" style={{ width: 70, textAlign: 'center', color: colors.amberInk }}>Plus</Text>
        </View>
        {COMPARE.map(([label, std, plus]) => (
          <View key={label} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 9, borderTopWidth: 1, borderColor: colors.line }}>
            <Text style={{ flex: 1, fontSize: 13, color: colors.navy700 }}>{label}</Text>
            {[std, plus].map((v, k) => (
              <View key={k} style={{ width: 70, alignItems: 'center' }}>
                {v === true ? <Check size={16} color={k ? colors.amberInk : colors.mint600} /> : v === false ? <Minus size={16} color={colors.navy200} /> : <Text style={{ fontSize: 12, color: colors.navy700 }}>{v}</Text>}
              </View>
            ))}
          </View>
        ))}
      </Card>

      <Text variant="h2" style={{ marginTop: 6 }}>Plans</Text>
      {plansLoaded && !learnerPlans.length && <Text variant="muted">Plus plans aren’t on sale right now. You can keep using Standard.</Text>}
      {learnerPlans.map((p, i) => {
        const current = isPlus && membership?.plan_id === p.id && membership?.source === 'own'
        return (
          <Animated.View key={p.id} entering={FadeInDown.delay(i * 80).duration(400)}>
            <LinearGradient colors={[colors.navy950, colors.navy900]} style={{ borderRadius: radius.xl, padding: 20, ...shadow.lift }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Crown size={18} color={colors.amber} />
                <Text style={{ fontFamily: fonts.display, fontSize: 20, color: colors.white }}>{p.name}</Text>
              </View>
              {!!p.tagline && <Text style={{ fontSize: 14, color: colors.navy200, marginTop: 4 }}>{p.tagline}</Text>}
              <Text style={{ fontFamily: fonts.displayHeavy, fontSize: 32, marginTop: 10, color: colors.white }}>{money(p.price)}<Text style={{ fontSize: 14, color: colors.navy300 }}> / {per(p)}</Text></Text>
              <View style={{ gap: 6, marginTop: 10 }}>
                {[
                  'Everything in Standard',
                  ...(p.ai_monthly_limit > 0 ? [`${p.ai_monthly_limit} AI assistant questions a month`] : []),
                  ...(p.discount > 0 ? [`${Math.round(p.discount * 100)}% off every lesson`] : []),
                  'Analytics, goals and monthly reports',
                  p.code === 'family' ? 'Covers every linked child' : 'Personal tutor matching',
                  'Priority support',
                ].map((f) => (
                  <View key={f} style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                    <Check size={14} color={colors.amber} />
                    <Text style={{ fontSize: 14, color: colors.navy100, flex: 1 }}>{f}</Text>
                  </View>
                ))}
              </View>
              {current && <Text variant="label" style={{ marginTop: 14, color: colors.mint300 }}>Your current plan</Text>}
              {PLAN_PURCHASES_IN_APP && (
                <Button title={current ? `Renew · ${money(p.price)}` : `Choose ${p.name}`} variant="mint" loading={busy === p.id} disabled={!!busy && busy !== p.id} style={{ marginTop: 16 }} onPress={() => buy(p)} full />
              )}
            </LinearGradient>
          </Animated.View>
        )
      })}
      {PLAN_PURCHASES_IN_APP ? (
        <>
          <RefundNotice kind="plan" />
          <Text variant="small" style={{ textAlign: 'center' }}>Payments are processed securely by Paystack in naira. Plus starts once Paystack confirms the payment.</Text>
        </>
      ) : (
        <Text variant="muted" style={{ textAlign: 'center' }}>Plus plans are bought on the TutorHaven website. Once you’re a member, every Plus feature works here in the app.</Text>
      )}
      <Button title="Done" variant="ghost" onPress={() => router.back()} />
    </Screen>
  )
}
