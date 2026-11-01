import { StyleSheet, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { router } from 'expo-router'
import { ArrowRight, CalendarDays, Clock } from 'lucide-react-native'
import { Avatar, Button, Floating, Text } from './ui'
import { colors, fonts, shadow } from '../theme'
import { dateLong, relativeFromNow, time } from '../lib/format'

/** Hero card with the next confirmed session, or a call to action. */
export default function NextSession({ booking, viewer = 'learner', emptyTitle, emptyBody, emptyAction }) {
  const other = viewer === 'tutor' ? booking?.student?.full_name : booking?.tutor?.profile?.full_name
  return (
    <Animated.View entering={FadeInDown.duration(500)}>
      <LinearGradient colors={[colors.navy950, colors.navy900, '#163a4a']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
        <View style={styles.glow} />
        <Floating style={styles.float} distance={6}>
          <View style={styles.floatIcon}><CalendarDays size={22} color={colors.mint300} /></View>
        </Floating>
        {booking ? (
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={styles.dot} />
              <Text style={styles.kicker}>Next session · {relativeFromNow(booking.starts_at)}</Text>
            </View>
            <Text style={styles.title}>{booking.subject}</Text>
            <View style={{ gap: 6, marginTop: 10 }}>
              <View style={styles.row}><Avatar name={other} seed={viewer === 'tutor' ? booking.student_id : booking.tutor_id} size={22} /><Text style={styles.meta}>{other}{viewer === 'parent' && booking.student ? ` · for ${booking.student.full_name}` : ''}</Text></View>
              <View style={styles.row}><CalendarDays size={15} color={colors.navy200} /><Text style={styles.meta}>{dateLong(booking.starts_at)}</Text></View>
              <View style={styles.row}><Clock size={15} color={colors.navy200} /><Text style={styles.meta}>{time(booking.starts_at)} – {time(booking.ends_at)}</Text></View>
            </View>
            <Button title="View sessions" variant="mint" size="sm" iconRight={ArrowRight} style={{ alignSelf: 'flex-start', marginTop: 18 }} onPress={() => router.push('/(tabs)/sessions')} />
          </View>
        ) : (
          <View style={{ paddingRight: 50 }}>
            <Text style={[styles.title, { marginTop: 0 }]}>{emptyTitle}</Text>
            <Text style={[styles.meta, { marginTop: 8, lineHeight: 21 }]}>{emptyBody}</Text>
            {emptyAction}
          </View>
        )}
      </LinearGradient>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  card: { borderRadius: 28, padding: 22, overflow: 'hidden', ...shadow.lift },
  glow: { position: 'absolute', top: -60, right: -40, width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(76,200,151,0.22)' },
  float: { position: 'absolute', right: 18, bottom: 18 },
  floatIcon: { width: 52, height: 52, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.mint400 },
  kicker: { fontFamily: fonts.semibold, fontSize: 13, color: colors.mint300 },
  title: { fontFamily: fonts.display, fontSize: 26, color: colors.white, marginTop: 10, letterSpacing: -0.4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  meta: { fontFamily: fonts.medium, fontSize: 14, color: colors.navy200 },
})
