import { useState } from 'react'
import { View } from 'react-native'
import { router } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { Check, Crown, Sparkles, Users } from 'lucide-react-native'
import Screen from '../components/Screen'
import { Button, Text } from '../components/ui'
import useAsync from '../lib/useAsync'
import { getSubscription, isSubscriptionLive } from '../lib/api'
import { payPlan } from '../lib/pay'
import { per } from '../lib/constants'
import PaymentResult from '../components/PaymentResult'
import { PLAN_PURCHASES_IN_APP } from '../lib/storeRules'
import { dateLong, money } from '../lib/format'
import { useAuth } from '../context/AuthContext'
import { useSettings } from '../context/SettingsContext'
import { useToast } from '../context/ToastContext'
import { colors, fonts, radius, shadow } from '../theme'

const ICON = { free: Sparkles, plus: Crown, family: Users }

export default function Membership() {
  const { profile } = useAuth()
  const { plans, plansLoaded } = useSettings()
  const toast = useToast()
  const sub = useAsync(() => getSubscription(profile.id), [profile.id])
  const [busy, setBusy] = useState('')
  const [result, setResult] = useState(null)
  const active = isSubscriptionLive(sub.data) ? sub.data : null
  const featuredId = plans.find((p) => p.id !== 'free')?.id

  const buy = async (plan) => {
    setBusy(plan.id)
    setResult(null)
    try {
      const r = await payPlan(plan.id)
      if (r.status === 'succeeded') toast.success(`${plan.name} is active. Enjoy ${Math.round(plan.discount * 100)}% off sessions!`)
      else setResult(r)
      await sub.reload({ silent: true })
    } catch (e) {
      toast.error(e.message)
    } finally {
      setBusy('')
    }
  }

  return (
    <Screen back title="Membership" subtitle="Save on every session. Nothing renews automatically; we remind you before your plan ends.">
      <PaymentResult result={result} kind="subscription" onDismiss={() => setResult(null)} />
      {active && <Text variant="label" style={{ color: colors.mint700 }}>{active.plan?.name} {active.status === 'cancelled' ? 'is cancelled; benefits continue' : 'is active'} until {dateLong(active.current_period_end)}. Paying again adds more time.</Text>}
      {plansLoaded && plans.length === 1 && <Text variant="muted">Membership plans aren’t available right now. You can still book any tutor and pay per session.</Text>}
      {plans.map((p, i) => {
        const Icon = ICON[p.code] ?? Crown
        const featured = p.id === featuredId
        const current = active ? active.plan_id === p.id : p.id === 'free'
        const inner = (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ width: 46, height: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: featured ? 'rgba(255,255,255,0.1)' : colors.cream200 }}><Icon size={22} color={featured ? colors.mint300 : colors.navy800} /></View>
              {featured && <View style={{ backgroundColor: colors.mint400, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}><Text style={{ fontFamily: fonts.semibold, fontSize: 11, color: colors.navy950 }}>Most popular</Text></View>}
            </View>
            <Text style={{ fontFamily: fonts.display, fontSize: 20, marginTop: 14, color: featured ? colors.white : colors.navy950 }}>{p.name}</Text>
            <Text style={{ fontSize: 14, color: featured ? colors.navy200 : colors.navy500, marginTop: 2 }}>{p.tagline}</Text>
            <Text style={{ fontFamily: fonts.displayHeavy, fontSize: 34, marginTop: 12, color: featured ? colors.white : colors.navy950 }}>{money(p.price)}<Text style={{ fontSize: 14, color: featured ? colors.navy300 : colors.navy400 }}> / {p.id === 'free' ? 'month' : per(p)}</Text></Text>
            <View style={{ gap: 8, marginTop: 14 }}>
              {p.features.map((f) => (
                <View key={f} style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                  <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: featured ? colors.mint400 : colors.mint100, alignItems: 'center', justifyContent: 'center' }}><Check size={12} color={featured ? colors.navy950 : colors.mint700} strokeWidth={3} /></View>
                  <Text style={{ fontSize: 14, color: featured ? colors.navy100 : colors.navy700, flex: 1 }}>{f}</Text>
                </View>
              ))}
            </View>
            {p.id !== 'free' && current && !PLAN_PURCHASES_IN_APP && <Text variant="label" style={{ marginTop: 16, color: featured ? colors.mint300 : colors.mint700 }}>Your current plan</Text>}
            {p.id !== 'free' && PLAN_PURCHASES_IN_APP && (
              <Button title={current ? `Renew · ${money(p.price)}` : `Choose ${p.name}`} variant={featured ? 'mint' : 'primary'} loading={busy === p.id} disabled={!!busy && busy !== p.id} style={{ marginTop: 18 }} onPress={() => buy(p)} full />
            )}
            {p.id === 'free' && current && <Text variant="label" style={{ marginTop: 16, color: colors.mint700 }}>Your current plan</Text>}
          </>
        )
        return (
          <Animated.View key={p.id} entering={FadeInDown.delay(i * 90).duration(450)}>
            {featured ? (
              <LinearGradient colors={[colors.navy950, colors.navy900]} style={{ borderRadius: radius.xl, padding: 20, ...shadow.lift }}>{inner}</LinearGradient>
            ) : (
              <View style={{ backgroundColor: colors.white, borderRadius: radius.xl, padding: 20, borderWidth: 1, borderColor: colors.line, ...shadow.soft }}>{inner}</View>
            )}
          </Animated.View>
        )
      })}
      {PLAN_PURCHASES_IN_APP && <Text variant="small" style={{ textAlign: 'center' }}>Payments are processed securely by Paystack in naira. Your plan starts once Paystack confirms the payment.</Text>}
      <Button title="Done" variant="ghost" onPress={() => router.back()} />
    </Screen>
  )
}
