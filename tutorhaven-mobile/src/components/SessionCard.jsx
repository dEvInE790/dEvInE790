import { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated'
import { router } from 'expo-router'
import { CheckCheck, ClipboardPen, Clock, CreditCard, NotebookText, Star, X } from 'lucide-react-native'
import { Avatar, Badge, Button, Field, StatusBadge, Tappable, Text } from './ui'
import Sheet from './Sheet'
import { colors, fonts, radius, shadow } from '../theme'
import { dayShort, money, monthShort, relativeFromNow, time } from '../lib/format'
import { saveLessonFeedback, setBookingStatus, submitReview } from '../lib/api'
import { useToast } from '../context/ToastContext'
import { useSettings } from '../context/SettingsContext'
import useNow from '../lib/useNow'

const reviewOf = (b) => (Array.isArray(b.review) ? b.review[0] : b.review)
const feedbackOf = (b) => (Array.isArray(b.feedback) ? b.feedback[0] : b.feedback)
const CATEGORIES = [['teaching', 'Teaching quality'], ['communication', 'Communication'], ['punctuality', 'Punctuality'], ['knowledge', 'Subject knowledge']]
const EMPTY = { rating: 0, teaching: 0, communication: 0, punctuality: 0, knowledge: 0 }

function StarRow({ label, value, onChange, size = 24 }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Text variant="label" style={{ fontSize: 13 }}>{label}</Text>
      <View style={{ flexDirection: 'row', gap: 2 }} accessibilityRole="radiogroup" accessibilityLabel={label}>
        {[1, 2, 3, 4, 5].map((i) => (
          <Tappable key={i} onPress={() => onChange(i)} accessibilityRole="radio" accessibilityState={{ checked: value === i }} accessibilityLabel={`${label}: ${i} star${i > 1 ? 's' : ''}`} scaleTo={0.85} style={{ padding: 2 }}>
            <Star size={size} color={i <= value ? colors.amber : colors.navy200} fill={i <= value ? colors.amber : colors.navy200} strokeWidth={0} />
          </Tappable>
        ))}
      </View>
    </View>
  )
}

export default function SessionCard({ booking: b, me, onChange, compact, index = 0 }) {
  const toast = useToast()
  const { settings } = useSettings()
  const [confirm, setConfirm] = useState(null)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [stars, setStars] = useState(EMPTY)
  const [comment, setComment] = useState('')
  const [fb, setFb] = useState(null)
  const [showFeedback, setShowFeedback] = useState(false)
  const [busy, setBusy] = useState(false)
  const now = useNow()

  const start = new Date(b.starts_at)
  const isTutor = b.tutor_id === me.id
  const future = start.getTime() > now
  const tutorName = b.tutor?.profile?.full_name ?? 'Tutor'
  const studentName = b.student?.full_name ?? 'Student'
  const holdExpired = b.status === 'pending_payment' && new Date(b.created_at).getTime() + settings.hold_minutes * 60000 < now
  const review = reviewOf(b)
  const feedback = feedbackOf(b)
  const canFeedback = isTutor && b.status === 'completed'
  const canPay = b.status === 'pending_payment' && b.booked_by === me.id && !holdExpired
  const canCancel = (b.status === 'confirmed' || b.status === 'pending_payment') && future && !holdExpired
  const canComplete = isTutor && b.status === 'confirmed' && !future
  const canReview = !isTutor && b.status === 'completed' && (b.student_id === me.id || b.booked_by === me.id)
  const upcoming = future && b.status === 'confirmed'

  const run = async (status) => {
    setBusy(true)
    try {
      const nb = await setBookingStatus(b.id, status)
      onChange?.({ ...b, ...nb })
      toast.success(status === 'completed' ? 'Session marked as complete' : b.status === 'confirmed' ? 'Session cancelled. Your full refund is being processed.' : 'Session cancelled')
      setConfirm(null)
    } catch (e) {
      toast.error(e.message)
    } finally {
      setBusy(false)
    }
  }

  const sendReview = async () => {
    setBusy(true)
    try {
      if (Object.values(stars).some((v) => !v)) throw new Error('Please rate every category from 1 to 5 stars.')
      const r = await submitReview(b.id, { ...stars, comment })
      onChange?.({ ...b, review: { id: r.id, rating: r.rating } })
      toast.success('Thanks! Your review helps other learners.')
      setReviewOpen(false)
    } catch (e) {
      toast.error(e.message)
    } finally {
      setBusy(false)
    }
  }

  const sendFeedback = async () => {
    setBusy(true)
    try {
      const f = await saveLessonFeedback(b.id, fb)
      onChange?.({ ...b, feedback: f })
      toast.success('Feedback shared with the learner and their parents')
      setFb(null)
    } catch (e) {
      toast.error(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Animated.View entering={FadeInDown.delay(Math.min(index, 6) * 50).duration(400)} layout={LinearTransition} style={styles.card}>
      <View style={{ flexDirection: 'row', gap: 14 }}>
        <View style={[styles.date, upcoming && { backgroundColor: colors.navy900 }]}>
          <Text style={[styles.dateMonth, upcoming && { color: colors.mint300 }]}>{monthShort(start).toUpperCase()}</Text>
          <Text style={[styles.dateDay, upcoming && { color: colors.white }]}>{start.getDate()}</Text>
          <Text style={[styles.dateDow, upcoming && { color: colors.navy200 }]}>{dayShort(start)}</Text>
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Text variant="h3">{b.subject}</Text>
            <StatusBadge status={holdExpired ? 'cancelled' : b.status} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Avatar name={isTutor ? studentName : tutorName} seed={isTutor ? b.student_id : b.tutor_id} size={20} />
            <Text variant="muted" numberOfLines={1} style={{ flex: 1, fontSize: 13 }}>
              with {isTutor ? studentName : tutorName}{!isTutor && b.student_id !== me.id ? ` · for ${studentName}` : ''}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <Clock size={13} color={colors.navy400} />
            <Text variant="small">{time(b.starts_at)} – {time(b.ends_at)}</Text>
            {upcoming && <Text variant="small" style={{ color: colors.mint700 }}>· {relativeFromNow(b.starts_at)}</Text>}
            {!compact && <Text variant="small">· {money(b.amount_paid ?? b.price)}</Text>}
          </View>
        </View>
      </View>
      {!compact && !!b.notes && <Text variant="muted" style={styles.notes} numberOfLines={2}>“{b.notes}”</Text>}

      {!isTutor && feedback && showFeedback && (
        <View style={{ marginTop: 12, backgroundColor: colors.mint50, borderRadius: 14, padding: 12, gap: 4 }}>
          <Text variant="label" style={{ color: colors.mint700 }}>Feedback from {tutorName.split(' ')[0]}</Text>
          <Text variant="muted">{feedback.summary}</Text>
          {!!feedback.strengths && <Text variant="muted"><Text variant="label" style={{ fontSize: 13 }}>Strengths: </Text>{feedback.strengths}</Text>}
          {!!feedback.improvements && <Text variant="muted"><Text variant="label" style={{ fontSize: 13 }}>To work on: </Text>{feedback.improvements}</Text>}
          {!!feedback.next_steps && <Text variant="muted"><Text variant="label" style={{ fontSize: 13 }}>Next steps: </Text>{feedback.next_steps}</Text>}
        </View>
      )}

      {(canPay || canCancel || canComplete || canReview || canFeedback || feedback) && (
        <View style={styles.actions}>
          {canPay && <Button size="sm" title="Pay now" icon={CreditCard} onPress={() => router.push(`/checkout/${b.id}`)} />}
          {canComplete && <Button size="sm" variant="mint" title="Mark complete" icon={CheckCheck} onPress={() => setConfirm('completed')} />}
          {canReview && (review ? <Badge tone="amber" icon={Star}>You rated {review.rating}/5</Badge> : <Button size="sm" variant="mint" title="Leave a review" icon={Star} onPress={() => setReviewOpen(true)} />)}
          {canFeedback && <Button size="sm" variant={feedback ? 'secondary' : 'mint'} title={feedback ? 'Edit feedback' : 'Add feedback'} icon={ClipboardPen}
            onPress={() => setFb({ summary: feedback?.summary ?? '', strengths: feedback?.strengths ?? '', improvements: feedback?.improvements ?? '', nextSteps: feedback?.next_steps ?? '', progress: feedback?.progress ?? 3 })} />}
          {!isTutor && feedback && <Button size="sm" variant="secondary" title={showFeedback ? 'Hide feedback' : 'Tutor feedback'} icon={NotebookText} onPress={() => setShowFeedback((v) => !v)} />}
          <View style={{ flex: 1 }} />
          {canCancel && <Button size="sm" variant="ghost" title="Cancel" icon={X} onPress={() => setConfirm('cancelled')} />}
        </View>
      )}

      <Sheet visible={!!confirm} onClose={() => setConfirm(null)}
        title={confirm === 'completed' ? 'Mark this session complete?' : 'Cancel this session?'}
        subtitle={confirm === 'completed' ? 'The learner will be invited to leave a review.' : b.status === 'confirmed' ? 'You’ll get a full refund to your original payment method.' : 'This releases the time slot.'}>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Button variant="secondary" title="Keep it" onPress={() => setConfirm(null)} style={{ flex: 1 }} />
          <Button variant={confirm === 'completed' ? 'primary' : 'danger'} title={confirm === 'completed' ? 'Mark complete' : 'Cancel session'} loading={busy} onPress={() => run(confirm)} style={{ flex: 1 }} />
        </View>
      </Sheet>

      <Sheet visible={reviewOpen} onClose={() => setReviewOpen(false)} title={`How was ${b.subject}?`} subtitle={`Rate your lesson with ${tutorName.split(' ')[0]}. Reviews are published with your first name and can’t be changed later.`}>
        <View style={{ gap: 10 }}>
          <StarRow label="Overall" value={stars.rating} onChange={(v) => setStars({ ...stars, rating: v })} size={30} />
          {CATEGORIES.map(([k, label]) => <StarRow key={k} label={label} value={stars[k]} onChange={(v) => setStars({ ...stars, [k]: v })} />)}
        </View>
        <Field multiline value={comment} onChangeText={setComment} placeholder="What went well? What could be better?" maxLength={2000} accessibilityLabel="Written feedback" />
        <Button title="Submit review" loading={busy} onPress={sendReview} full />
      </Sheet>

      <Sheet visible={!!fb} onClose={() => setFb(null)} title={`Feedback for ${studentName.split(' ')[0]}`} subtitle="Shared with the learner and their parents.">
        {fb && (
          <View style={{ gap: 10 }}>
            <Field label="What did you cover?" multiline value={fb.summary} onChangeText={(v) => setFb({ ...fb, summary: v })} maxLength={2000} />
            <Field label="Strengths" value={fb.strengths} onChangeText={(v) => setFb({ ...fb, strengths: v })} maxLength={1000} />
            <Field label="Areas to work on" value={fb.improvements} onChangeText={(v) => setFb({ ...fb, improvements: v })} maxLength={1000} />
            <Field label="Next steps" value={fb.nextSteps} onChangeText={(v) => setFb({ ...fb, nextSteps: v })} maxLength={1000} />
            <Button title="Save feedback" loading={busy} onPress={sendFeedback} full />
          </View>
        )}
      </Sheet>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.white, borderRadius: radius.xl, padding: 16, borderWidth: 1, borderColor: 'rgba(15,28,54,0.06)', ...shadow.soft },
  date: { width: 56, borderRadius: 16, backgroundColor: colors.cream200, alignItems: 'center', paddingVertical: 8 },
  dateMonth: { fontFamily: fonts.semibold, fontSize: 10, color: colors.navy400 },
  dateDay: { fontFamily: fonts.display, fontSize: 21, color: colors.navy900, lineHeight: 25 },
  dateDow: { fontFamily: fonts.medium, fontSize: 10, color: colors.navy500 },
  notes: { marginTop: 12, backgroundColor: colors.cream100, borderRadius: 12, padding: 10, fontSize: 13 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderColor: 'rgba(15,28,54,0.06)', flexWrap: 'wrap' },
})
