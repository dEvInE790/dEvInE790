import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { Check, Crown, Minus, ShieldCheck, Sparkles, Users } from 'lucide-react'
import PublicLayout from '../components/layout/PublicLayout'
import PageTransition from '../motion/PageTransition'
import { Reveal, Stagger, StaggerItem } from '../motion/Reveal'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import RefundNotice from '../components/RefundNotice'
import { PLUS_FEATURES, PlusBadge } from '../components/Plus'
import { paymentReturnUrl, startPaystackCheckout } from '../lib/api'
import { useSettings } from '../context/SettingsContext'
import { useAuth } from '../context/AuthContext'
import { useMembership } from '../context/MembershipContext'
import { useToast } from '../context/ToastContext'
import { dateLong, money } from '../lib/format'
import { spring } from '../motion/variants'

const per = (p) => (p.interval_months === 12 ? 'year' : p.interval_months > 1 ? `${p.interval_months} months` : 'month')

const ROWS = [
  ['Browse, search and filter verified tutors', true, true],
  ['Tutor profiles, qualifications and verified reviews', true, true],
  ['Message tutors, book and pay per lesson with Paystack', true, true],
  ['Review tutors after completed lessons', true, true],
  ['Booking history', 'Basic', 'Full, with tutor feedback'],
  ['Top-rated, popular and new tutor lists', true, true],
  ['AI Learning Assistant', false, 'Monthly allowance'],
  ['Learning analytics and goals', false, true],
  ['Monthly learning reports', false, true],
  ['Personal tutor recommendations', false, true],
  ['Family dashboard for every child', false, true],
  ['Priority customer support', false, true],
  ['Member discount on lessons', false, 'Plan dependent'],
  ['Free cancellation window', '24 hours', '2 hours'],
]

function Cell({ v, plus }) {
  if (v === true) return <Check className={`mx-auto h-5 w-5 ${plus ? 'text-amber-500' : 'text-mint-600'}`} aria-label="Included" />
  if (v === false) return <Minus className="mx-auto h-5 w-5 text-navy-200" aria-label="Not included" />
  return <span className={`text-sm font-medium ${plus ? 'text-navy-900' : 'text-navy-500'}`}>{v}</span>
}

export default function Plus() {
  const { user, profile } = useAuth()
  const { learnerPlans, plansLoaded } = useSettings()
  const { membership, isPlus } = useMembership()
  const navigate = useNavigate()
  const toast = useToast()
  const [period, setPeriod] = useState('month')
  const [choice, setChoice] = useState(null)
  const [busy, setBusy] = useState(false)

  const byPeriod = useMemo(() => ({
    month: learnerPlans.filter((p) => p.interval_months < 12),
    year: learnerPlans.filter((p) => p.interval_months >= 12),
  }), [learnerPlans])
  const hasAnnual = byPeriod.year.length > 0
  const shown = byPeriod[hasAnnual ? period : 'month'].length ? byPeriod[hasAnnual ? period : 'month'] : learnerPlans
  const monthly = byPeriod.month.find((p) => p.code === 'plus') ?? byPeriod.month[0]

  const choose = (plan) => {
    if (!user) return navigate('/signup', { state: { from: '/plus' } })
    if (profile?.role !== 'student' && profile?.role !== 'parent') return toast.info('TutorHaven Plus is for student and parent accounts.')
    setChoice(plan)
  }
  const pay = async () => {
    setBusy(true)
    try {
      const { authorization_url } = await startPaystackCheckout({ kind: 'subscription', planId: choice.id, redirectUrl: paymentReturnUrl() })
      window.location.assign(authorization_url)
    } catch (e) {
      toast.error(e.message)
      setBusy(false)
    }
  }

  return (
    <PublicLayout>
      <PageTransition>
        <section className="relative overflow-hidden bg-navy-950 pt-32 pb-20 text-white lg:pt-40">
          <div className="pointer-events-none absolute -top-24 left-1/2 h-96 w-[56rem] -translate-x-1/2 rounded-full bg-amber-400/15 blur-3xl" aria-hidden />
          <div className="pointer-events-none absolute -bottom-32 left-10 h-72 w-72 rounded-full bg-mint-400/20 blur-3xl" aria-hidden />
          <div className="container-page relative text-center">
            <Reveal><PlusBadge size="lg" /></Reveal>
            <Reveal delay={0.05} as="h1" className="mx-auto mt-6 max-w-3xl text-4xl font-extrabold text-white sm:text-6xl">Learn smarter with TutorHaven Plus</Reveal>
            <Reveal delay={0.1} as="p" className="mx-auto mt-5 max-w-2xl text-lg text-navy-200">
              Everything in Standard, plus an AI learning assistant, progress analytics, monthly reports for families, personal tutor matching and priority support.
            </Reveal>
            {isPlus && membership && (
              <Reveal delay={0.15} as="p" className="mx-auto mt-6 w-fit rounded-full bg-white/10 px-4 py-2 text-sm text-mint-200">
                You’re on {membership.plan_name}{membership.source === 'parent' ? ` through ${membership.paid_by}` : ''} · {membership.status === 'cancelled' ? 'ends' : 'renew by'} {dateLong(membership.current_period_end)}
              </Reveal>
            )}
          </div>
        </section>

        <section className="container-page -mt-10 pb-16">
          <Stagger className="mx-auto grid max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-3" gap={0.06}>
            {PLUS_FEATURES.map((f) => (
              <StaggerItem key={f.title}>
                <motion.div whileHover={{ y: -4 }} transition={spring} className="card h-full p-6">
                  <span className="grid h-11 w-11 place-items-center rounded-2xl bg-amber-400/15 text-[#8a5a00]"><f.icon className="h-5 w-5" /></span>
                  <h2 className="mt-4 text-lg font-semibold">{f.title}</h2>
                  <p className="mt-1.5 text-sm text-navy-500">{f.text}</p>
                </motion.div>
              </StaggerItem>
            ))}
          </Stagger>
        </section>

        <section className="container-page pb-16" aria-labelledby="plans-title">
          <Reveal as="h2" id="plans-title" className="text-center text-3xl font-bold">Choose your plan</Reveal>
          {hasAnnual && (
            <div className="mt-6 flex justify-center">
              <div role="tablist" className="inline-flex rounded-2xl bg-navy-900/[0.05] p-1">
                {[['month', 'Monthly'], ['year', 'Annual']].map(([v, label]) => (
                  <button key={v} type="button" role="tab" aria-selected={period === v} onClick={() => setPeriod(v)}
                    className={`relative rounded-xl px-5 py-2 text-sm font-semibold ${period === v ? 'text-navy-950' : 'text-navy-500'}`}>
                    {period === v && <motion.span layoutId="plus-period" className="absolute inset-0 rounded-xl bg-white shadow-soft" transition={spring} />}
                    <span className="relative">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {!plansLoaded ? <div className="skeleton mx-auto mt-10 h-72 max-w-4xl rounded-3xl" /> : !learnerPlans.length ? (
            <p className="mx-auto mt-8 max-w-md text-center text-navy-500">Plus plans aren’t on sale right now. You can keep using Standard: book any tutor and pay per lesson.</p>
          ) : (
            <Stagger key={period} className={`mx-auto mt-10 grid gap-6 ${shown.length + 1 >= 3 ? 'max-w-6xl lg:grid-cols-3' : 'max-w-4xl md:grid-cols-2'}`} gap={0.08}>
              <StaggerItem>
                <div className="card flex h-full flex-col p-7">
                  <h3 className="text-xl font-semibold">Standard</h3>
                  <p className="mt-1.5 text-sm text-navy-500">Free forever. Pay only for lessons.</p>
                  <p className="mt-6 font-display text-5xl font-bold">{money(0)}</p>
                  <ul className="mt-6 space-y-2.5 text-sm text-navy-700">
                    {ROWS.filter((r) => r[1] === true).map((r) => <li key={r[0]} className="flex gap-2.5"><Check className="mt-0.5 h-4 w-4 shrink-0 text-mint-600" />{r[0]}</li>)}
                  </ul>
                  <div className="mt-auto pt-8">
                    {user ? <p className="rounded-xl bg-cream-100 py-3 text-center text-sm font-semibold text-navy-600">{isPlus ? 'Included in Plus' : 'Your current plan'}</p>
                      : <Button variant="secondary" className="w-full" to="/signup">Create a free account</Button>}
                  </div>
                </div>
              </StaggerItem>
              {shown.map((p) => {
                const current = isPlus && membership?.plan_id === p.id && membership?.source === 'own'
                const saving = p.interval_months === 12 && monthly ? Math.round((1 - p.price / (monthly.price * 12)) * 100) : 0
                const Icon = p.code === 'family' ? Users : p.interval_months === 12 ? Sparkles : Crown
                return (
                  <StaggerItem key={p.id}>
                    <motion.div whileHover={{ y: -6 }} transition={spring} className="relative flex h-full flex-col overflow-hidden rounded-[1.75rem] bg-navy-950 p-7 text-white shadow-lift" data-testid="plus-plan">
                      <motion.div className="pointer-events-none absolute -top-12 -right-12 h-48 w-48 rounded-full bg-amber-400/25 blur-3xl" aria-hidden
                        animate={{ scale: [1, 1.15, 1], opacity: [0.7, 1, 0.7] }} transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }} />
                      <div className="relative flex items-center justify-between">
                        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/10 text-amber-300"><Icon className="h-5 w-5" /></span>
                        {saving > 0 && <span className="rounded-full bg-mint-400 px-3 py-1 text-xs font-bold text-navy-950">Save {saving}%</span>}
                      </div>
                      <h3 className="relative mt-5 flex items-center gap-2 text-xl font-semibold text-white">{p.name} <PlusBadge /></h3>
                      <p className="relative mt-1.5 text-sm text-navy-200">{p.tagline}</p>
                      <p className="relative mt-6 font-display text-5xl font-bold">{money(p.price)}<span className="text-base font-medium text-navy-300"> / {per(p)}</span></p>
                      <ul className="relative mt-6 space-y-2.5 text-sm text-navy-100">
                        <li className="flex gap-2.5"><Check className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />Everything in Standard</li>
                        {p.ai_monthly_limit > 0 && <li className="flex gap-2.5"><Check className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />{p.ai_monthly_limit} AI assistant questions a month</li>}
                        {p.discount > 0 && <li className="flex gap-2.5"><Check className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />{Math.round(p.discount * 100)}% off every lesson</li>}
                        {['Learning analytics, goals and monthly reports', 'Personal tutor matching', p.code === 'family' ? 'Covers every linked child' : 'Family dashboard for parents', 'Priority support'].map((f) => (
                          <li key={f} className="flex gap-2.5"><Check className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />{f}</li>
                        ))}
                        {p.features.filter((f) => !/2 hours|money off/i.test(f)).map((f) => <li key={f} className="flex gap-2.5"><Check className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />{f}</li>)}
                      </ul>
                      <div className="relative mt-auto pt-8">
                        {current ? (
                          <Button variant="light" className="w-full" onClick={() => choose(p)}>Renew {p.name}</Button>
                        ) : (
                          <Button variant="mint" size="lg" className="w-full" onClick={() => choose(p)}>{isPlus ? `Switch to ${p.name}` : `Upgrade to ${p.name}`}</Button>
                        )}
                      </div>
                    </motion.div>
                  </StaggerItem>
                )
              })}
            </Stagger>
          )}
          <p className="mx-auto mt-8 max-w-2xl text-center text-sm text-navy-500">
            Prices in Nigerian Naira. Nothing renews automatically: we remind you before your plan ends. Plans are non-refundable once paid, except where the law requires it, and your benefits continue to the end of the paid period if you cancel.{' '}
            <Link to="/refunds" className="font-semibold text-navy-800 underline underline-offset-2">Refund Policy</Link>
          </p>
        </section>

        <section className="container-page max-w-4xl pb-28" aria-labelledby="compare-title">
          <Reveal as="h2" id="compare-title" className="text-center text-3xl font-bold">Standard and Plus compared</Reveal>
          <Reveal className="card mt-8 overflow-x-auto">
            <table className="w-full min-w-[34rem] text-left">
              <thead>
                <tr className="border-b border-navy-900/[0.06] text-sm">
                  <th className="px-5 py-4 font-semibold text-navy-500">Feature</th>
                  <th className="w-36 px-5 py-4 text-center font-semibold">Standard</th>
                  <th className="w-44 bg-amber-400/10 px-5 py-4 text-center font-semibold"><PlusBadge /></th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map(([label, std, plus]) => (
                  <tr key={label} className="border-b border-navy-900/[0.04] last:border-0">
                    <td className="px-5 py-3.5 text-sm text-navy-700">{label}</td>
                    <td className="px-5 py-3.5 text-center"><Cell v={std} /></td>
                    <td className="bg-amber-400/[0.06] px-5 py-3.5 text-center"><Cell v={plus} plus /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Reveal>
        </section>

        <Modal open={!!choice} onClose={() => !busy && setChoice(null)} title={`${isPlus ? 'Renew or switch to' : 'Upgrade to'} ${choice?.name}`}
          description={choice ? `${money(choice.price)} for ${choice.interval_months === 12 ? 'one year' : choice.interval_months > 1 ? `${choice.interval_months} months` : 'one month'} · no automatic charges` : null}>
          <p className="flex items-start gap-2 rounded-xl bg-cream-100 p-3 text-xs text-navy-600">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-mint-600" />
            You’ll pay securely on Paystack. Plus starts as soon as Paystack confirms the payment to our server{isPlus ? ', and the time is added to the end of your current period' : ''}.
          </p>
          {choice && <RefundNotice className="mt-3" kind="plan" period={choice.interval_months === 12 ? '1 year' : `${choice.interval_months} month${choice.interval_months > 1 ? 's' : ''}`} />}
          <div className="mt-6 flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setChoice(null)} disabled={busy}>Not now</Button>
            <Button className="flex-1" loading={busy} onClick={pay}>Pay {money(choice?.price)}</Button>
          </div>
        </Modal>
      </PageTransition>
    </PublicLayout>
  )
}
