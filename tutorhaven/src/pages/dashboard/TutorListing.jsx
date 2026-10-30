import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Eye, Plus, Trash2 } from 'lucide-react'
import { PageHeader } from '../../components/layout/DashboardLayout'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Skeleton from '../../components/ui/Skeleton'
import { ChipGroup, Input, Select, Textarea } from '../../components/ui/Field'
import { ErrorState } from '../../components/ui/EmptyState'
import { Reveal } from '../../motion/Reveal'
import useAsync from '../../lib/useAsync'
import { getOwnTutor, replaceAvailability, updateTutor } from '../../lib/api'
import { LANGUAGES, LEVELS, SUBJECTS } from '../../lib/constants'
import { minutesToLabel } from '../../lib/format'
import { browserTimezone, isValidTimezone } from '../../lib/time'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const ORDER = [1, 2, 3, 4, 5, 6, 0]
const TIMES = Array.from({ length: 49 }, (_, i) => i * 30)

export default function TutorListing() {
  const { profile } = useAuth()
  const toast = useToast()
  const own = useAsync(() => getOwnTutor(profile.id), [profile.id])
  const [form, setForm] = useState(null)
  const [slots, setSlots] = useState([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!own.data?.tutor) return
    const t = own.data.tutor
    setForm({
      headline: t.headline, bio: t.bio, subjects: t.subjects, levels: t.levels, languages: t.languages,
      hourly_rate: t.hourly_rate, years_experience: t.years_experience, location: t.location,
      timezone: t.timezone === 'UTC' ? browserTimezone() : t.timezone,
    })
    setSlots(own.data.availability.map((a, i) => ({ ...a, key: i })))
  }, [own.data])

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v?.target ? v.target.value : v }))
  const addSlot = (weekday) => setSlots((s) => [...s, { key: Date.now() + Math.random(), weekday, start_minute: 1020, end_minute: 1140 }])
  const updateSlot = (key, patch) => setSlots((s) => s.map((x) => (x.key === key ? { ...x, ...patch } : x)))
  const removeSlot = (key) => setSlots((s) => s.filter((x) => x.key !== key))

  const save = async () => {
    if (form.headline.trim().length < 10) return toast.error('Your headline should be at least 10 characters.')
    if (!form.subjects.length) return toast.error('Choose at least one subject.')
    if (!isValidTimezone(form.timezone)) return toast.error('Please enter a valid timezone, e.g. Europe/London.')
    if (slots.some((s) => s.end_minute <= s.start_minute)) return toast.error('Each time window must end after it starts.')
    setSaving(true)
    try {
      await updateTutor(profile.id, {
        ...form,
        headline: form.headline.trim(), bio: form.bio.trim(), location: form.location.trim(),
        hourly_rate: Number(form.hourly_rate), years_experience: Number(form.years_experience),
      })
      await replaceAvailability(profile.id, slots)
      toast.success('Listing saved')
      own.reload({ silent: true })
    } catch (e) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  if (own.error) return <ErrorState message={own.error} onRetry={own.reload} />
  if (own.loading || !form) return <div className="space-y-4"><Skeleton className="h-10 w-48" /><Skeleton className="h-96 rounded-3xl" /></div>

  const status = own.data.tutor.status
  return (
    <>
      <PageHeader
        title="My listing"
        subtitle="This is what students see when they find you."
        action={
          <div className="flex items-center gap-3">
            <Badge tone={status === 'approved' ? 'mint' : status === 'pending' ? 'amber' : 'coral'}>{status === 'approved' ? 'Live' : status === 'pending' ? 'In review' : 'Not approved'}</Badge>
            {status === 'approved' && <Button to={`/tutors/${profile.id}`} variant="secondary" size="sm" icon={Eye}>Preview</Button>}
          </div>
        }
      />
      <div className="space-y-6 pb-24">
        <Reveal className="card space-y-6 p-6 sm:p-8">
          <h2 className="text-lg font-semibold">Profile</h2>
          <Input label="Headline" value={form.headline} onChange={set('headline')} maxLength={90} hint={`${form.headline.length}/90`} />
          <Textarea label="About you" rows={6} value={form.bio} onChange={set('bio')} maxLength={1500} hint="Your background, teaching style and what a first session looks like." />
          <div className="grid gap-4 sm:grid-cols-3">
            <Input label="Hourly rate (USD)" type="number" min={5} max={500} value={form.hourly_rate} onChange={set('hourly_rate')} />
            <Input label="Years of experience" type="number" min={0} max={60} value={form.years_experience} onChange={set('years_experience')} />
            <Input label="Location" value={form.location} onChange={set('location')} placeholder="City, Country" />
          </div>
        </Reveal>

        <Reveal className="card space-y-6 p-6 sm:p-8">
          <h2 className="text-lg font-semibold">What you teach</h2>
          <div><p className="mb-2.5 text-sm font-medium text-navy-800">Subjects</p><ChipGroup size="sm" options={[...new Set([...SUBJECTS, ...form.subjects])]} value={form.subjects} onChange={set('subjects')} label="Subjects" /></div>
          <div><p className="mb-2.5 text-sm font-medium text-navy-800">Levels</p><ChipGroup size="sm" options={LEVELS} value={form.levels} onChange={set('levels')} label="Levels" /></div>
          <div><p className="mb-2.5 text-sm font-medium text-navy-800">Languages</p><ChipGroup size="sm" options={[...new Set([...LANGUAGES, ...form.languages])]} value={form.languages} onChange={set('languages')} label="Languages" /></div>
        </Reveal>

        <Reveal className="card p-6 sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Weekly availability</h2>
              <p className="mt-1 text-sm text-navy-500">Students see these times converted to their own timezone.</p>
            </div>
            <Input label="Your timezone" value={form.timezone} onChange={set('timezone')} className="sm:w-64" />
          </div>
          <ul className="mt-6 divide-y divide-navy-900/[0.06]">
            {ORDER.map((d) => {
              const daySlots = slots.filter((s) => s.weekday === d)
              return (
                <li key={d} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start">
                  <p className={`w-28 shrink-0 pt-2.5 text-sm font-semibold ${daySlots.length ? 'text-navy-900' : 'text-navy-400'}`}>{WEEKDAYS[d]}</p>
                  <div className="flex-1 space-y-2">
                    <AnimatePresence initial={false}>
                      {daySlots.map((s) => (
                        <motion.div key={s.key} layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="flex items-center gap-2">
                          <Select aria-label="From" value={s.start_minute} onChange={(e) => updateSlot(s.key, { start_minute: Number(e.target.value) })} className="flex-1">
                            {TIMES.slice(0, -1).map((m) => <option key={m} value={m}>{minutesToLabel(m)}</option>)}
                          </Select>
                          <span className="text-sm text-navy-400">to</span>
                          <Select aria-label="To" value={s.end_minute} onChange={(e) => updateSlot(s.key, { end_minute: Number(e.target.value) })} className="flex-1">
                            {TIMES.slice(1).map((m) => <option key={m} value={m}>{minutesToLabel(m)}</option>)}
                          </Select>
                          <button type="button" onClick={() => removeSlot(s.key)} className="rounded-lg p-2.5 text-navy-400 hover:bg-coral-50 hover:text-coral-600" aria-label={`Remove ${WEEKDAYS[d]} window`}>
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    {!daySlots.length && <p className="pt-2.5 text-sm text-navy-400">Unavailable</p>}
                  </div>
                  <Button variant="ghost" size="sm" icon={Plus} onClick={() => addSlot(d)} className="self-start">Add</Button>
                </li>
              )
            })}
          </ul>
        </Reveal>
      </div>

      <motion.div initial={{ y: 80 }} animate={{ y: 0 }} className="fixed inset-x-0 bottom-16 z-20 border-t border-navy-900/[0.06] bg-white/90 px-4 py-3 backdrop-blur-xl lg:bottom-0 lg:left-[17rem]">
        <div className="mx-auto flex max-w-6xl items-center justify-end gap-3 lg:px-6">
          <p className="hidden text-sm text-navy-500 sm:block">Changes apply to new bookings immediately.</p>
          <Button onClick={save} loading={saving}>Save listing</Button>
        </div>
      </motion.div>
    </>
  )
}
