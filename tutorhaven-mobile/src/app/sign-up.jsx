import { useState } from 'react'
import { View } from 'react-native'
import { router } from 'expo-router'
import Animated, { FadeIn } from 'react-native-reanimated'
import { GraduationCap, HeartHandshake, Lock, Mail, MailCheck, Presentation, User } from 'lucide-react-native'
import Screen from '../components/Screen'
import { Button, Card, Field, Tappable, Text } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { colors, fonts, radius } from '../theme'

const ROLES = [
  ['student', 'Student', 'I want to learn', GraduationCap],
  ['parent', 'Parent', 'Booking for my child', HeartHandshake],
  ['tutor', 'Tutor', 'I want to teach', Presentation],
]

export default function SignUp() {
  const { signUp } = useAuth()
  const [role, setRole] = useState('student')
  const [form, setForm] = useState({ fullName: '', email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [sentTo, setSentTo] = useState('')
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }))

  const submit = async () => {
    const errs = {}
    if (form.fullName.trim().length < 2) errs.fullName = 'Please enter your full name.'
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) errs.email = 'Please enter a valid email address.'
    if (form.password.length < 8) errs.password = 'Use at least 8 characters.'
    setErrors(errs)
    if (Object.keys(errs).length) return
    setBusy(true)
    try {
      const data = await signUp({ email: form.email.trim(), password: form.password, fullName: form.fullName.trim(), role })
      if (data.session) router.replace('/onboarding')
      else setSentTo(form.email.trim())
    } catch (e) {
      setErrors({ form: /already registered/i.test(e.message) ? 'An account with this email already exists. Try signing in.' : e.message })
    } finally {
      setBusy(false)
    }
  }

  if (sentTo) {
    return (
      <Screen back>
        <Card style={{ alignItems: 'center', gap: 12, paddingVertical: 32 }}>
          <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: colors.mint100, alignItems: 'center', justifyContent: 'center' }}><MailCheck size={30} color={colors.mint700} /></View>
          <Text variant="h2">Check your inbox</Text>
          <Text variant="muted" style={{ textAlign: 'center' }}>We sent a confirmation link to {sentTo}. Open it, then come back here and sign in.</Text>
        </Card>
        <Button title="Go to sign in" onPress={() => router.replace('/sign-in')} full />
      </Screen>
    )
  }

  return (
    <Screen back title="Create your account" subtitle="Join TutorHaven in under a minute.">
      <Text variant="label">I am a…</Text>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {ROLES.map(([value, label, body, Icon]) => {
          const on = role === value
          return (
            <Tappable key={value} onPress={() => setRole(value)} accessibilityRole="radio" accessibilityState={{ selected: on }}
              style={{ flex: 1, alignItems: 'center', gap: 6, paddingVertical: 14, paddingHorizontal: 6, borderRadius: radius.lg, borderWidth: 1, borderColor: on ? colors.navy900 : 'rgba(15,28,54,0.1)', backgroundColor: on ? colors.navy900 : colors.white }}>
              <Icon size={22} color={on ? colors.mint300 : colors.navy500} />
              <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: on ? colors.white : colors.navy900 }}>{label}</Text>
              <Text style={{ fontFamily: fonts.body, fontSize: 11, textAlign: 'center', color: on ? colors.navy200 : colors.navy400 }}>{body}</Text>
            </Tappable>
          )
        })}
      </View>
      <Field label="Full name" icon={User} value={form.fullName} onChangeText={set('fullName')} error={errors.fullName} placeholder="Chioma Okeke" autoComplete="name" textContentType="name" />
      <Field label="Email" icon={Mail} value={form.email} onChangeText={set('email')} error={errors.email} placeholder="you@example.com" autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
      <Field label="Password" icon={Lock} value={form.password} onChangeText={set('password')} error={errors.password} hint="At least 8 characters" secureTextEntry autoComplete="new-password" textContentType="newPassword" />
      {!!errors.form && <Animated.View entering={FadeIn} style={{ backgroundColor: colors.coralBg, borderRadius: 14, padding: 12 }}><Text style={{ color: colors.coralInk, fontSize: 14 }}>{errors.form}</Text></Animated.View>}
      <Button title={`Create ${role} account`} size="lg" loading={busy} onPress={submit} full />
      <Text variant="muted" style={{ textAlign: 'center' }}>
        Already have an account? <Text variant="label" style={{ color: colors.mint700 }} onPress={() => router.replace('/sign-in')}>Sign in</Text>
      </Text>
    </Screen>
  )
}
