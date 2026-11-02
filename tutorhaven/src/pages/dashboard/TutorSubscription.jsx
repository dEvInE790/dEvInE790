import { useState } from 'react'
import { motion } from 'motion/react'
import { Link } from 'react-router-dom'
import { BadgeCheck, CalendarClock, Check, EyeOff, Receipt, ShieldCheck } from 'lucide-react'
import { PageHeader } from '../../components/layout/DashboardLayout'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Skeleton from '../../components/ui/Skeleton'
import EmptyState, { ErrorState } from '../../components/ui/EmptyState'
import { Stagger, StaggerItem } from '../../motion/Reveal'
import useAsync from '../../lib/useAsync'
import { cancelSubscription, getMyPayoutAccount, getOwnTutor, getSubscription, isSubscriptionLive, isTutorListed, listPayments, paymentReturnUrl, startPaystackCheckout } from '../../lib/api'
import { dateLong, dateShort, money } from '../../lib/format'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useSettings } from '../../context/SettingsContext'
import { spring } from '../../motion/variants'
import RefundNotice from '../../components/RefundNotice'

const STATUS = {
  active: ['mint', 'Active'],
  cancelled: ['amber', 'Cancelled'],
  expired: ['coral', 'Expired'],
  pending: ['neutral', 'Awaiting payment'],
}

/** Tutors pay a monthly subscription to be listed and take paid bookings. */
export default function TutorSubscription() {
  const { profile } = useAuth()
  const toast = useToast()
  const { tutorPlans, settings, plansLoaded } = useSettings()
  const sub = useAsync(() => getSubscription(profile.id, 'tutor'), [profile.id])
  const tutor = useAsync(() => getOwnTutor(profile.id), [profile.id])
  const payments = useAsync(() => listPayments(profile.id), [profile.id])
  const listedNow = useAsync(() => isTutorListed(profile.id), [profile.id])
  const payout = useAsync(() => getMyPayoutAccount(profile.id), [profile.id])
  const [busy, setBusy] = useState(null)

  const live = isSubscriptionLive(sub.data)
  const approved = tutor.data?.tutor?.status === 'approved'
  const required = settings.tutor_subscription_required !== false
  const listed = listedNow.data ?? (approved && (!required || live))
  const needsPayout = settings.payout_account_required !== false && payout.data === null
  const [tone, label] = STATUS[sub.data?.status] ?? ['neutral', 'No subscription']
  const daysLeft = live ? Math.ceil((new Date(sub.data.current_period_end) - Date.now()) / 864e5) : 0

  const pay = async (plan) => {
    setBusy(plan.id)
    try {
      const { authorization_url } = await startPaystackCheckout({ kind: 'subscription', planId: plan.id, redirectUrl: paymentReturnUrl() })
      window.location.assign(authorization_url)
    } catch (e) {
      toast.error(e.message)
      setBusy(null)
    }
  }
  const cancel = async () => {
    setBusy('cancel')
    try {
      const s = await cancelSubscription('tutor')
      sub.setData((d) => ({ ...d, ...s }))
      toast.success(`Cancelled. You stay listed until ${dateLong(s.current_period_end)}.`)
    } catch (e) {
      toast.error(e.message)
    }
    setBusy(null)
  }

  const history = (payments.data ?? []).filter((p) => p.kind === 'subscription')

  return (
    <>
      <PageHeader title="Subscription" subtitle="Your subscription keeps your profile listed and lets learners book and pay you." />

      <Stagger onMount className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
        <StaggerItem className="relative overflow-hidden rounded-3xl bg-navy-950 p-6 text-white shadow-lift sm:p-8">
          <div className="pointer-events-none absolute -top-16 -right-16 h-56 w-56 rounded-full bg-mint-400/20 blur-3xl" aria-hidden />
          {sub.loading || tutor.loading ? <Skeleton className="h-36 bg-white/10" /> : sub.error ? <ErrorState message={sub.error} onRetry={sub.reload} /> : (
            <div className="relative">
              <div className="flex items-center justify-between">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/10 text-mint-300">{listed ? <BadgeCheck className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}</span>
                <Badge tone={tone}>{label}</Badge>
              </div>
              <p className="mt-6 text-sm text-navy-300">{sub.data?.plan?.name ?? 'Tutor subscription'}</p>
              <h2 className="text-3xl font-bold text-white">{listed ? 'You’re listed' : 'You’re not listed yet'}</h2>
              <p className="mt-2 text-navy-200">
                {!approved
                  ? 'Your profile is waiting for admin approval. You can subscribe now; your listing goes live once you’re approved.'
                  : live
                    ? sub.data.status === 'cancelled'
                      ? `Cancelled. You stay listed until ${dateLong(sub.data.current_period_end)}.`
                      : `Active until ${dateLong(sub.data.current_period_end)} (${daysLeft} day${daysLeft === 1 ? '' : 's'} left). Nothing renews automatically.`
                    : !required
                      ? 'Subscriptions are currently optional, so your profile is visible.'
                      : sub.data?.status === 'expired'
                        ? `Your subscription ended on ${dateLong(sub.data.current_period_end)}. Learners can’t find or book you until you renew.`
                        : 'Subscribe to appear in search and accept paid bookings.'}
              </p>
              {needsPayout ? (
                <p className="mt-3 text-sm text-mint-200">You also need to <Link to="/dashboard/payouts" className="font-semibold underline">add your bank account</Link> before learners can book you.</p>
              ) : payout.data && (
                <p className="mt-3 text-sm text-navy-300">Earnings are paid to {payout.data.bank_name} ••••{payout.data.account_number_last4}. <Link to="/dashboard/payouts" className="font-semibold text-mint-300 underline">Manage payouts</Link></p>
              )}
              {live && daysLeft <= 3 && <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-amber-400/15 px-3 py-1 text-xs font-semibold text-amber-300"><CalendarClock className="h-3.5 w-3.5" />Renew soon to stay listed</p>}
              {sub.data?.status === 'active' && live && (
                <div className="mt-6"><Button variant="light" loading={busy === 'cancel'} onClick={cancel}>Cancel subscription</Button></div>
              )}
            </div>
          )}
        </StaggerItem>

        <StaggerItem className="card p-6 sm:p-8">
          <h3 className="font-semibold">What you get</h3>
          <ul className="mt-4 space-y-3 text-sm text-navy-700">
            {['Appear in tutor search and on the home page', `Get paid straight to your bank: you keep ${100 - Math.round(Number(settings.commission_rate ?? 0.15) * 100)}% of every session`, 'Message learners and parents', 'Earnings and sessions dashboard'].map((f) => (
              <li key={f} className="flex gap-2.5"><Check className="mt-0.5 h-4 w-4 shrink-0 text-mint-600" />{f}</li>
            ))}
          </ul>
          <p className="mt-5 flex items-start gap-2 rounded-xl bg-cream-100 p-3 text-xs text-navy-600">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-mint-600" />
            You’re never charged automatically. We’ll remind you 3 days before your subscription ends; renewing early adds the time on.
          </p>
        </StaggerItem>
      </Stagger>

      <section className="mt-6">
        <h2 className="mb-4 text-lg font-semibold">{live ? 'Renew' : 'Choose a plan'}</h2>
        {!plansLoaded ? <Skeleton className="h-40 rounded-3xl" /> : !tutorPlans.length ? (
          <div className="card"><EmptyState icon={BadgeCheck} title="No tutor plans available">An admin hasn’t published a tutor plan yet. Please check back soon.</EmptyState></div>
        ) : (
          <>
          <RefundNotice className="mb-5 max-w-2xl" kind="plan" period="the subscription period shown on each plan" />
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {tutorPlans.map((p) => (
              <motion.div key={p.id} whileHover={{ y: -4 }} transition={spring} className="card flex flex-col p-6">
                <h3 className="text-lg font-semibold">{p.name}</h3>
                {p.description && <p className="mt-1 text-sm text-navy-500">{p.description}</p>}
                <p className="mt-4 font-display text-4xl font-bold">{money(p.price)}<span className="text-base font-medium text-navy-400"> / {p.interval_months > 1 ? `${p.interval_months} months` : 'month'}</span></p>
                {p.features?.length > 0 && (
                  <ul className="mt-4 space-y-2 text-sm text-navy-700">{p.features.map((f) => <li key={f} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 text-mint-600" />{f}</li>)}</ul>
                )}
                <Button className="mt-6 w-full" loading={busy === p.id} disabled={!!busy} onClick={() => pay(p)}>
                  {live ? `Renew for ${money(p.price)}` : `Pay ${money(p.price)} with Paystack`}
                </Button>
              </motion.div>
            ))}
          </div>
          </>
        )}
      </section>

      <section className="card mt-6 p-6 sm:p-8">
        <h2 className="text-lg font-semibold">Subscription payments</h2>
        {payments.loading ? <Skeleton className="mt-4 h-12" /> : !history.length ? (
          <EmptyState icon={Receipt} title="No payments yet">Your subscription payments will appear here once Paystack confirms them.</EmptyState>
        ) : (
          <ul className="mt-4 divide-y divide-navy-900/[0.06]">
            {history.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-4 py-3.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{p.description}</p>
                  <p className="text-xs text-navy-400">{dateShort(p.created_at)}{p.provider_ref ? ` · Ref ${p.provider_ref}` : ''}</p>
                </div>
                <p className="text-sm font-semibold tabular-nums">{money(p.amount)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}
