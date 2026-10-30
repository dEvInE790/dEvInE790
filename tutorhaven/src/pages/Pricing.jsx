import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { Check, Crown, FlaskConical, Sparkles, Users } from 'lucide-react'
import PublicLayout from '../components/layout/PublicLayout'
import PageTransition from '../motion/PageTransition'
import { Reveal, Stagger, StaggerItem } from '../motion/Reveal'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import { SuccessMark } from './Checkout'
import useAsync from '../lib/useAsync'
import { getSubscription, subscribe } from '../lib/api'
import { PLANS } from '../lib/constants'
import { dateLong, money } from '../lib/format'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { spring } from '../motion/variants'

const planIcon = { free: Sparkles, plus: Crown, family: Users }

const FAQ = [
  ['How do tutor prices work?', 'Each tutor sets their own hourly rate. You pay per session at checkout, and membership discounts are applied automatically.'],
  ['Can I cancel my membership?', 'Yes, any time from Billing. Your benefits continue until the end of the period you’ve paid for.'],
  ['What is the cancellation policy for sessions?', 'Cancel up to 24 hours before a session for a full refund, or up to 2 hours before with Plus or Family.'],
  ['Who is the Family plan for?', 'Parents who book for one or more children. The discount applies to every session you book for a linked learner.'],
]

export default function Pricing() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const sub = useAsync(() => getSubscription(user.id), [user?.id], { enabled: !!user })
  const [choice, setChoice] = useState(null)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(null)
  const [openFaq, setOpenFaq] = useState(0)

  const current = sub.data && new Date(sub.data.current_period_end) > new Date() ? sub.data : null

  const choose = (plan) => {
    if (plan.id === 'free') return navigate(user ? '/tutors' : '/signup')
    if (!user) return navigate('/signup', { state: { from: '/pricing' } })
    if (profile?.role === 'tutor') return toast.info('Memberships are for students and parents.')
    setDone(null)
    setChoice(plan)
  }

  const confirm = async () => {
    setBusy(true)
    try {
      const s = await subscribe(choice.id)
      sub.setData(s)
      setDone(s)
    } catch (e) {
      toast.error(e.message)
    } finally {
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
          </div>
        </section>

        <section className="container-page pb-20">
          <Stagger className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-3" gap={0.1}>
            {PLANS.map((p) => {
              const Icon = planIcon[p.id]
              const isCurrent = current ? current.plan === p.id : user && p.id === 'free'
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
                      {money(p.price)}<span className={`text-base font-medium ${p.featured ? 'text-navy-300' : 'text-navy-400'}`}> / month</span>
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
                          Your current plan{current?.plan === p.id && current.status === 'canceled' ? ` · ends ${dateLong(current.current_period_end)}` : ''}
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

        <Modal open={!!choice} onClose={() => setChoice(null)} title={done ? 'Welcome to ' + choice?.name : `Upgrade to ${choice?.name}`} description={done ? null : `${money(choice?.price)} per month · cancel any time`}>
          {done ? (
            <div className="text-center">
              <SuccessMark />
              <p className="mt-5 text-navy-600">Your {choice?.name} benefits are active until <strong>{dateLong(done.current_period_end)}</strong>. Discounts apply automatically at checkout.</p>
              <Button className="mt-6 w-full" to="/tutors">Find a tutor</Button>
            </div>
          ) : (
            <>
              <ul className="space-y-2.5 text-sm">
                {choice?.features.map((f) => <li key={f} className="flex gap-2.5"><Check className="h-4 w-4 text-mint-600" />{f}</li>)}
              </ul>
              <p className="mt-5 flex items-start gap-2 rounded-xl bg-cream-100 p-3 text-xs text-navy-600">
                <FlaskConical className="mt-0.5 h-4 w-4 shrink-0 text-navy-400" />Test mode: no card is charged. The subscription and payment are recorded in your account.
              </p>
              <div className="mt-6 flex gap-3">
                <Button variant="secondary" className="flex-1" onClick={() => setChoice(null)}>Not now</Button>
                <Button className="flex-1" loading={busy} onClick={confirm}>Pay {money(choice?.price)}</Button>
              </div>
            </>
          )}
        </Modal>
      </PageTransition>
    </PublicLayout>
  )
}
