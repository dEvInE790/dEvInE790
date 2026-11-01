import { useMemo, useState } from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import Animated, { FadeIn } from 'react-native-reanimated'
import { ArrowRight, CalendarX2, Globe } from 'lucide-react-native'
import Screen from '../../components/Screen'
import { Avatar, Button, Card, ChipGroup, EmptyState, Field, Segmented, Skeleton, Tappable, Text } from '../../components/ui'
import useAsync from '../../lib/useAsync'
import { activeDiscount, createBooking, getBusySlots, getSubscription, getTutor, listChildren } from '../../lib/api'
import { browserTimezone, generateSlots, groupByLocalDay } from '../../lib/time'
import { DURATIONS } from '../../lib/constants'
import { dateLong, dayShort, money, time } from '../../lib/format'
import { useAuth } from '../../context/AuthContext'
import { useSettings } from '../../context/SettingsContext'
import { useToast } from '../../context/ToastContext'
import { colors, fonts, radius, shadow } from '../../theme'

export default function Book() {
  const { id } = useLocalSearchParams()
  const { profile } = useAuth()
  const { settings } = useSettings()
  const toast = useToast()
  const isParent = profile.role === 'parent'
  const tutor = useAsync(() => getTutor(id), [id])
  const children = useAsync(() => listChildren(profile.id), [profile.id], { enabled: isParent })
  const sub = useAsync(() => getSubscription(profile.id), [profile.id])
  const busy = useAsync(() => getBusySlots(id, new Date(), new Date(Date.now() + 22 * 864e5)), [id])
  const [subjectPick, setSubject] = useState('')
  const [learnerPick, setLearner] = useState('')
  const [duration, setDuration] = useState(60)
  const [dayKey, setDayKey] = useState(null)
  const [pick, setPick] = useState(null) // { dayKey, duration, time }
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const t = tutor.data

  const days = useMemo(() => (t ? groupByLocalDay(generateSlots({ availability: t.availability, timezone: t.timezone, busy: busy.data ?? [], duration, days: 21 })) : []), [t, busy.data, duration])

  // Sensible defaults derived from loaded data; the learner's picks override them.
  const subject = subjectPick || t?.subjects?.[0] || ''
  const learner = learnerPick || (isParent ? children.data?.[0]?.id ?? '' : profile.id)
  const day = days.find((d) => d.key === dayKey) ?? days[0]
  const slot = pick && pick.dayKey === day?.key && pick.duration === duration ? pick.time : null
  const setSlot = (time) => setPick(time ? { dayKey: day?.key, duration, time } : null)
  const discount = activeDiscount(sub.data)
  const price = t ? Math.round((t.hourly_rate * duration) / 60) : 0
  const total = Math.round(price * (1 - discount))
  const needsChild = isParent && children.data && children.data.length === 0

  const submit = async () => {
    setSubmitting(true)
    try {
      const b = await createBooking({ tutorId: id, studentId: learner, subject, startsAt: slot, duration, notes })
      router.replace(`/checkout/${b.id}`)
    } catch (e) {
      toast.error(e.message)
      busy.reload({ silent: true })
      setSlot(null)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Screen back title="Book a session" subtitle={t ? `with ${t.full_name}` : ' '} footer={
      <SafeAreaView edges={['bottom']} style={styles.footer}>
        <View style={{ flex: 1 }}>
          <Text variant="small" numberOfLines={1}>{slot ? `${dateLong(slot)} · ${time(slot)}` : 'Choose a time'}</Text>
          <Text style={{ fontFamily: fonts.display, fontSize: 22, color: colors.navy950 }}>{money(total)}{discount > 0 && <Text variant="small" style={{ color: colors.mint700 }}>  −{Math.round(discount * 100)}% member</Text>}</Text>
        </View>
        <Button title="Continue" iconRight={ArrowRight} loading={submitting} disabled={!slot || !subject || !learner || needsChild} onPress={submit} />
      </SafeAreaView>
    }>
      {needsChild ? (
        <EmptyState title="Link your child first" body="Parent accounts book for a linked learner. Add your child from Home." action={<Button title="Go home" onPress={() => router.replace('/(tabs)')} />} />
      ) : tutor.loading ? <Skeleton style={{ height: 300, borderRadius: 24 }} /> : !t ? <EmptyState title="Tutor not found" /> : (
        <>
          <Card delay={0} style={{ gap: 12 }}>
            <Text variant="h3">What would you like to learn?</Text>
            <ChipGroup multiple={false} options={t.subjects} value={subject} onChange={setSubject} />
            {isParent && children.data?.length > 0 && (
              <>
                <Text variant="label" style={{ marginTop: 6 }}>Who is this for?</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {children.data.map((c) => (
                    <Tappable key={c.id} onPress={() => setLearner(c.id)} accessibilityRole="radio" accessibilityState={{ selected: learner === c.id }} style={[styles.kid, learner === c.id && styles.kidOn]}>
                      <Avatar name={c.full_name} seed={c.id} size={24} />
                      <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: learner === c.id ? colors.white : colors.navy900 }}>{c.full_name}</Text>
                    </Tappable>
                  ))}
                </View>
              </>
            )}
          </Card>
          <Card delay={60} style={{ gap: 12 }}>
            <Text variant="h3">Session length</Text>
            <Segmented value={duration} onChange={setDuration} options={DURATIONS.map((d) => ({ value: d, label: `${d} min` }))} />
          </Card>
          <Card delay={120} style={{ gap: 12 }}>
            <Text variant="h3">Pick a time</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Globe size={14} color={colors.navy400} /><Text variant="small">Times in {browserTimezone().replace(/_/g, ' ')}</Text></View>
            {busy.loading ? <Skeleton style={{ height: 160 }} /> : days.length === 0 ? (
              <EmptyState icon={CalendarX2} title="No openings in the next 3 weeks" body="Try a shorter session or check back soon." />
            ) : (
              <>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  {days.map((d) => {
                    const on = d.key === day?.key
                    return (
                      <Tappable key={d.key} onPress={() => setDayKey(d.key)} accessibilityRole="button" accessibilityState={{ selected: on }} style={[styles.day, on && styles.dayOn]}>
                        <Text style={{ fontFamily: fonts.semibold, fontSize: 11, color: on ? colors.mint300 : colors.navy400 }}>{dayShort(d.date).toUpperCase()}</Text>
                        <Text style={{ fontFamily: fonts.display, fontSize: 20, color: on ? colors.white : colors.navy900 }}>{d.date.getDate()}</Text>
                        <Text style={{ fontFamily: fonts.medium, fontSize: 10, color: on ? colors.navy200 : colors.navy400 }}>{d.slots.length} open</Text>
                      </Tappable>
                    )
                  })}
                </ScrollView>
                <Animated.View key={`${day?.key}-${duration}`} entering={FadeIn.duration(250)} style={styles.slots}>
                  {day?.slots.map((s) => {
                    const on = slot?.getTime() === s.getTime()
                    return (
                      <Tappable key={s.toISOString()} onPress={() => setSlot(s)} accessibilityRole="button" accessibilityState={{ selected: on }} style={[styles.slot, on && styles.slotOn]}>
                        <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.navy900 }}>{time(s)}</Text>
                      </Tappable>
                    )
                  })}
                </Animated.View>
              </>
            )}
          </Card>
          <Card delay={180} style={{ gap: 10 }}>
            <Text variant="h3">Anything your tutor should know?</Text>
            <Field multiline value={notes} onChangeText={setNotes} maxLength={1000} placeholder="e.g. My WAEC exam is in May and I struggle with quadratic equations." />
          </Card>
          <Text variant="small" style={{ textAlign: 'center' }}>Your slot is held for {settings.hold_minutes} minutes while you pay.</Text>
          <View style={{ height: 80 }} />
        </>
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  footer: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 12, backgroundColor: 'rgba(255,255,255,0.97)', borderTopWidth: 1, borderColor: colors.line },
  kid: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: radius.lg, borderWidth: 1, borderColor: 'rgba(15,28,54,0.12)', paddingVertical: 8, paddingLeft: 8, paddingRight: 14, backgroundColor: colors.white },
  kidOn: { backgroundColor: colors.navy900, borderColor: colors.navy900 },
  day: { width: 66, alignItems: 'center', paddingVertical: 10, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(15,28,54,0.1)', backgroundColor: colors.white },
  dayOn: { backgroundColor: colors.navy900, borderColor: colors.navy900 },
  slots: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slot: { width: '31%', height: 46, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(15,28,54,0.1)', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white },
  slotOn: { backgroundColor: colors.mint400, borderColor: colors.mint500, ...shadow.glow },
})
