import { useState } from 'react'
import { View } from 'react-native'
import { router } from 'expo-router'
import { Lock, Mail } from 'lucide-react-native'
import Screen from '../components/Screen'
import { Button, Field, Text } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { supabase } from '../lib/supabase'
import { colors } from '../theme'

export default function SignIn() {
  const { signIn } = useAuth()
  const toast = useToast()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    setError('')
    setBusy(true)
    try {
      await signIn(email.trim(), password)
      router.replace('/')
    } catch (e) {
      setError(/invalid login/i.test(e.message) ? 'That email and password don’t match.' : /confirm/i.test(e.message) ? 'Please confirm your email first. Check your inbox.' : e.message)
    } finally {
      setBusy(false)
    }
  }

  const reset = async () => {
    if (!email.trim()) return setError('Enter your email above and we’ll send a reset link.')
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim())
    if (err) setError(err.message)
    else toast.success('Check your inbox for a password reset link.')
  }

  return (
    <Screen back title="Welcome back" subtitle="Sign in to continue your learning journey.">
      <Field label="Email" icon={Mail} value={email} onChangeText={setEmail} placeholder="you@example.com" autoCapitalize="none" keyboardType="email-address" autoComplete="email" textContentType="emailAddress" />
      <Field label="Password" icon={Lock} value={password} onChangeText={setPassword} placeholder="••••••••" secureTextEntry autoComplete="password" textContentType="password" onSubmitEditing={submit} />
      <Text variant="small" onPress={reset} style={{ alignSelf: 'flex-end', color: colors.navy600 }} accessibilityRole="button">Forgot password?</Text>
      {!!error && <View style={{ backgroundColor: colors.coralBg, borderRadius: 14, padding: 12 }}><Text style={{ color: colors.coralInk, fontSize: 14 }} accessibilityRole="alert">{error}</Text></View>}
      <Button title="Sign in" size="lg" loading={busy} disabled={!email || !password} onPress={submit} full />
      <Text variant="muted" style={{ textAlign: 'center' }}>
        New to TutorHaven? <Text variant="label" style={{ color: colors.mint700 }} onPress={() => router.replace('/sign-up')}>Create an account</Text>
      </Text>
    </Screen>
  )
}
