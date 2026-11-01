import { StyleSheet, View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { router } from 'expo-router'
import { BadgeCheck, Heart, MapPin } from 'lucide-react-native'
import { Avatar, Skeleton, Stars, Tappable, Text } from './ui'
import { colors, radius, shadow, fonts } from '../theme'
import { money } from '../lib/format'
import { useFavourites } from '../context/FavouritesContext'

export default function TutorCard({ tutor, index = 0 }) {
  const { isFavourite, toggle } = useFavourites()
  const fav = isFavourite(tutor.id)
  const rating = Number(tutor.rating) || 0
  return (
    <Animated.View entering={FadeInDown.delay(Math.min(index, 6) * 60).duration(420)}>
      <Tappable onPress={() => router.push(`/tutor/${tutor.id}`)} accessibilityRole="button" accessibilityLabel={`${tutor.full_name}, ${money(tutor.hourly_rate)} per hour`} style={styles.card} scaleTo={0.98}>
        <View style={styles.row}>
          <Avatar name={tutor.full_name} seed={tutor.id} size={54} />
          <View style={{ flex: 1, gap: 2 }}>
            <View style={styles.nameRow}>
              <Text variant="h3" numberOfLines={1} style={{ flexShrink: 1 }}>{tutor.full_name}</Text>
              <BadgeCheck size={16} color={colors.mint600} />
            </View>
            <Text variant="muted" numberOfLines={2} style={{ fontSize: 13, lineHeight: 18 }}>{tutor.headline}</Text>
          </View>
          <Tappable onPress={() => toggle(tutor.id)} accessibilityRole="button" accessibilityLabel={fav ? 'Remove from favourites' : 'Save to favourites'} style={styles.heart} scaleTo={0.85}>
            <Heart size={18} color={fav ? colors.coral : colors.navy300} fill={fav ? colors.coral : 'transparent'} />
          </Tappable>
        </View>
        <View style={styles.subjects}>
          {tutor.subjects.slice(0, 3).map((s) => (
            <View key={s} style={styles.subject}><Text variant="small" style={{ color: colors.navy700 }}>{s}</Text></View>
          ))}
        </View>
        <View style={styles.footer}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
            {tutor.review_count > 0 ? (
              <>
                <Stars value={rating} size={12} />
                <Text variant="small" style={{ color: colors.navy800 }}>{rating.toFixed(1)} ({tutor.review_count})</Text>
              </>
            ) : (
              <View style={styles.new}><Text variant="small" style={{ color: colors.mint700, fontFamily: fonts.semibold }}>New tutor</Text></View>
            )}
            {!!tutor.location && <><MapPin size={12} color={colors.navy400} /><Text variant="small" numberOfLines={1}>{tutor.location}</Text></>}
          </View>
          <Text style={{ fontFamily: fonts.display, fontSize: 17, color: colors.navy950 }}>
            {money(tutor.hourly_rate)}<Text variant="small"> /hr</Text>
          </Text>
        </View>
      </Tappable>
    </Animated.View>
  )
}

export function TutorCardSkeleton() {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Skeleton style={{ width: 54, height: 54, borderRadius: 27 }} />
        <View style={{ flex: 1, gap: 8 }}>
          <Skeleton style={{ height: 16, width: '60%' }} />
          <Skeleton style={{ height: 12, width: '90%' }} />
        </View>
      </View>
      <Skeleton style={{ height: 24, width: '70%', marginTop: 14, borderRadius: 12 }} />
    </View>
  )
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.white, borderRadius: radius.xl, padding: 16, borderWidth: 1, borderColor: 'rgba(15,28,54,0.06)', ...shadow.soft },
  row: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  heart: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cream100 },
  subjects: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  subject: { backgroundColor: colors.cream200, borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 4 },
  footer: { flexDirection: 'row', alignItems: 'center', marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderColor: 'rgba(15,28,54,0.06)', gap: 8 },
  new: { backgroundColor: colors.mint50, borderRadius: radius.full, paddingHorizontal: 8, paddingVertical: 2 },
})
