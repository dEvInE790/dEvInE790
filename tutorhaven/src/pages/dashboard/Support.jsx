import { useState } from 'react'
import { motion } from 'motion/react'
import { Crown, LifeBuoy, Send } from 'lucide-react'
import { PageHeader } from '../../components/layout/DashboardLayout'
import { PlusBadge } from '../../components/Plus'
import SupportCard from '../../components/SupportCard'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import { Input, Select, Textarea } from '../../components/ui/Field'
import EmptyState from '../../components/ui/EmptyState'
import Skeleton from '../../components/ui/Skeleton'
import { Reveal } from '../../motion/Reveal'
import useAsync from '../../lib/useAsync'
import { createSupportRequest, listMySupportRequests } from '../../lib/api'
import { dateLong } from '../../lib/format'
import { useMembership } from '../../context/MembershipContext'
import { useToast } from '../../context/ToastContext'
import { fadeUp } from '../../motion/variants'

const CATEGORIES = [['booking', 'A booking or lesson'], ['payment', 'A payment or refund'], ['account', 'My account'], ['tutor', 'A tutor'], ['technical', 'Something isn’t working'], ['other', 'Something else']]
const STATUS = { open: ['amber', 'Open'], in_progress: ['navy', 'In progress'], resolved: ['mint', 'Resolved'] }

export default function Support() {
  const toast = useToast()
  const { isPlus } = useMembership()
  const requests = useAsync(() => listMySupportRequests(), [])
  const [form, setForm] = useState({ category: 'booking', subject: '', message: '' })
  const [busy, setBusy] = useState(false)

  const send = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      const r = await createSupportRequest(form)
      requests.setData((list) => [r, ...(list ?? [])])
      setForm({ category: 'booking', subject: '', message: '' })
      toast.success(r.priority === 'priority' ? 'Sent to our priority queue. We’ll reply as soon as possible.' : 'Request sent. We usually reply within one working day.')
    } catch (err) {
      toast.error(err.message)
    }
    setBusy(false)
  }

  return (
    <>
      <PageHeader title="Help & support" subtitle="Send us a request and follow its progress here, or reach us on WhatsApp." />
      {isPlus && (
        <Reveal className="mb-6 flex items-center gap-3 rounded-3xl bg-navy-950 p-5 text-white">
          <Crown className="h-6 w-6 shrink-0 text-amber-300" />
          <p className="text-sm text-navy-100"><PlusBadge className="mr-2" />Priority support is on. Your requests go to the front of our queue.</p>
        </Reveal>
      )}
      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <Reveal className="card p-6 sm:p-8">
          <h2 className="flex items-center gap-2 text-lg font-semibold"><LifeBuoy className="h-5 w-5 text-mint-600" />New request</h2>
          <form onSubmit={send} className="mt-5 space-y-4">
            <Select label="What’s it about?" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {CATEGORIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
            <Input label="Subject" required minLength={3} maxLength={120} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
            <Textarea label="Details" required minLength={10} maxLength={4000} rows={5} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })}
              hint="Include your payment reference (TH-…) for anything about a payment." />
            <Button type="submit" icon={Send} loading={busy}>Send request</Button>
          </form>
        </Reveal>
        <SupportCard title="Contact us directly" message={isPlus ? 'Hello TutorHaven, I’m a Plus member and need help with ' : undefined} />
      </div>

      <Reveal className="card mt-6 p-6 sm:p-8">
        <h2 className="text-lg font-semibold">Your requests</h2>
        {requests.loading ? <Skeleton className="mt-4 h-20" /> : !requests.data?.length ? <EmptyState icon={LifeBuoy} title="No requests yet">Anything you send appears here with our replies.</EmptyState> : (
          <ul className="mt-4 space-y-3">
            {requests.data.map((r) => {
              const [tone, label] = STATUS[r.status]
              return (
                <motion.li key={r.id} variants={fadeUp} initial="hidden" animate="show" className="rounded-2xl border border-navy-900/8 p-4" data-testid="support-request">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{r.subject}</p>
                    <Badge tone={tone}>{label}</Badge>
                    {r.priority === 'priority' && <PlusBadge />}
                    <span className="ml-auto text-xs text-navy-400">{dateLong(r.created_at)}</span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-navy-600">{r.message}</p>
                  {r.admin_reply && <p className="mt-3 rounded-xl bg-mint-50/70 p-3 text-sm"><strong className="text-mint-800">TutorHaven:</strong> {r.admin_reply}</p>}
                </motion.li>
              )
            })}
          </ul>
        )}
      </Reveal>
    </>
  )
}
