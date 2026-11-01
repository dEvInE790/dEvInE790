import { useState } from 'react'
import { motion } from 'motion/react'
import { Pencil, Plus, Tags } from 'lucide-react'
import { PageHeader } from '../../components/layout/DashboardLayout'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import { Input, Select, Textarea } from '../../components/ui/Field'
import EmptyState from '../../components/ui/EmptyState'
import Skeleton from '../../components/ui/Skeleton'
import { adminUpsertPlan } from '../../lib/api'
import { money } from '../../lib/format'
import { useSettings } from '../../context/SettingsContext'
import { useToast } from '../../context/ToastContext'

const NEW = { code: '', audience: 'learner', name: '', description: '', price: '', interval_months: '1', session_discount: '0', features: '', is_active: true, sort_order: '0' }
const toForm = (p) => ({
  ...p, price: String(p.price), interval_months: String(p.interval_months), session_discount: String(Math.round(Number(p.session_discount) * 100)),
  features: (p.features ?? []).join('\n'), sort_order: String(p.sort_order),
})

/** Admins set subscription prices here; checkout always charges the price stored on the plan. */
export default function Plans() {
  const { allPlans, plansLoaded, reload } = useSettings()
  const toast = useToast()
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  const save = async (e) => {
    e.preventDefault()
    const price = Number(form.price)
    const discount = Number(form.session_discount)
    if (!(price >= 100)) return toast.error('Price must be at least ₦100.')
    if (form.audience === 'learner' && !(discount >= 0 && discount <= 50)) return toast.error('Discount must be between 0% and 50%.')
    if (!form.id && !/^[a-z0-9_]{2,40}$/.test(form.code)) return toast.error('Code: 2–40 lowercase letters, numbers or underscores.')
    setSaving(true)
    try {
      await adminUpsertPlan({
        ...(form.id ? { id: form.id } : { code: form.code, audience: form.audience }),
        name: form.name.trim(), description: form.description.trim(), price, interval_months: Number(form.interval_months),
        session_discount: discount / 100, features: form.features.split('\n').map((f) => f.trim()).filter(Boolean),
        is_active: form.is_active, sort_order: Number(form.sort_order) || 0,
      })
      reload()
      toast.success('Plan saved. New checkouts use the new price straight away.')
      setForm(null)
    } catch (err) {
      toast.error(err.message)
    }
    setSaving(false)
  }

  const groups = [['learner', 'Learner memberships', 'Students and parents pay these for a discount on every session.'], ['tutor', 'Tutor subscriptions', 'Tutors pay these to be listed and take paid bookings.']]

  return (
    <>
      <PageHeader title="Plans & prices" subtitle="Monthly plans for learners and tutors. Prices are in naira." action={<Button icon={Plus} onClick={() => setForm(NEW)}>New plan</Button>} />
      {!plansLoaded ? <Skeleton className="h-64 rounded-3xl" /> : groups.map(([aud, title, sub]) => {
        const plans = allPlans.filter((p) => p.audience === aud)
        return (
          <section key={aud} className="mb-8">
            <h2 className="text-lg font-semibold">{title}</h2>
            <p className="mb-4 text-sm text-navy-500">{sub}</p>
            {!plans.length ? <div className="card"><EmptyState icon={Tags} title="No plans yet" action={<Button size="sm" onClick={() => setForm({ ...NEW, audience: aud })}>Create one</Button>} /></div> : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {plans.map((p) => (
                  <motion.div key={p.id} layout className={`card p-5 ${p.is_active ? '' : 'opacity-60'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{p.name}</p>
                        <p className="font-mono text-xs text-navy-400">{p.code}</p>
                      </div>
                      <Badge tone={p.is_active ? 'mint' : 'neutral'}>{p.is_active ? 'On sale' : 'Hidden'}</Badge>
                    </div>
                    <p className="mt-4 font-display text-3xl font-bold">{money(p.price)}<span className="text-sm font-medium text-navy-400"> / {p.interval_months > 1 ? `${p.interval_months} months` : 'month'}</span></p>
                    {aud === 'learner' && <p className="mt-1 text-sm text-mint-700">{Math.round(p.discount * 100)}% off every session</p>}
                    {p.description && <p className="mt-2 text-sm text-navy-500">{p.description}</p>}
                    <Button size="sm" variant="secondary" icon={Pencil} className="mt-4" onClick={() => setForm(toForm(p))}>Edit</Button>
                  </motion.div>
                ))}
              </div>
            )}
          </section>
        )
      })}

      <Modal open={!!form} onClose={() => !saving && setForm(null)} title={form?.id ? `Edit ${form.name}` : 'New plan'} description="Existing subscribers keep what they paid for; new checkouts use these settings.">
        {form && (
          <form onSubmit={save} className="space-y-4">
            {!form.id && (
              <div className="grid grid-cols-2 gap-4">
                <Input label="Code" value={form.code} onChange={set('code')} placeholder="tutor_pro" hint="Permanent identifier" />
                <Select label="For" value={form.audience} onChange={set('audience')}>
                  <option value="learner">Students & parents</option>
                  <option value="tutor">Tutors</option>
                </Select>
              </div>
            )}
            <Input label="Name" value={form.name} onChange={set('name')} required maxLength={60} />
            <Textarea label="Short description" rows={2} value={form.description} onChange={set('description')} maxLength={200} />
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Input label="Price (₦)" type="number" min={100} value={form.price} onChange={set('price')} required />
              <Select label="Billing period" value={form.interval_months} onChange={set('interval_months')}>
                {[1, 3, 6, 12].map((m) => <option key={m} value={m}>{m === 1 ? '1 month' : `${m} months`}</option>)}
              </Select>
              {form.audience === 'learner' && <Input label="Session discount (%)" type="number" min={0} max={50} value={form.session_discount} onChange={set('session_discount')} />}
            </div>
            <Textarea label="Features (one per line)" rows={3} value={form.features} onChange={set('features')} />
            <div className="grid grid-cols-2 items-end gap-4">
              <Input label="Order" type="number" value={form.sort_order} onChange={set('sort_order')} />
              <label className="flex h-11 items-center gap-2 text-sm font-medium"><input type="checkbox" checked={form.is_active} onChange={set('is_active')} className="h-4 w-4 accent-navy-900" />On sale</label>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="secondary" className="flex-1" onClick={() => setForm(null)}>Cancel</Button>
              <Button type="submit" className="flex-1" loading={saving}>Save plan</Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  )
}
