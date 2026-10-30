import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import {
  ArrowRight, Atom, BadgeCheck, BookOpen, Calculator, CalendarCheck2, ChartColumn, Code2, FlaskConical,
  GraduationCap, HeartHandshake, Languages, LineChart, PenLine, Quote, Search, ShieldCheck, Sigma, Sparkles, Users, Wallet,
} from 'lucide-react'
import PublicLayout from '../components/layout/PublicLayout'
import PageTransition from '../motion/PageTransition'
import { Reveal, Stagger, StaggerItem } from '../motion/Reveal'
import AnimatedNumber from '../motion/AnimatedNumber'
import { LogoIntro } from '../motion/AnimatedLogo'
import Float from '../motion/Float'
import Button from '../components/ui/Button'
import Avatar from '../components/ui/Avatar'
import Tabs from '../components/ui/Tabs'
import { Stars } from '../components/ui/StarRating'
import TutorCard, { TutorCardSkeleton } from '../components/TutorCard'
import HeroArt from '../components/illustrations/HeroArt'
import useAsync from '../lib/useAsync'
import { getFeaturedReviews, getPublicStats, searchTutors } from '../lib/api'
import { isSupabaseConfigured } from '../lib/supabase'
import { PLANS } from '../lib/constants'
import { money } from '../lib/format'
import { ease } from '../motion/variants'

const POPULAR = ['Mathematics', 'Physics', 'English', 'Chemistry', 'Spanish', 'Computer Science']

const SUBJECT_TILES = [
  { name: 'Mathematics', icon: Sigma },
  { name: 'Physics', icon: Atom },
  { name: 'Chemistry', icon: FlaskConical },
  { name: 'English', icon: BookOpen },
  { name: 'Writing', icon: PenLine },
  { name: 'Computer Science', icon: Code2 },
  { name: 'Spanish', icon: Languages },
  { name: 'Statistics', icon: Calculator },
]

const STEPS = [
  { icon: Search, title: 'Discover your match', body: 'Filter verified tutors by subject, level, budget and language, then compare real reviews from learners.' },
  { icon: CalendarCheck2, title: 'Book in seconds', body: 'See live availability in your own timezone and lock in a time that works. No back-and-forth emails.' },
  { icon: LineChart, title: 'Grow with every session', body: 'Track hours, upcoming lessons and progress from a dashboard built for learners, parents and tutors.' },
]

const AUDIENCES = {
  students: {
    title: 'Learn at your pace, with someone in your corner',
    points: ['Personalised tutor recommendations from your interests', 'Weekly learning-hours chart to keep momentum', 'Rate every session and save favourite tutors'],
    icon: GraduationCap,
    cta: ['Start learning', '/signup?role=student'],
  },
  parents: {
    title: 'Peace of mind for every learner at home',
    points: ['Link your children and book on their behalf', 'See upcoming sessions and spending in one place', 'Family plan with 15% off every session'],
    icon: HeartHandshake,
    cta: ['Create a family account', '/signup?role=parent'],
  },
  tutors: {
    title: 'Grow your tutoring business without the admin',
    points: ['Set your rate, subjects and weekly availability', 'Get booked and paid with no chasing', 'Earnings and student insights at a glance'],
    icon: Wallet,
    cta: ['Apply to teach', '/signup?role=tutor'],
  },
}

export default function Landing() {
  const navigate = useNavigate()
  const location = useLocation()
  const [q, setQ] = useState('')
  const [audience, setAudience] = useState('students')
  const enabled = isSupabaseConfigured
  const stats = useAsync(getPublicStats, [], { enabled })
  const tutors = useAsync(() => searchTutors({ limit: 6 }), [], { enabled })
  const reviews = useAsync(() => getFeaturedReviews(6), [], { enabled })

  useEffect(() => {
    if (!location.hash) return
    const t = setTimeout(() => document.querySelector(location.hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120)
    return () => clearTimeout(t)
  }, [location.hash])

  const onSearch = (e) => {
    e.preventDefault()
    navigate(`/tutors${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''}`)
  }

  const s = stats.data
  const a = AUDIENCES[audience]

  return (
    <PublicLayout transparentHeader>
      <LogoIntro />
      <PageTransition>
        {/* ------------------------------------------------------------------ Hero */}
        <section className="relative overflow-hidden pt-28 pb-16 sm:pt-32 lg:pt-40 lg:pb-28">
          <div className="pointer-events-none absolute inset-0" aria-hidden>
            <div className="absolute -top-32 -left-24 h-[28rem] w-[28rem] rounded-full bg-mint-200/50 blur-3xl" />
            <div className="absolute top-20 right-[-10rem] h-[32rem] w-[32rem] rounded-full bg-navy-200/40 blur-3xl" />
            <div className="absolute inset-0 bg-[radial-gradient(rgb(15_28_54/0.07)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_70%)]" />
          </div>

          <div className="container-page relative grid items-center gap-14 lg:grid-cols-[1.05fr_1fr] lg:gap-10">
            <Stagger onMount gap={0.09} delay={0.15}>
              <StaggerItem>
                <span className="eyebrow"><Sparkles className="h-3.5 w-3.5" />Verified tutors · Live availability</span>
              </StaggerItem>
              <StaggerItem as="h1" className="mt-6 text-[2.6rem] leading-[1.05] font-extrabold sm:text-6xl lg:text-[4.2rem]">
                Find the{' '}
                <span className="relative inline-block whitespace-nowrap">
                  right tutor.
                  <svg className="absolute -bottom-2 left-0 h-3 w-full" viewBox="0 0 300 12" preserveAspectRatio="none" aria-hidden>
                    <motion.path
                      d="M2 9 C 80 2, 200 2, 298 7"
                      fill="none" stroke="#4cc897" strokeWidth="5" strokeLinecap="round"
                      initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.9, delay: 0.9, ease }}
                    />
                  </svg>
                </span>
                <br />
                <span className="bg-gradient-to-r from-navy-950 via-navy-700 to-mint-700 bg-clip-text text-transparent">Unlock your potential.</span>
              </StaggerItem>
              <StaggerItem as="p" className="mt-6 max-w-xl text-lg leading-relaxed text-navy-600">
                TutorHaven connects learners and families with exceptional, verified tutors, with live scheduling, secure payments and progress you can actually see.
              </StaggerItem>

              <StaggerItem>
                <form onSubmit={onSearch} className="mt-8 flex max-w-xl flex-col gap-2 rounded-2xl border border-navy-900/8 bg-white p-2 shadow-lift sm:flex-row" role="search">
                  <label htmlFor="hero-search" className="sr-only">What do you want to learn?</label>
                  <div className="relative flex-1">
                    <Search className="pointer-events-none absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-navy-300" aria-hidden />
                    <input
                      id="hero-search"
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      placeholder="What do you want to learn?"
                      className="h-12 w-full rounded-xl bg-transparent pr-3 pl-12 text-base outline-none placeholder:text-navy-300"
                    />
                  </div>
                  <Button type="submit" size="lg" className="!h-12" iconRight={ArrowRight}>Find tutors</Button>
                </form>
              </StaggerItem>

              <StaggerItem className="mt-5 flex flex-wrap items-center gap-2 text-sm">
                <span className="text-navy-400">Popular:</span>
                {POPULAR.map((p) => (
                  <Link key={p} to={`/tutors?subject=${encodeURIComponent(p)}`} className="rounded-full border border-navy-900/8 bg-white/70 px-3 py-1 text-navy-700 transition-colors hover:border-mint-500/40 hover:bg-mint-50 hover:text-mint-800">
                    {p}
                  </Link>
                ))}
              </StaggerItem>

              {tutors.data?.length > 0 && (
                <StaggerItem className="mt-9 flex items-center gap-4">
                  <div className="flex -space-x-3">
                    {tutors.data.slice(0, 4).map((t) => (
                      <Avatar key={t.id} name={t.full_name} src={t.avatar_url} seed={t.id} size="sm" ring />
                    ))}
                  </div>
                  <p className="text-sm text-navy-600">
                    <strong className="text-navy-950">{s?.tutors ?? tutors.data.length} verified tutors</strong> across {s?.subjects ?? '—'} subjects
                  </p>
                </StaggerItem>
              )}
            </Stagger>

            <HeroArt />
          </div>
        </section>

        {/* ------------------------------------------------------------------ Live stats */}
        {s && s.tutors > 0 && (
          <section className="container-page">
            <Reveal className="grid grid-cols-2 gap-px overflow-hidden rounded-3xl border border-navy-900/[0.06] bg-navy-900/[0.06] shadow-soft md:grid-cols-4">
              {[
                { label: 'Verified tutors', value: s.tutors },
                { label: 'Subjects taught', value: s.subjects },
                { label: 'Sessions completed', value: s.sessions },
                { label: 'Average rating', value: s.avg_rating ?? 0, format: (v) => (s.avg_rating ? v.toFixed(1) + ' ★' : 'New') },
              ].map((x) => (
                <div key={x.label} className="bg-white px-6 py-7 text-center">
                  <p className="font-display text-3xl font-bold text-navy-950 sm:text-4xl">
                    <AnimatedNumber value={x.value} format={x.format} />
                  </p>
                  <p className="mt-1 text-sm text-navy-500">{x.label}</p>
                </div>
              ))}
            </Reveal>
          </section>
        )}

        {/* ------------------------------------------------------------------ How it works */}
        <section id="how-it-works" className="container-page scroll-mt-24 py-24 lg:py-32">
          <Reveal className="mx-auto max-w-2xl text-center">
            <span className="eyebrow">How it works</span>
            <h2 className="mt-4 text-3xl font-bold sm:text-5xl">From first search to real progress</h2>
            <p className="mt-4 text-lg text-navy-500">Three simple steps, designed to get you learning this week, not next month.</p>
          </Reveal>
          <div className="relative mt-16">
            <svg className="absolute top-10 left-0 hidden h-2 w-full md:block" preserveAspectRatio="none" viewBox="0 0 100 2" aria-hidden>
              <motion.line x1="16" y1="1" x2="84" y2="1" stroke="#7fdcb8" strokeWidth="0.35" strokeDasharray="1 1.2"
                initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 1.4, ease }} />
            </svg>
            <Stagger className="grid gap-6 md:grid-cols-3" gap={0.15}>
              {STEPS.map((st, i) => (
                <StaggerItem key={st.title} className="relative text-center">
                  <motion.div whileHover={{ y: -4, rotate: -3 }} className="relative mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-white shadow-lift">
                    <st.icon className="h-8 w-8 text-navy-900" aria-hidden />
                    <span className="absolute -top-2 -right-2 grid h-7 w-7 place-items-center rounded-full bg-mint-400 font-display text-xs font-bold text-navy-950">{i + 1}</span>
                  </motion.div>
                  <h3 className="mt-6 text-xl font-semibold">{st.title}</h3>
                  <p className="mx-auto mt-2 max-w-xs text-navy-500">{st.body}</p>
                </StaggerItem>
              ))}
            </Stagger>
          </div>
        </section>

        {/* ------------------------------------------------------------------ Featured tutors */}
        <section className="bg-white py-24 lg:py-28">
          <div className="container-page">
            <Reveal className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
              <div>
                <span className="eyebrow">Featured tutors</span>
                <h2 className="mt-4 text-3xl font-bold sm:text-4xl">Learn from people who love to teach</h2>
                <p className="mt-3 max-w-xl text-navy-500">Every tutor is reviewed by our team before they can be booked.</p>
              </div>
              <Button to="/tutors" variant="secondary" iconRight={ArrowRight}>Browse all tutors</Button>
            </Reveal>
            <div className="mt-12">
              {!enabled || tutors.error ? (
                <p className="rounded-2xl bg-cream-100 p-6 text-center text-navy-500">Tutors will appear here once your database is connected.</p>
              ) : tutors.loading ? (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 3 }).map((_, i) => <TutorCardSkeleton key={i} />)}</div>
              ) : tutors.data.length === 0 ? (
                <p className="rounded-2xl bg-cream-100 p-6 text-center text-navy-500">Our first tutors are being verified. Check back soon, or <Link to="/signup?role=tutor" className="font-semibold text-mint-700 underline">apply to teach</Link>.</p>
              ) : (
                <Stagger className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" gap={0.08}>
                  {tutors.data.map((t) => <TutorCard key={t.id} tutor={t} />)}
                </Stagger>
              )}
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------------ Subjects */}
        <section className="container-page py-24 lg:py-28">
          <Reveal className="text-center">
            <span className="eyebrow">Subjects</span>
            <h2 className="mt-4 text-3xl font-bold sm:text-4xl">Whatever you’re learning, start here</h2>
          </Reveal>
          <Stagger className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-4" gap={0.05}>
            {SUBJECT_TILES.map((t) => (
              <StaggerItem key={t.name}>
                <Link to={`/tutors?subject=${encodeURIComponent(t.name)}`} className="group block h-full">
                  <motion.div whileHover={{ y: -4 }} whileTap={{ scale: 0.98 }} className="card flex h-full items-center gap-3 p-4 transition-shadow group-hover:shadow-lift sm:p-5">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-cream-200 text-navy-800 transition-colors duration-300 group-hover:bg-navy-900 group-hover:text-mint-300">
                      <t.icon className="h-5 w-5" aria-hidden />
                    </span>
                    <span className="font-semibold text-navy-900">{t.name}</span>
                  </motion.div>
                </Link>
              </StaggerItem>
            ))}
          </Stagger>
        </section>

        {/* ------------------------------------------------------------------ Audiences */}
        <section className="container-page pb-24 lg:pb-32">
          <Reveal className="overflow-hidden rounded-[2.25rem] bg-navy-950 p-6 text-white sm:p-10 lg:p-14">
            <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
              <div>
                <span className="inline-flex rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold tracking-wide text-mint-300 uppercase">Built for everyone</span>
                <h2 className="mt-4 text-3xl font-bold text-white sm:text-4xl">One platform, three journeys</h2>
                <div className="mt-6 [&_[role=tablist]]:bg-white/10 [&_[role=tab]]:text-navy-200 [&_[role=tab][aria-selected=true]]:text-navy-950">
                  <Tabs
                    value={audience}
                    onChange={setAudience}
                    tabs={[{ value: 'students', label: 'Students' }, { value: 'parents', label: 'Parents' }, { value: 'tutors', label: 'Tutors' }]}
                  />
                </div>
                <AnimatePresence mode="wait">
                  <motion.div key={audience} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.35, ease }}>
                    <h3 className="mt-8 text-2xl font-semibold text-white">{a.title}</h3>
                    <ul className="mt-5 space-y-3">
                      {a.points.map((p, i) => (
                        <motion.li key={p} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.07 }} className="flex items-start gap-3 text-navy-100">
                          <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-mint-400" aria-hidden />{p}
                        </motion.li>
                      ))}
                    </ul>
                    <Button to={a.cta[1]} variant="mint" className="mt-8" iconRight={ArrowRight}>{a.cta[0]}</Button>
                  </motion.div>
                </AnimatePresence>
              </div>
              <div className="relative hidden h-80 lg:block" aria-hidden>
                <AnimatePresence mode="wait">
                  <motion.div key={audience} className="absolute inset-0 grid place-items-center" initial={{ opacity: 0, scale: 0.9, rotate: -4 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.5, ease }}>
                    <div className="absolute h-72 w-72 rounded-full bg-mint-400/15 blur-2xl" />
                    <Float distance={10} duration={6}>
                      <div className="grid h-44 w-44 place-items-center rounded-[2.5rem] border border-white/10 bg-gradient-to-br from-navy-700 to-navy-900 shadow-lift">
                        <a.icon className="h-20 w-20 text-mint-300" strokeWidth={1.4} />
                      </div>
                    </Float>
                    <Float className="absolute top-6 right-10" distance={8} duration={5} delay={0.5}>
                      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white/10 backdrop-blur"><ChartColumn className="h-6 w-6 text-mint-300" /></div>
                    </Float>
                    <Float className="absolute bottom-8 left-12" distance={8} duration={5.5} delay={1}>
                      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-mint-400"><ShieldCheck className="h-6 w-6 text-navy-950" /></div>
                    </Float>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </Reveal>
        </section>

        {/* ------------------------------------------------------------------ Testimonials (real reviews only) */}
        {reviews.data?.length > 0 && (
          <section className="bg-white py-24 lg:py-28">
            <div className="container-page">
              <Reveal className="text-center">
                <span className="eyebrow">Reviews</span>
                <h2 className="mt-4 text-3xl font-bold sm:text-4xl">What learners are saying</h2>
              </Reveal>
              <Stagger className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3" gap={0.08}>
                {reviews.data.map((r) => (
                  <StaggerItem key={r.id} className="card relative p-6">
                    <Quote className="absolute top-5 right-5 h-8 w-8 text-mint-100" aria-hidden />
                    <Stars value={r.rating} />
                    <p className="mt-4 leading-relaxed text-navy-700">“{r.comment}”</p>
                    <p className="mt-5 text-sm">
                      <span className="font-semibold text-navy-950">{r.author_name}</span>
                      <span className="text-navy-400"> on </span>
                      <Link to={`/tutors/${r.tutor_id}`} className="font-medium text-mint-700 hover:underline">{r.tutor_name}</Link>
                    </p>
                  </StaggerItem>
                ))}
              </Stagger>
            </div>
          </section>
        )}

        {/* ------------------------------------------------------------------ Pricing teaser */}
        <section className="container-page py-24 lg:py-28">
          <Reveal className="text-center">
            <span className="eyebrow">Membership</span>
            <h2 className="mt-4 text-3xl font-bold sm:text-4xl">Simple pricing. Better value the more you learn.</h2>
            <p className="mx-auto mt-4 max-w-xl text-navy-500">Tutors set their own hourly rates. Membership takes money off every session.</p>
          </Reveal>
          <Stagger className="mx-auto mt-12 grid max-w-5xl gap-5 md:grid-cols-3" gap={0.1}>
            {PLANS.map((p) => (
              <StaggerItem key={p.id} className={`card relative p-7 ${p.featured ? 'ring-2 ring-mint-400' : ''}`}>
                {p.featured && <span className="absolute -top-3 left-7 rounded-full bg-mint-400 px-3 py-1 text-xs font-bold text-navy-950">Most popular</span>}
                <h3 className="text-lg font-semibold">{p.name}</h3>
                <p className="mt-3 font-display text-4xl font-bold">{money(p.price)}<span className="text-base font-medium text-navy-400">/mo</span></p>
                <p className="mt-2 text-sm text-navy-500">{p.tagline}</p>
              </StaggerItem>
            ))}
          </Stagger>
          <div className="mt-10 text-center"><Button to="/pricing" variant="secondary" iconRight={ArrowRight}>Compare plans</Button></div>
        </section>

        {/* ------------------------------------------------------------------ CTA */}
        <section className="container-page pb-24">
          <Reveal className="relative overflow-hidden rounded-[2.25rem] bg-gradient-to-br from-mint-300 via-mint-200 to-cream-200 px-6 py-16 text-center sm:px-12">
            <Float className="absolute top-8 left-[8%] hidden sm:block" distance={10} duration={6}>
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white/70 shadow-soft"><Users className="h-6 w-6 text-navy-800" /></div>
            </Float>
            <Float className="absolute right-[8%] bottom-10 hidden sm:block" distance={12} duration={7} delay={0.8}>
              <div className="grid h-16 w-16 place-items-center rounded-2xl bg-navy-900 shadow-lift"><GraduationCap className="h-7 w-7 text-mint-300" /></div>
            </Float>
            <h2 className="mx-auto max-w-2xl text-3xl font-bold sm:text-5xl">Your next breakthrough is one session away</h2>
            <p className="mx-auto mt-4 max-w-lg text-navy-700">Create a free account in under a minute. Pay only when you book.</p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button to="/signup" size="lg" iconRight={ArrowRight}>Get started free</Button>
              <Button to="/tutors" size="lg" variant="secondary">Browse tutors</Button>
            </div>
          </Reveal>
        </section>
      </PageTransition>
    </PublicLayout>
  )
}
