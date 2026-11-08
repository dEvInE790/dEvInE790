import { useState } from 'react'
import { View } from 'react-native'
import { router } from 'expo-router'
import { BadgeCheck, BarChart3, Bell, Bot, ChevronRight, Crown, MessageSquareQuote, ExternalLink, FileText, Landmark, Lock, LogOut, Mail, MessageCircle, Phone, Receipt, RotateCcw } from 'lucide-react-native'
import Screen from '../../components/Screen'
import { Avatar, Badge, Button, Card, Field, Tappable, Text } from '../../components/ui'
import useAsync from '../../lib/useAsync'
import { deleteMyAccount, getDeletionBlockers, getSubscription, isSubscriptionLive, updateProfile } from '../../lib/api'
import Sheet from '../../components/Sheet'
import { useUnread } from '../../context/UnreadContext'
import { supabase } from '../../lib/supabase'
import { ROLE_LABEL } from '../../lib/constants'
import { dateLong } from '../../lib/format'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { colors } from '../../theme'
import { useSettings } from '../../context/SettingsContext'
import { businessInfo, openEmail, openPhone, openPolicy, openWhatsApp } from '../../lib/business'
import { useMembership } from '../../context/MembershipContext'
import { PlusBadge } from '../../components/PlusGate'


export default function Account() {
  const { profile, user, setProfile, signOut } = useAuth()
  const toast = useToast()
  const { notifications } = useUnread()
  const { settings } = useSettings()
  const info = businessInfo(settings)
  const { isPlus, membership } = useMembership()
  const learner = profile.role !== 'tutor'
  const sub = useAsync(() => getSubscription(profile.id, learner ? 'learner' : 'tutor'), [profile.id])
  const [name, setName] = useState(profile.full_name)
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState('')
  const [deleting, setDeleting] = useState(null)
  const [typed, setTyped] = useState('')

  const active = isSubscriptionLive(sub.data) ? sub.data : null
  const planName = active?.plan?.name ?? (learner && isPlus ? membership?.plan_name : learner ? 'Standard' : 'Not subscribed')

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
          {isPlus && <View style={{ marginTop: 4 }}><PlusBadge /></View>}
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
          ...(learner ? [[Bot, 'AI assistant', '/assistant', 0], [BarChart3, 'Progress & reports', '/progress', 0]] : [[MessageSquareQuote, 'Reviews', '/reviews', 0], [Landmark, 'Payout account', '/payouts', 0]]),
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

      <Text variant="h3" style={{ marginTop: 4 }}>Help & legal</Text>
      <Card delay={100} style={{ padding: 0, overflow: 'hidden' }}>
        {[
          [MessageCircle, 'WhatsApp support', info.whatsappDisplay, () => openWhatsApp(info), false],
          [Mail, 'Email support', info.support_email, () => openEmail(info), false],
          [Phone, 'Call us', info.phoneDisplay, () => openPhone(info), false],
          [RotateCcw, 'Refund Policy', null, () => openPolicy('refund'), true],
          [FileText, 'Terms and Conditions', null, () => openPolicy('terms'), true],
          [Lock, 'Privacy Policy', null, () => openPolicy('privacy'), true],
        ].map(([Icon, label, value, onPress, external], i) => (
          <Tappable key={label} onPress={onPress} accessibilityRole={external ? 'link' : 'button'} accessibilityLabel={label}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderTopWidth: i ? 1 : 0, borderColor: colors.line }}>
            <Icon size={19} color={colors.navy600} />
            <View style={{ flex: 1 }}>
              <Text variant="label">{label}</Text>
              {!!value && <Text variant="small">{value}</Text>}
            </View>
            {external ? <ExternalLink size={16} color={colors.navy300} /> : <ChevronRight size={18} color={colors.navy300} />}
          </Tappable>
        ))}
      </Card>
      <Text variant="small" style={{ textAlign: 'center' }}>{info.business_name} · operated by {info.operator_name} · {info.location}</Text>

      <Card delay={120} style={{ gap: 12 }}>
        <Field label="Full name" value={name} onChangeText={setName} />
        <Button title="Save name" variant="secondary" size="sm" loading={busy === 'name'} onPress={saveName} style={{ alignSelf: 'flex-start' }} />
        <Field label="New password" value={password} onChangeText={setPassword} secureTextEntry placeholder="At least 8 characters" />
        <Button title="Update password" variant="secondary" size="sm" loading={busy === 'pw'} onPress={savePassword} style={{ alignSelf: 'flex-start' }} />
      </Card>
      <Button title="Sign out" variant="danger" icon={LogOut} onPress={async () => { await signOut(); router.replace('/welcome') }} full />
      {profile.role !== 'admin' && (
        <Button title="Delete account" variant="ghost" onPress={async () => { setTyped(''); setDeleting({}); setDeleting(await getDeletionBlockers().catch(() => ({}))) }} full />
      )}
      <Sheet visible={!!deleting} onClose={() => busy !== 'delete' && setDeleting(null)} title="Delete your account?" subtitle="This permanently deletes your account. It can’t be undone.">
        <Text variant="muted" style={{ fontSize: 13 }}>Deleted: your profile, sessions, messages, reviews, goals, reports, AI conversations and uploaded documents (tutors: listing and payout details too). Kept: records of payments, without your name or email, for financial and tax rules. Any plan ends immediately and isn’t refunded.</Text>
        {(deleting?.upcoming_sessions > 0 || deleting?.refunds_in_progress > 0) && (
          <Text style={{ fontSize: 13, color: colors.amberInk, backgroundColor: colors.amberBg, padding: 10, borderRadius: 10 }}>
            {deleting.upcoming_sessions > 0 ? `You have ${deleting.upcoming_sessions} upcoming session(s). Cancel them first in Sessions (paid sessions are refunded).` : 'A refund linked to your account is still being processed. Try again once it has finished.'}
          </Text>
        )}
        <Field label="Type DELETE to confirm" value={typed} onChangeText={setTyped} autoCapitalize="characters" />
        <Button title="Delete permanently" variant="danger" full loading={busy === 'delete'}
          disabled={typed !== 'DELETE' || deleting?.upcoming_sessions > 0 || deleting?.refunds_in_progress > 0}
          onPress={async () => {
            setBusy('delete')
            try {
              await deleteMyAccount()
              setDeleting(null)
              toast.success('Your account has been deleted.')
              await signOut()
              router.replace('/welcome')
            } catch (e) {
              toast.error(e.message)
            } finally {
              setBusy('')
            }
          }} />
      </Sheet>
    </Screen>
  )
}
