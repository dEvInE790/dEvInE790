// TutorHaven mobile UI kit: typography, buttons with spring feedback, inputs,
// chips, badges, avatars, cards, skeletons and empty states.
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text as RNText, TextInput, View } from 'react-native'
import Animated, {
  FadeInDown, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSequence, withSpring, withTiming, Easing,
} from 'react-native-reanimated'
import { LinearGradient } from 'expo-linear-gradient'
import * as Haptics from 'expo-haptics'
import { Star } from 'lucide-react-native'
import { colors, fonts, radius, shadow } from '../theme'
import { initials } from '../lib/format'

export const tap = (style = 'light') => {
  if (Platform.OS === 'web') return
  Haptics.impactAsync(style === 'medium' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light).catch(() => {})
}

// ---------------------------------------------------------------------------
// Text
// ---------------------------------------------------------------------------
const TEXT = {
  hero: { fontFamily: fonts.displayHeavy, fontSize: 38, lineHeight: 42, letterSpacing: -1.2, color: colors.navy950 },
  h1: { fontFamily: fonts.display, fontSize: 28, lineHeight: 33, letterSpacing: -0.6, color: colors.navy950 },
  h2: { fontFamily: fonts.display, fontSize: 21, lineHeight: 26, letterSpacing: -0.3, color: colors.navy950 },
  h3: { fontFamily: fonts.displaySemi, fontSize: 17, lineHeight: 22, color: colors.navy950 },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.navy700 },
  muted: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.navy500 },
  small: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 16, color: colors.navy500 },
  label: { fontFamily: fonts.semibold, fontSize: 14, color: colors.navy800 },
  eyebrow: { fontFamily: fonts.semibold, fontSize: 12, letterSpacing: 0.8, textTransform: 'uppercase', color: colors.mint700 },
}
export function Text({ variant = 'body', style, ...rest }) {
  const base = TEXT[variant]
  const own = StyleSheet.flatten(style) ?? {}
  // A bigger font than the variant's keeps the variant's line height unless we
  // adjust it, and iOS then clips the tops of the glyphs (e.g. large prices).
  const fix = own.fontSize && !own.lineHeight && base.lineHeight && own.fontSize > base.fontSize
    ? { lineHeight: Math.round(own.fontSize * 1.22) }
    : null
  return <RNText style={[base, style, fix]} {...rest} />
}

// ---------------------------------------------------------------------------
// Pressable with spring scale
// ---------------------------------------------------------------------------
const APressable = Animated.createAnimatedComponent(Pressable)
export function Tappable({ onPress, style, children, scaleTo = 0.97, haptic = true, disabled, ...rest }) {
  const scale = useSharedValue(1)
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))
  return (
    <APressable
      onPressIn={() => scale.set(withSpring(scaleTo, { damping: 18, stiffness: 400 }))}
      onPressOut={() => scale.set(withSpring(1, { damping: 14, stiffness: 300 }))}
      onPress={(e) => {
        if (disabled) return
        if (haptic) tap()
        onPress?.(e)
      }}
      disabled={disabled}
      style={[style, anim]}
      {...rest}
    >
      {children}
    </APressable>
  )
}

const BTN = {
  primary: { bg: colors.navy900, fg: colors.white },
  mint: { bg: colors.mint400, fg: colors.navy950 },
  secondary: { bg: colors.white, fg: colors.navy900, border: colors.line },
  ghost: { bg: 'transparent', fg: colors.navy700 },
  danger: { bg: colors.coralBg, fg: colors.coralInk },
  light: { bg: 'rgba(255,255,255,0.12)', fg: colors.white, border: 'rgba(255,255,255,0.18)' },
}
export function Button({ title, onPress, variant = 'primary', size = 'md', icon: Icon, iconRight: IconRight, loading, disabled, style, full, accessibilityLabel }) {
  const v = BTN[variant]
  const h = size === 'lg' ? 54 : size === 'sm' ? 38 : 48
  const off = disabled || loading
  return (
    <Tappable
      onPress={onPress}
      disabled={off}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: !!off, busy: !!loading }}
      style={[
        styles.btn,
        { height: h, backgroundColor: v.bg, borderColor: v.border ?? 'transparent', paddingHorizontal: size === 'sm' ? 14 : 20, opacity: off ? 0.55 : 1 },
        variant === 'primary' && shadow.soft,
        variant === 'mint' && shadow.glow,
        full && { alignSelf: 'stretch' },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={v.fg} size="small" /> : Icon ? <Icon size={size === 'sm' ? 16 : 18} color={v.fg} /> : null}
      {!!title && <RNText style={[styles.btnText, { color: v.fg, fontSize: size === 'sm' ? 14 : 16 }]}>{title}</RNText>}
      {IconRight && !loading ? <IconRight size={18} color={v.fg} /> : null}
    </Tappable>
  )
}

// ---------------------------------------------------------------------------
// Inputs
// ---------------------------------------------------------------------------
export const Field = forwardRef(function Field({ label, error, hint, icon: Icon, style, multiline, ...rest }, ref) {
  const [focus, setFocus] = useState(false)
  const input = useRef(null)
  useImperativeHandle(ref, () => input.current)
  return (
    <View style={[{ gap: 6 }, style]}>
      {label && <Text variant="label">{label}</Text>}
      {/* The whole box focuses the input, not just the line of text inside it. */}
      <Pressable
        onPress={() => input.current?.focus()}
        accessible={false}
        style={[styles.input, multiline && { height: 120, alignItems: 'flex-start', paddingTop: 12 }, focus && styles.inputFocus, error && { borderColor: colors.coral }]}
      >
        {Icon && <View style={{ flexShrink: 0 }} pointerEvents="none"><Icon size={18} color={colors.navy400} /></View>}
        <TextInput
          ref={input}
          placeholderTextColor={colors.navy300}
          style={[styles.inputText, multiline && { textAlignVertical: 'top' }]}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          multiline={multiline}
          accessibilityLabel={label}
          {...rest}
        />
      </Pressable>
      {error ? <Text variant="small" style={{ color: colors.coralInk }}>{error}</Text> : hint ? <Text variant="small" style={{ color: colors.navy400 }}>{hint}</Text> : null}
    </View>
  )
})

export function Chip({ label, selected, onPress, size = 'md' }) {
  return (
    <Tappable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[styles.chip, size === 'sm' && { paddingHorizontal: 12, paddingVertical: 7 }, selected ? styles.chipOn : null]}
    >
      <RNText style={[styles.chipText, size === 'sm' && { fontSize: 13 }, selected && { color: colors.white }]}>{label}</RNText>
    </Tappable>
  )
}

export function ChipGroup({ options, value, onChange, multiple = true, size }) {
  const sel = multiple ? value : [value]
  return (
    <View style={styles.chips}>
      {options.map((o) => (
        <Chip key={o} label={o} size={size} selected={sel.includes(o)} onPress={() => (multiple ? onChange(sel.includes(o) ? sel.filter((x) => x !== o) : [...sel, o]) : onChange(o))} />
      ))}
    </View>
  )
}

// ---------------------------------------------------------------------------
// Display
// ---------------------------------------------------------------------------
export function Card({ children, style, delay = 0, animated = true }) {
  if (!animated) return <View style={[styles.card, style]}>{children}</View>
  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(450).easing(Easing.out(Easing.cubic))} style={[styles.card, style]}>
      {children}
    </Animated.View>
  )
}

const BADGE = {
  mint: [colors.mint50, colors.mint700], navy: [colors.navy50, colors.navy700], amber: [colors.amberBg, colors.amberInk],
  coral: [colors.coralBg, colors.coralInk], neutral: [colors.cream200, colors.navy700], dark: [colors.navy900, colors.white],
}
export function Badge({ tone = 'neutral', children, icon: Icon }) {
  const [bg, fg] = BADGE[tone]
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      {Icon && <Icon size={12} color={fg} />}
      <RNText style={[styles.badgeText, { color: fg }]}>{children}</RNText>
    </View>
  )
}
const STATUS = { pending_payment: ['amber', 'Awaiting payment'], confirmed: ['mint', 'Confirmed'], completed: ['navy', 'Completed'], cancelled: ['neutral', 'Cancelled'] }
export const StatusBadge = ({ status }) => <Badge tone={(STATUS[status] ?? ['neutral'])[0]}>{(STATUS[status] ?? [, status])[1]}</Badge>

const GRADIENTS = [['#0f1c36', '#27ae7c'], ['#182746', '#4a5f8f'], ['#1a8d64', '#7fdcb8'], ['#24365c', '#9aabcf'], ['#165a43', '#4cc897'], ['#344874', '#b0ebd3']]
const hash = (s = '') => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h) }
export function Avatar({ name = '', seed, size = 48, ring }) {
  const g = GRADIENTS[hash(seed || name) % GRADIENTS.length]
  return (
    <LinearGradient colors={g} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center' }, ring && { borderWidth: 3, borderColor: colors.white }]}>
      <RNText style={{ color: colors.white, fontFamily: fonts.display, fontSize: size * 0.34 }}>{initials(name)}</RNText>
    </LinearGradient>
  )
}

export function Stars({ value = 0, size = 13 }) {
  return (
    <View style={{ flexDirection: 'row', gap: 1 }} accessibilityLabel={`${Number(value).toFixed(1)} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={size} color={i <= Math.round(value) ? colors.amber : colors.navy200} fill={i <= Math.round(value) ? colors.amber : colors.navy200} strokeWidth={0} />
      ))}
    </View>
  )
}

/** Shimmering placeholder block. */
export function Skeleton({ style }) {
  const reduce = useReducedMotion()
  const x = useSharedValue(0)
  useEffect(() => {
    if (!reduce) x.set(withRepeat(withSequence(withTiming(1, { duration: 900 }), withTiming(0, { duration: 900 })), -1))
  }, [reduce, x])
  const anim = useAnimatedStyle(() => ({ opacity: 0.55 + x.value * 0.45 }))
  return <Animated.View style={[{ backgroundColor: colors.navy100, borderRadius: 12 }, style, anim]} />
}

export function EmptyState({ icon: Icon, title, body, action }) {
  return (
    <Animated.View entering={FadeInDown.duration(400)} style={{ alignItems: 'center', paddingVertical: 32, paddingHorizontal: 16 }}>
      {Icon && (
        <Floating distance={5}>
          <View style={styles.emptyIcon}><Icon size={28} color={colors.mint700} /></View>
        </Floating>
      )}
      <Text variant="h3" style={{ marginTop: 16, textAlign: 'center' }}>{title}</Text>
      {body && <Text variant="muted" style={{ marginTop: 6, textAlign: 'center' }}>{body}</Text>}
      {action && <View style={{ marginTop: 18 }}>{action}</View>}
    </Animated.View>
  )
}

/** Gentle endless bobbing for decorative elements. */
export function Floating({ children, distance = 8, duration = 3000, style }) {
  const reduce = useReducedMotion()
  const y = useSharedValue(0)
  useEffect(() => {
    if (!reduce) y.set(withRepeat(withSequence(withTiming(-distance, { duration, easing: Easing.inOut(Easing.sin) }), withTiming(0, { duration, easing: Easing.inOut(Easing.sin) })), -1))
  }, [reduce, distance, duration, y])
  const anim = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }))
  return <Animated.View style={[style, anim]}>{children}</Animated.View>
}

export function Segmented({ options, value, onChange }) {
  return (
    <View style={styles.segment} accessibilityRole="tablist">
      {options.map((o) => {
        const on = o.value === value
        return (
          <Tappable key={o.value} onPress={() => onChange(o.value)} accessibilityRole="tab" accessibilityState={{ selected: on }} style={[styles.segmentItem, on && styles.segmentOn]}>
            <RNText style={[styles.segmentText, on && { color: colors.navy950 }]}>{o.label}{o.count != null ? `  ${o.count}` : ''}</RNText>
          </Tappable>
        )
      })}
    </View>
  )
}

export const styles = StyleSheet.create({
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: radius.md, borderWidth: 1 },
  btnText: { fontFamily: fonts.semibold },
  input: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 50, borderRadius: radius.md, borderWidth: 1, borderColor: 'rgba(15,28,54,0.12)', backgroundColor: colors.white, paddingHorizontal: 14 },
  inputFocus: { borderColor: colors.mint500, ...shadow.soft },
  inputText: { flex: 1, alignSelf: 'stretch', fontFamily: fonts.body, fontSize: 16, color: colors.navy950, paddingVertical: 0, ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : null) },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderRadius: radius.full, borderWidth: 1, borderColor: 'rgba(15,28,54,0.12)', backgroundColor: colors.white, paddingHorizontal: 15, paddingVertical: 9 },
  chipOn: { backgroundColor: colors.navy900, borderColor: colors.navy900 },
  chipText: { fontFamily: fonts.medium, fontSize: 14, color: colors.navy700 },
  card: { backgroundColor: colors.white, borderRadius: radius.xl, borderWidth: 1, borderColor: 'rgba(15,28,54,0.06)', padding: 18, ...shadow.soft },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', borderRadius: radius.full, paddingHorizontal: 9, paddingVertical: 4 },
  badgeText: { fontFamily: fonts.semibold, fontSize: 11 },
  emptyIcon: { width: 64, height: 64, borderRadius: 20, backgroundColor: colors.mint100, alignItems: 'center', justifyContent: 'center' },
  segment: { flexDirection: 'row', backgroundColor: 'rgba(15,28,54,0.05)', borderRadius: radius.lg, padding: 4, alignSelf: 'flex-start' },
  segmentItem: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.md },
  segmentOn: { backgroundColor: colors.white, ...shadow.soft },
  segmentText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.navy500 },
})
