import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { ChevronLeft } from 'lucide-react-native'
import Animated, { FadeIn } from 'react-native-reanimated'
import { Tappable, Text } from './ui'
import { colors } from '../theme'

/** Standard screen: safe area, optional back button and title, pull to refresh. */
export default function Screen({ title, subtitle, eyebrow, back, right, children, onRefresh, refreshing = false, scroll = true, footer, contentStyle, edges = ['top'] }) {
  const header = (title || back) && (
    <Animated.View entering={FadeIn.duration(300)} style={styles.header}>
      {back && (
        <Tappable onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} accessibilityRole="button" accessibilityLabel="Back" style={styles.back}>
          <ChevronLeft size={22} color={colors.navy900} />
        </Tappable>
      )}
      <View style={{ flex: 1 }}>
        {eyebrow && <Text variant="eyebrow" style={{ marginBottom: 4 }}>{eyebrow}</Text>}
        {title && <Text variant="h1">{title}</Text>}
        {subtitle && <Text variant="muted" style={{ marginTop: 4 }}>{subtitle}</Text>}
      </View>
      {right}
    </Animated.View>
  )
  return (
    <SafeAreaView edges={edges} style={styles.root}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[styles.content, contentStyle]}
          keyboardShouldPersistTaps="handled"
          refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.mint600} /> : undefined}
        >
          {header}
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.content, { flex: 1 }, contentStyle]}>
          {header}
          {children}
        </View>
      )}
      {footer}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream100 },
  content: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 8, gap: 16 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 4 },
  back: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.line, marginTop: 2 },
})
