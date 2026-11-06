import { View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { Crown } from 'lucide-react-native'
import { Button, Skeleton, Text } from './ui'
import { useMembership } from '../context/MembershipContext'
import { colors, fonts, radius } from '../theme'

export function PlusBadge() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.amber, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start' }} accessibilityLabel="Plus member">
      <Crown size={11} color={colors.navy950} />
      <Text style={{ fontFamily: fonts.semibold, fontSize: 11, color: colors.navy950 }}>Plus</Text>
    </View>
  )
}

/** Explains a Plus feature to Standard members. The server refuses the feature anyway. */
export default function PlusGate({ title, body, children }) {
  const { isPlus, loading, membership } = useMembership()
  if (isPlus) return children
  if (loading && !membership) return <Skeleton style={{ height: 220, borderRadius: radius.xl }} />
  return (
    <LinearGradient colors={[colors.navy950, colors.navy900]} style={{ borderRadius: radius.xl, padding: 22, gap: 10 }}>
      <PlusBadge />
      <Text style={{ fontFamily: fonts.display, fontSize: 22, color: colors.white }}>{title}</Text>
      <Text style={{ color: colors.navy200, fontSize: 14, lineHeight: 20 }}>{body}</Text>
      <Text style={{ color: colors.navy300, fontSize: 13 }}>Part of TutorHaven Plus. Standard keeps booking, paying per lesson and reviewing tutors.</Text>
      <Button title="About Plus" variant="mint" style={{ marginTop: 6 }} onPress={() => router.push('/membership')} />
    </LinearGradient>
  )
}
