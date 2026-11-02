import { useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { BadgeCheck, RefreshCw, Wrench } from 'lucide-react'
import { PageHeader } from '../../components/layout/DashboardLayout'
import Button from '../../components/ui/Button'
import { Input } from '../../components/ui/Field'
import { Reveal } from '../../motion/Reveal'
import { adminReconcile, adminRunMaintenance, adminUpdateSettings } from '../../lib/api'
import { useSettings } from '../../context/SettingsContext'
import { useToast } from '../../context/ToastContext'
import { spring } from '../../motion/variants'

const toForm = (s) => ({
  hold_minutes: String(s.hold_minutes), tutor_subscription_required: s.tutor_subscription_required !== false,
  commission: String(Math.round(Number(s.commission_rate ?? 0.15) * 100)), payout_account_required: s.payout_account_required !== false,
})

export default function Settings() {
  const { settings, setSettings } = useSettings()
  const toast = useToast()
  const [form, setForm] = useState(() => toForm(settings))
  const [saving, setSaving] = useState(false)
  const [running, setRunning] = useState(null)
  // Refresh the form only when saved settings change, never over what the admin is typing.
  const shown = useRef(settings)
  useEffect(() => {
    if (shown.current === settings) return
    shown.current = settings
    setForm(toForm(settings))
  }, [settings])

  const save = async (e) => {
    e.preventDefault()
    const hold = Number(form.hold_minutes)
    if (!(hold >= 10 && hold <= 120)) return toast.error('Hold time must be 10–120 minutes.')
    const commission = Number(form.commission)
    if (!(commission >= 0 && commission <= 50)) return toast.error('Commission must be between 0% and 50%.')
    setSaving(true)
    try {
      setSettings(await adminUpdateSettings({
        hold_minutes: hold, tutor_subscription_required: form.tutor_subscription_required,
        commission_rate: commission / 100, payout_account_required: form.payout_account_required,
      }))
      toast.success('Settings saved. Changes apply immediately.')
    } catch (err) {
      toast.error(err.message)
    }
    setSaving(false)
  }

  const run = async (which) => {
    setRunning(which)
    try {
      if (which === 'maintenance') {
        const r = await adminRunMaintenance()
        toast.success(`Done: ${r.expired} expired, ${r.reminded} reminded, ${r.abandoned} abandoned checkouts, ${r.released} holds released.`)
      } else {
        const r = await adminReconcile()
        const ok = Object.values(r.results ?? {}).filter((s) => s === 'succeeded').length
        toast.success(r.checked ? `Checked ${r.checked} pending payment${r.checked === 1 ? '' : 's'} with Paystack; ${ok} confirmed.` : 'No pending payments to check.')
      }
    } catch (err) {
      toast.error(err.message)
    }
    setRunning(null)
  }

  const required = form.tutor_subscription_required
  return (
    <>
      <PageHeader title="Settings" subtitle="Checkout rules and platform maintenance. Plan prices live under Plans & prices." />
      <form onSubmit={save} className="space-y-6">
        <Reveal className="card p-6 sm:p-8">
          <h2 className="text-lg font-semibold">Checkout & listings</h2>
          <div className="mt-5 grid gap-6 md:grid-cols-2">
            <Input label="Hold a slot during checkout for (minutes)" type="number" min={10} max={120} value={form.hold_minutes} onChange={(e) => setForm((f) => ({ ...f, hold_minutes: e.target.value }))} hint="Unpaid bookings release their slot after this long." />
            <div>
              <p className="mb-1.5 text-sm font-medium text-navy-800">Tutor subscriptions</p>
              <button type="button" role="switch" aria-checked={required} onClick={() => setForm((f) => ({ ...f, tutor_subscription_required: !f.tutor_subscription_required }))}
                className={`flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition-colors ${required ? 'border-mint-500/40 bg-mint-50/60' : 'border-navy-900/10 bg-white'}`}>
                <span className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${required ? 'bg-mint-500' : 'bg-navy-200'}`}>
                  <motion.span layout transition={spring} className="absolute top-1 h-4 w-4 rounded-full bg-white shadow" style={{ left: required ? 24 : 4 }} />
                </span>
                <span className="text-sm">
                  <span className="flex items-center gap-1.5 font-semibold"><BadgeCheck className="h-4 w-4" />{required ? 'Required to be listed' : 'Optional (all approved tutors listed)'}</span>
                  <span className="block text-xs text-navy-500">When required, approved tutors appear in search only while their subscription is active.</span>
                </span>
              </button>
            </div>
          </div>
        </Reveal>
        <Reveal className="card p-6 sm:p-8">
          <h2 className="text-lg font-semibold">Tutor payouts</h2>
          <p className="mt-1 text-sm text-navy-500">Session payments are split by Paystack: the tutor’s share settles to their bank, TutorHaven keeps the commission and pays Paystack’s fees.</p>
          <div className="mt-5 grid gap-6 md:grid-cols-2">
            <Input label="TutorHaven commission (%)" type="number" min={0} max={50} value={form.commission} onChange={(e) => setForm((f) => ({ ...f, commission: e.target.value }))}
              hint={`Tutors earn ${100 - (Number(form.commission) || 0)}% of their listed price. Applies to new checkouts.`} />
            <div>
              <p className="mb-1.5 text-sm font-medium text-navy-800">Bank account before listing</p>
              <button type="button" role="switch" aria-checked={form.payout_account_required} aria-label="Require a payout account" onClick={() => setForm((f) => ({ ...f, payout_account_required: !f.payout_account_required }))}
                className={`flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition-colors ${form.payout_account_required ? 'border-mint-500/40 bg-mint-50/60' : 'border-navy-900/10 bg-white'}`}>
                <span className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${form.payout_account_required ? 'bg-mint-500' : 'bg-navy-200'}`}>
                  <motion.span layout transition={spring} className="absolute top-1 h-4 w-4 rounded-full bg-white shadow" style={{ left: form.payout_account_required ? 24 : 4 }} />
                </span>
                <span className="text-sm">
                  <span className="block font-semibold">{form.payout_account_required ? 'Required to be listed' : 'Optional'}</span>
                  <span className="block text-xs text-navy-500">When optional, earnings of tutors without a bank account must be paid manually.</span>
                </span>
              </button>
            </div>
          </div>
        </Reveal>
        <Button type="submit" size="lg" loading={saving}>Save settings</Button>
      </form>

      <Reveal className="card mt-8 p-6 sm:p-8">
        <h2 className="text-lg font-semibold">Maintenance</h2>
        <p className="mt-1 text-sm text-navy-500">
          These run automatically (every 15 minutes with pg_cron, and on every Paystack webhook). Run them by hand if you need to.
        </p>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-navy-900/8 p-5">
            <p className="font-semibold">Subscriptions & holds</p>
            <p className="mt-1 text-sm text-navy-500">Expire lapsed subscriptions, send renewal reminders, mark checkouts older than 24h as abandoned and release unpaid slots.</p>
            <Button className="mt-4" variant="secondary" icon={Wrench} loading={running === 'maintenance'} onClick={() => run('maintenance')}>Run maintenance</Button>
          </div>
          <div className="rounded-2xl border border-navy-900/8 p-5">
            <p className="font-semibold">Check pending payments</p>
            <p className="mt-1 text-sm text-navy-500">Ask Paystack about payments still marked pending, in case a webhook didn’t arrive.</p>
            <Button className="mt-4" variant="secondary" icon={RefreshCw} loading={running === 'reconcile'} onClick={() => run('reconcile')}>Check with Paystack</Button>
          </div>
        </div>
      </Reveal>
    </>
  )
}
