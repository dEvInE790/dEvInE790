import { useState } from 'react'
import { View } from 'react-native'
import { MessageSquareQuote } from 'lucide-react-native'
import Screen from '../components/Screen'
import Sheet from '../components/Sheet'
import { Badge, Button, Card, EmptyState, Field, Skeleton, Stars, Text } from '../components/ui'
import useAsync from '../lib/useAsync'
import { getMyTutorReviews, reportReview, respondToReview } from '../lib/api'
import { dateLong } from '../lib/format'
import { useToast } from '../context/ToastContext'
import { colors } from '../theme'

/** Tutors read verified reviews, reply publicly or report a review. They can't change a review. */
export default function Reviews() {
  const toast = useToast()
  const reviews = useAsync(() => getMyTutorReviews(), [])
  const [replying, setReplying] = useState(null)
  const [reply, setReply] = useState('')
  const [reporting, setReporting] = useState(null)
  const [details, setDetails] = useState('')
  const [busy, setBusy] = useState(false)

  const act = async (fn, msg) => {
    setBusy(true)
    try {
      await fn()
      toast.success(msg)
      setReplying(null)
      setReporting(null)
      reviews.reload({ silent: true })
    } catch (e) {
      toast.error(e.message)
    }
    setBusy(false)
  }

  return (
    <Screen back title="Reviews" subtitle="From learners who completed paid lessons with you." onRefresh={() => reviews.reload()}>
      {reviews.loading ? <Skeleton style={{ height: 160, borderRadius: 20 }} /> : reviews.error ? <Text variant="muted">{reviews.error}</Text> : !reviews.data.length ? (
        <EmptyState icon={MessageSquareQuote} title="No reviews yet" body="Learners are invited to review after you mark a paid lesson complete." />
      ) : reviews.data.map((r, i) => (
        <Card key={r.id} delay={i * 40} style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Stars value={r.rating} />
            <Text variant="label">{r.author_name}</Text>
            <Text variant="small">{r.subject} · {dateLong(r.created_at)}</Text>
            {r.status === 'hidden' && <Badge tone="coral">Hidden</Badge>}
          </View>
          {!!r.comment && <Text style={{ fontSize: 14 }}>“{r.comment}”</Text>}
          {r.teaching != null && <Text variant="small">Teaching {r.teaching} · Communication {r.communication} · Punctuality {r.punctuality} · Knowledge {r.knowledge}</Text>}
          {r.status === 'hidden' && <Text variant="small" style={{ color: colors.coralInk }}>Reason: {r.hidden_reason}</Text>}
          {!!r.response && <Text variant="muted" style={{ backgroundColor: colors.mint50, padding: 10, borderRadius: 10, fontSize: 13 }}>Your reply: {r.response}</Text>}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button size="sm" variant="secondary" title={r.response ? 'Edit reply' : 'Reply'} onPress={() => { setReplying(r); setReply(r.response ?? '') }} />
            {!r.reported && r.status === 'published' && <Button size="sm" variant="ghost" title="Report" onPress={() => { setReporting(r); setDetails('') }} />}
          </View>
        </Card>
      ))}
      <Sheet visible={!!replying} onClose={() => setReplying(null)} title="Reply publicly" subtitle="Keep it professional. You can’t change the learner’s review.">
        <Field multiline value={reply} onChangeText={setReply} maxLength={1500} accessibilityLabel="Your reply" />
        <Button title="Publish reply" full loading={busy} disabled={reply.trim().length < 2} onPress={() => act(() => respondToReview(replying.id, reply), 'Reply published')} />
      </Sheet>
      <Sheet visible={!!reporting} onClose={() => setReporting(null)} title="Report this review" subtitle="Our moderators check every report.">
        <Field label="What’s wrong?" multiline value={details} onChangeText={setDetails} maxLength={1000} />
        <Button title="Send report" variant="danger" full loading={busy} onPress={() => act(() => reportReview(reporting.id, 'other', details), 'Report sent')} />
      </Sheet>
    </Screen>
  )
}
