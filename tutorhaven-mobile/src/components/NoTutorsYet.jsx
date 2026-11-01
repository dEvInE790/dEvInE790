import { Share, View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { BadgeCheck, GraduationCap, Send, Sparkles } from 'lucide-react-native'
import { Button, Floating, Text } from './ui'
import { colors, radius, shadow } from '../theme'

/** No tutors are listed yet: honest, warm, with something useful to do. */
export default function NoTutorsYet() {
  const invite = () =>
    Share.share({ message: 'Teach on TutorHaven: set your own rate, get booked and get paid in naira. Download the app and sign up as a tutor.' }).catch(() => {})
  return (
    <Animated.View entering={FadeInDown.duration(450)} style={{ backgroundColor: colors.white, borderRadius: radius.xl, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: colors.line, ...shadow.soft }}>
      <View style={{ width: 140, height: 100 }}>
        <Floating distance={7} style={{ position: 'absolute', left: 34, top: 4 }}>
          <View style={{ width: 72, height: 72, borderRadius: 24, backgroundColor: colors.navy900, alignItems: 'center', justifyContent: 'center', ...shadow.lift }}><GraduationCap size={36} color={colors.mint300} /></View>
        </Floating>
        <Floating distance={5} duration={2600} style={{ position: 'absolute', left: 0, bottom: 0 }}>
          <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', ...shadow.soft }}><BadgeCheck size={18} color={colors.mint600} /></View>
        </Floating>
        <Floating distance={6} duration={3300} style={{ position: 'absolute', right: 0, top: 0 }}>
          <View style={{ width: 32, height: 32, borderRadius: 11, backgroundColor: colors.mint400, alignItems: 'center', justifyContent: 'center' }}><Sparkles size={16} color={colors.navy950} /></View>
        </Floating>
      </View>
      <Text variant="h2" style={{ textAlign: 'center', marginTop: 12 }}>Our first tutors are on their way</Text>
      <Text variant="muted" style={{ textAlign: 'center', marginTop: 8 }}>Every tutor is reviewed before they appear here, so the directory is still filling up. Check back soon, or help us grow it.</Text>
      <View style={{ alignSelf: 'stretch', gap: 10, marginTop: 20 }}>
        <Button title="Invite a tutor you know" icon={Send} onPress={invite} full />
      </View>
    </Animated.View>
  )
}
