import { View } from 'react-native'
import { router } from 'expo-router'
import { LogOut, Monitor } from 'lucide-react-native'
import Screen from '../components/Screen'
import { Button, Card, Text } from '../components/ui'
import { LogoLockup } from '../components/Logo'
import { useAuth } from '../context/AuthContext'
import { colors } from '../theme'

export default function AdminNotice() {
  const { signOut, profile } = useAuth()
  return (
    <Screen>
      <LogoLockup />
      <Card style={{ alignItems: 'center', gap: 12, paddingVertical: 32, marginTop: 24 }}>
        <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: colors.navy900, alignItems: 'center', justifyContent: 'center' }}><Monitor size={28} color={colors.mint300} /></View>
        <Text variant="h2" style={{ textAlign: 'center' }}>Hi {profile?.full_name?.split(' ')[0]}, use the web admin panel</Text>
        <Text variant="muted" style={{ textAlign: 'center' }}>Approvals, users, bookings, payments, refunds and pricing are managed on desktop at /admin in the TutorHaven web app.</Text>
      </Card>
      <Button title="Sign out" variant="secondary" icon={LogOut} onPress={async () => { await signOut(); router.replace('/welcome') }} />
    </Screen>
  )
}
