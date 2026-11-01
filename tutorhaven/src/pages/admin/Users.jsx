import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { Ban, Search, ShieldCheck, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../../components/layout/DashboardLayout'
import Avatar from '../../components/ui/Avatar'
import Badge from '../../components/ui/Badge'
import Dropdown from '../../components/ui/Dropdown'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import { Input } from '../../components/ui/Field'
import Skeleton from '../../components/ui/Skeleton'
import EmptyState, { ErrorState } from '../../components/ui/EmptyState'
import useAsync from '../../lib/useAsync'
import { adminListUsers, adminSetRole, adminSetSuspended } from '../../lib/api'
import { ROLE_LABEL } from '../../lib/constants'
import { dateShort } from '../../lib/format'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'

const ROLE_OPTIONS = Object.entries(ROLE_LABEL).map(([value, label]) => ({ value, label }))

export default function AdminUsers() {
  const { profile } = useAuth()
  const toast = useToast()
  const [draft, setDraft] = useState('')
  const [q, setQ] = useState('')
  const users = useAsync(() => adminListUsers(q), [q])
  const [suspend, setSuspend] = useState(null)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)

  const setSuspended = async (u, on, why = '') => {
    setBusy(true)
    try {
      const p = await adminSetSuspended(u.id, on, why)
      users.setData((list) => list.map((x) => (x.id === u.id ? { ...x, suspended_at: p.suspended_at, suspended_reason: p.suspended_reason } : x)))
      toast.success(on ? `${u.full_name || u.email} is suspended` : `${u.full_name || u.email} is reinstated`)
      setSuspend(null)
    } catch (e) {
      toast.error(e.message)
    }
    setBusy(false)
  }

  useEffect(() => {
    const t = setTimeout(() => setQ(draft.trim()), 300)
    return () => clearTimeout(t)
  }, [draft])

  const changeRole = async (u, role) => {
    if (role === u.role) return
    try {
      await adminSetRole(u.id, role)
      users.setData((list) => list.map((x) => (x.id === u.id ? { ...x, role, tutor_status: role === 'tutor' ? x.tutor_status ?? 'pending' : x.tutor_status } : x)))
      toast.success(`${u.full_name || u.email} is now ${ROLE_LABEL[role].toLowerCase()}`)
    } catch (e) {
      toast.error(e.message)
    }
  }

  return (
    <>
      <PageHeader title="Users" subtitle="Search accounts, manage roles and suspend accounts." />
      <div className="relative mb-6 max-w-md">
        <Search className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-navy-400" aria-hidden />
        <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Search by name or email" aria-label="Search users" className="h-11 w-full rounded-xl border border-navy-900/12 bg-white pr-4 pl-11 text-sm shadow-soft outline-none focus:border-mint-500 focus:ring-4 focus:ring-mint-400/20" />
      </div>

      {users.error ? <ErrorState message={users.error} onRetry={users.reload} /> : users.loading && !users.data ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
      ) : !users.data.length ? (
        <div className="card"><EmptyState icon={Users} title="No users found">Try a different name or email.</EmptyState></div>
      ) : (
        <motion.ul className={`card divide-y divide-navy-900/[0.06] transition-opacity ${users.loading ? 'opacity-60' : ''}`} initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.03 } } }}>
          {users.data.map((u) => (
            <motion.li key={u.id} variants={{ hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0 } }} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:px-6">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <Avatar name={u.full_name} seed={u.id} size="sm" />
                <div className="min-w-0">
                  <p className="flex items-center gap-2 truncate text-sm font-semibold">
                    {u.full_name || '—'}
                    {u.id === profile.id && <Badge tone="navy">You</Badge>}
                    {u.suspended_at && <Badge tone="coral" icon={Ban}>Suspended</Badge>}
                    {u.subscription_status && <Badge tone={u.subscription_status === 'active' ? 'mint' : u.subscription_status === 'expired' ? 'neutral' : 'amber'}>{u.role === 'tutor' ? 'Tutor plan' : 'Plan'}: {u.subscription_status}</Badge>}
                    {u.role === 'tutor' && u.tutor_status && (
                      <Link to={`/tutors/${u.id}`}><Badge tone={u.tutor_status === 'approved' ? 'mint' : u.tutor_status === 'pending' ? 'amber' : 'coral'}>{u.tutor_status}</Badge></Link>
                    )}
                  </p>
                  <p className="truncate text-xs text-navy-500">{u.email} · joined {dateShort(u.created_at)}{u.subscription_end ? ` · plan until ${dateShort(u.subscription_end)}` : ''}</p>
                  {u.suspended_at && u.suspended_reason && <p className="truncate text-xs text-coral-600">Reason: {u.suspended_reason}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Dropdown value={u.role} onChange={(r) => changeRole(u, r)} options={ROLE_OPTIONS} align="right" className="flex-1 sm:w-40" />
                {u.id !== profile.id && (u.suspended_at
                  ? <Button size="sm" variant="secondary" icon={ShieldCheck} loading={busy && suspend?.id === u.id} onClick={() => { setSuspend(u); setSuspended(u, false) }}>Reinstate</Button>
                  : <Button size="sm" variant="ghost" icon={Ban} onClick={() => { setSuspend(u); setReason('') }}>Suspend</Button>)}
              </div>
            </motion.li>
          ))}
        </motion.ul>
      )}

      <Modal open={!!suspend && !suspend.suspended_at} onClose={() => setSuspend(null)} title={`Suspend ${suspend?.full_name || suspend?.email}?`} description="They won’t be able to book, pay or send messages. Tutors are hidden from search, and unpaid slot holds are released. You can reinstate them at any time.">
        <Input label="Reason (shown to the user)" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Payment dispute under review" maxLength={200} />
        <div className="mt-6 flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={() => setSuspend(null)}>Cancel</Button>
          <Button variant="danger" className="flex-1" loading={busy} onClick={() => setSuspended(suspend, true, reason.trim())}>Suspend account</Button>
        </div>
      </Modal>
    </>
  )
}
