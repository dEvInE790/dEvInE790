import { useState } from 'react'
import { View } from 'react-native'
import { Receipt } from 'lucide-react-native'
import Screen from '../components/Screen'
import { Badge, Card, EmptyState, Segmented, Skeleton, Text } from '../components/ui'
import useAsync from '../lib/useAsync'
import { listPaymentAttempts, listPayments } from '../lib/api'
import { dateShort, money } from '../lib/format'
import { useAuth } from '../context/AuthContext'
import { colors, fonts } from '../theme'

const PAID = { refund_pending: ['amber', 'Refund pending'], refund_processing: ['amber', 'Refund processing'], refunded: ['mint', 'Refunded'] }
const ATTEMPT = { pending: ['amber', 'Processing'], succeeded: ['mint', 'Paid'], failed: ['coral', 'Failed'], abandoned: ['neutral', 'Not completed'] }

/** Confirmed payments and every checkout attempt, straight from the database. */
export default function Payments() {
  const { profile } = useAuth()
  const [tab, setTab] = useState('paid')
  const payments = useAsync(() => listPayments(profile.id), [profile.id])
  const attempts = useAsync(() => listPaymentAttempts(profile.id), [profile.id])
  const state = tab === 'paid' ? payments : attempts

  return (
    <Screen back title="Payment history" onRefresh={() => { payments.reload(); attempts.reload() }}>
      <Segmented value={tab} onChange={setTab} options={[{ value: 'paid', label: 'Payments' }, { value: 'attempts', label: 'All attempts' }]} />
      {state.loading ? <Skeleton style={{ height: 160, borderRadius: 20 }} /> : state.error ? <Text variant="muted">{state.error}</Text> : !state.data?.length ? (
        <EmptyState icon={Receipt} title={tab === 'paid' ? 'No payments yet' : 'No checkouts yet'} body={tab === 'paid' ? 'Payments confirmed by Paystack appear here.' : 'Every checkout you start appears here, including unfinished ones.'} />
      ) : (
        <Card style={{ paddingVertical: 4 }}>
          {state.data.map((p, i) => {
            const badge = tab === 'paid' ? PAID[p.status] : ATTEMPT[p.status]
            const title = tab === 'paid' ? p.description : p.kind === 'subscription' ? `${p.plan?.name ?? 'Plan'} subscription` : `${p.booking?.subject ?? 'Session'}`
            const sub = tab === 'paid' ? `${dateShort(p.created_at)}${p.provider_ref ? ` · ${p.provider_ref}` : ''}` : `${dateShort(p.created_at)} · ${p.reference}${p.failure_reason && p.status !== 'succeeded' ? `\n${p.failure_reason}` : ''}`
            return (
              <View key={p.id ?? p.reference} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderTopWidth: i ? 1 : 0, borderColor: colors.line }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, color: colors.navy900 }} numberOfLines={1}>{title}</Text>
                  <Text variant="small">{sub}</Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Text style={{ fontFamily: fonts.semibold, color: p.status === 'refunded' ? colors.navy400 : colors.navy900, textDecorationLine: p.status === 'refunded' ? 'line-through' : 'none' }}>{money(p.amount)}</Text>
                  {badge && <Badge tone={badge[0]}>{badge[1]}</Badge>}
                </View>
              </View>
            )
          })}
        </Card>
      )}
    </Screen>
  )
}
