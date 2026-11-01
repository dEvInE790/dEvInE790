import { View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { AlertCircle, Hourglass, XCircle } from 'lucide-react-native'
import { Button, Text } from './ui'
import { describePayment } from '../lib/pay'
import { colors } from '../theme'

const TONE = {
  pending: [colors.amberBg, colors.amberInk, Hourglass],
  refund_pending: [colors.amberBg, colors.amberInk, AlertCircle],
  abandoned: [colors.cream200, colors.navy700, XCircle],
  failed: [colors.coralBg, colors.coralInk, XCircle],
}

/** Server-confirmed outcome of a checkout that didn’t succeed (success has its own screens). */
export default function PaymentResult({ result, kind, onRetry, onDismiss }) {
  if (!result || result.status === 'succeeded') return null
  const { title, body } = describePayment(result, kind)
  const [bg, fg, Icon] = TONE[result.status] ?? TONE.failed
  return (
    <Animated.View entering={FadeInDown.duration(350)} accessibilityRole="alert" style={{ backgroundColor: bg, borderRadius: 20, padding: 16, gap: 10 }}>
      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
        <Icon size={20} color={fg} />
        <Text variant="h3" style={{ color: fg, flex: 1 }}>{title}</Text>
      </View>
      <Text style={{ color: fg, fontSize: 14, lineHeight: 20 }}>{body}</Text>
      {result.reference && <Text variant="small" style={{ color: fg }}>Reference {result.reference}</Text>}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {onRetry && result.status !== 'refund_pending' && result.status !== 'pending' && <Button title="Try again" size="sm" onPress={onRetry} />}
        {onDismiss && <Button title="Dismiss" size="sm" variant="ghost" onPress={onDismiss} />}
      </View>
    </Animated.View>
  )
}
