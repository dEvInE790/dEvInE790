import { useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { FileCheck2, GraduationCap, Paperclip, Plus, Trash2 } from 'lucide-react'
import Button from './ui/Button'
import Badge from './ui/Badge'
import Skeleton from './ui/Skeleton'
import { Input } from './ui/Field'
import { ErrorState } from './ui/EmptyState'
import useAsync from '../lib/useAsync'
import { addQualification, deleteQualification, listMyQualifications } from '../lib/api'
import { useToast } from '../context/ToastContext'

const STATUS = { pending: ['amber', 'In review'], verified: ['mint', 'Verified'], rejected: ['coral', 'Not verified'] }
const EMPTY = { title: '', institution: '', year: '', file: null }

/** Tutors add degrees and certificates; admins verify them before they show publicly. */
export default function Qualifications({ tutorId }) {
  const toast = useToast()
  const list = useAsync(() => listMyQualifications(tutorId), [tutorId])
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const fileRef = useRef(null)

  const save = async (e) => {
    e.preventDefault()
    if (form.title.trim().length < 2) return toast.error('Add the name of the qualification.')
    setSaving(true)
    try {
      const q = await addQualification(tutorId, form)
      list.setData((l) => [...(l ?? []), q])
      setForm(null)
      toast.success('Added. An admin will review it shortly.')
    } catch (err) {
      toast.error(err.message)
    }
    setSaving(false)
  }
  const remove = async (q) => {
    try {
      await deleteQualification(q)
      list.setData((l) => l.filter((x) => x.id !== q.id))
    } catch (err) {
      toast.error(err.message)
    }
  }

  return (
    <div className="card p-6 sm:p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Qualifications</h2>
          <p className="mt-1 text-sm text-navy-500">Upload certificates so our team can verify them. Verified qualifications show a badge on your profile; documents stay private.</p>
        </div>
        {!form && <Button variant="secondary" size="sm" icon={Plus} onClick={() => setForm(EMPTY)}>Add qualification</Button>}
      </div>

      <AnimatePresence initial={false}>
        {form && (
          <motion.form key="form" onSubmit={save} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="mt-5 grid gap-4 rounded-2xl bg-cream-100 p-4 sm:grid-cols-[2fr_2fr_1fr]">
              <Input label="Qualification" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="B.Sc. Mathematics" maxLength={120} required />
              <Input label="Institution" value={form.institution} onChange={(e) => setForm({ ...form, institution: e.target.value })} placeholder="University of Ibadan" />
              <Input label="Year" type="number" min={1950} max={2100} value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} />
              <div className="flex flex-col gap-3 sm:col-span-3 sm:flex-row sm:items-center">
                <input ref={fileRef} type="file" accept=".pdf,image/*" className="sr-only" id="qual-file" onChange={(e) => setForm({ ...form, file: e.target.files?.[0] ?? null })} />
                <label htmlFor="qual-file" className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-dashed border-navy-900/20 bg-white px-3.5 text-sm font-medium text-navy-700 hover:border-mint-500">
                  <Paperclip className="h-4 w-4" />{form.file ? form.file.name : 'Attach certificate (PDF or image, max 5 MB)'}
                </label>
                <div className="flex gap-2 sm:ml-auto">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setForm(null)}>Cancel</Button>
                  <Button type="submit" size="sm" loading={saving}>Submit for review</Button>
                </div>
              </div>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {list.error ? <div className="mt-4"><ErrorState message={list.error} onRetry={list.reload} /></div> : list.loading ? <Skeleton className="mt-5 h-14" /> : !list.data.length && !form ? (
        <div className="mt-5 flex items-center gap-3 rounded-2xl border border-dashed border-navy-900/12 p-4 text-sm text-navy-500">
          <GraduationCap className="h-5 w-5 shrink-0 text-navy-300" />
          No qualifications yet. Tutors with verified qualifications earn more trust from parents.
        </div>
      ) : (
        <ul className="mt-5 divide-y divide-navy-900/[0.06]">
          {list.data.map((q) => {
            const [tone, label] = STATUS[q.status]
            return (
              <li key={q.id} className="flex items-center gap-3 py-3.5">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-cream-200 text-navy-700"><FileCheck2 className="h-4 w-4" /></span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{q.title}</p>
                  <p className="truncate text-xs text-navy-400">{[q.institution, q.year].filter(Boolean).join(' · ') || 'No institution given'}{q.document_path ? ' · document attached' : ''}</p>
                  {q.status === 'rejected' && q.review_note && <p className="mt-0.5 text-xs text-coral-600">{q.review_note}</p>}
                </div>
                <Badge tone={tone}>{label}</Badge>
                <button type="button" onClick={() => remove(q)} className="rounded-lg p-2 text-navy-400 hover:bg-coral-50 hover:text-coral-600" aria-label={`Remove ${q.title}`}><Trash2 className="h-4 w-4" /></button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
