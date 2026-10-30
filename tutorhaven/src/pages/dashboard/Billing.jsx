import { useState } from 'react'
import { motion } from 'motion/react'
import { Crown, Receipt, Sparkles } from 'lucide-react'
import { PageHeader } from '../../components/layout/DashboardLayout'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import Skeleton from '../../components/ui/Skeleton'
import EmptyState, { ErrorState } from '../../components/ui/EmptyState'
import { Stagger, StaggerItem } from '../../motion/Reveal'
import useAsync from '../../lib/useAsync'
import { cancelSubscription, getSubscription, listPayments } from '../../lib/api'
import { PLANS } from '../../lib/constants'
import { dateLong, dateShort, money } from '../../lib/format'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'

export default function Billing() {
  const { profile } = useAuth()
  const toast = useToast()
  const sub = useAsync(() => getSubscription(profile.id), [profile.id])
  const payments = useAsync(() => listPayments(profile.id), [profile.id])
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)

  const active = sub.data && new Date(sub.data.current_period_end) > new Date() ? sub.data : null
  const plan = PLANS.find((p) => p.id === (active?.plan ?? 'free'))
  const spent = (payments.data ?? []).filter((p) => p.status === 'succeeded').reduce((s, p) => s + Number(p.amount), 0)

  const onCancel = async () => {
    setBusy(true)
    try {
      sub.setData(await cancelSubscription())
      toast.success('Your membership won’t renew. Benefits continue until the period ends.')
      setConfirm(false)
    } catch (e) {
      toast.error(e.message)
    } finally {
      setBusy(false)
    }
  }

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
                {active && <Badge tone={active.status === 'active' ? 'mint' : 'amber'}>{active.status === 'active' ? 'Active' : 'Ends soon'}</Badge>}
              </div>
              <p className="mt-6 text-sm text-navy-300">Current plan</p>
              <h2 className="text-3xl font-bold text-white">{plan.name}</h2>
              <p className="mt-2 text-navy-200">
                {active
                  ? active.status === 'active'
                    ? `Renews ${dateLong(active.current_period_end)} · ${money(plan.price)}/month`
                    : `Benefits end ${dateLong(active.current_period_end)}`
                  : 'Pay per session. Upgrade to save on every lesson.'}
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                {(!active || active.status === 'canceled') && <Button to="/pricing" variant="mint">{active ? 'Renew membership' : 'Upgrade'}</Button>}
                {active?.status === 'active' && <Button to="/pricing" variant="light">Change plan</Button>}
                {active?.status === 'active' && <Button variant="light" onClick={() => setConfirm(true)}>Cancel renewal</Button>}
              </div>
            </div>
          )}
        </StaggerItem>
        <StaggerItem className="card flex flex-col justify-between p-6 sm:p-8">
          <div>
            <p className="text-sm text-navy-500">Total spent</p>
            {payments.loading ? <Skeleton className="mt-2 h-10 w-32" /> : <p className="mt-1 font-display text-4xl font-bold">{money(spent)}</p>}
          </div>
          <p className="mt-4 text-sm text-navy-500">{plan.discount ? `You’re saving ${plan.discount * 100}% on every session.` : 'Members save up to 15% on every session.'}</p>
        </StaggerItem>
      </Stagger>

      <section className="card mt-6 p-6 sm:p-8">
        <h2 className="text-lg font-semibold">Payment history</h2>
        {payments.error ? <div className="mt-4"><ErrorState message={payments.error} onRetry={payments.reload} /></div> : payments.loading ? (
          <div className="mt-5 space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : !payments.data.length ? (
          <EmptyState icon={Receipt} title="No payments yet">Payments for sessions and memberships will appear here.</EmptyState>
        ) : (
          <motion.ul className="mt-4 divide-y divide-navy-900/[0.06]" initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.04 } } }}>
            {payments.data.map((p) => (
              <motion.li key={p.id} variants={{ hidden: { opacity: 0, x: -8 }, show: { opacity: 1, x: 0 } }} className="flex items-center gap-4 py-3.5">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-cream-200 text-navy-700">{p.kind === 'subscription' ? <Crown className="h-4 w-4" /> : <Receipt className="h-4 w-4" />}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{p.description}</p>
                  <p className="text-xs text-navy-400">{dateShort(p.created_at)}{p.provider === 'test' ? ' · test mode' : ''}</p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-semibold tabular-nums ${p.status === 'refunded' ? 'text-navy-400 line-through' : ''}`}>{money(p.amount)}</p>
                  {p.status === 'refunded' && <p className="text-xs text-mint-700">Refunded</p>}
                </div>
              </motion.li>
            ))}
          </motion.ul>
        )}
      </section>

      <Modal open={confirm} onClose={() => setConfirm(false)} title="Cancel renewal?" description={active ? `You’ll keep ${plan.name} benefits until ${dateLong(active.current_period_end)}.` : ''} size="sm">
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={() => setConfirm(false)}>Keep plan</Button>
          <Button variant="danger" className="flex-1" loading={busy} onClick={onCancel}>Cancel renewal</Button>
        </div>
      </Modal>
    </>
  )
}
