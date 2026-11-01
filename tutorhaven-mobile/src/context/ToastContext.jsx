import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Animated, { FadeInUp, FadeOutUp, LinearTransition } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { CircleAlert, CircleCheck, Info } from 'lucide-react-native'
import { colors, fonts, shadow } from '../theme'

const ToastContext = createContext(null)
const ICON = { success: [CircleCheck, colors.mint400], error: [CircleAlert, '#f0826f'], info: [Info, colors.navy300] }

export function ToastProvider({ children }) {
  const insets = useSafeAreaInsets()
  const [toasts, setToasts] = useState([])
  const push = useCallback((type, message) => {
    const id = Math.random().toString(36).slice(2)
    setToasts((t) => [...t.slice(-2), { id, type, message }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), type === 'error' ? 5000 : 3200)
  }, [])
  const api = useMemo(() => ({ success: (m) => push('success', m), error: (m) => push('error', m), info: (m) => push('info', m) }), [push])
  return (
    <ToastContext.Provider value={api}>
      {children}
      <View pointerEvents="none" style={[styles.wrap, { top: insets.top + 8 }]}>
        {toasts.map((t) => {
          const [Icon, tint] = ICON[t.type]
          return (
            <Animated.View key={t.id} entering={FadeInUp.springify().damping(16)} exiting={FadeOutUp.duration(200)} layout={LinearTransition} style={styles.toast} accessibilityRole="alert">
              <Icon size={20} color={tint} />
              <Text style={styles.text}>{t.message}</Text>
            </Animated.View>
          )
        })}
      </View>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 16, right: 16, gap: 8, zIndex: 1000 },
  toast: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.navy950, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 14, ...shadow.lift },
  text: { flex: 1, color: colors.white, fontFamily: fonts.medium, fontSize: 14, lineHeight: 19 },
})
