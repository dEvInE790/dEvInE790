import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { AlertTriangle, Ban, BadgeCheck, CalendarDays, Crown, Eye, FileCheck2, Hourglass, Landmark, RotateCcw, Users, Wallet, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../../components/layout/DashboardLayout'
import StatCard from '../../components/StatCard'
import BarChart, { BreakdownBars } from '../../components/charts/BarChart'
import Avatar from '../../components/ui/Avatar'
import Button from '../../components/ui/Button'
import Skeleton from '../../components/ui/Skeleton'
import { StatusBadge } from '../../components/ui/Badge'
import { CardHeader } from '../../components/ui/Card'
import EmptyState, { ErrorState } from '../../components/ui/EmptyState'
import { Reveal, Stagger } from '../../motion/Reveal'
import useAsync from '../../lib/useAsync'
import { adminPlusOverview, adminRecentBookings, adminSetTutorStatus, getAdminOverview, listPendingTutors } from '../../lib/api'
import { dateShort, money, time } from '../../lib/format'
import { useToast } from '../../context/ToastContext'

const STATUS_COLORS = { confirmed: '#1a8d64', completed: '#24365c', pending_payment: '#e29a1b', cancelled: '#9aabcf' }
const STATUS_LABEL = { confirmed: 'Confirmed', completed: 'Completed', pending_payment: 'Awaiting payment', cancelled: 'Cancelled' }

export default function Overview() {
  const toast = useToast()
  const overview = useAsync(getAdminOverview, [])
  const pending = useAsync(listPendingTutors, [])
  const recent = useAsync(() => adminRecentBookings(8), [])
  const plus = useAsync(adminPlusOverview, [])
  const [acting, setActing] = useState(null)

  const o = overview.data
  const users = o ? Object.values(o.users_by_role).reduce((a, b) => a + b, 0) : 0
  const revenueChart = useMemo(
    () => (o?.revenue_by_month ?? []).map((m) => {
      const d = new Date(`${m.month}-01T00:00:00`)
      return { label: d.toLocaleDateString(undefined, { month: 'short' }), detail: d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }), value: Number(m.amount) }
    }),
    [o],
  )

  const decide = async (tutor, status) => {
    setActing(tutor.id)
    try {
      await adminSetTutorStatus(tutor.id, status)
      pending.setData((list) => list.filter((t) => t.id !== tutor.id))
      overview.reload({ silent: true })
      toast.success(`${tutor.profile?.full_name ?? 'Tutor'} ${status === 'approved' ? 'is now live' : 'was rejected'}`)
    } catch (e) {
      toast.error(e.message)
    } finally {
      setActing(null)
    }
  }

  return (
    <>
      <PageHeader eyebrow="Admin" title="Platform overview" subtitle="Health of the TutorHaven marketplace." action={<Button to="/admin/users" variant="secondary" icon={Users}>Manage users</Button>} />
      {plus.data && (
        <Reveal className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5" data-testid="plus-overview">
          {[
            ['Plus members', plus.data.plus_members, '/admin/subscriptions'],
            ['AI questions this month', plus.data.ai_questions_month, null],
            ['Open review reports', plus.data.reports_open, '/admin/reviews'],
            ['Hidden reviews', plus.data.reviews_hidden, '/admin/reviews'],
            [`Support open (${plus.data.support_priority_open} priority)`, plus.data.support_open, '/admin/support'],
          ].map(([label, value, to]) => {
            const body = <><p className="font-display text-2xl font-bold">{value}</p><p className="text-xs text-navy-500">{label}</p></>
            return to ? <Link key={label} to={to} className="card p-4 transition-shadow hover:shadow-lift">{body}</Link> : <div key={label} className="card p-4">{body}</div>
          })}
        </Reveal>
      )}
      {o?.refunds_pending > 0 && (
        <Link to="/admin/payments?status=refund_pending" className="mb-6 flex items-center gap-3 rounded-2xl bg-amber-400/15 p-4 text-sm text-[#6b4700] transition-colors hover:bg-amber-400/25">
          <RotateCcw className="h-5 w-5 shrink-0" />
          <span><strong>{o.refunds_pending} refund{o.refunds_pending > 1 ? 's' : ''} waiting</strong> ({money(o.refunds_pending_amount)}). Review them in Payments.</span>
        </Link>
      )}
      {o?.qualifications_pending > 0 && (
        <Link to="/admin/qualifications" className="mb-6 flex items-center gap-3 rounded-2xl bg-mint-50 p-4 text-sm text-mint-800 transition-colors hover:bg-mint-100">
          <FileCheck2 className="h-5 w-5 shrink-0" />
          <span><strong>{o.qualifications_pending} qualification{o.qualifications_pending > 1 ? 's' : ''}</strong> waiting for verification.</span>
        </Link>
      )}
      {(o?.tutors_without_payout > 0 || Number(o?.awaiting_manual_payout) > 0) && (
        <Link to="/admin/payouts" className="mb-6 flex items-center gap-3 rounded-2xl bg-navy-50 p-4 text-sm text-navy-800 transition-colors hover:bg-navy-100">
          <Landmark className="h-5 w-5 shrink-0" />
          <span>
            {o.tutors_without_payout > 0 && <><strong>{o.tutors_without_payout} approved tutor{o.tutors_without_payout > 1 ? 's' : ''}</strong> without a payout account. </>}
            {Number(o.awaiting_manual_payout) > 0 && <><strong>{money(Number(o.awaiting_manual_payout))}</strong> to pay tutors manually.</>}
          </span>
        </Link>
      )}
      {overview.error && <div className="mb-6"><ErrorState message={overview.error} onRetry={overview.reload} /></div>}

      <Stagger onMount className="grid grid-cols-2 gap-4 lg:grid-cols-4" gap={0.06}>
        <StatCard icon={Users} label="Total users" value={users} hint={o ? `+${o.new_users_30d} in 30 days` : ''} loading={overview.loading} />
        <StatCard icon={Hourglass} label="Tutors awaiting review" value={o?.tutors_pending ?? 0} loading={overview.loading} accent="amber" />
        <StatCard icon={Wallet} label="Revenue (all time)" value={Number(o?.revenue_total ?? 0)} format={money} loading={overview.loading} accent="navy" />
        <StatCard icon={Crown} label="Active subscriptions" value={o?.active_subscriptions ?? 0} hint={o ? `${o.active_tutor_subscriptions} tutors` : ''} loading={overview.loading} accent="cream" />
        <StatCard icon={Eye} label="Tutors listed" value={o?.tutors_listed ?? 0} hint="Visible and bookable" loading={overview.loading} />
        <StatCard icon={Hourglass} label="Payments in progress" value={o?.payments_pending ?? 0} hint="Awaiting Paystack" loading={overview.loading} accent="navy" />
        <StatCard icon={AlertTriangle} label="Failed or abandoned" value={o?.payments_failed_30d ?? 0} hint="Last 30 days" loading={overview.loading} accent="amber" />
        <StatCard icon={Ban} label="Suspended accounts" value={o?.suspended_users ?? 0} loading={overview.loading} accent="cream" />
      </Stagger>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Reveal className="card p-6">
          <CardHeader title="Revenue" subtitle="Payments confirmed by Paystack, last 6 months" />
          <div className="mt-6">{overview.loading ? <Skeleton className="h-[220px]" /> : <BarChart data={revenueChart} format={money} title="Revenue per month" />}</div>
          {o && (
            <dl className="mt-6 grid grid-cols-2 gap-3 border-t border-navy-900/[0.06] pt-5 text-sm sm:grid-cols-3">
              {[['Sessions (gross)', o.revenue_sessions], ['Session commission', o.session_commission], ['Paid to tutors', o.tutor_earnings], ['Tutor subscriptions', o.revenue_tutor_subscriptions], ['Memberships', o.revenue_learner_subscriptions], ['Refunded', o.refunded_total]].map(([k, v]) => (
                <div key={k}><dt className="text-navy-500">{k}</dt><dd className="font-display text-lg font-bold tabular-nums">{money(Number(v))}</dd></div>
              ))}
            </dl>
          )}
        </Reveal>
        <Reveal className="card p-6" delay={0.05}>
          <CardHeader title="Bookings by status" />
          <div className="mt-6">
            {overview.loading ? <Skeleton className="h-40" /> : (
              <BreakdownBars items={Object.keys(STATUS_LABEL).map((k) => ({ label: STATUS_LABEL[k], value: o?.bookings_by_status?.[k] ?? 0, color: STATUS_COLORS[k] }))} />
            )}
          </div>
          <div className="mt-8 border-t border-navy-900/[0.06] pt-6">
            <h3 className="mb-4 text-sm font-semibold text-navy-800">Users by role</h3>
            {overview.loading ? <Skeleton className="h-28" /> : (
              <BreakdownBars items={['student', 'parent', 'tutor', 'admin'].map((r) => ({ label: r[0].toUpperCase() + r.slice(1) + 's', value: o?.users_by_role?.[r] ?? 0 }))} />
            )}
          </div>
        </Reveal>
      </div>

      <Reveal className="card mt-6 p-6">
        <CardHeader title="Tutor applications" subtitle="Review profiles before they go live" action={<Button to="/admin/tutors" variant="ghost" size="sm">All tutors</Button>} />
        {pending.loading ? <Skeleton className="mt-5 h-24" /> : pending.error ? <div className="mt-4"><ErrorState message={pending.error} /></div> : pending.data.length === 0 ? (
          <EmptyState icon={BadgeCheck} title="All caught up">No tutor applications are waiting for review.</EmptyState>
        ) : (
          <ul className="mt-5 space-y-3">
            <AnimatePresence initial={false}>
              {pending.data.map((t) => (
                <motion.li key={t.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 60, transition: { duration: 0.25 } }} className="rounded-2xl border border-navy-900/[0.06] p-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                    <Avatar name={t.profile?.full_name} seed={t.id} size="md" />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{t.profile?.full_name}</p>
                      <p className="text-sm text-navy-600">{t.headline || <span className="text-navy-400 italic">No headline yet</span>}</p>
                      <p className="mt-1 text-xs text-navy-400">{t.subjects.join(', ') || 'No subjects'} · {money(t.hourly_rate)}/hr · {t.years_experience} yrs · applied {dateShort(t.created_at)}</p>
                      {t.bio && <p className="mt-2 line-clamp-2 text-sm text-navy-500">{t.bio}</p>}
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" icon={X} onClick={() => decide(t, 'rejected')} disabled={acting === t.id} className="text-coral-600 hover:bg-coral-50">Reject</Button>
                      <Button size="sm" variant="mint" icon={BadgeCheck} onClick={() => decide(t, 'approved')} loading={acting === t.id}>Approve</Button>
                    </div>
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </Reveal>

      <Reveal className="card mt-6 p-6">
        <CardHeader title="Latest bookings" action={<Button to="/admin/bookings" variant="ghost" size="sm">All bookings</Button>} />
        {recent.loading ? <Skeleton className="mt-5 h-40" /> : !recent.data?.length ? (
          <EmptyState icon={CalendarDays} title="No bookings yet" />
        ) : (
          <div className="mt-5 -mx-6 overflow-x-auto">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead className="text-xs text-navy-400 uppercase">
                <tr><th className="px-6 py-2 font-semibold">Session</th><th className="px-3 py-2 font-semibold">Tutor</th><th className="px-3 py-2 font-semibold">Student</th><th className="px-3 py-2 font-semibold">When</th><th className="px-3 py-2 font-semibold">Amount</th><th className="px-6 py-2 font-semibold">Status</th></tr>
              </thead>
              <tbody className="divide-y divide-navy-900/[0.05]">
                {recent.data.map((b) => (
                  <tr key={b.id} className="transition-colors hover:bg-cream-50">
                    <td className="px-6 py-3 font-medium">{b.subject}</td>
                    <td className="px-3 py-3"><Link to={`/tutors/${b.tutor_id}`} className="hover:underline">{b.tutor?.profile?.full_name ?? '—'}</Link></td>
                    <td className="px-3 py-3">{b.student?.full_name ?? '—'}</td>
                    <td className="px-3 py-3 whitespace-nowrap text-navy-500">{dateShort(b.starts_at)}, {time(b.starts_at)}</td>
                    <td className="px-3 py-3 tabular-nums">{money(b.amount_paid ?? b.price)}</td>
                    <td className="px-6 py-3"><StatusBadge status={b.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Reveal>
    </>
  )
}
