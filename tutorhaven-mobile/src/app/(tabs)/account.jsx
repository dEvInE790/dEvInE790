import { useState } from 'react'
import { View } from 'react-native'
import { router } from 'expo-router'
import { BadgeCheck, Bell, ChevronRight, Crown, LogOut, Receipt } from 'lucide-react-native'
import Screen from '../../components/Screen'
import { Avatar, Badge, Button, Card, Field, Tappable, Text } from '../../components/ui'
import useAsync from '../../lib/useAsync'
import { getSubscription, isSubscriptionLive, updateProfile } from '../../lib/api'
import { useUnread } from '../../context/UnreadContext'
import { supabase } from '../../lib/supabase'
import { ROLE_LABEL } from '../../lib/constants'
import { dateLong } from '../../lib/format'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { colors } from '../../theme'


export default function Account() {
  const { profile, user, setProfile, signOut } = useAuth()
  const toast = useToast()
  const { notifications } = useUnread()
  const learner = profile.role !== 'tutor'
  const sub = useAsync(() => getSubscription(profile.id, learner ? 'learner' : 'tutor'), [profile.id])
  const [name, setName] = useState(profile.full_name)
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState('')

  const active = isSubscriptionLive(sub.data) ? sub.data : null
  const planName = active?.plan?.name ?? (learner ? 'Pay as you go' : 'Not subscribed')

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
    <Screen title="Account" onRefresh={() => sub.reload()} refreshing={false}>
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <Avatar name={profile.full_name} seed={user.id} size={56} />
        <View style={{ flex: 1 }}>
          <Text variant="h3">{profile.full_name}</Text>
          <Text variant="small">{user.email} · {ROLE_LABEL[profile.role]}</Text>
        </View>
      </Card>

      {(
        <Tappable onPress={() => router.push(learner ? '/membership' : '/subscription')} accessibilityRole="button" style={{ borderRadius: 24, overflow: 'hidden' }}>
          <View style={{ backgroundColor: colors.navy950, padding: 20, borderRadius: 24, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <View style={{ width: 46, height: 46, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' }}>{learner ? <Crown size={22} color={colors.mint300} /> : <BadgeCheck size={22} color={colors.mint300} />}</View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.navy300, fontSize: 13 }}>{learner ? 'Membership' : 'Tutor subscription'}</Text>
              <Text style={{ color: colors.white, fontSize: 20, fontFamily: 'PlusJakartaSans_700Bold' }}>{sub.loading ? '…' : planName}</Text>
              <Text style={{ color: colors.navy200, fontSize: 13 }}>
                {active ? `${active.status === 'cancelled' ? 'Ends' : 'Active until'} ${dateLong(active.current_period_end)}` : learner ? 'Members save on every session' : sub.data?.status === 'expired' ? 'Expired: renew to be listed again' : 'Subscribe to be listed in search'}
              </Text>
            </View>
            <ChevronRight size={20} color={colors.navy300} />
          </View>
        </Tappable>
      )}

      <Card delay={80} style={{ padding: 0, overflow: 'hidden' }}>
        {[
          [Bell, 'Notifications', '/notifications', notifications],
          [Receipt, 'Payment history', '/payments', 0],
        ].map(([Icon, label, href, count], i) => (
          <Tappable key={href} onPress={() => router.push(href)} accessibilityRole="button" accessibilityLabel={label}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderTopWidth: i ? 1 : 0, borderColor: colors.line }}>
            <Icon size={19} color={colors.navy600} />
            <Text variant="label" style={{ flex: 1 }}>{label}</Text>
            {count > 0 && <Badge tone="coral">{count > 9 ? '9+' : String(count)}</Badge>}
            <ChevronRight size={18} color={colors.navy300} />
          </Tappable>
        ))}
      </Card>

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
