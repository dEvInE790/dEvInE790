import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeft, ArrowRight, CalendarX2, Clock, Globe, Lock } from 'lucide-react'
import PublicLayout from '../components/layout/PublicLayout'
import PageTransition from '../motion/PageTransition'
import Avatar from '../components/ui/Avatar'
import Button from '../components/ui/Button'
import Skeleton, { LoadingRegion } from '../components/ui/Skeleton'
import { Textarea, ChipGroup } from '../components/ui/Field'
import Tabs from '../components/ui/Tabs'
import EmptyState, { ErrorState } from '../components/ui/EmptyState'
import { Stars } from '../components/ui/StarRating'
import useAsync from '../lib/useAsync'
import { activeDiscount, createBooking, getBusySlots, getSubscription, getTutor, listChildren } from '../lib/api'
import { generateSlots, groupByLocalDay, browserTimezone } from '../lib/time'
import { DURATIONS, PLANS } from '../lib/constants'
import { dateLong, money, time } from '../lib/format'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { ease, spring } from '../motion/variants'

const DAYS_AHEAD = 21

function Step({ n, title, children, done }) {
  return (
    <motion.section layout="position" className="card p-5 sm:p-7">
      <h2 className="flex items-center gap-3 text-lg font-semibold">
        <motion.span
          animate={{ backgroundColor: done ? '#4cc897' : '#0f1c36', color: done ? '#0a1428' : '#ffffff' }}
          className="grid h-7 w-7 place-items-center rounded-full font-display text-xs font-bold"
        >
          {n}
        </motion.span>
        {title}
      </h2>
      <div className="mt-5">{children}</div>
    </motion.section>
  )
}

export default function Book() {
  const { tutorId } = useParams()
  const { profile } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const isParent = profile?.role === 'parent'

  const tutor = useAsync(() => getTutor(tutorId), [tutorId])
  const children = useAsync(() => listChildren(profile.id), [profile?.id], { enabled: isParent })
  const sub = useAsync(() => getSubscription(profile.id), [profile?.id])
  const busy = useAsync(() => getBusySlots(tutorId, new Date(), new Date(Date.now() + (DAYS_AHEAD + 1) * 864e5)), [tutorId])

  const [subject, setSubject] = useState('')
  const [learner, setLearner] = useState(isParent ? '' : profile?.id)
  const [duration, setDuration] = useState(60)
  const [dayKey, setDayKey] = useState(null)
  const [slot, setSlot] = useState(null)
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const t = tutor.data
  useEffect(() => {
    if (t?.subjects?.length && !subject) setSubject(t.subjects[0])
  }, [t, subject])
  useEffect(() => {
    if (isParent && children.data?.length && !learner) setLearner(children.data[0].id)
  }, [isParent, children.data, learner])

  const days = useMemo(() => {
    if (!t) return []
    return groupByLocalDay(generateSlots({ availability: t.availability, timezone: t.timezone, busy: busy.data ?? [], duration, days: DAYS_AHEAD }))
  }, [t, busy.data, duration])

  useEffect(() => {
    if (!days.length) return setDayKey(null)
    if (!days.some((d) => d.key === dayKey)) setDayKey(days[0].key)
  }, [days, dayKey])
  useEffect(() => setSlot(null), [duration, dayKey])

  const day = days.find((d) => d.key === dayKey)
  const discount = activeDiscount(sub.data, PLANS)
  const price = t ? Math.round((t.hourly_rate * duration * 100) / 60) / 100 : 0
  const total = Math.round(price * (1 - discount) * 100) / 100

  const onSubmit = async () => {
    if (!slot || !subject || !learner) return
    setSubmitting(true)
    try {
      const booking = await createBooking({ tutorId, studentId: learner, subject, startsAt: slot, duration, notes })
      navigate(`/checkout/${booking.id}`)
    } catch (e) {
      toast.error(e.message)
      busy.reload({ silent: true })
      setSlot(null)
    } finally {
      setSubmitting(false)
    }
  }

  if (tutor.error) return <PublicLayout><div className="container-page pt-32 pb-24"><ErrorState message={tutor.error} onRetry={tutor.reload} /></div></PublicLayout>
  if (!tutor.loading && !t) return <PublicLayout><div className="container-page pt-32 pb-24"><EmptyState title="Tutor not found" action={<Button to="/tutors">Browse tutors</Button>} /></div></PublicLayout>

  const needsChild = isParent && children.data && children.data.length === 0
  const morning = day?.slots.filter((s) => s.getHours() < 12) ?? []
  const afternoon = day?.slots.filter((s) => s.getHours() >= 12 && s.getHours() < 17) ?? []
  const evening = day?.slots.filter((s) => s.getHours() >= 17) ?? []

  return (
    <PublicLayout footer={false}>
      <PageTransition className="container-page pt-24 pb-32 lg:pt-28 lg:pb-16">
        <Link to={`/tutors/${tutorId}`} className="inline-flex items-center gap-1.5 text-sm font-medium text-navy-500 hover:text-navy-900"><ArrowLeft className="h-4 w-4" />Back to profile</Link>
        <h1 className="mt-4 text-3xl font-bold sm:text-4xl">Book a session</h1>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_22rem]">
          <div className="min-w-0 space-y-5">
            {needsChild ? (
              <div className="card p-8">
                <EmptyState title="Link your child first" action={<Button to="/dashboard">Go to your dashboard</Button>}>
                  Parent accounts book on behalf of a linked learner. Add your child’s student account from your dashboard.
                </EmptyState>
              </div>
            ) : (
              <>
                <Step n={1} title="What would you like to learn?" done={!!subject && !!learner}>
                  {tutor.loading ? <Skeleton className="h-10" /> : (
                    <ChipGroup multiple={false} options={t.subjects} value={subject} onChange={setSubject} label="Subject" />
                  )}
                  {isParent && children.data?.length > 0 && (
                    <div className="mt-6">
                      <p className="mb-3 text-sm font-semibold text-navy-800">Who is this session for?</p>
                      <div className="flex flex-wrap gap-2">
                        {children.data.map((c) => (
                          <motion.button
                            key={c.id}
                            type="button"
                            whileTap={{ scale: 0.97 }}
                            onClick={() => setLearner(c.id)}
                            aria-pressed={learner === c.id}
                            className={`flex items-center gap-2.5 rounded-2xl border py-2 pr-4 pl-2 text-sm font-semibold transition-colors ${learner === c.id ? 'border-navy-900 bg-navy-900 text-white' : 'border-navy-900/10 bg-white text-navy-800 hover:border-navy-900/25'}`}
                          >
                            <Avatar name={c.full_name} seed={c.id} size="xs" />{c.full_name}
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  )}
                </Step>

                <Step n={2} title="Session length" done>
                  <Tabs value={duration} onChange={setDuration} tabs={DURATIONS.map((d) => ({ value: d, label: `${d} min` }))} />
                </Step>

                <Step n={3} title="Pick a time" done={!!slot}>
                  <p className="-mt-2 mb-4 flex items-center gap-1.5 text-sm text-navy-500"><Globe className="h-4 w-4" />Times shown in {browserTimezone().replace(/_/g, ' ')}</p>
                  {tutor.loading || busy.loading ? (
                    <LoadingRegion label="Loading availability">
                      <div className="flex gap-2 overflow-hidden">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20 w-16 shrink-0 rounded-2xl" />)}</div>
                      <div className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-11" />)}</div>
                    </LoadingRegion>
                  ) : days.length === 0 ? (
                    <EmptyState icon={CalendarX2} title="No openings in the next three weeks">Try a shorter session, or check back soon. Tutors update their availability regularly.</EmptyState>
                  ) : (
                    <>
                      <div className="scrollbar-none -mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="listbox" aria-label="Day">
                        {days.map((d) => {
                          const on = d.key === dayKey
                          return (
                            <motion.button
                              key={d.key}
                              type="button"
                              role="option"
                              aria-selected={on}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => setDayKey(d.key)}
                              className={`relative flex w-[4.5rem] shrink-0 flex-col items-center rounded-2xl border py-3 transition-colors ${on ? 'border-transparent text-white' : 'border-navy-900/10 bg-white text-navy-800 hover:border-navy-900/25'}`}
                            >
                              {on && <motion.span layoutId="day-pill" className="absolute inset-0 rounded-2xl bg-navy-900" transition={spring} />}
                              <span className={`relative text-[0.7rem] font-semibold uppercase ${on ? 'text-mint-300' : 'text-navy-400'}`}>{d.date.toLocaleDateString(undefined, { weekday: 'short' })}</span>
                              <span className="relative font-display text-xl font-bold">{d.date.getDate()}</span>
                              <span className={`relative text-[0.65rem] ${on ? 'text-navy-200' : 'text-navy-400'}`}>{d.slots.length} open</span>
                            </motion.button>
                          )
                        })}
                      </div>
                      <AnimatePresence mode="wait">
                        <motion.div key={dayKey + duration} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.25, ease }} className="mt-6 space-y-5">
                          {[['Morning', morning], ['Afternoon', afternoon], ['Evening', evening]].filter(([, s]) => s.length).map(([label, list]) => (
                            <div key={label}>
                              <p className="mb-2.5 text-xs font-semibold tracking-wide text-navy-400 uppercase">{label}</p>
                              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                                {list.map((s) => {
                                  const on = slot?.getTime() === s.getTime()
                                  return (
                                    <motion.button
                                      key={s.toISOString()}
                                      type="button"
                                      whileHover={{ y: -2 }}
                                      whileTap={{ scale: 0.95 }}
                                      onClick={() => setSlot(s)}
                                      aria-pressed={on}
                                      className={`h-11 rounded-xl border text-sm font-semibold tabular-nums transition-colors ${on ? 'border-mint-500 bg-mint-400 text-navy-950 shadow-glow' : 'border-navy-900/10 bg-white text-navy-800 hover:border-mint-500/50'}`}
                                    >
                                      {time(s)}
                                    </motion.button>
                                  )
                                })}
                              </div>
                            </div>
                          ))}
                        </motion.div>
                      </AnimatePresence>
                    </>
                  )}
                </Step>

                <Step n={4} title="Anything your tutor should know?" done={!!notes}>
                  <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} maxLength={1000} placeholder="e.g. I have a calculus exam on the 14th and struggle with integration by parts." aria-label="Notes for your tutor" />
                </Step>
              </>
            )}
          </div>

          {/* Summary */}
          <aside>
            <div className="card sticky top-24 overflow-hidden">
              <div className="bg-navy-950 p-5 text-white">
                {tutor.loading ? <Skeleton className="h-12 bg-white/10" /> : (
                  <div className="flex items-center gap-3">
                    <Avatar name={t.full_name} seed={t.id} src={t.avatar_url} size="md" />
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{t.full_name}</p>
                      {t.review_count > 0 ? <Stars value={Number(t.rating)} size={12} /> : <p className="text-xs text-navy-300">New tutor</p>}
                    </div>
                  </div>
                )}
              </div>
              <div className="space-y-3 p-5 text-sm">
                <Row label="Subject" value={subject || '—'} />
                <Row label="Length" value={`${duration} minutes`} />
                <Row
                  label="When"
                  value={
                    <AnimatePresence mode="wait">
                      <motion.span key={slot?.toISOString() ?? 'none'} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="block text-right">
                        {slot ? <>{dateLong(slot)}<br />{time(slot)}</> : 'Choose a time'}
                      </motion.span>
                    </AnimatePresence>
                  }
                />
                <div className="border-t border-dashed border-navy-900/10 pt-3">
                  <Row label="Session price" value={money(price)} />
                  {discount > 0 && <Row label={`Member discount (${Math.round(discount * 100)}%)`} value={<span className="text-mint-700">−{money(price - total)}</span>} />}
                </div>
                <div className="flex items-end justify-between border-t border-navy-900/[0.06] pt-3">
                  <span className="font-semibold">Total</span>
                  <motion.span key={total} initial={{ scale: 1.15 }} animate={{ scale: 1 }} transition={spring} className="font-display text-2xl font-bold">{money(total)}</motion.span>
                </div>
                <Button size="lg" className="mt-2 w-full" disabled={!slot || !subject || !learner || needsChild} loading={submitting} onClick={onSubmit} iconRight={ArrowRight}>
                  Continue to payment
                </Button>
                <p className="flex items-center justify-center gap-1.5 pt-1 text-xs text-navy-400"><Lock className="h-3.5 w-3.5" />Your slot is held for 20 minutes at checkout</p>
                {!discount && <p className="text-center text-xs text-navy-400"><Link to="/pricing" className="font-semibold text-mint-700 hover:underline">Members save up to 15%</Link></p>}
              </div>
            </div>
          </aside>
        </div>
        {/* Mobile checkout bar */}
        <AnimatePresence>
          {slot && (
            <motion.div
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              transition={{ duration: 0.35, ease }}
              className="fixed inset-x-0 bottom-0 z-30 border-t border-navy-900/[0.06] bg-white/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-xl lg:hidden"
            >
              <div className="mx-auto flex max-w-xl items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="truncate text-xs text-navy-500">{dateLong(slot)} · {time(slot)}</p>
                  <p className="font-display text-xl font-bold">{money(total)}</p>
                </div>
                <Button loading={submitting} onClick={onSubmit} iconRight={ArrowRight} disabled={!subject || !learner}>Continue</Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </PageTransition>
    </PublicLayout>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="flex items-center gap-1.5 text-navy-500">{label === 'Length' && <Clock className="h-3.5 w-3.5" />}{label}</span>
      <span className="font-medium text-navy-900">{value}</span>
    </div>
  )
}
