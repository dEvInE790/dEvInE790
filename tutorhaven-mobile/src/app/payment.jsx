import { useEffect, useState } from 'react'
import { ActivityIndicator, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'
import Screen from '../components/Screen'
import { Button, Text } from '../components/ui'
import { verifyPaystack } from '../lib/api'
import { describePayment } from '../lib/pay'
import { colors } from '../theme'

// In a browser, Paystack's redirect lands here inside the checkout popup: hand the
// result back to the window that opened it (no effect on iOS).
WebBrowser.maybeCompleteAuthSession()

/**
 * Landing route for Paystack's redirect back into the app (tutorhaven://payment or exp://…/--/payment).
 * The status in the link is ignored: the server asks Paystack and we show its answer.
 */
export default function PaymentReturn() {
  const { reference } = useLocalSearchParams()
  const [result, setResult] = useState(null)
  useEffect(() => {
    if (!reference) return
    verifyPaystack(String(reference)).then(setResult).catch((e) => setResult({ status: 'pending', reason: e.message }))
  }, [reference])
  const shown = reference ? result : { status: 'failed', reason: 'No payment reference' }
  const copy = shown && describePayment(shown, shown.kind)
  return (
    <Screen>
      <View style={{ alignItems: 'center', paddingTop: 60, gap: 14 }}>
        {!shown ? (
          <>
            <ActivityIndicator color={colors.mint600} size="large" />
            <Text variant="muted">Confirming your payment with Paystack…</Text>
          </>
        ) : (
          <>
            <Text variant="h1" style={{ textAlign: 'center' }}>{copy.title}</Text>
            <Text variant="muted" style={{ textAlign: 'center' }}>{copy.body}</Text>
            {!!reference && <Text variant="small">Reference {String(reference)}</Text>}
            <Button title="Continue" onPress={() => router.replace(shown.kind === 'subscription' ? '/(tabs)/account' : '/(tabs)/sessions')} />
          </>
        )}
      </View>
    </Screen>
  )
}
