import { useEffect, useState } from 'react'
import { ActivityIndicator, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import Screen from '../components/Screen'
import { Button, Text } from '../components/ui'
import { verifyPaystack } from '../lib/api'
import { colors } from '../theme'

/** Landing route for Paystack's redirect back into the app (tutorhaven://payment or exp://…/--/payment). */
export default function PaymentReturn() {
  const { reference } = useLocalSearchParams()
  const [result, setResult] = useState(null)
  useEffect(() => {
    if (!reference) return
    verifyPaystack(String(reference)).then(setResult).catch((e) => setResult({ status: 'failed', note: e.message }))
  }, [reference])
  const shown = reference ? result : { status: 'failed' }
  return (
    <Screen>
      <View style={{ alignItems: 'center', paddingTop: 60, gap: 14 }}>
        {!shown ? <ActivityIndicator color={colors.mint600} size="large" /> : (
          <>
            <Text variant="h1">{shown.status === 'succeeded' ? 'Payment received' : 'Payment not completed'}</Text>
            <Text variant="muted" style={{ textAlign: 'center' }}>{shown.status === 'succeeded' ? 'Thank you! Your booking or membership is confirmed.' : shown.note || 'No money was taken. You can try again.'}</Text>
            <Button title="Continue" onPress={() => router.replace(shown.kind === 'subscription' ? '/(tabs)/account' : '/(tabs)/sessions')} />
          </>
        )}
      </View>
    </Screen>
  )
}
