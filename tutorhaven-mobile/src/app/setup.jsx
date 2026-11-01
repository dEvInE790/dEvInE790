import { View } from 'react-native'
import { Database, KeyRound, Play } from 'lucide-react-native'
import Screen from '../components/Screen'
import { Card, Text } from '../components/ui'
import { LogoLockup } from '../components/Logo'
import { colors } from '../theme'

const STEPS = [
  [Database, 'Create the database', 'Run both SQL files in tutorhaven/supabase/migrations in your Supabase SQL editor.'],
  [KeyRound, 'Add your keys', 'Put your Project URL and anon key into tutorhaven-mobile/.env (EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY).'],
  [Play, 'Restart Expo', 'Stop the server (Ctrl+C) and run npx expo start again, then scan the QR code.'],
]

export default function Setup() {
  return (
    <Screen>
      <LogoLockup />
      <Text variant="h1" style={{ marginTop: 12 }}>Connect your database</Text>
      <Text variant="muted">TutorHaven runs on your Supabase project. Three quick steps and you’re live.</Text>
      {STEPS.map(([Icon, title, body], i) => (
        <Card key={title} delay={i * 80} style={{ flexDirection: 'row', gap: 14 }}>
          <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: colors.navy900, alignItems: 'center', justifyContent: 'center' }}><Icon size={20} color={colors.mint300} /></View>
          <View style={{ flex: 1 }}>
            <Text variant="small">Step {i + 1}</Text>
            <Text variant="h3">{title}</Text>
            <Text variant="muted" style={{ marginTop: 4 }}>{body}</Text>
          </View>
        </Card>
      ))}
    </Screen>
  )
}
