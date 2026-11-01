import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View } from 'react-native'
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { X } from 'lucide-react-native'
import { Tappable, Text } from './ui'
import { colors } from '../theme'

/** Bottom sheet with a dimmed backdrop; tap outside or the close button to dismiss. */
export default function Sheet({ visible, onClose, title, subtitle, children }) {
  const insets = useSafeAreaInsets()
  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      {visible && (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end' }}>
          <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)} style={StyleSheet.absoluteFill}>
            <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />
          </Animated.View>
          <Animated.View entering={SlideInDown.springify().damping(18)} exiting={SlideOutDown.duration(220)} style={[styles.panel, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]} accessibilityViewIsModal>
            <View style={styles.grabber} />
            <View style={styles.head}>
              <View style={{ flex: 1 }}>
                <Text variant="h2">{title}</Text>
                {subtitle && <Text variant="muted" style={{ marginTop: 4 }}>{subtitle}</Text>}
              </View>
              <Tappable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" style={styles.close}>
                <X size={18} color={colors.navy500} />
              </Tappable>
            </View>
            {children}
          </Animated.View>
        </KeyboardAvoidingView>
      )}
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(10,20,40,0.45)' },
  panel: { backgroundColor: colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 10, gap: 14 },
  grabber: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: colors.navy100, marginBottom: 6 },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  close: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.navy50, alignItems: 'center', justifyContent: 'center' },
})
