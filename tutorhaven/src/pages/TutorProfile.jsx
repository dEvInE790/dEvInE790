import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { motion } from 'motion/react'
import { ArrowLeft, Award, BadgeCheck, CalendarDays, Clock, Globe, GraduationCap, MapPin, MessageSquareQuote, UserRoundX } from 'lucide-react'
import PublicLayout from '../components/layout/PublicLayout'
import PageTransition from '../motion/PageTransition'
import { Reveal, Stagger, StaggerItem } from '../motion/Reveal'
import AnimatedNumber from '../motion/AnimatedNumber'
import Avatar from '../components/ui/Avatar'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Skeleton, { SkeletonText, LoadingRegion } from '../components/ui/Skeleton'
import { Stars } from '../components/ui/StarRating'
import EmptyState, { ErrorState } from '../components/ui/EmptyState'
import FavouriteButton from '../components/FavouriteButton'
import useAsync from '../lib/useAsync'
import { getBusySlots, getTutor, getTutorReviews } from '../lib/api'
import { generateSlots, groupByLocalDay } from '../lib/time'
import { money, monthDay, pluralize } from '../lib/format'
import { useAuth } from '../context/AuthContext'
import { ease } from '../motion/variants'

export default function TutorProfile() {
  const { id } = useParams()
  const { profile } = useAuth()
  const tutor = useAsync(() => getTutor(id), [id])
  const reviews = useAsync(() => getTutorReviews(id), [id])
  const busy = useAsync(() => getBusySlots(id, new Date(), new Date(Date.now() + 8 * 864e5)), [id])

  const week = useMemo(() => {
    if (!tutor.data) return []
    const slots = generateSlots({ availability: tutor.data.availability, timezone: tutor.data.timezone, busy: busy.data ?? [], duration: 60, days: 7 })
    const groups = groupByLocalDay(slots)
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date()
      d.setHours(0, 0, 0, 0)
      d.setDate(d.getDate() + i)
      const g = groups.find((x) => x.date.getTime() === d.getTime())
      return { date: d, count: g?.slots.length ?? 0 }
    })
  }, [tutor.data, busy.data])

  if (tutor.error) {
    return (
      <PublicLayout>
        <div className="container-page pt-32 pb-24"><ErrorState message={tutor.error} onRetry={tutor.reload} /></div>
      </PublicLayout>
    )
  }

  if (!tutor.loading && !tutor.data) {
    return (
      <PublicLayout>
        <div className="container-page pt-32 pb-24">
          <EmptyState icon={UserRoundX} title="Tutor not found" action={<Button to="/tutors">Browse tutors</Button>}>
            This tutor may no longer be accepting students.
          </EmptyState>
        </div>
      </PublicLayout>
    )
  }

  const t = tutor.data
  const isSelf = profile?.id === id
  const canBook = t && t.status === 'approved' && !isSelf && profile?.role !== 'tutor'
  const maxCount = Math.max(1, ...week.map((w) => w.count))

  return (
    <PublicLayout>
      <PageTransition>
        {/* Banner */}
        <section className="relative overflow-hidden bg-navy-950 pt-24 pb-28 lg:pt-28">
          <div className="grain absolute inset-0" aria-hidden />
          <div className="pointer-events-none absolute -top-20 right-[-6rem] h-96 w-96 rounded-full bg-mint-500/20 blur-3xl" aria-hidden />
          <div className="container-page relative">
            <Link to="/tutors" className="inline-flex items-center gap-1.5 text-sm font-medium text-navy-200 transition-colors hover:text-white">
              <ArrowLeft className="h-4 w-4" />All tutors
            </Link>
          </div>
        </section>

        <div className="container-page relative -mt-20 grid gap-8 pb-28 lg:grid-cols-[1fr_22rem] lg:pb-24">
          <div className="min-w-0 space-y-8">
            {/* Identity card */}
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease }} className="card p-6 sm:p-8">
              {tutor.loading ? (
                <LoadingRegion label="Loading tutor">
                  <div className="flex gap-5">
                    <div className="skeleton h-24 w-24 rounded-full" />
                    <div className="flex-1 space-y-3 pt-2">
                      <Skeleton className="h-7 w-1/2" />
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-1/3" />
                    </div>
                  </div>
                </LoadingRegion>
              ) : (
                <>
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                    <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.15 }}>
                      <Avatar name={t.full_name} src={t.avatar_url} seed={t.id} size="xl" ring />
                    </motion.div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h1 className="text-2xl font-bold sm:text-3xl">{t.full_name}</h1>
                            {t.status === 'approved' ? <Badge tone="mint" icon={BadgeCheck}>Verified</Badge> : <Badge tone="amber">Pending review</Badge>}
                          </div>
                          <p className="mt-2 text-lg text-navy-600">{t.headline}</p>
                        </div>
                        <FavouriteButton tutorId={t.id} className="shrink-0" />
                      </div>
                      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-navy-500">
                        {t.location && <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" />{t.location}</span>}
                        <span className="flex items-center gap-1.5"><Globe className="h-4 w-4" />{t.languages.join(', ')}</span>
                        <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" />{t.timezone.replace(/_/g, ' ')}</span>
                      </div>
                    </div>
                  </div>
                  <Stagger onMount className="mt-7 grid grid-cols-3 gap-3 border-t border-navy-900/[0.06] pt-6" gap={0.08} delay={0.2}>
                    {[
                      { icon: Award, label: 'Rating', node: t.review_count ? <><AnimatedNumber value={Number(t.rating)} format={(v) => v.toFixed(1)} /><span className="text-amber-400"> ★</span></> : 'New' },
                      { icon: GraduationCap, label: 'Experience', node: <><AnimatedNumber value={t.years_experience} /> yrs</> },
                      { icon: CalendarDays, label: 'Sessions', node: <AnimatedNumber value={t.sessions_completed} /> },
                    ].map((s) => (
                      <StaggerItem key={s.label} className="text-center sm:text-left">
                        <p className="font-display text-xl font-bold text-navy-950 sm:text-2xl">{s.node}</p>
                        <p className="mt-0.5 flex items-center justify-center gap-1 text-xs text-navy-500 sm:justify-start"><s.icon className="h-3.5 w-3.5" />{s.label}</p>
                      </StaggerItem>
                    ))}
                  </Stagger>
                </>
              )}
            </motion.div>

            {/* About */}
            <Reveal className="card p-6 sm:p-8">
              <h2 className="text-xl font-semibold">About</h2>
              {tutor.loading ? <SkeletonText lines={4} className="mt-4" /> : (
                <p className="mt-3 leading-relaxed whitespace-pre-line text-navy-700">{t.bio || 'This tutor hasn’t written a bio yet.'}</p>
              )}
              {t && (
                <div className="mt-6 grid gap-6 sm:grid-cols-2">
                  <div>
                    <h3 className="text-sm font-semibold text-navy-800">Subjects</h3>
                    <div className="mt-2.5 flex flex-wrap gap-2">{t.subjects.map((s) => <span key={s} className="rounded-full bg-navy-900 px-3 py-1.5 text-xs font-semibold text-white">{s}</span>)}</div>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-navy-800">Levels</h3>
                    <div className="mt-2.5 flex flex-wrap gap-2">{t.levels.map((s) => <span key={s} className="rounded-full bg-cream-200 px-3 py-1.5 text-xs font-semibold text-navy-700">{s}</span>)}</div>
                  </div>
                </div>
              )}
            </Reveal>

            {/* Availability preview */}
            {t && (
              <Reveal className="card p-6 sm:p-8">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold">This week’s availability</h2>
                    <p className="mt-1 text-sm text-navy-500">One-hour openings in your timezone.</p>
                  </div>
                  {canBook && <Link to={`/book/${t.id}`} className="text-sm font-semibold text-mint-700 hover:underline">See all times</Link>}
                </div>
                <div className="mt-6 grid grid-cols-7 gap-2">
                  {week.map((d, i) => (
                    <div key={i} className="text-center">
                      <p className="text-[0.7rem] font-semibold text-navy-400 uppercase">{d.date.toLocaleDateString(undefined, { weekday: 'short' })}</p>
                      <p className="text-sm font-semibold text-navy-800">{d.date.getDate()}</p>
                      <div className="mt-2 flex h-20 items-end justify-center rounded-xl bg-cream-100 p-1.5">
                        <motion.div
                          className={`w-full origin-bottom rounded-lg ${d.count ? 'bg-mint-500' : 'bg-navy-100'}`}
                          style={{ height: `${d.count ? Math.max(14, (d.count / maxCount) * 100) : 8}%` }}
                          initial={{ scaleY: 0 }}
                          whileInView={{ scaleY: 1 }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.6, ease, delay: i * 0.05 }}
                          title={`${d.count} openings`}
                        />
                      </div>
                      <p className="mt-1.5 text-[0.7rem] text-navy-500 tabular-nums">{d.count || '—'}</p>
                    </div>
                  ))}
                </div>
              </Reveal>
            )}

            {/* Reviews */}
            <Reveal className="card p-6 sm:p-8">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Reviews</h2>
                {t?.review_count > 0 && (
                  <span className="flex items-center gap-2 text-sm"><Stars value={Number(t.rating)} /><strong>{Number(t.rating).toFixed(1)}</strong><span className="text-navy-400">· {pluralize(t.review_count, 'review')}</span></span>
                )}
              </div>
              {reviews.loading ? (
                <div className="mt-6 space-y-6">{[0, 1].map((i) => <SkeletonText key={i} lines={3} />)}</div>
              ) : !reviews.data?.length ? (
                <EmptyState icon={MessageSquareQuote} title="No reviews yet">Reviews appear here after completed sessions.</EmptyState>
              ) : (
                <Stagger className="mt-6 divide-y divide-navy-900/[0.06]" gap={0.06}>
                  {reviews.data.map((r) => (
                    <StaggerItem key={r.id} className="py-5 first:pt-0 last:pb-0">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={r.author_name} seed={r.id} size="sm" />
                          <div>
                            <p className="text-sm font-semibold">{r.author_name}</p>
                            <p className="text-xs text-navy-400">{r.subject} · {monthDay(r.created_at)}</p>
                          </div>
                        </div>
                        <Stars value={r.rating} size={13} />
                      </div>
                      {r.comment && <p className="mt-3 leading-relaxed text-navy-700">{r.comment}</p>}
                    </StaggerItem>
                  ))}
                </Stagger>
              )}
            </Reveal>
          </div>

          {/* Booking card */}
          <aside className="hidden lg:block">
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease, delay: 0.1 }} className="card sticky top-24 p-6">
              {tutor.loading ? <Skeleton className="h-40" /> : (
                <>
                  <p><span className="font-display text-3xl font-bold">{money(t.hourly_rate)}</span><span className="text-navy-500"> / hour</span></p>
                  <p className="mt-1 text-sm text-navy-500">30, 45, 60 or 90-minute sessions</p>
                  <ul className="mt-5 space-y-2.5 text-sm text-navy-700">
                    <li className="flex gap-2"><BadgeCheck className="h-4 w-4 text-mint-600" />Identity & credentials reviewed</li>
                    <li className="flex gap-2"><BadgeCheck className="h-4 w-4 text-mint-600" />Free cancellation up to 24h before</li>
                    <li className="flex gap-2"><BadgeCheck className="h-4 w-4 text-mint-600" />Members save up to 15%</li>
                  </ul>
                  {canBook ? (
                    <Button to={`/book/${t.id}`} size="lg" className="mt-6 w-full">Book a session</Button>
                  ) : isSelf ? (
                    <Button to="/dashboard/listing" variant="secondary" size="lg" className="mt-6 w-full">Edit your listing</Button>
                  ) : (
                    <p className="mt-6 rounded-xl bg-cream-100 p-3 text-center text-sm text-navy-500">Booking is available to student and parent accounts.</p>
                  )}
                </>
              )}
            </motion.div>
          </aside>
        </div>

        {/* Mobile sticky booking bar */}
        {t && (
          <motion.div initial={{ y: 100 }} animate={{ y: 0 }} transition={{ delay: 0.4, duration: 0.5, ease }} className="fixed inset-x-0 bottom-0 z-30 border-t border-navy-900/[0.06] bg-white/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-xl lg:hidden">
            <div className="mx-auto flex max-w-xl items-center justify-between gap-4">
              <p><span className="font-display text-xl font-bold">{money(t.hourly_rate)}</span><span className="text-sm text-navy-500"> / hour</span></p>
              {canBook ? <Button to={`/book/${t.id}`}>Book a session</Button> : isSelf ? <Button to="/dashboard/listing" variant="secondary">Edit listing</Button> : null}
            </div>
          </motion.div>
        )}
      </PageTransition>
    </PublicLayout>
  )
}
