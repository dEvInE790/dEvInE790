import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { CalendarClock, Crown, Hourglass, Link2, MoreHorizontal, Plus, Search, Wallet } from 'lucide-react'
import { PageHeader } from '../../components/layout/DashboardLayout'
import NextSessionCard from '../../components/NextSessionCard'
import StatCard from '../../components/StatCard'
import BarChart from '../../components/charts/BarChart'
import SessionItem from '../../components/SessionItem'
import Avatar from '../../components/ui/Avatar'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import Skeleton from '../../components/ui/Skeleton'
import { Input } from '../../components/ui/Field'
import { CardHeader } from '../../components/ui/Card'
import { ErrorState } from '../../components/ui/EmptyState'
import { Reveal, Stagger } from '../../motion/Reveal'
import useAsync from '../../lib/useAsync'
import { getSubscription, linkChild, listBookings, listChildren, listPayments, unlinkChild } from '../../lib/api'
import { hours, hoursFmt, isThisMonth, isUpcoming, monthlySeries } from '../../lib/stats'
import { PLANS } from '../../lib/constants'
import { firstName, greeting, money } from '../../lib/format'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { fadeUp, spring, stagger } from '../../motion/variants'

export default function ParentHome() {
  const { profile } = useAuth()
  const toast = useToast()
  const children = useAsync(() => listChildren(profile.id), [profile.id])
  const bookings = useAsync(() => listBookings({ limit: 500 }), [])
  const payments = useAsync(() => listPayments(profile.id), [profile.id])
  const sub = useAsync(() => getSubscription(profile.id), [profile.id])
  const [linkOpen, setLinkOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [linking, setLinking] = useState(false)
  const [menu, setMenu] = useState(null)

  const s = useMemo(() => {
    const all = bookings.data ?? []
    const upcoming = all.filter(isUpcoming)
    const monthHours = all.filter((b) => b.status === 'completed' && isThisMonth(b.starts_at)).reduce((t, b) => t + hours(b), 0)
    const paid = (payments.data ?? []).filter((p) => p.status === 'succeeded')
    return {
      upcoming,
      monthHours,
      monthSpend: paid.filter((p) => isThisMonth(p.created_at)).reduce((t, p) => t + Number(p.amount), 0),
      chart: monthlySeries(paid),
      perChild: (id) => ({
        upcoming: upcoming.filter((b) => b.student_id === id).length,
        hours: all.filter((b) => b.student_id === id && b.status === 'completed').reduce((t, b) => t + hours(b), 0),
      }),
    }
  }, [bookings.data, payments.data])

  const plan = sub.data && new Date(sub.data.current_period_end) > new Date() ? PLANS.find((p) => p.id === sub.data.plan) : PLANS[0]
  const replace = (nb) => bookings.setData((list) => list.map((x) => (x.id === nb.id ? nb : x)))

  const onLink = async (e) => {
    e.preventDefault()
    setLinking(true)
    try {
      const child = await linkChild(email)
      children.setData((list) => (list.some((c) => c.id === child.id) ? list : [...list, child]))
      bookings.reload({ silent: true })
      toast.success(`${child.full_name} is now linked to your account`)
      setLinkOpen(false)
      setEmail('')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLinking(false)
    }
  }

  const onUnlink = async (child) => {
    setMenu(null)
    try {
      await unlinkChild(profile.id, child.id)
      children.setData((list) => list.filter((c) => c.id !== child.id))
      bookings.reload({ silent: true })
      toast.success(`${child.full_name} was unlinked`)
    } catch (err) {
      toast.error(err.message)
    }
  }

  return (
    <>
      <PageHeader
        eyebrow={greeting()}
        title={`Hello, ${firstName(profile.full_name)}`}
        subtitle="Everything your family is learning, in one place."
        action={<Button to="/tutors" icon={Search}>Book for a child</Button>}
      />
      {(bookings.error || children.error) && <div className="mb-6"><ErrorState message={bookings.error || children.error} onRetry={() => { bookings.reload(); children.reload() }} /></div>}

      {/* Children */}
      <section className="mb-6">
        <h2 className="mb-4 text-lg font-semibold">Your learners</h2>
        {children.loading ? <div className="flex gap-4"><Skeleton className="h-36 w-64 rounded-3xl" /><Skeleton className="h-36 w-64 rounded-3xl" /></div> : (
          <motion.div className="scrollbar-none -mx-4 flex gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:px-0 lg:grid-cols-3" variants={stagger(0.06)} initial="hidden" animate="show">
            <AnimatePresence mode="popLayout">
              {children.data.map((c) => {
                const st = s.perChild(c.id)
                return (
                  <motion.div key={c.id} layout variants={fadeUp} exit={{ opacity: 0, scale: 0.9 }} whileHover={{ y: -4 }} transition={spring} className="card relative w-64 shrink-0 p-5 sm:w-auto">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar name={c.full_name} seed={c.id} size="md" />
                        <div>
                          <p className="font-semibold">{c.full_name}</p>
                          <p className="text-xs text-navy-500">{c.grade_level || 'Student'}</p>
                        </div>
                      </div>
                      <div className="relative">
                        <button type="button" onClick={() => setMenu(menu === c.id ? null : c.id)} className="rounded-lg p-1.5 text-navy-400 hover:bg-navy-50" aria-label={`Options for ${c.full_name}`} aria-expanded={menu === c.id}>
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                        <AnimatePresence>
                          {menu === c.id && (
                            <motion.div initial={{ opacity: 0, scale: 0.95, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="absolute right-0 z-10 mt-1 w-36 origin-top-right rounded-xl border border-navy-900/8 bg-white p-1 shadow-lift">
                              <button type="button" onClick={() => onUnlink(c)} className="w-full rounded-lg px-3 py-2 text-left text-sm text-coral-600 hover:bg-coral-50">Unlink</button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                    <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-xl bg-cream-100 px-3 py-2"><p className="font-display text-lg font-bold">{st.upcoming}</p><p className="text-xs text-navy-500">Upcoming</p></div>
                      <div className="rounded-xl bg-cream-100 px-3 py-2"><p className="font-display text-lg font-bold">{hoursFmt(st.hours)}h</p><p className="text-xs text-navy-500">Learned</p></div>
                    </div>
                  </motion.div>
                )
              })}
              <motion.button
                key="add"
                layout
                type="button"
                variants={fadeUp}
                whileHover={{ y: -4 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setLinkOpen(true)}
                className="flex w-64 shrink-0 flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-navy-900/12 p-5 text-navy-500 transition-colors hover:border-mint-500 hover:bg-mint-50/50 hover:text-mint-700 sm:w-auto"
              >
                <span className="grid h-11 w-11 place-items-center rounded-full bg-white shadow-soft"><Plus className="h-5 w-5" /></span>
                <span className="text-sm font-semibold">Link a child</span>
              </motion.button>
            </AnimatePresence>
          </motion.div>
        )}
      </section>

      <Stagger onMount className="grid gap-5" gap={0.06}>
        {bookings.loading ? <Skeleton className="h-52 rounded-3xl" /> : (
          <NextSessionCard
            booking={s.upcoming[0]}
            viewer="parent"
            emptyTitle={children.data?.length ? 'No sessions booked yet' : 'Link your first learner'}
            emptyBody={children.data?.length ? 'Find a tutor and book a session for one of your children.' : 'Your child signs up as a student, then you link them here using their email.'}
            emptyAction={!children.data?.length && <Button variant="mint" size="sm" className="mt-6" icon={Link2} onClick={() => setLinkOpen(true)}>Link a child</Button>}
          />
        )}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard icon={CalendarClock} label="Upcoming sessions" value={s.upcoming.length} loading={bookings.loading} />
          <StatCard icon={Hourglass} label="Hours this month" value={s.monthHours} format={hoursFmt} loading={bookings.loading} accent="navy" />
          <StatCard icon={Wallet} label="Spent this month" value={s.monthSpend} format={money} loading={payments.loading} accent="amber" />
          <StatCard icon={Crown} label="Plan" value={plan?.discount * 100 || 0} format={(v) => (v ? `${Math.round(v)}% off` : 'Free')} hint={plan?.name} loading={sub.loading} accent="cream" />
        </div>
      </Stagger>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Reveal className="card p-6">
          <CardHeader title="Family spending" subtitle="Successful payments, last 6 months" />
          <div className="mt-6">{payments.loading ? <Skeleton className="h-[220px]" /> : <BarChart data={s.chart} format={money} title="Spending per month" />}</div>
        </Reveal>
        <Reveal className="card p-6" delay={0.05}>
          <CardHeader title="Coming up" subtitle="Next confirmed sessions" action={<Button to="/dashboard/sessions" variant="ghost" size="sm">All</Button>} />
          {bookings.loading ? <Skeleton className="mt-5 h-28" /> : (
            <motion.ul className="mt-5 space-y-3" variants={stagger(0.05)} initial="hidden" animate="show">
              {s.upcoming.slice(0, 3).map((b) => <SessionItem key={b.id} booking={b} me={profile} onChange={replace} compact />)}
              {!s.upcoming.length && <p className="rounded-2xl bg-cream-100 p-4 text-sm text-navy-500">Nothing scheduled yet.</p>}
            </motion.ul>
          )}
        </Reveal>
      </div>

      <Modal open={linkOpen} onClose={() => setLinkOpen(false)} title="Link a child" description="Enter the email your child used to create their TutorHaven student account.">
        <form onSubmit={onLink} className="space-y-4">
          <Input type="email" label="Child’s email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="child@example.com" required />
          <Button type="submit" className="w-full" loading={linking} disabled={!email}>Link account</Button>
        </form>
      </Modal>
    </>
  )
}
