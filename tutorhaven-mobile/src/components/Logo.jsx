import { useEffect } from 'react'
import { Text, View } from 'react-native'
import Svg, { Path, Rect } from 'react-native-svg'
import Animated, { useAnimatedProps, useReducedMotion, useSharedValue, withDelay, withTiming, Easing } from 'react-native-reanimated'
import { colors, fonts } from '../theme'

const APath = Animated.createAnimatedComponent(Path)
const ROOF = 'M10 19.5 20 11l10 8.5'
const BOOK = 'M12 22.5c2.8-1 5.4-.6 8 1.2 2.6-1.8 5.2-2.2 8-1.2v7.3c-2.8-1-5.4-.6-8 1.2-2.6-1.8-5.2-2.2-8-1.2z'

/** The TutorHaven mark: a sheltering roof over an open book. `animated` draws the strokes in. */
export function LogoMark({ size = 36, dark = false, animated = false }) {
  const reduce = useReducedMotion()
  const roof = useSharedValue(animated && !reduce ? 1 : 0)
  const book = useSharedValue(animated && !reduce ? 1 : 0)
  useEffect(() => {
    if (!animated || reduce) return
    roof.set(withDelay(250, withTiming(0, { duration: 700, easing: Easing.out(Easing.cubic) })))
    book.set(withDelay(500, withTiming(0, { duration: 800, easing: Easing.out(Easing.cubic) })))
  }, [animated, reduce, roof, book])
  const roofProps = useAnimatedProps(() => ({ strokeDashoffset: roof.value * 30 }))
  const bookProps = useAnimatedProps(() => ({ strokeDashoffset: book.value * 60 }))
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Rect width="40" height="40" rx="11" fill={dark ? colors.cream50 : colors.navy900} />
      <APath d={ROOF} fill="none" stroke={colors.mint400} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="30" animatedProps={roofProps} />
      <APath d={BOOK} fill="none" stroke={dark ? colors.navy900 : colors.cream100} strokeWidth="2.4" strokeLinejoin="round" strokeDasharray="60" animatedProps={bookProps} />
    </Svg>
  )
}

export function Wordmark({ light = false, size = 20 }) {
  return (
    <Text style={{ fontFamily: fonts.display, fontSize: size, letterSpacing: -0.4, color: light ? colors.white : colors.navy950 }}>
      Tutor<Text style={{ color: light ? colors.mint300 : colors.mint600 }}>Haven</Text>
    </Text>
  )
}

export function LogoLockup({ light, size = 32 }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <LogoMark size={size} dark={light} />
      <Wordmark light={light} size={size * 0.6} />
    </View>
  )
}
