import { useState } from 'react'
import { motion } from 'motion/react'
import { Link } from 'react-router-dom'
import SupportCard from '../../components/SupportCard'
import { Crown, Receipt, Sparkles } from 'lucide-react'
import Tabs from '../../components/ui/Tabs'
import { PageHeader } from '../../components/layout/DashboardLayout'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Skeleton from '../../components/ui/Skeleton'
import EmptyState, { ErrorState } from '../../components/ui/EmptyState'
import { Stagger, StaggerItem } from '../../motion/Reveal'
import useAsync from '../../lib/useAsync'
import { cancelSubscription, getSubscription, isSubscriptionLive, listPaymentAttempts, listPayments } from '../../lib/api'
import { dateLong, dateShort, money } from '../../lib/format'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useSettings } from '../../context/SettingsContext'

const STATUS = {
  succeeded: null,
  refund_pending: ['amber', 'Refund pending'],
  refund_processing: ['amber', 'Refund processing'],
  refunded: ['mint', 'Refunded'],
}

const ATTEMPT = {
  pending: ['amber', 'Processing'],
  succeeded: ['mint', 'Paid'],
  failed: ['coral', 'Failed'],
  abandoned: ['neutral', 'Not completed'],
}

export default function Billing() {
  const { profile } = useAuth()
  const toast = useToast()
  const { learnerPlans } = useSettings()
  const [tab, setTab] = useState('payments')
  const [cancelling, setCancelling] = useState(false)
  const sub = useAsync(() => getSubscription(profile.id), [profile.id])
  const payments = useAsync(() => listPayments(profile.id), [profile.id])
  const attempts = useAsync(() => listPaymentAttempts(profile.id), [profile.id])

  const active = isSubscriptionLive(sub.data) ? sub.data : null
  const plan = active?.plan ?? { name: 'Pay as you go', session_discount: 0 }
  const discount = Number(plan.session_discount ?? 0)
  const bestDiscount = Math.max(0, ...learnerPlans.map((p) => p.discount))

  const onCancel = async () => {
    setCancelling(true)
    try {
      sub.setData({ ...(await cancelSubscription('learner')), plan: active.plan })
      toast.success(`Cancelled. Your benefits continue until ${dateLong(active.current_period_end)}.`)
    } catch (e) {
      toast.error(e.message)
    }
    setCancelling(false)
  }

  const spent = (payments.data ?? []).filter((p) => p.status === 'succeeded').reduce((s, p) => s + Number(p.amount), 0)

  return (
    <>
      <PageHeader title="Billing" subtitle="Your membership and payment history." />
      <Stagger onMount className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
        <StaggerItem className="relative overflow-hidden rounded-3xl bg-navy-950 p-6 text-white shadow-lift sm:p-8">
          <div className="pointer-events-none absolute -top-16 -right-16 h-56 w-56 rounded-full bg-mint-400/20 blur-3xl" aria-hidden />
          {sub.loading ? <Skeleton className="h-32 bg-white/10" /> : sub.error ? <ErrorState message={sub.error} /> : (
            <div className="relative">
              <div className="flex items-center justify-between">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/10 text-mint-300">{active ? <Crown className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}</span>
                {active && <Badge tone={active.status === 'cancelled' ? 'amber' : 'mint'}>{active.status === 'cancelled' ? 'Cancelled' : 'Active'}</Badge>}
                {!active && sub.data?.status === 'expired' && <Badge tone="neutral">Expired</Badge>}
              </div>
              <p className="mt-6 text-sm text-navy-300">Current plan</p>
              <h2 className="text-3xl font-bold text-white">{plan.name}</h2>
              <p className="mt-2 text-navy-200">
                {active
                  ? active.status === 'cancelled'
                    ? `Cancelled. Your benefits continue until ${dateLong(active.current_period_end)}.`
                    : `Active until ${dateLong(active.current_period_end)}. Nothing renews automatically; renew any time to add more time.`
                  : sub.data?.status === 'expired' ? `Your ${sub.data.plan?.name ?? ''} plan ended on ${dateLong(sub.data.current_period_end)}. Renew to get your discount back.` : 'Pay per session. Upgrade to save on every lesson.'}
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button to="/pricing" variant="mint">{active ? 'Renew or change plan' : 'Upgrade'}</Button>
                {active?.status === 'active' && <Button variant="ghost" className="text-navy-200 hover:bg-white/10 hover:text-white" loading={cancelling} onClick={onCancel}>Cancel plan</Button>}
              </div>
            </div>
          )}
        </StaggerItem>
        <StaggerItem className="card flex flex-col justify-between p-6 sm:p-8">
          <div>
            <p className="text-sm text-navy-500">Total spent</p>
            {payments.loading ? <Skeleton className="mt-2 h-10 w-32" /> : <p className="mt-1 font-display text-4xl font-bold">{money(spent)}</p>}
          </div>
          <p className="mt-4 text-sm text-navy-500">
            {discount ? `You’re saving ${Math.round(discount * 100)}% on every session.` : bestDiscount ? `Members save up to ${Math.round(bestDiscount * 100)}% on every session.` : 'Every payment is processed securely by Paystack.'}
          </p>
        </StaggerItem>
      </Stagger>

      <section className="card mt-6 p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Transactions</h2>
          <Tabs value={tab} onChange={setTab} tabs={[{ value: 'payments', label: 'Payments' }, { value: 'attempts', label: 'All attempts' }]} />
        </div>
        {tab === 'attempts' ? <Attempts state={attempts} /> : payments.error ? <div className="mt-4"><ErrorState message={payments.error} onRetry={payments.reload} /></div> : payments.loading ? (
          <div className="mt-5 space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : !payments.data.length ? (
          <EmptyState icon={Receipt} title="No payments yet">Payments for sessions and memberships will appear here.</EmptyState>
        ) : (
          <motion.ul className="mt-4 divide-y divide-navy-900/[0.06]" initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.04 } } }}>
            {payments.data.map((p) => {
              const badge = STATUS[p.status]
              return (
                <motion.li key={p.id} variants={{ hidden: { opacity: 0, x: -8 }, show: { opacity: 1, x: 0 } }} className="flex items-center gap-4 py-3.5">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-cream-200 text-navy-700">{p.kind === 'subscription' ? <Crown className="h-4 w-4" /> : <Receipt className="h-4 w-4" />}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{p.description}</p>
                    <p className="text-xs text-navy-400">
                      {dateShort(p.created_at)}
                      {p.provider_ref ? ` · Ref ${p.provider_ref}` : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-semibold tabular-nums ${p.status === 'refunded' ? 'text-navy-400 line-through' : ''}`}>{money(p.amount)}</p>
                    {badge && <Badge tone={badge[0]} className="mt-1">{badge[1]}</Badge>}
                  </div>
                </motion.li>
              )
            })}
          </motion.ul>
        )}
      </section>
      <SupportCard className="mt-6" title="Questions about a payment or refund?" />
      <p className="mt-4 text-center text-sm text-navy-500">
        <Link to="/refunds" className="font-semibold text-navy-800 underline-offset-2 hover:underline">Refund Policy</Link>
        {' · '}<Link to="/terms" className="font-semibold text-navy-800 underline-offset-2 hover:underline">Terms and Conditions</Link>
      </p>
    </>
  )
}

function Attempts({ state }) {
  if (state.error) return <div className="mt-4"><ErrorState message={state.error} onRetry={state.reload} /></div>
  if (state.loading) return <div className="mt-5 space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12" />)}</div>
  if (!state.data.length) return <EmptyState icon={Receipt} title="No checkouts yet">Every Paystack checkout you start, including unfinished ones, appears here.</EmptyState>
  return (
    <ul className="mt-4 divide-y divide-navy-900/[0.06]">
      {state.data.map((a) => {
        const [tone, label] = ATTEMPT[a.status] ?? ['neutral', a.status]
        return (
          <li key={a.reference} className="flex items-center gap-4 py-3.5">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{a.kind === 'subscription' ? `${a.plan?.name ?? 'Plan'} subscription` : `${a.booking?.subject ?? 'Session'}${a.booking ? ` · ${dateShort(a.booking.starts_at)}` : ''}`}</p>
              <p className="text-xs text-navy-400">{dateShort(a.created_at)} · Ref {a.reference}{a.failure_reason && a.status !== 'succeeded' ? ` · ${a.failure_reason}` : ''}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold tabular-nums">{money(a.amount)}</p>
              <Badge tone={tone} className="mt-1">{label}</Badge>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
