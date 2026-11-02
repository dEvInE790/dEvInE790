import { Landmark } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../../components/layout/DashboardLayout'
import Badge from '../../components/ui/Badge'
import Skeleton from '../../components/ui/Skeleton'
import EmptyState, { ErrorState } from '../../components/ui/EmptyState'
import useAsync from '../../lib/useAsync'
import { adminPayoutAccounts } from '../../lib/api'
import { dateShort, money } from '../../lib/format'
import { useSettings } from '../../context/SettingsContext'

/** Which tutors are connected for automatic payouts, what they've earned, and what to pay by hand. */
export default function Payouts() {
  const rows = useAsync(adminPayoutAccounts, [])
  const { settings } = useSettings()
  const rate = Math.round(Number(settings.commission_rate ?? 0.15) * 100)
  const manual = (rows.data ?? []).reduce((s, r) => s + Number(r.awaiting_manual_payout), 0)
  return (
    <>
      <PageHeader title="Tutor payouts" subtitle={`Paystack splits every session payment: tutors receive ${100 - rate}% of their listed price in their bank, TutorHaven keeps the rest.`} />
      {manual > 0 && (
        <p className="mb-6 rounded-2xl bg-amber-400/15 p-4 text-sm text-[#6b4700]">
          <strong>{money(manual)}</strong> was paid before some tutors connected a bank account. Pay it to them manually (see “To pay manually”), then keep a record.
        </p>
      )}
      {rows.error ? <ErrorState message={rows.error} onRetry={rows.reload} /> : rows.loading ? <Skeleton className="h-72 rounded-3xl" /> : !rows.data.length ? (
        <div className="card"><EmptyState icon={Landmark} title="No tutors yet" /></div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[56rem] text-left text-sm">
            <thead className="text-xs text-navy-400 uppercase">
              <tr><th className="px-5 py-3 font-semibold">Tutor</th><th className="px-3 py-3 font-semibold">Status</th><th className="px-3 py-3 font-semibold">Payout account</th><th className="px-3 py-3 font-semibold">Paystack subaccount</th><th className="px-3 py-3 font-semibold">Earned</th><th className="px-5 py-3 font-semibold">To pay manually</th></tr>
            </thead>
            <tbody className="divide-y divide-navy-900/[0.05]">
              {rows.data.map((r) => (
                <tr key={r.tutor_id} className="align-top hover:bg-cream-50">
                  <td className="px-5 py-3"><Link to={`/tutors/${r.tutor_id}`} className="font-medium hover:underline">{r.full_name}</Link><p className="text-xs text-navy-400">{r.email}</p></td>
                  <td className="px-3 py-3"><Badge tone={r.tutor_status === 'approved' ? 'mint' : r.tutor_status === 'pending' ? 'amber' : 'coral'}>{r.tutor_status}</Badge></td>
                  <td className="px-3 py-3">
                    {r.bank_name ? <><p className="font-medium">{r.account_name}</p><p className="text-xs text-navy-400">{r.bank_name} •••• {r.account_last4} · {dateShort(r.updated_at)}</p></> : <span className="text-navy-400">Not connected</span>}
                  </td>
                  <td className="px-3 py-3 font-mono text-xs text-navy-500">{r.subaccount_code ?? '—'}</td>
                  <td className="px-3 py-3 font-semibold tabular-nums">{money(Number(r.earned))}</td>
                  <td className={`px-5 py-3 tabular-nums ${Number(r.awaiting_manual_payout) > 0 ? 'font-semibold text-[#8a5a00]' : 'text-navy-400'}`}>{money(Number(r.awaiting_manual_payout))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
