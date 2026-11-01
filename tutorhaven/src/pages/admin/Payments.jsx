import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Receipt, RotateCcw, Search, Wallet } from 'lucide-react'
import { PageHeader } from '../../components/layout/DashboardLayout'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import Tabs from '../../components/ui/Tabs'
import Skeleton from '../../components/ui/Skeleton'
import { Input } from '../../components/ui/Field'
import EmptyState, { ErrorState } from '../../components/ui/EmptyState'
import useAsync from '../../lib/useAsync'
import { adminListPayments, adminMarkRefunded, adminRefund } from '../../lib/api'
import { dateShort, money, time } from '../../lib/format'
import { useToast } from '../../context/ToastContext'

const STATUS = { succeeded: ['mint', 'Paid'], refund_pending: ['amber', 'Refund pending'], refunded: ['neutral', 'Refunded'] }

export default function Payments() {
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const status = params.get('status') ?? ''
  const [draft, setDraft] = useState('')
  const [q, setQ] = useState('')
  const payments = useAsync(() => adminListPayments('', q), [q])
  const [refund, setRefund] = useState(null)
  const [manual, setManual] = useState(false)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setQ(draft.trim()), 300)
    return () => clearTimeout(t)
  }, [draft])

  const all = payments.data ?? []
  const list = status ? all.filter((p) => p.status === status) : all
  const totals = useMemo(() => ({
    paid: all.filter((p) => p.status === 'succeeded').reduce((s, p) => s + Number(p.amount), 0),
    pending: all.filter((p) => p.status === 'refund_pending').reduce((s, p) => s + Number(p.amount), 0),
    refunded: all.filter((p) => p.status === 'refunded').reduce((s, p) => s + Number(p.amount), 0),
  }), [all])

  const doRefund = async () => {
    setBusy(true)
    try {
      const updated = manual ? await adminMarkRefunded(refund.id, note || 'Refunded outside Paystack') : await adminRefund(refund)
      payments.setData((rows) => rows.map((p) => (p.id === refund.id ? { ...p, ...updated, status: 'refunded' } : p)))
      toast.success(manual ? 'Marked as refunded' : refund.provider === 'paystack' ? 'Refund sent to Paystack' : 'Refunded')
      setRefund(null)
    } catch (e) {
      toast.error(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <PageHeader title="Payments" subtitle="Paystack transactions, memberships and refunds." />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Collected', value: totals.paid, icon: Wallet, tone: 'bg-mint-50 text-mint-700' },
          { label: 'Refunds waiting', value: totals.pending, icon: RotateCcw, tone: 'bg-amber-400/15 text-[#8a5a00]' },
          { label: 'Refunded', value: totals.refunded, icon: Receipt, tone: 'bg-navy-50 text-navy-700' },
        ].map((s) => (
          <div key={s.label} className="card flex items-center gap-4 p-5">
            <span className={`grid h-11 w-11 place-items-center rounded-xl ${s.tone}`}><s.icon className="h-5 w-5" /></span>
            <div>
              <p className="text-sm text-navy-500">{s.label}</p>
              {payments.loading ? <Skeleton className="mt-1 h-7 w-24" /> : <p className="font-display text-2xl font-bold">{money(s.value)}</p>}
            </div>
          </div>
        ))}
      </div>

      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Tabs value={status || 'all'} onChange={(v) => setParams(v === 'all' ? {} : { status: v }, { replace: true })} tabs={[
          { value: 'all', label: 'All', count: payments.data ? all.length : null },
          { value: 'succeeded', label: 'Paid', count: payments.data ? all.filter((p) => p.status === 'succeeded').length : null },
          { value: 'refund_pending', label: 'Refunds waiting', count: payments.data ? all.filter((p) => p.status === 'refund_pending').length : null },
          { value: 'refunded', label: 'Refunded', count: payments.data ? all.filter((p) => p.status === 'refunded').length : null },
        ]} />
        <div className="relative lg:w-80">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-navy-400" aria-hidden />
          <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Search name, email or reference" aria-label="Search payments" className="h-11 w-full rounded-xl border border-navy-900/12 bg-white pr-3 pl-10 text-sm shadow-soft outline-none focus:border-mint-500 focus:ring-4 focus:ring-mint-400/20" />
        </div>
      </div>

      {payments.error ? <ErrorState message={payments.error} onRetry={payments.reload} /> : payments.loading && !payments.data ? <Skeleton className="h-80 rounded-3xl" /> : list.length === 0 ? (
        <div className="card"><EmptyState icon={Receipt} title="No payments here" /></div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[60rem] text-left text-sm">
            <thead className="text-xs text-navy-400 uppercase">
              <tr><th className="px-5 py-3 font-semibold">Date</th><th className="px-3 py-3 font-semibold">Customer</th><th className="px-3 py-3 font-semibold">For</th><th className="px-3 py-3 font-semibold">Reference</th><th className="px-3 py-3 font-semibold">Amount</th><th className="px-3 py-3 font-semibold">Status</th><th className="px-5 py-3 text-right font-semibold">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-navy-900/[0.05]">
              {list.map((p) => {
                const [tone, label] = STATUS[p.status] ?? ['neutral', p.status]
                return (
                  <tr key={p.id} className="align-top transition-colors hover:bg-cream-50">
                    <td className="px-5 py-3 whitespace-nowrap text-navy-600">{dateShort(p.created_at)}<br /><span className="text-xs text-navy-400">{time(p.created_at)}</span></td>
                    <td className="px-3 py-3"><p className="font-medium">{p.full_name}</p><p className="text-xs text-navy-400">{p.email}</p></td>
                    <td className="px-3 py-3"><p>{p.description}</p>{p.note && <p className="mt-0.5 text-xs text-navy-400">{p.note}</p>}</td>
                    <td className="px-3 py-3 font-mono text-xs text-navy-500">{p.provider_ref ?? (p.provider === 'test' ? 'test mode' : '—')}</td>
                    <td className={`px-3 py-3 font-semibold tabular-nums ${p.status === 'refunded' ? 'text-navy-400 line-through' : ''}`}>{money(p.amount)}</td>
                    <td className="px-3 py-3"><Badge tone={tone}>{label}</Badge></td>
                    <td className="px-5 py-3 text-right whitespace-nowrap">
                      {p.status !== 'refunded' && (
                        <Button size="sm" variant={p.status === 'refund_pending' ? 'primary' : 'ghost'} icon={RotateCcw} onClick={() => { setRefund(p); setManual(false); setNote('') }}>
                          Refund
                        </Button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={!!refund} onClose={() => setRefund(null)} title={`Refund ${refund ? money(refund.amount) : ''}?`} description={refund ? `${refund.full_name} · ${refund.description}` : ''}>
        {refund?.provider === 'paystack' && (
          <div className="mb-4 space-y-2">
            {[[false, 'Refund through Paystack', 'Paystack returns the money to the customer’s card or account (usually within 5–10 working days).'], [true, 'Already refunded another way', 'Record a refund you made outside Paystack, such as a bank transfer.']].map(([val, title, body]) => (
              <label key={title} className={`flex cursor-pointer gap-3 rounded-2xl border p-4 ${manual === val ? 'border-navy-900 bg-navy-50' : 'border-navy-900/10'}`}>
                <input type="radio" name="refund-mode" checked={manual === val} onChange={() => setManual(val)} className="mt-1 accent-navy-900" />
                <span><span className="block text-sm font-semibold">{title}</span><span className="block text-xs text-navy-500">{body}</span></span>
              </label>
            ))}
          </div>
        )}
        {manual && <Input label="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Bank transfer on 3 Nov" className="mb-4" />}
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={() => setRefund(null)}>Back</Button>
          <Button variant="danger" className="flex-1" loading={busy} onClick={doRefund}>{manual ? 'Mark refunded' : 'Issue refund'}</Button>
        </div>
      </Modal>
    </>
  )
}
