import { useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { FlaskConical } from 'lucide-react'
import { PageHeader } from '../../components/layout/DashboardLayout'
import Button from '../../components/ui/Button'
import { Input } from '../../components/ui/Field'
import { Reveal } from '../../motion/Reveal'
import { adminUpdateSettings } from '../../lib/api'
import { money } from '../../lib/format'
import { useSettings } from '../../context/SettingsContext'
import { useToast } from '../../context/ToastContext'
import { spring } from '../../motion/variants'

const toForm = (s) => ({
  plus_price: String(s.plus_price), family_price: String(s.family_price),
  plus_discount: String(Math.round(s.plus_discount * 100)), family_discount: String(Math.round(s.family_discount * 100)),
  hold_minutes: String(s.hold_minutes), test_mode: !!s.test_mode,
})

export default function Settings() {
  const { settings, setSettings } = useSettings()
  const toast = useToast()
  const [form, setForm] = useState(() => toForm(settings))
  const [saving, setSaving] = useState(false)
  // Refresh the form only when saved settings change, never over what the admin is typing.
  const shown = useRef(settings)
  useEffect(() => {
    if (shown.current === settings) return
    shown.current = settings
    setForm(toForm(settings))
  }, [settings])
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const save = async (e) => {
    e.preventDefault()
    const n = (k) => Number(form[k])
    if (!(n('plus_price') > 0 && n('family_price') > 0)) return toast.error('Prices must be above ₦0.')
    if ([n('plus_discount'), n('family_discount')].some((d) => d < 0 || d > 50)) return toast.error('Discounts must be between 0% and 50%.')
    if (n('hold_minutes') < 10 || n('hold_minutes') > 120) return toast.error('Hold time must be 10–120 minutes.')
    setSaving(true)
    try {
      const s = await adminUpdateSettings({
        plus_price: n('plus_price'), family_price: n('family_price'),
        plus_discount: n('plus_discount') / 100, family_discount: n('family_discount') / 100,
        hold_minutes: n('hold_minutes'), test_mode: form.test_mode,
      })
      setSettings(s)
      toast.success('Settings saved. Changes apply immediately.')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <PageHeader title="Settings" subtitle="Membership pricing and checkout rules. All amounts are in naira." />
      <form onSubmit={save} className="space-y-6">
        <Reveal className="card p-6 sm:p-8">
          <h2 className="text-lg font-semibold">Memberships</h2>
          <p className="mt-1 text-sm text-navy-500">Monthly price and the discount members get on every session.</p>
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            {[['plus', 'Plus'], ['family', 'Family']].map(([id, name]) => (
              <div key={id} className="rounded-2xl border border-navy-900/8 p-5">
                <p className="font-semibold">{name}</p>
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <Input label="Price per month (₦)" type="number" min={1} value={form[`${id}_price`]} onChange={set(`${id}_price`)} />
                  <Input label="Session discount (%)" type="number" min={0} max={50} value={form[`${id}_discount`]} onChange={set(`${id}_discount`)} />
                </div>
                <p className="mt-3 text-xs text-navy-400">Learners see: {money(Number(form[`${id}_price`]) || 0)}/month · {Number(form[`${id}_discount`]) || 0}% off sessions</p>
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal className="card p-6 sm:p-8">
          <h2 className="text-lg font-semibold">Checkout</h2>
          <div className="mt-5 grid gap-6 md:grid-cols-2">
            <Input label="Hold a slot during checkout for (minutes)" type="number" min={10} max={120} value={form.hold_minutes} onChange={set('hold_minutes')} hint="Unpaid bookings release their slot after this long." />
            <div>
              <p className="mb-1.5 text-sm font-medium text-navy-800">Test mode</p>
              <button type="button" role="switch" aria-checked={form.test_mode} onClick={() => setForm((f) => ({ ...f, test_mode: !f.test_mode }))}
                className={`flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition-colors ${form.test_mode ? 'border-amber-500/40 bg-amber-400/10' : 'border-navy-900/10 bg-white'}`}>
                <span className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${form.test_mode ? 'bg-amber-500' : 'bg-navy-200'}`}>
                  <motion.span layout transition={spring} className="absolute top-1 h-4 w-4 rounded-full bg-white shadow" style={{ left: form.test_mode ? 24 : 4 }} />
                </span>
                <span className="text-sm">
                  <span className="flex items-center gap-1.5 font-semibold"><FlaskConical className="h-4 w-4" />{form.test_mode ? 'On: payments are simulated' : 'Off: real Paystack payments'}</span>
                  <span className="block text-xs text-navy-500">Turn on only while testing. Learners can book without paying.</span>
                </span>
              </button>
            </div>
          </div>
        </Reveal>
        <Button type="submit" size="lg" loading={saving}>Save settings</Button>
      </form>
    </>
  )
}
