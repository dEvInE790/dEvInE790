import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Activity, Receipt, RotateCcw, Search, Wallet } from 'lucide-react'
import { PageHeader } from '../../components/layout/DashboardLayout'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import Tabs from '../../components/ui/Tabs'
import Skeleton from '../../components/ui/Skeleton'
import { Input } from '../../components/ui/Field'
import EmptyState, { ErrorState } from '../../components/ui/EmptyState'
import useAsync from '../../lib/useAsync'
import { adminListPaymentAttempts, adminListPayments, adminMarkRefunded, adminPaymentEvents, adminRefund } from '../../lib/api'
import { dateShort, money, time } from '../../lib/format'
import { useToast } from '../../context/ToastContext'

const STATUS = { succeeded: ['mint', 'Paid'], refund_pending: ['amber', 'Refund pending'], refund_processing: ['amber', 'Refund processing'], refunded: ['neutral', 'Refunded'] }
const ATTEMPT = { pending: ['amber', 'Pending'], succeeded: ['mint', 'Paid'], failed: ['coral', 'Failed'], abandoned: ['neutral', 'Abandoned'] }

export default function Payments() {
  const [params, setParams] = useSearchParams()
  const view = params.get('view') ?? 'payments'
  return (
    <>
      <PageHeader title="Payments" subtitle="Confirmed Paystack payments, every checkout attempt, refunds and the payment event log." />
      <Tabs className="mb-6" value={view} onChange={(v) => setParams(v === 'payments' ? {} : { view: v }, { replace: true })} tabs={[
        { value: 'payments', label: 'Payments' },
        { value: 'attempts', label: 'Checkout attempts' },
        { value: 'events', label: 'Event log' },
      ]} />
      {view === 'attempts' ? <Attempts /> : view === 'events' ? <Events initial={params.get('ref') ?? ''} /> : <PaymentsView />}
    </>
  )
}

function useDebounced(value, ms = 300) {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return v
}

function SearchBox({ value, onChange, placeholder }) {
  return (
    <div className="relative lg:w-80">
      <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-navy-400" aria-hidden />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} className="h-11 w-full rounded-xl border border-navy-900/12 bg-white pr-3 pl-10 text-sm shadow-soft outline-none focus:border-mint-500 focus:ring-4 focus:ring-mint-400/20" />
    </div>
  )
}

function Attempts() {
  const [status, setStatus] = useState('')
  const [draft, setDraft] = useState('')
  const q = useDebounced(draft.trim())
  const rows = useAsync(() => adminListPaymentAttempts(status, q), [status, q])
  return (
    <>
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Tabs value={status || 'all'} onChange={(v) => setStatus(v === 'all' ? '' : v)} size="sm" tabs={[
          { value: 'all', label: 'All' }, { value: 'pending', label: 'Pending' }, { value: 'succeeded', label: 'Paid' },
          { value: 'failed', label: 'Failed' }, { value: 'abandoned', label: 'Abandoned' },
        ]} />
        <SearchBox value={draft} onChange={setDraft} placeholder="Search name, email or reference" />
      </div>
      {rows.error ? <ErrorState message={rows.error} onRetry={rows.reload} /> : rows.loading && !rows.data ? <Skeleton className="h-80 rounded-3xl" /> : !rows.data.length ? (
        <div className="card"><EmptyState icon={Receipt} title="No checkout attempts">Every Paystack checkout started by a user shows up here, including failed and unfinished ones.</EmptyState></div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[60rem] text-left text-sm">
            <thead className="text-xs text-navy-400 uppercase">
              <tr><th className="px-5 py-3 font-semibold">Started</th><th className="px-3 py-3 font-semibold">Customer</th><th className="px-3 py-3 font-semibold">For</th><th className="px-3 py-3 font-semibold">Reference</th><th className="px-3 py-3 font-semibold">Amount</th><th className="px-3 py-3 font-semibold">Status</th><th className="px-5 py-3 font-semibold">Detail</th></tr>
            </thead>
            <tbody className="divide-y divide-navy-900/[0.05]">
              {rows.data.map((a) => {
                const [tone, label] = ATTEMPT[a.status] ?? ['neutral', a.status]
                return (
                  <tr key={a.reference} className="align-top hover:bg-cream-50">
                    <td className="px-5 py-3 whitespace-nowrap text-navy-600">{dateShort(a.created_at)}<br /><span className="text-xs text-navy-400">{time(a.created_at)}</span></td>
                    <td className="px-3 py-3"><p className="font-medium">{a.full_name}</p><p className="text-xs text-navy-400">{a.email}</p></td>
                    <td className="px-3 py-3">{a.kind === 'subscription' ? `${a.plan_name ?? 'Plan'} subscription` : 'Session'}</td>
                    <td className="px-3 py-3"><a href={`?view=events&ref=${a.reference}`} className="font-mono text-xs text-mint-700 hover:underline">{a.reference}</a></td>
                    <td className="px-3 py-3 font-semibold tabular-nums">{money(a.amount)}</td>
                    <td className="px-3 py-3"><Badge tone={tone}>{label}</Badge></td>
                    <td className="px-5 py-3 text-xs text-navy-500">{a.failure_reason || (a.paystack_status ? `Paystack: ${a.paystack_status}` : '—')}</td>
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

function Events({ initial }) {
  const [draft, setDraft] = useState(initial)
  const ref = useDebounced(draft.trim())
  const rows = useAsync(() => adminPaymentEvents(ref), [ref])
  return (
    <>
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <p className="text-sm text-navy-500">Every checkout, verification, webhook and refund, newest first. Use it to trace what happened to a payment.</p>
        <SearchBox value={draft} onChange={setDraft} placeholder="Filter by exact reference" />
      </div>
      {rows.error ? <ErrorState message={rows.error} onRetry={rows.reload} /> : rows.loading && !rows.data ? <Skeleton className="h-80 rounded-3xl" /> : !rows.data.length ? (
        <div className="card"><EmptyState icon={Activity} title="No events yet" /></div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[56rem] text-left text-sm">
            <thead className="text-xs text-navy-400 uppercase">
              <tr><th className="px-5 py-3 font-semibold">Time</th><th className="px-3 py-3 font-semibold">Event</th><th className="px-3 py-3 font-semibold">Source</th><th className="px-3 py-3 font-semibold">Reference</th><th className="px-3 py-3 font-semibold">Outcome</th><th className="px-5 py-3 font-semibold">Error</th></tr>
            </thead>
            <tbody className="divide-y divide-navy-900/[0.05]">
              {rows.data.map((e) => (
                <tr key={e.id} className="align-top hover:bg-cream-50">
                  <td className="px-5 py-2.5 whitespace-nowrap text-navy-600">{dateShort(e.created_at)} {time(e.created_at)}</td>
                  <td className="px-3 py-2.5 font-medium">{e.event}</td>
                  <td className="px-3 py-2.5"><Badge tone={e.source === 'webhook' ? 'navy' : 'neutral'}>{e.source}</Badge></td>
                  <td className="px-3 py-2.5 font-mono text-xs text-navy-500">{e.reference ?? '—'}</td>
                  <td className="px-3 py-2.5">{e.outcome || '—'}</td>
                  <td className="px-5 py-2.5 text-xs text-coral-600">{e.error ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}

function PaymentsView() {
  const toast = useToast()
  const [params] = useSearchParams()
  const [status, setStatus] = useState(params.get('status') ?? '')
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
    pending: all.filter((p) => p.status === 'refund_pending' || p.status === 'refund_processing').reduce((s, p) => s + Number(p.amount), 0),
    refunded: all.filter((p) => p.status === 'refunded').reduce((s, p) => s + Number(p.amount), 0),
  }), [all])

  const doRefund = async () => {
    setBusy(true)
    try {
      const updated = manual ? await adminMarkRefunded(refund.id, note || 'Refunded outside Paystack') : await adminRefund(refund)
      payments.setData((rows) => rows.map((p) => (p.id === refund.id ? { ...p, ...updated } : p)))
      toast.success(manual ? 'Marked as refunded' : updated.status === 'refunded' ? 'Refunded through Paystack' : 'Refund sent to Paystack. It completes when Paystack confirms it.')
      setRefund(null)
    } catch (e) {
      toast.error(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
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
        <Tabs value={status || 'all'} onChange={(v) => setStatus(v === 'all' ? '' : v)} tabs={[
          { value: 'all', label: 'All', count: payments.data ? all.length : null },
          { value: 'succeeded', label: 'Paid', count: payments.data ? all.filter((p) => p.status === 'succeeded').length : null },
          { value: 'refund_pending', label: 'Refunds waiting', count: payments.data ? all.filter((p) => p.status === 'refund_pending').length : null },
          { value: 'refund_processing', label: 'Processing', count: payments.data ? all.filter((p) => p.status === 'refund_processing').length : null },
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
                    <td className="px-3 py-3"><a href={`?view=events&ref=${p.provider_ref}`} className="font-mono text-xs text-mint-700 hover:underline">{p.provider_ref ?? '—'}</a></td>
                    <td className={`px-3 py-3 font-semibold tabular-nums ${p.status === 'refunded' ? 'text-navy-400 line-through' : ''}`}>{money(p.amount)}</td>
                    <td className="px-3 py-3"><Badge tone={tone}>{label}</Badge></td>
                    <td className="px-5 py-3 text-right whitespace-nowrap">
                      {['succeeded', 'refund_pending'].includes(p.status) && (
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
        {refund && (
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
