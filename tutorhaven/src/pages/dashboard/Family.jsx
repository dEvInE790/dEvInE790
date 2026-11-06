import { useState } from 'react'
import { motion } from 'motion/react'
import { ArrowRight, CalendarDays, FileText, GraduationCap, PencilLine, Target, Users } from 'lucide-react'
import { PageHeader } from '../../components/layout/DashboardLayout'
import { PlusBadge, PlusGate } from '../../components/Plus'
import Avatar from '../../components/ui/Avatar'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import { ChipGroup } from '../../components/ui/Field'
import EmptyState, { ErrorState } from '../../components/ui/EmptyState'
import Skeleton from '../../components/ui/Skeleton'
import { Stagger, StaggerItem } from '../../motion/Reveal'
import useAsync from '../../lib/useAsync'
import { getFamilyOverview, updateChildProfile } from '../../lib/api'
import { GOALS, LEVELS, SUBJECTS } from '../../lib/constants'
import { dateLong, time } from '../../lib/format'
import { hoursFmt } from '../../lib/stats'
import { useToast } from '../../context/ToastContext'
import { spring } from '../../motion/variants'

export default function Family() {
  return (
    <>
      <PageHeader title={<span className="flex items-center gap-3">Family dashboard <PlusBadge /></span>} subtitle="Each child’s learning profile, bookings, tutors and progress. Only you and each child can see their details." />
      <PlusGate feature="Family dashboard"><Overview /></PlusGate>
    </>
  )
}

function Overview() {
  const toast = useToast()
  const fam = useAsync(() => getFamilyOverview(), [])
  const [editing, setEditing] = useState(null)
  const [busy, setBusy] = useState(false)

  const save = async () => {
    setBusy(true)
    try {
      await updateChildProfile(editing.id, { grade_level: editing.grade_level ?? '', subjects: editing.subjects ?? [], goals: editing.goals ?? [] })
      toast.success(`${editing.name.split(' ')[0]}’s learning profile saved`)
      setEditing(null)
      fam.reload({ silent: true })
    } catch (e) {
      toast.error(e.message)
    }
    setBusy(false)
  }

  if (fam.error) return <ErrorState message={fam.error} onRetry={fam.reload} />
  if (fam.loading) return <div className="grid gap-5 lg:grid-cols-2">{[0, 1].map((i) => <Skeleton key={i} className="h-80 rounded-3xl" />)}</div>
  if (!fam.data.length) {
    return <div className="card"><EmptyState icon={Users} title="No children linked yet" action={<Button to="/dashboard">Link a child</Button>}>Your child signs up as a student, then you link them from your overview using their email.</EmptyState></div>
  }
  return (
    <>
      <Stagger onMount className="grid gap-5 lg:grid-cols-2" gap={0.08}>
        {fam.data.map((c) => (
          <StaggerItem key={c.id}>
            <motion.article whileHover={{ y: -4 }} transition={spring} className="card flex h-full flex-col p-6" data-testid="family-child">
              <div className="flex items-center gap-4">
                <Avatar name={c.name} seed={c.id} size="lg" />
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-lg font-semibold">{c.name}</h2>
                  <p className="text-sm text-navy-500">{c.grade_level || 'Level not set'}{c.subjects?.length ? ` · ${c.subjects.slice(0, 3).join(', ')}` : ''}</p>
                </div>
                <Button size="sm" variant="ghost" icon={PencilLine} onClick={() => setEditing({ ...c })} aria-label={`Edit ${c.name}’s learning profile`}>Profile</Button>
              </div>
              <dl className="mt-5 grid grid-cols-3 gap-3 text-center">
                {[['This month', `${c.this_month.lessons_completed} lesson${c.this_month.lessons_completed === 1 ? '' : 's'}`], ['All time', `${hoursFmt(c.all_time.minutes / 60)}h`], ['Active goals', c.active_goals]].map(([k, v]) => (
                  <div key={k} className="rounded-2xl bg-cream-100 p-3"><dd className="font-display text-lg font-bold">{v}</dd><dt className="text-xs text-navy-500">{k}</dt></div>
                ))}
              </dl>
              <div className="mt-5 space-y-4 text-sm">
                <div>
                  <p className="flex items-center gap-1.5 font-semibold"><CalendarDays className="h-4 w-4 text-navy-400" />Upcoming</p>
                  {c.upcoming.length ? (
                    <ul className="mt-2 space-y-1.5">{c.upcoming.slice(0, 3).map((b) => <li key={b.id} className="flex justify-between gap-2 rounded-xl bg-cream-50 px-3 py-2"><span>{b.subject} with {b.tutor}</span><span className="text-navy-500">{dateLong(b.starts_at)} · {time(b.starts_at)}</span></li>)}</ul>
                  ) : <p className="mt-1 text-navy-500">No upcoming lessons.</p>}
                </div>
                <div>
                  <p className="flex items-center gap-1.5 font-semibold"><GraduationCap className="h-4 w-4 text-navy-400" />Tutors</p>
                  <p className="mt-1 text-navy-600">{c.tutors.length ? c.tutors.map((t) => t.name).join(', ') : 'None yet'}</p>
                </div>
                {c.latest_feedback && (
                  <div className="rounded-2xl bg-mint-50/60 p-3">
                    <p className="text-xs text-navy-500">Latest feedback · {c.latest_feedback.subject} · {c.latest_feedback.tutor}</p>
                    <p className="mt-1 text-navy-700">{c.latest_feedback.summary}</p>
                  </div>
                )}
              </div>
              <div className="mt-auto flex flex-wrap gap-2 pt-5">
                <Button size="sm" to={`/dashboard/progress?child=${c.id}`} iconRight={ArrowRight}>Progress & reports</Button>
                <Button size="sm" variant="secondary" to="/tutors">Book a tutor</Button>
                {c.latest_report && <span className="flex items-center gap-1 text-xs text-navy-500"><FileText className="h-3.5 w-3.5" />Latest report: {new Date(c.latest_report.month).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</span>}
              </div>
            </motion.article>
          </StaggerItem>
        ))}
      </Stagger>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={`${editing?.name?.split(' ')[0] ?? ''}’s learning profile`} description="Used for tutor recommendations and in reports.">
        {editing && (
          <div className="space-y-5">
            <div><p className="mb-2 text-sm font-medium">Level</p><ChipGroup size="sm" multiple={false} options={LEVELS} value={editing.grade_level ?? ''} onChange={(v) => setEditing({ ...editing, grade_level: v })} label="Level" /></div>
            <div><p className="mb-2 text-sm font-medium">Subjects</p><ChipGroup size="sm" options={SUBJECTS} value={editing.subjects ?? []} onChange={(v) => setEditing({ ...editing, subjects: v })} label="Subjects" /></div>
            <div><p className="mb-2 flex items-center gap-1.5 text-sm font-medium"><Target className="h-4 w-4" />Focus</p><ChipGroup size="sm" options={GOALS} value={editing.goals ?? []} onChange={(v) => setEditing({ ...editing, goals: v })} label="Focus" /></div>
            <Button className="w-full" loading={busy} onClick={save}>Save profile</Button>
          </div>
        )}
      </Modal>
    </>
  )
}
