import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { Check, Crown, GraduationCap, ShieldCheck, Sparkles, Users } from 'lucide-react'
import PublicLayout from '../components/layout/PublicLayout'
import PageTransition from '../motion/PageTransition'
import { Reveal, Stagger, StaggerItem } from '../motion/Reveal'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import useAsync from '../lib/useAsync'
import { getSubscription, isSubscriptionLive, paymentReturnUrl, startPaystackCheckout } from '../lib/api'
import { useSettings } from '../context/SettingsContext'
import { dateLong, money } from '../lib/format'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { spring } from '../motion/variants'
import RefundNotice from '../components/RefundNotice'

const planIcon = { free: Sparkles, plus: Crown, family: Users }
export const per = (p) => (p.interval_months > 1 ? `${p.interval_months} months` : 'month')

const FAQ = [
  ['How do tutor prices work?', 'Each tutor sets their own hourly rate. You pay per session at checkout, and membership discounts are applied automatically.'],
  ['Does membership renew automatically?', 'No. Nothing is charged automatically. We remind you three days before your plan ends, and renewing early adds the time to the end of your current period.'],
  ['Is paying online safe?', 'Payments are processed by Paystack, a licensed Nigerian payment provider. TutorHaven never sees your card details, and a booking is only confirmed after Paystack confirms the payment to our server.'],
  ['What is the cancellation policy for sessions?', 'Cancel up to 24 hours before a session for a full refund, or up to 2 hours before with Plus or Family. If your tutor cancels, you get a full refund. See the Refund Policy for details.'],
  ['Can I get a refund on a membership?', 'Memberships and tutor subscriptions are non-refundable once paid, except where the law requires it. If you cancel, your benefits continue until the end of the period you paid for.'],
  ['Who is the Family plan for?', 'Parents who book for one or more children. The discount applies to every session you book for a linked learner.'],
]

export default function Pricing() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const sub = useAsync(() => getSubscription(user.id), [user?.id], { enabled: !!user })
  const [choice, setChoice] = useState(null)
  const [busy, setBusy] = useState(false)
  const [openFaq, setOpenFaq] = useState(0)
  const { plans: PLANS, tutorPlans, plansLoaded, settings } = useSettings()

  const current = isSubscriptionLive(sub.data) ? sub.data : null
  const featuredId = PLANS.find((p) => p.id !== 'free')?.id

  const choose = (plan) => {
    if (plan.id === 'free') return navigate(user ? '/tutors' : '/signup')
    if (!user) return navigate('/signup', { state: { from: '/pricing' } })
    if (profile?.role === 'tutor') return toast.info('Memberships are for students and parents.')
    if (profile?.role === 'admin') return toast.info('Admins don’t need a membership.')
    setChoice(plan)
  }

  const confirm = async () => {
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
        <section className="relative overflow-hidden pt-32 pb-12 text-center lg:pt-40">
          <div className="pointer-events-none absolute top-0 left-1/2 h-96 w-[52rem] -translate-x-1/2 rounded-full bg-mint-200/45 blur-3xl" aria-hidden />
          <div className="container-page relative">
            <Reveal><span className="eyebrow">Pricing</span></Reveal>
            <Reveal delay={0.05} as="h1" className="mx-auto mt-5 max-w-3xl text-4xl font-extrabold sm:text-6xl">Invest in learning, not in fees</Reveal>
            <Reveal delay={0.1} as="p" className="mx-auto mt-5 max-w-xl text-lg text-navy-500">Start free and pay per session. Upgrade when you’re booking regularly, and save on every lesson.</Reveal>
            <Reveal delay={0.15} className="mt-6"><Link to="/plus" className="inline-flex items-center gap-2 rounded-full bg-navy-950 px-4 py-2 text-sm font-semibold text-white"><Crown className="h-4 w-4 text-amber-300" />Compare Standard and TutorHaven Plus</Link></Reveal>
          </div>
        </section>

        <section className="container-page pb-20">
          <Stagger className={`mx-auto grid gap-6 ${PLANS.length >= 3 ? 'max-w-6xl lg:grid-cols-3' : PLANS.length === 2 ? 'max-w-4xl md:grid-cols-2' : 'max-w-md'}`} gap={0.1} key={PLANS.length}>
            {PLANS.map((p) => {
              const Icon = planIcon[p.code] ?? Crown
              p = { ...p, featured: p.id === featuredId }
              const isCurrent = current ? current.plan_id === p.id : user && p.id === 'free'
              return (
                <StaggerItem key={p.id} className="h-full">
                  <motion.div
                    whileHover={{ y: -6 }}
                    transition={spring}
                    className={`relative flex h-full flex-col overflow-hidden rounded-[1.75rem] p-7 sm:p-8 ${p.featured ? 'bg-navy-950 text-white shadow-lift' : 'card'}`}
                  >
                    {p.featured && (
                      <>
                        <div className="pointer-events-none absolute -top-10 -right-10 h-48 w-48 rounded-full bg-mint-400/25 blur-3xl" aria-hidden />
                        <span className="absolute top-7 right-7 rounded-full bg-mint-400 px-3 py-1 text-xs font-bold text-navy-950">Most popular</span>
                      </>
                    )}
                    <span className={`grid h-12 w-12 place-items-center rounded-2xl ${p.featured ? 'bg-white/10 text-mint-300' : 'bg-cream-200 text-navy-800'}`}><Icon className="h-6 w-6" /></span>
                    <h2 className={`mt-6 text-xl font-semibold ${p.featured ? 'text-white' : ''}`}>{p.name}</h2>
                    <p className={`mt-1.5 text-sm ${p.featured ? 'text-navy-200' : 'text-navy-500'}`}>{p.tagline}</p>
                    <p className="mt-6 font-display text-5xl font-bold tracking-tight">
                      {money(p.price)}<span className={`text-base font-medium ${p.featured ? 'text-navy-300' : 'text-navy-400'}`}> / {p.id === 'free' ? 'month' : per(p)}</span>
                    </p>
                    <ul className="mt-7 space-y-3.5 text-sm">
                      {p.features.map((f) => (
                        <li key={f} className="flex gap-3">
                          <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full ${p.featured ? 'bg-mint-400 text-navy-950' : 'bg-mint-100 text-mint-700'}`}><Check className="h-3 w-3" strokeWidth={3} /></span>
                          <span className={p.featured ? 'text-navy-100' : 'text-navy-700'}>{f}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-auto pt-8">
                      {isCurrent ? (
                        <p className={`rounded-xl py-3 text-center text-sm font-semibold ${p.featured ? 'bg-white/10 text-mint-300' : 'bg-mint-50 text-mint-700'}`}>
                          Your current plan{current?.plan_id === p.id ? ` · ${current.status === 'cancelled' ? 'ends' : 'active until'} ${dateLong(current.current_period_end)}` : ''}
                        </p>
                      ) : (
                        <Button variant={p.featured ? 'mint' : 'primary'} size="lg" className="w-full" onClick={() => choose(p)}>
                          {p.id === 'free' ? (user ? 'Find a tutor' : 'Get started') : `Choose ${p.name}`}
                        </Button>
                      )}
                    </div>
                  </motion.div>
                </StaggerItem>
              )
            })}
          </Stagger>
          <p className="mx-auto mt-8 max-w-2xl text-center text-sm text-navy-500">
            Prices in Nigerian Naira (NGN). Memberships don’t renew automatically and are non-refundable once paid, except where the law requires it; benefits continue until the end of the paid period.{' '}
            <Link to="/refunds" className="font-semibold text-navy-800 underline underline-offset-2">Read the Refund Policy</Link>
          </p>
          {plansLoaded && PLANS.length === 1 && (
            <p className="mx-auto mt-6 max-w-md text-center text-sm text-navy-500">Membership plans aren’t available right now. You can still book any tutor and pay per session.</p>
          )}

          {tutorPlans.length > 0 && (
            <Reveal className="mx-auto mt-14 max-w-6xl">
              <div className="card flex flex-col gap-6 p-7 sm:p-8 md:flex-row md:items-center">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-mint-100 text-mint-700"><GraduationCap className="h-6 w-6" /></span>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold">Are you a tutor?</h2>
                  <p className="mt-1.5 text-sm text-navy-500">
                    {tutorPlans.map((t) => `${t.name}: ${money(t.price)} / ${per(t)}`).join(' · ')}. Your profile appears in search and takes paid bookings while your subscription is active, and you keep {100 - Math.round(Number(settings.commission_rate ?? 0.15) * 100)}% of every session, paid straight to your bank.
                  </p>
                </div>
                <Button variant="secondary" to={profile?.role === 'tutor' ? '/dashboard/subscription' : '/signup?role=tutor'}>
                  {profile?.role === 'tutor' ? 'Manage subscription' : 'Apply to teach'}
                </Button>
              </div>
            </Reveal>
          )}
        </section>

        <section className="container-page max-w-3xl pb-28">
          <Reveal as="h2" className="text-center text-3xl font-bold">Questions, answered</Reveal>
          <div className="mt-10 space-y-3">
            {FAQ.map(([q, a], i) => {
              const open = openFaq === i
              return (
                <Reveal key={q} delay={i * 0.05} className="card overflow-hidden">
                  <button type="button" onClick={() => setOpenFaq(open ? -1 : i)} aria-expanded={open} className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left font-semibold">
                    {q}
                    <motion.span animate={{ rotate: open ? 45 : 0 }} transition={spring} className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-cream-200 text-lg leading-none text-navy-700">+</motion.span>
                  </button>
                  <motion.div initial={false} animate={{ height: open ? 'auto' : 0, opacity: open ? 1 : 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
                    <p className="px-6 pb-5 text-navy-600">{a}</p>
                  </motion.div>
                </Reveal>
              )
            })}
          </div>
        </section>

        <Modal open={!!choice} onClose={() => !busy && setChoice(null)} title={`Upgrade to ${choice?.name}`} description={choice ? `${money(choice.price)} per ${per(choice)} · no automatic charges` : null}>
          <ul className="space-y-2.5 text-sm">
            {choice?.features.map((f) => <li key={f} className="flex gap-2.5"><Check className="h-4 w-4 text-mint-600" />{f}</li>)}
          </ul>
          <p className="mt-5 flex items-start gap-2 rounded-xl bg-cream-100 p-3 text-xs text-navy-600">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-mint-600" />
            You’ll pay securely on Paystack (card, bank transfer or USSD). Your plan starts once Paystack confirms the payment to us.
          </p>
          {choice && <RefundNotice className="mt-3" kind="plan" period={`${choice.interval_months > 1 ? choice.interval_months : 1} month${choice.interval_months > 1 ? 's' : ''}`} />}
          <div className="mt-6 flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setChoice(null)} disabled={busy}>Not now</Button>
            <Button className="flex-1" loading={busy} onClick={confirm}>Pay {money(choice?.price)}</Button>
          </div>
        </Modal>
      </PageTransition>
    </PublicLayout>
  )
}
