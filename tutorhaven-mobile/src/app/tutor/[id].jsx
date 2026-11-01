import { useMemo } from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { SafeAreaView } from 'react-native-safe-area-context'
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated'
import { BadgeCheck, ChevronLeft, FileCheck2, Globe, Heart, MapPin, MessageCircle, MessageSquareQuote } from 'lucide-react-native'
import { Avatar, Button, Card, EmptyState, Skeleton, Stars, Tappable, Text } from '../../components/ui'
import useAsync from '../../lib/useAsync'
import { getBusySlots, getPublicQualifications, getTutor, getTutorReviews } from '../../lib/api'
import { generateSlots, groupByLocalDay } from '../../lib/time'
import { dayShort, money, monthShort } from '../../lib/format'
import { useAuth } from '../../context/AuthContext'
import { useFavourites } from '../../context/FavouritesContext'
import { colors, fonts, radius, shadow } from '../../theme'

export default function TutorProfile() {
  const { id } = useLocalSearchParams()
  const { profile } = useAuth()
  const { isFavourite, toggle } = useFavourites()
  const tutor = useAsync(() => getTutor(id), [id])
  const reviews = useAsync(() => getTutorReviews(id), [id])
  const quals = useAsync(() => getPublicQualifications(id), [id])
  const busy = useAsync(() => getBusySlots(id, new Date(), new Date(Date.now() + 8 * 864e5)), [id])
  const t = tutor.data

  const week = useMemo(() => {
    if (!t) return []
    const groups = groupByLocalDay(generateSlots({ availability: t.availability, timezone: t.timezone, busy: busy.data ?? [], duration: 60, days: 7 }))
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + i)
      return { date: d, count: groups.find((g) => g.date.getTime() === d.getTime())?.slots.length ?? 0 }
    })
  }, [t, busy.data])
  const maxCount = Math.max(1, ...week.map((w) => w.count))
  const isLearner = profile && ['student', 'parent'].includes(profile.role)
  const canBook = t?.listed && isLearner && profile.id !== id
  const canMessage = t && isLearner && profile.id !== id

  return (
    <View style={{ flex: 1, backgroundColor: colors.cream100 }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <LinearGradient colors={[colors.navy950, colors.navy900, '#163a4a']} style={styles.banner}>
          <SafeAreaView edges={['top']} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16 }}>
            <Tappable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back" style={styles.round}><ChevronLeft size={22} color={colors.white} /></Tappable>
            {t && (
              <Tappable onPress={() => toggle(t.id)} accessibilityRole="button" accessibilityLabel={isFavourite(t.id) ? 'Remove from favourites' : 'Save to favourites'} style={styles.round} scaleTo={0.85}>
                <Heart size={20} color={isFavourite(t.id) ? colors.coral : colors.white} fill={isFavourite(t.id) ? colors.coral : 'transparent'} />
              </Tappable>
            )}
          </SafeAreaView>
        </LinearGradient>

        <View style={{ paddingHorizontal: 20, marginTop: -64, gap: 16 }}>
          <Animated.View entering={FadeInDown.duration(500)} style={styles.idCard}>
            {tutor.loading ? <Skeleton style={{ height: 160 }} /> : !t ? <EmptyState title="Tutor not found" body="This tutor may no longer be taking students." /> : (
              <>
                <View style={{ marginTop: -56, alignSelf: 'flex-start' }}><Avatar name={t.full_name} seed={t.id} size={88} ring /></View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 }}>
                  <Text variant="h1" style={{ flexShrink: 1 }}>{t.full_name}</Text>
                  <BadgeCheck size={22} color={colors.mint600} />
                </View>
                <Text variant="body" style={{ marginTop: 4 }}>{t.headline}</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 10 }}>
                  {!!t.location && <View style={styles.meta}><MapPin size={14} color={colors.navy400} /><Text variant="small">{t.location}</Text></View>}
                  <View style={styles.meta}><Globe size={14} color={colors.navy400} /><Text variant="small">{t.languages.join(', ')}</Text></View>
                </View>
                <View style={styles.statsRow}>
                  {[[t.review_count ? Number(t.rating).toFixed(1) + ' ★' : 'New', 'Rating'], [`${t.years_experience} yrs`, 'Experience'], [String(t.sessions_completed), 'Sessions']].map(([v, l]) => (
                    <View key={l} style={{ flex: 1, alignItems: 'center' }}>
                      <Text style={{ fontFamily: fonts.display, fontSize: 20, color: colors.navy950 }}>{v}</Text>
                      <Text variant="small">{l}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}
          </Animated.View>

          {t && (
            <>
              <Card delay={100}>
                <Text variant="h3">About</Text>
                <Text variant="body" style={{ marginTop: 8 }}>{t.bio || 'This tutor hasn’t written a bio yet.'}</Text>
                <Text variant="label" style={{ marginTop: 16 }}>Subjects</Text>
                <View style={styles.tags}>{t.subjects.map((s) => <View key={s} style={[styles.tag, { backgroundColor: colors.navy900 }]}><Text variant="small" style={{ color: colors.white }}>{s}</Text></View>)}</View>
                <Text variant="label" style={{ marginTop: 14 }}>Levels</Text>
                <View style={styles.tags}>{t.levels.map((s) => <View key={s} style={styles.tag}><Text variant="small" style={{ color: colors.navy700 }}>{s}</Text></View>)}</View>
              </Card>
              {quals.data?.length > 0 && (
                <Card delay={130} style={{ gap: 10 }}>
                  <Text variant="h3">Verified qualifications</Text>
                  {quals.data.map((q) => (
                    <View key={q.id} style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                      <View style={{ width: 34, height: 34, borderRadius: 11, backgroundColor: colors.mint100, alignItems: 'center', justifyContent: 'center' }}><FileCheck2 size={16} color={colors.mint700} /></View>
                      <View style={{ flex: 1 }}>
                        <Text variant="label">{q.title}</Text>
                        <Text variant="small">{[q.institution, q.year].filter(Boolean).join(' · ')}</Text>
                      </View>
                    </View>
                  ))}
                </Card>
              )}
              <Card delay={160}>
                <Text variant="h3">This week’s availability</Text>
                <Text variant="small">One-hour openings in your time zone</Text>
                <View style={{ flexDirection: 'row', gap: 6, marginTop: 14 }}>
                  {week.map((d, i) => (
                    <View key={i} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                      <Text variant="small" style={{ fontSize: 10 }}>{dayShort(d.date).toUpperCase()}</Text>
                      <Text variant="label" style={{ fontSize: 13 }}>{d.date.getDate()}</Text>
                      <View style={styles.barTrack}>
                        <Animated.View entering={FadeInUp.delay(200 + i * 50)} style={{ width: '100%', borderRadius: 8, height: `${d.count ? Math.max(14, (d.count / maxCount) * 100) : 8}%`, backgroundColor: d.count ? colors.mint500 : colors.navy100 }} />
                      </View>
                      <Text variant="small" style={{ fontSize: 10 }}>{d.count || '—'}</Text>
                    </View>
                  ))}
                </View>
              </Card>
              <Card delay={220}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text variant="h3">Reviews</Text>
                  {t.review_count > 0 && <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Stars value={Number(t.rating)} /><Text variant="small">{t.review_count}</Text></View>}
                </View>
                {reviews.loading ? <Skeleton style={{ height: 60, marginTop: 10 }} /> : !reviews.data?.length ? <EmptyState icon={MessageSquareQuote} title="No reviews yet" body="Reviews appear after completed sessions." /> : (
                  reviews.data.slice(0, 10).map((r) => (
                    <View key={r.id} style={{ paddingVertical: 12, borderTopWidth: 1, borderColor: colors.line, marginTop: 10, gap: 6 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <Avatar name={r.author_name} seed={r.id} size={30} />
                        <View style={{ flex: 1 }}><Text variant="label">{r.author_name}</Text><Text variant="small">{r.subject} · {monthShort(r.created_at)} {new Date(r.created_at).getDate()}</Text></View>
                        <Stars value={r.rating} size={12} />
                      </View>
                      {!!r.comment && <Text variant="body" style={{ fontSize: 14 }}>{r.comment}</Text>}
                    </View>
                  ))
                )}
              </Card>
            </>
          )}
        </View>
      </ScrollView>
      {t && (
        <Animated.View entering={FadeInUp.delay(300).duration(400)} style={styles.bottom}>
          <SafeAreaView edges={['bottom']} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12 }}>
            <Text style={{ fontFamily: fonts.display, fontSize: 22, color: colors.navy950 }}>{money(t.hourly_rate)}<Text variant="small"> / hour</Text></Text>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              {canMessage && <Button title="" icon={MessageCircle} variant="secondary" accessibilityLabel={`Message ${t.full_name}`} onPress={() => router.push(`/messages/${t.id}`)} />}
              {canBook ? <Button title="Book a session" onPress={() => router.push(`/book/${t.id}`)} />
                : <Text variant="small">{profile?.id === id ? 'This is your listing' : !t.listed ? 'Not taking bookings' : 'Booking is for learners'}</Text>}
            </View>
          </SafeAreaView>
        </Animated.View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  banner: { height: 190, paddingTop: 4 },
  round: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  idCard: { backgroundColor: colors.white, borderRadius: radius.xl, padding: 20, ...shadow.lift },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statsRow: { flexDirection: 'row', marginTop: 18, paddingTop: 16, borderTopWidth: 1, borderColor: colors.line },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  tag: { backgroundColor: colors.cream200, borderRadius: radius.full, paddingHorizontal: 11, paddingVertical: 6 },
  barTrack: { height: 70, width: '100%', backgroundColor: colors.cream100, borderRadius: 10, padding: 3, justifyContent: 'flex-end' },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.97)', borderTopWidth: 1, borderColor: colors.line, paddingBottom: 8 },
})
