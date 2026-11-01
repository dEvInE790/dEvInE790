import { useState } from 'react'
import { View } from 'react-native'
import { router } from 'expo-router'
import { ChevronRight, Crown, LogOut, Receipt } from 'lucide-react-native'
import Screen from '../../components/Screen'
import { Avatar, Badge, Button, Card, Field, Skeleton, Tappable, Text } from '../../components/ui'
import useAsync from '../../lib/useAsync'
import { getSubscription, listPayments, updateProfile } from '../../lib/api'
import { supabase } from '../../lib/supabase'
import { ROLE_LABEL } from '../../lib/constants'
import { dateLong, dateShort, money } from '../../lib/format'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useSettings } from '../../context/SettingsContext'
import { colors } from '../../theme'

const PAY_STATUS = { refund_pending: ['amber', 'Refund pending'], refunded: ['mint', 'Refunded'] }

export default function Account() {
  const { profile, user, setProfile, signOut } = useAuth()
  const toast = useToast()
  const { plans } = useSettings()
  const learner = profile.role !== 'tutor'
  const sub = useAsync(() => getSubscription(profile.id), [profile.id], { enabled: learner })
  const payments = useAsync(() => listPayments(profile.id), [profile.id], { enabled: learner })
  const [name, setName] = useState(profile.full_name)
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState('')

  const active = sub.data && new Date(sub.data.current_period_end) > new Date() ? sub.data : null
  const plan = plans.find((p) => p.id === (active?.plan ?? 'free'))

  const saveName = async () => {
    if (name.trim().length < 2) return toast.error('Please enter your name.')
    setBusy('name')
    try {
      setProfile(await updateProfile(profile.id, { full_name: name.trim() }))
      toast.success('Name updated')
    } catch (e) {
      toast.error(e.message)
    } finally {
      setBusy('')
    }
  }
  const savePassword = async () => {
    if (password.length < 8) return toast.error('Use at least 8 characters.')
    setBusy('pw')
    const { error } = await supabase.auth.updateUser({ password })
    setBusy('')
    if (error) return toast.error(error.message)
    setPassword('')
    toast.success('Password updated')
  }

  return (
    <Screen title="Account" onRefresh={() => { sub.reload(); payments.reload() }} refreshing={false}>
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <Avatar name={profile.full_name} seed={user.id} size={56} />
        <View style={{ flex: 1 }}>
          <Text variant="h3">{profile.full_name}</Text>
          <Text variant="small">{user.email} · {ROLE_LABEL[profile.role]}</Text>
        </View>
      </Card>

      {learner && (
        <Tappable onPress={() => router.push('/membership')} accessibilityRole="button" style={{ borderRadius: 24, overflow: 'hidden' }}>
          <View style={{ backgroundColor: colors.navy950, padding: 20, borderRadius: 24, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <View style={{ width: 46, height: 46, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' }}><Crown size={22} color={colors.mint300} /></View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.navy300, fontSize: 13 }}>Membership</Text>
              <Text style={{ color: colors.white, fontSize: 20, fontFamily: 'PlusJakartaSans_700Bold' }}>{plan.name}</Text>
              <Text style={{ color: colors.navy200, fontSize: 13 }}>{active ? `Active until ${dateLong(active.current_period_end)}` : 'Members save on every session'}</Text>
            </View>
            <ChevronRight size={20} color={colors.navy300} />
          </View>
        </Tappable>
      )}

      {learner && (
        <Card delay={80}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}><Receipt size={18} color={colors.navy500} /><Text variant="h3">Payments</Text></View>
          {payments.loading ? <Skeleton style={{ height: 80 }} /> : !payments.data?.length ? <Text variant="muted">No payments yet.</Text> : (
            payments.data.slice(0, 8).map((p) => {
              const badge = PAY_STATUS[p.status]
              return (
                <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderTopWidth: 1, borderColor: colors.line }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, color: colors.navy900 }} numberOfLines={1}>{p.description}</Text>
                    <Text variant="small">{dateShort(p.created_at)}{p.provider_ref ? ` · ${p.provider_ref}` : ''}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <Text style={{ fontFamily: 'Inter_600SemiBold', color: p.status === 'refunded' ? colors.navy400 : colors.navy900, textDecorationLine: p.status === 'refunded' ? 'line-through' : 'none' }}>{money(p.amount)}</Text>
                    {badge && <Badge tone={badge[0]}>{badge[1]}</Badge>}
                  </View>
                </View>
              )
            })
          )}
        </Card>
      )}

      <Card delay={120} style={{ gap: 12 }}>
        <Field label="Full name" value={name} onChangeText={setName} />
        <Button title="Save name" variant="secondary" size="sm" loading={busy === 'name'} onPress={saveName} style={{ alignSelf: 'flex-start' }} />
        <Field label="New password" value={password} onChangeText={setPassword} secureTextEntry placeholder="At least 8 characters" />
        <Button title="Update password" variant="secondary" size="sm" loading={busy === 'pw'} onPress={savePassword} style={{ alignSelf: 'flex-start' }} />
      </Card>
      <Button title="Sign out" variant="danger" icon={LogOut} onPress={async () => { await signOut(); router.replace('/welcome') }} full />
    </Screen>
  )
}
