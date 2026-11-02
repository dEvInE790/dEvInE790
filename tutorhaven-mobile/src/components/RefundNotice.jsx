import { View } from 'react-native'
import { RotateCcw } from 'lucide-react-native'
import { Text } from './ui'
import { openPolicy } from '../lib/business'
import { colors, fonts } from '../theme'

const Bullet = ({ children }) => (
  <View style={{ flexDirection: 'row', gap: 8 }}>
    <Text variant="small" style={{ color: colors.mint600 }}>•</Text>
    <Text variant="small" style={{ flex: 1, color: colors.navy600 }}>{children}</Text>
  </View>
)
const B = ({ children }) => <Text variant="small" style={{ fontFamily: fonts.semibold, color: colors.navy900 }}>{children}</Text>
const L = ({ children, kind }) => (
  <Text variant="small" accessibilityRole="link" onPress={() => openPolicy(kind)} style={{ fontFamily: fonts.semibold, color: colors.navy900, textDecorationLine: 'underline' }}>{children}</Text>
)

/** Refund and renewal terms shown before every payment. */
export default function RefundNotice({ kind = 'session', member = false, style }) {
  return (
    <View style={[{ gap: 5, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white }, style]} accessibilityLabel="Refunds and renewal">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <RotateCcw size={13} color={colors.mint600} />
        <Text variant="small" style={{ fontFamily: fonts.semibold, color: colors.navy900 }}>Refunds & renewal</Text>
      </View>
      {kind === 'session' ? (
        <>
          <Bullet>Full refund if you cancel at least <B>{member ? '2 hours' : '24 hours'}</B> before the start, if the tutor cancels, or if you’re charged twice or in error.</Bullet>
          <Bullet>After that, sessions can’t be cancelled or refunded, except where the law requires it.</Bullet>
        </>
      ) : (
        <>
          <Bullet><B>Non-refundable once paid</B>, except where required by law.</Bullet>
          <Bullet>Covers the period shown. <B>Nothing renews automatically</B>; if you cancel, access continues until the end of the paid period.</Bullet>
        </>
      )}
      <Text variant="small" style={{ color: colors.navy600 }}>By paying you agree to our <L kind="terms">Terms</L> and <L kind="refund">Refund Policy</L>.</Text>
    </View>
  )
}
