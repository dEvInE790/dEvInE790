import { useState } from 'react'
import { motion } from 'motion/react'
import { LifeBuoy } from 'lucide-react'
import { PageHeader } from '../../components/layout/DashboardLayout'
import { PlusBadge } from '../../components/Plus'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import Tabs from '../../components/ui/Tabs'
import { Select, Textarea } from '../../components/ui/Field'
import EmptyState, { ErrorState } from '../../components/ui/EmptyState'
import Skeleton from '../../components/ui/Skeleton'
import useAsync from '../../lib/useAsync'
import { adminListSupport, adminUpdateSupport } from '../../lib/api'
import { dateShort } from '../../lib/format'
import { ROLE_LABEL } from '../../lib/constants'
import { useToast } from '../../context/ToastContext'
import { fadeUp } from '../../motion/variants'

const STATUS = { open: ['amber', 'Open'], in_progress: ['navy', 'In progress'], resolved: ['mint', 'Resolved'] }

export default function Support() {
  const toast = useToast()
  const [status, setStatus] = useState('open')
  const list = useAsync(() => adminListSupport(status), [status])
  const [open, setOpen] = useState(null)
  const [reply, setReply] = useState('')
  const [next, setNext] = useState('in_progress')
  const [busy, setBusy] = useState(false)

  const save = async () => {
    setBusy(true)
    try {
      await adminUpdateSupport(open.id, next, reply.trim() ? reply : null)
      toast.success(reply.trim() ? 'Reply sent; the user gets a notification.' : 'Status updated')
      setOpen(null)
      list.reload({ silent: true })
    } catch (e) {
      toast.error(e.message)
    }
    setBusy(false)
  }

  return (
    <>
      <PageHeader title="Support" subtitle="Requests from users. Plus members’ requests are marked priority and listed first." />
      <Tabs className="mb-5" value={status} onChange={setStatus} tabs={[{ value: 'open', label: 'Open' }, { value: 'resolved', label: 'Resolved' }, { value: '', label: 'All' }]} />
      {list.error ? <ErrorState message={list.error} onRetry={list.reload} /> : list.loading ? <Skeleton className="h-40 rounded-3xl" /> : !list.data.length ? (
        <div className="card"><EmptyState icon={LifeBuoy} title="No requests">You’re all caught up.</EmptyState></div>
      ) : (
        <ul className="space-y-3">
          {list.data.map((r) => {
            const [tone, label] = STATUS[r.status]
            return (
              <motion.li key={r.id} variants={fadeUp} initial="hidden" animate="show" className="card p-5" data-testid="admin-support">
                <div className="flex flex-wrap items-center gap-2">
                  {r.priority === 'priority' && <PlusBadge />}
                  <p className="font-semibold">{r.subject}</p>
                  <Badge tone={tone}>{label}</Badge>
                  <span className="ml-auto text-xs text-navy-400">{dateShort(r.created_at)}</span>
                </div>
                <p className="mt-1 text-xs text-navy-500">{r.full_name} · {ROLE_LABEL[r.role]} · {r.email} · {r.category}</p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-navy-700">{r.message}</p>
                {r.admin_reply && <p className="mt-2 rounded-xl bg-mint-50/70 p-3 text-sm"><strong>Reply:</strong> {r.admin_reply}</p>}
                <Button size="sm" className="mt-3" variant="secondary" onClick={() => { setOpen(r); setReply(''); setNext(r.status === 'open' ? 'in_progress' : r.status) }}>Reply or update</Button>
              </motion.li>
            )
          })}
        </ul>
      )}
      <Modal open={!!open} onClose={() => setOpen(null)} title={open?.subject ?? ''} description={open ? `${open.full_name} · ${open.email}` : ''}>
        <Select label="Status" value={next} onChange={(e) => setNext(e.target.value)}>
          <option value="open">Open</option><option value="in_progress">In progress</option><option value="resolved">Resolved</option>
        </Select>
        <Textarea className="mt-4" label="Reply (optional, shown to the user)" rows={5} maxLength={4000} value={reply} onChange={(e) => setReply(e.target.value)} />
        <Button className="mt-5 w-full" loading={busy} onClick={save}>Save</Button>
      </Modal>
    </>
  )
}
