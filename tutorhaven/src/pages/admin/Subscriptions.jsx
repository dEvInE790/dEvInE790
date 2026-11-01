import { useState } from 'react'
import { BadgeCheck } from 'lucide-react'
import { PageHeader } from '../../components/layout/DashboardLayout'
import Badge from '../../components/ui/Badge'
import Tabs from '../../components/ui/Tabs'
import Skeleton from '../../components/ui/Skeleton'
import EmptyState, { ErrorState } from '../../components/ui/EmptyState'
import useAsync from '../../lib/useAsync'
import { adminListSubscriptions } from '../../lib/api'
import { dateShort } from '../../lib/format'

const STATUS = { active: ['mint', 'Active'], cancelled: ['amber', 'Cancelled'], expired: ['neutral', 'Expired'], pending: ['navy', 'Awaiting payment'] }

export default function Subscriptions() {
  const [status, setStatus] = useState('')
  const [audience, setAudience] = useState('')
  const rows = useAsync(() => adminListSubscriptions(status, audience), [status, audience])
  return (
    <>
      <PageHeader title="Subscriptions" subtitle="Tutor and learner subscriptions, their status and renewal dates." />
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Tabs value={status || 'all'} onChange={(v) => setStatus(v === 'all' ? '' : v)} tabs={[
          { value: 'all', label: 'All' }, { value: 'active', label: 'Active' }, { value: 'cancelled', label: 'Cancelled' },
          { value: 'expired', label: 'Expired' }, { value: 'pending', label: 'Awaiting payment' },
        ]} />
        <Tabs size="sm" value={audience || 'all'} onChange={(v) => setAudience(v === 'all' ? '' : v)} tabs={[
          { value: 'all', label: 'Everyone' }, { value: 'tutor', label: 'Tutors' }, { value: 'learner', label: 'Learners' },
        ]} />
      </div>
      {rows.error ? <ErrorState message={rows.error} onRetry={rows.reload} /> : rows.loading && !rows.data ? <Skeleton className="h-72 rounded-3xl" /> : !rows.data.length ? (
        <div className="card"><EmptyState icon={BadgeCheck} title="No subscriptions here">Subscriptions appear once someone starts a plan checkout.</EmptyState></div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[52rem] text-left text-sm">
            <thead className="text-xs text-navy-400 uppercase">
              <tr><th className="px-5 py-3 font-semibold">Member</th><th className="px-3 py-3 font-semibold">Plan</th><th className="px-3 py-3 font-semibold">Status</th><th className="px-3 py-3 font-semibold">Period</th><th className="px-5 py-3 font-semibold">Ends in</th></tr>
            </thead>
            <tbody className="divide-y divide-navy-900/[0.05]">
              {rows.data.map((r) => {
                const [tone, label] = STATUS[r.status] ?? ['neutral', r.status]
                const days = r.current_period_end ? Math.ceil((new Date(r.current_period_end) - Date.now()) / 864e5) : null
                return (
                  <tr key={r.id} className="hover:bg-cream-50">
                    <td className="px-5 py-3"><p className="font-medium">{r.full_name}</p><p className="text-xs text-navy-400">{r.email}</p></td>
                    <td className="px-3 py-3">{r.plan_name} <span className="text-xs text-navy-400">· {r.audience}</span></td>
                    <td className="px-3 py-3"><Badge tone={tone}>{label}</Badge></td>
                    <td className="px-3 py-3 text-navy-600">{r.current_period_start ? `${dateShort(r.current_period_start)} – ${dateShort(r.current_period_end)}` : '—'}</td>
                    <td className={`px-5 py-3 tabular-nums ${days != null && days <= 3 && days > 0 ? 'font-semibold text-[#8a5a00]' : 'text-navy-600'}`}>{days == null ? '—' : days > 0 ? `${days} day${days === 1 ? '' : 's'}` : 'Ended'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
