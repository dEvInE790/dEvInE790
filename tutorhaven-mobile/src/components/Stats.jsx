import { useEffect, useRef, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import Animated, { FadeInDown, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming, Easing } from 'react-native-reanimated'
import { Skeleton, Tappable, Text } from './ui'
import { colors, fonts, radius, shadow } from '../theme'

/** Counts up to `value` on mount (instant with reduced motion). */
export function useCountUp(value, duration = 1000) {
  const reduce = useReducedMotion()
  const [shown, setShown] = useState(reduce ? value : 0)
  const from = useRef(0)
  useEffect(() => {
    if (reduce) return
    const start = Date.now()
    const a = from.current
    let raf
    const step = () => {
      const t = Math.min(1, (Date.now() - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setShown(a + (value - a) * eased)
      if (t < 1) raf = requestAnimationFrame(step)
      else from.current = value
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [value, duration, reduce])
  return reduce ? value : shown
}

const ACCENT = { mint: [colors.mint50, colors.mint700], navy: [colors.navy50, colors.navy700], amber: [colors.amberBg, colors.amberInk], cream: [colors.cream200, colors.navy800] }

export function StatCard({ icon: Icon, label, value = 0, format = (v) => String(Math.round(v)), hint, accent = 'mint', loading, delay = 0 }) {
  const shown = useCountUp(Number(value) || 0)
  const [bg, fg] = ACCENT[accent]
  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(450)} style={styles.stat}>
      <View style={styles.statTop}>
        <Text variant="small" style={{ flex: 1 }}>{label}</Text>
        {Icon && <View style={[styles.statIcon, { backgroundColor: bg }]}><Icon size={16} color={fg} /></View>}
      </View>
      {loading ? <Skeleton style={{ height: 28, width: 70, marginTop: 8 }} /> : <Text style={styles.statValue}>{format(shown)}</Text>}
      {hint ? <Text variant="small" style={{ color: colors.navy400 }}>{hint}</Text> : null}
    </Animated.View>
  )
}

function Bar({ height, index, active, onPress, label, max }) {
  const reduce = useReducedMotion()
  const h = useSharedValue(reduce ? height : 0)
  useEffect(() => {
    h.set(reduce ? height : withDelay(80 * index, withTiming(height, { duration: 700, easing: Easing.out(Easing.cubic) })))
  }, [height, index, reduce, h])
  const anim = useAnimatedStyle(() => ({ height: h.value }))
  return (
    <Tappable onPress={onPress} haptic={false} accessibilityRole="button" accessibilityLabel={label} style={styles.barHit}>
      <View style={{ height: max, width: '100%', justifyContent: 'flex-end', alignItems: 'center' }}>
        <Animated.View style={[styles.bar, { backgroundColor: active ? colors.navy800 : colors.mint600 }, anim]} />
      </View>
    </Tappable>
  )
}

/** Single-series column chart; tap a bar to read its value. */
export function BarChart({ data, format = (v) => String(v), height = 150 }) {
  const [sel, setSel] = useState(data.length - 1)
  const max = Math.max(1, ...data.map((d) => d.value))
  const showLabel = (i) => data.length <= 6 || (data.length - 1 - i) % 2 === 0
  const cur = data[sel] ?? data[data.length - 1]
  return (
    <View>
      <View style={styles.readout}>
        <Text variant="small">{cur?.detail ?? cur?.label}</Text>
        <Text style={{ fontFamily: fonts.display, fontSize: 20, color: colors.navy950 }}>{format(cur?.value ?? 0)}</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginTop: 10, borderBottomWidth: 1, borderColor: colors.line }}>
        {data.map((d, i) => (
          <Bar key={d.label + i} index={i} height={(d.value / max) * height} max={height} active={i === sel} onPress={() => setSel(i)} label={`${d.detail ?? d.label}: ${format(d.value)}`} />
        ))}
      </View>
      <View style={{ flexDirection: 'row', marginTop: 6 }}>
        {data.map((d, i) => (
          <Text key={i} variant="small" numberOfLines={1} style={{ flex: 1, textAlign: 'center', fontSize: 10, color: i === sel ? colors.navy900 : colors.navy400 }}>
            {showLabel(i) || i === sel ? d.label : ''}
          </Text>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  stat: { flex: 1, minWidth: '45%', backgroundColor: colors.white, borderRadius: radius.lg, padding: 14, borderWidth: 1, borderColor: 'rgba(15,28,54,0.06)', ...shadow.soft },
  statTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statIcon: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontFamily: fonts.display, fontSize: 26, color: colors.navy950, marginTop: 6, letterSpacing: -0.5 },
  barHit: { flex: 1, alignItems: 'center' },
  bar: { width: '56%', maxWidth: 26, borderTopLeftRadius: 5, borderTopRightRadius: 5 },
  readout: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
})
