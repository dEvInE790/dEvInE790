import { ActivityIndicator, View } from 'react-native'
import { Redirect } from 'expo-router'
import { useAuth } from '../context/AuthContext'
import { LogoMark } from '../components/Logo'
import { Button, Text } from '../components/ui'
import { colors } from '../theme'

/** Sends people to the right place based on sign-in state, onboarding and role. */
export default function Gate() {
  const { configured, loading, user, profile, refreshProfile, signOut } = useAuth()
  if (!configured) return <Redirect href="/setup" />
  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cream100, gap: 16 }}>
        <LogoMark size={56} />
        <ActivityIndicator color={colors.mint600} />
      </View>
    )
  }
  if (!user) return <Redirect href="/welcome" />
  if (!profile) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12, backgroundColor: colors.cream100 }}>
        <Text variant="h2" style={{ textAlign: 'center' }}>We couldn’t load your profile</Text>
        <Text variant="muted" style={{ textAlign: 'center' }}>Check your connection. If this is a new project, make sure both database migrations have been run.</Text>
        <Button title="Try again" onPress={refreshProfile} />
        <Button title="Sign out" variant="ghost" onPress={signOut} />
      </View>
    )
  }
  if (!profile.onboarded) return <Redirect href="/onboarding" />
  if (profile.role === 'admin') return <Redirect href="/admin" />
  return <Redirect href="/(tabs)" />
}
