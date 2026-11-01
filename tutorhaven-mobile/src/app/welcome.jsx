import { StyleSheet, View } from 'react-native'
import { router } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { SafeAreaView } from 'react-native-safe-area-context'
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated'
import { ArrowRight, CircleCheck, Star } from 'lucide-react-native'
import { LogoMark, Wordmark } from '../components/Logo'
import { Avatar, Button, Floating, Text } from '../components/ui'
import { colors, fonts, shadow } from '../theme'

export default function Welcome() {
  return (
    <LinearGradient colors={[colors.navy950, colors.navy900, '#13324a']} style={{ flex: 1 }}>
      <View style={styles.glow} />
      <SafeAreaView style={{ flex: 1, paddingHorizontal: 24 }}>
        <Animated.View entering={FadeIn.duration(500)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 }}>
          <LogoMark size={36} dark animated />
          <Wordmark light size={21} />
        </Animated.View>

        {/* Floating product moments */}
        <View style={styles.art}>
          <Animated.View entering={FadeInDown.delay(250).duration(700)} style={{ position: 'absolute', top: 30, left: 0, right: 40 }}>
            <Floating distance={6} duration={3200}>
              <View style={styles.sessionCard}>
                <Text variant="small" style={{ color: colors.navy400, letterSpacing: 0.6 }}>NEXT SESSION</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 }}>
                  <Avatar name="Adaeze Okafor" size={42} />
                  <View>
                    <Text variant="h3">WAEC Mathematics</Text>
                    <Text variant="muted" style={{ fontSize: 13 }}>Tomorrow · 4:00 PM</Text>
                  </View>
                </View>
                <View style={styles.progress}><View style={styles.progressFill} /></View>
                <Text variant="small" style={{ marginTop: 6 }}>Weekly goal · 3 of 4</Text>
              </View>
            </Floating>
          </Animated.View>
          <Animated.View entering={FadeInDown.delay(500).duration(700)} style={{ position: 'absolute', top: 0, right: 0 }}>
            <Floating distance={9} duration={2800}>
              <View style={styles.chip}><Star size={16} color={colors.amber} fill={colors.amber} /><Text variant="label">Top-rated tutors</Text></View>
            </Floating>
          </Animated.View>
          <Animated.View entering={FadeInDown.delay(750).duration(700)} style={{ position: 'absolute', bottom: 6, right: 4 }}>
            <Floating distance={7} duration={3400}>
              <View style={styles.chip}><CircleCheck size={18} color={colors.mint500} /><Text variant="label">Paid with Paystack</Text></View>
            </Floating>
          </Animated.View>
        </View>

        <View style={{ flex: 1 }} />
        <Animated.View entering={FadeInUp.delay(300).duration(600)}>
          <Text style={styles.title}>Find the right tutor.</Text>
          <Text style={[styles.title, { color: colors.mint300 }]}>Unlock your potential.</Text>
          <Text style={styles.lede}>Verified tutors for WAEC, JAMB, university and beyond. Book in seconds and pay securely in naira.</Text>
        </Animated.View>
        <Animated.View entering={FadeInUp.delay(500).duration(600)} style={{ gap: 12, marginTop: 28, marginBottom: 12 }}>
          <Button title="Get started" variant="mint" size="lg" iconRight={ArrowRight} onPress={() => router.push('/sign-up')} full />
          <Button title="I already have an account" variant="light" size="lg" onPress={() => router.push('/sign-in')} full />
        </Animated.View>
      </SafeAreaView>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  glow: { position: 'absolute', top: -120, right: -120, width: 360, height: 360, borderRadius: 180, backgroundColor: 'rgba(76,200,151,0.18)' },
  art: { height: 260, marginTop: 28 },
  sessionCard: { backgroundColor: colors.white, borderRadius: 24, padding: 18, ...shadow.lift },
  progress: { height: 8, borderRadius: 4, backgroundColor: colors.navy50, marginTop: 14, overflow: 'hidden' },
  progressFill: { width: '75%', height: '100%', borderRadius: 4, backgroundColor: colors.mint500 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.white, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 11, ...shadow.lift },
  title: { fontFamily: fonts.displayHeavy, fontSize: 36, lineHeight: 40, letterSpacing: -1, color: colors.white },
  lede: { fontFamily: fonts.body, fontSize: 16, lineHeight: 24, color: colors.navy200, marginTop: 14 },
})
