import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { Search, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../../components/layout/DashboardLayout'
import Avatar from '../../components/ui/Avatar'
import Badge from '../../components/ui/Badge'
import Dropdown from '../../components/ui/Dropdown'
import Skeleton from '../../components/ui/Skeleton'
import EmptyState, { ErrorState } from '../../components/ui/EmptyState'
import useAsync from '../../lib/useAsync'
import { adminListUsers, adminSetRole } from '../../lib/api'
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
      <PageHeader title="Users" subtitle="Search accounts and manage roles." />
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
                    {u.role === 'tutor' && u.tutor_status && (
                      <Link to={`/tutors/${u.id}`}><Badge tone={u.tutor_status === 'approved' ? 'mint' : u.tutor_status === 'pending' ? 'amber' : 'coral'}>{u.tutor_status}</Badge></Link>
                    )}
                  </p>
                  <p className="truncate text-xs text-navy-500">{u.email} · joined {dateShort(u.created_at)}</p>
                </div>
              </div>
              <Dropdown value={u.role} onChange={(r) => changeRole(u, r)} options={ROLE_OPTIONS} align="right" className="sm:w-40" />
            </motion.li>
          ))}
        </motion.ul>
      )}
    </>
  )
}
