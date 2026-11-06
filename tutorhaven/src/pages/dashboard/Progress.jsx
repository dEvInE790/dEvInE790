import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { BookOpenCheck, CalendarCheck, CheckCircle2, FileText, Flame, Hourglass, Lightbulb, Plus as PlusIcon, Target, Trash2 } from 'lucide-react'
import { PageHeader } from '../../components/layout/DashboardLayout'
import { PlusBadge, PlusGate } from '../../components/Plus'
import StatCard from '../../components/StatCard'
import BarChart from '../../components/charts/BarChart'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import Tabs from '../../components/ui/Tabs'
import { Input, Select } from '../../components/ui/Field'
import { CardHeader } from '../../components/ui/Card'
import EmptyState, { ErrorState } from '../../components/ui/EmptyState'
import Skeleton from '../../components/ui/Skeleton'
import { Reveal, Stagger } from '../../motion/Reveal'
import useAsync from '../../lib/useAsync'
import { deleteGoal, getLearningAnalytics, listChildren, listReports, requestReport, saveGoal } from '../../lib/api'
import { SUBJECTS } from '../../lib/constants'
import { dateLong } from '../../lib/format'
import { hoursFmt } from '../../lib/stats'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { spring } from '../../motion/variants'

const monthLabel = (ym) => new Date(`${ym}-01T12:00:00`).toLocaleDateString(undefined, { month: 'short' })

export default function Progress() {
  const { profile } = useAuth()
  const isParent = profile.role === 'parent'
  const [params, setParams] = useSearchParams()
  const children = useAsync(() => listChildren(profile.id), [profile.id], { enabled: isParent })
  const childId = isParent ? params.get('child') ?? children.data?.[0]?.id ?? null : profile.id
  return (
    <>
      <PageHeader title={<span className="flex items-center gap-3">Learning progress <PlusBadge /></span>}
        subtitle={isParent ? 'Lessons, goals, tutor feedback and monthly reports for each child.' : 'Your lessons, goals, tutor feedback and monthly reports.'} />
      <PlusGate feature="Learning analytics">
        {isParent && children.data?.length > 1 && (
          <Tabs className="mb-6" value={childId} onChange={(id) => setParams({ child: id }, { replace: true })} tabs={children.data.map((c) => ({ value: c.id, label: c.full_name }))} />
        )}
        {isParent && children.data && !children.data.length ? (
          <div className="card"><EmptyState icon={Target} title="Link a child first" action={<Button to="/dashboard">Go to overview</Button>}>Progress appears here once your child’s student account is linked to yours.</EmptyState></div>
        ) : childId ? <Analytics key={childId} studentId={childId} /> : <Skeleton className="h-64 rounded-3xl" />}
      </PlusGate>
    </>
  )
}

function Analytics({ studentId }) {
  const toast = useToast()
  const a = useAsync(() => getLearningAnalytics(studentId), [studentId])
  const reports = useAsync(() => listReports(studentId), [studentId])
  const [goalOpen, setGoalOpen] = useState(false)
  const [goal, setGoal] = useState({ title: '', subject: '', target_date: '' })
  const [busy, setBusy] = useState(null)
  const [report, setReport] = useState(null)
  const d = a.data
  const chart = useMemo(() => (d?.monthly ?? []).map((m) => ({ label: monthLabel(m.month), value: m.minutes / 60, detail: `${m.lessons} lesson${m.lessons === 1 ? '' : 's'}` })), [d])
  const weeksActive = (d?.weekly ?? []).filter((w) => w.activities > 0).length

  const addGoal = async (e) => {
    e.preventDefault()
    setBusy('goal')
    try {
      await saveGoal({ ...goal, student_id: studentId })
      setGoalOpen(false)
      setGoal({ title: '', subject: '', target_date: '' })
      a.reload({ silent: true })
      toast.success('Goal added')
    } catch (err) {
      toast.error(err.message)
    }
    setBusy(null)
  }
  const updateGoal = async (g, patch) => {
    try {
      await saveGoal({ id: g.id, student_id: studentId, ...patch })
      a.reload({ silent: true })
      if (patch.status === 'achieved') toast.success('Goal achieved. Well done!')
    } catch (err) {
      toast.error(err.message)
    }
  }
  const removeGoal = async (g) => {
    try {
      await deleteGoal(g.id)
      a.reload({ silent: true })
    } catch (err) {
      toast.error(err.message)
    }
  }
  const generate = async () => {
    setBusy('report')
    try {
      const r = await requestReport(studentId)
      reports.reload({ silent: true })
      setReport(r)
    } catch (err) {
      toast.error(err.message)
    }
    setBusy(null)
  }

  if (a.error) return <ErrorState message={a.error} onRetry={a.reload} />
  return (
    <div className="space-y-6" data-testid="analytics">
      <Stagger onMount className="grid grid-cols-2 gap-4 lg:grid-cols-4" gap={0.05}>
        <StatCard icon={BookOpenCheck} label="Lessons completed" value={d?.all_time.lessons_completed ?? 0} loading={a.loading} />
        <StatCard icon={Hourglass} label="Hours learned" value={(d?.all_time.minutes ?? 0) / 60} format={hoursFmt} loading={a.loading} accent="navy" />
        <StatCard icon={CalendarCheck} label="Lessons this month" value={d?.this_month.lessons_completed ?? 0} loading={a.loading} accent="amber" />
        <StatCard icon={Flame} label="Active weeks" value={weeksActive} hint="Out of the last 12" loading={a.loading} accent="cream" />
      </Stagger>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Reveal className="card p-6">
          <CardHeader title="Progress over time" subtitle="Hours of completed lessons, last 6 months" />
          <div className="mt-6">{a.loading ? <Skeleton className="h-[220px]" /> : <BarChart data={chart} format={(v) => `${hoursFmt(v)}h`} title="Learning hours per month" />}</div>
        </Reveal>
        <Reveal className="card p-6" delay={0.05}>
          <CardHeader title="Subjects studied" subtitle="All completed lessons" />
          {a.loading ? <Skeleton className="mt-5 h-32" /> : !d.all_time.subjects.length ? <p className="mt-5 text-sm text-navy-500">No completed lessons yet.</p> : (
            <ul className="mt-5 space-y-3">
              {d.all_time.subjects.map((s) => {
                const max = Math.max(...d.all_time.subjects.map((x) => x.minutes))
                return (
                  <li key={s.subject}>
                    <div className="flex justify-between text-sm"><span className="font-medium">{s.subject}</span><span className="text-navy-500">{s.lessons} lesson{s.lessons === 1 ? '' : 's'} · {hoursFmt(s.minutes / 60)}h</span></div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-navy-900/[0.06]">
                      <motion.div className="h-full rounded-full bg-mint-500" initial={{ width: 0 }} animate={{ width: `${(s.minutes / max) * 100}%` }} transition={{ duration: 0.8 }} />
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </Reveal>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Reveal className="card p-6">
          <CardHeader title="Learning goals" subtitle="Set goals and mark them off as you go" action={<Button size="sm" icon={PlusIcon} onClick={() => setGoalOpen(true)}>Add goal</Button>} />
          {a.loading ? <Skeleton className="mt-5 h-24" /> : !d.all_time.goals.length ? <p className="mt-5 rounded-2xl bg-cream-100 p-4 text-sm text-navy-500">No goals yet. A clear goal, like “Score B2 or better in WAEC Maths”, helps your tutor plan lessons.</p> : (
            <ul className="mt-5 space-y-3" data-testid="goals">
              <AnimatePresence initial={false}>
                {d.all_time.goals.map((g) => (
                  <motion.li key={g.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="rounded-2xl border border-navy-900/8 p-3.5">
                    <div className="flex items-start gap-3">
                      <button type="button" onClick={() => g.status !== 'achieved' && updateGoal(g, { status: 'achieved' })} aria-label={g.status === 'achieved' ? 'Achieved' : `Mark “${g.title}” achieved`}
                        className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 ${g.status === 'achieved' ? 'border-mint-500 bg-mint-500 text-white' : 'border-navy-200 hover:border-mint-500'}`}>
                        {g.status === 'achieved' && <CheckCircle2 className="h-4 w-4" />}
                      </button>
                      <div className="min-w-0 flex-1">
                        <p className={`font-medium ${g.status === 'achieved' ? 'text-navy-400 line-through' : ''}`}>{g.title}</p>
                        <p className="text-xs text-navy-400">{[g.subject, g.target_date && `by ${dateLong(g.target_date)}`, g.status === 'achieved' && g.achieved_at && `achieved ${dateLong(g.achieved_at)}`].filter(Boolean).join(' · ')}</p>
                        {g.status === 'active' && (
                          <div className="mt-2 flex items-center gap-2">
                            <input type="range" min={0} max={100} step={10} defaultValue={g.progress} aria-label={`Progress on ${g.title}`}
                              onMouseUp={(e) => updateGoal(g, { progress: Number(e.currentTarget.value), status: 'active' })} onTouchEnd={(e) => updateGoal(g, { progress: Number(e.currentTarget.value), status: 'active' })}
                              onKeyUp={(e) => updateGoal(g, { progress: Number(e.currentTarget.value), status: 'active' })} className="flex-1 accent-mint-600" />
                            <span className="w-10 text-right text-xs font-semibold">{g.progress}%</span>
                          </div>
                        )}
                      </div>
                      <button type="button" onClick={() => removeGoal(g)} className="rounded-lg p-1.5 text-navy-300 hover:bg-coral-50 hover:text-coral-600" aria-label={`Delete ${g.title}`}><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </Reveal>

        <Reveal className="card p-6" delay={0.05}>
          <CardHeader title="Tutor feedback & next steps" subtitle="From lesson notes your tutors write" />
          {a.loading ? <Skeleton className="mt-5 h-24" /> : (
            <div className="mt-5 space-y-4">
              {d.recommendations.length > 0 && (
                <ul className="space-y-2">
                  {d.recommendations.map((r) => (
                    <li key={r.subject} className="flex gap-3 rounded-2xl bg-amber-400/10 p-3 text-sm"><Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-[#8a5a00]" /><span><strong>{r.subject}:</strong> {r.text} <span className="text-navy-400">({r.tutor})</span></span></li>
                  ))}
                </ul>
              )}
              {!d.all_time.feedback.length ? <p className="rounded-2xl bg-cream-100 p-4 text-sm text-navy-500">Feedback appears here after tutors add notes to completed lessons.</p> : (
                <ul className="max-h-80 space-y-3 overflow-y-auto pr-1">
                  {d.all_time.feedback.slice(0, 10).map((f, i) => (
                    <li key={i} className="rounded-2xl border border-navy-900/8 p-3.5 text-sm">
                      <p className="text-xs text-navy-400">{f.subject} · {f.tutor} · {dateLong(f.date)}</p>
                      <p className="mt-1 text-navy-700">{f.summary}</p>
                      {f.strengths && <p className="mt-1"><span className="font-semibold text-mint-700">Strengths:</span> {f.strengths}</p>}
                      {f.improvements && <p><span className="font-semibold text-[#8a5a00]">To work on:</span> {f.improvements}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </Reveal>
      </div>

      <Reveal className="card p-6">
        <CardHeader title="Monthly reports" subtitle="Generated automatically at the start of each month" action={<Button size="sm" variant="secondary" icon={FileText} loading={busy === 'report'} onClick={generate}>This month so far</Button>} />
        {reports.loading ? <Skeleton className="mt-5 h-16" /> : !reports.data?.length ? <p className="mt-5 text-sm text-navy-500">No reports yet.</p> : (
          <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3" data-testid="reports">
            {reports.data.map((r) => (
              <li key={r.id}>
                <motion.button type="button" whileHover={{ y: -3 }} transition={spring} onClick={() => setReport(r)} className="w-full rounded-2xl border border-navy-900/8 bg-white p-4 text-left">
                  <p className="font-semibold">{r.data.month}</p>
                  <p className="text-sm text-navy-500">{r.data.summary.lessons_completed} lesson{r.data.summary.lessons_completed === 1 ? '' : 's'} · {hoursFmt(r.data.summary.minutes / 60)}h{r.data.complete ? '' : ' · in progress'}</p>
                </motion.button>
              </li>
            ))}
          </ul>
        )}
      </Reveal>

      <Modal open={goalOpen} onClose={() => setGoalOpen(false)} title="Add a learning goal" size="sm">
        <form onSubmit={addGoal} className="space-y-4">
          <Input label="Goal" required minLength={3} maxLength={120} value={goal.title} onChange={(e) => setGoal({ ...goal, title: e.target.value })} placeholder="e.g. Score B2 or better in WAEC Maths" />
          <Select label="Subject" value={goal.subject} onChange={(e) => setGoal({ ...goal, subject: e.target.value })}>
            <option value="">Any subject</option>
            {SUBJECTS.map((s) => <option key={s}>{s}</option>)}
          </Select>
          <Input label="Target date (optional)" type="date" value={goal.target_date} onChange={(e) => setGoal({ ...goal, target_date: e.target.value })} />
          <Button type="submit" className="w-full" loading={busy === 'goal'}>Add goal</Button>
        </form>
      </Modal>

      <ReportModal report={report} onClose={() => setReport(null)} />
    </div>
  )
}

export function ReportModal({ report, onClose }) {
  const r = report?.data
  return (
    <Modal open={!!report} onClose={onClose} title={r ? `${r.student_name} · ${r.month}` : ''} description={r && !r.complete ? 'This month is still in progress; the final report is generated on the 1st.' : 'Monthly learning report'} size="lg">
      {r && (
        <div className="space-y-5 text-sm" data-testid="report">
          <div className="grid grid-cols-3 gap-3 text-center">
            {[['Lessons attended', r.summary.lessons_completed, r.previous?.lessons_completed], ['Hours', hoursFmt(r.summary.minutes / 60), r.previous ? hoursFmt(r.previous.minutes / 60) : null], ['Active days', r.summary.active_days, null]].map(([label, v, prev]) => (
              <div key={label} className="rounded-2xl bg-cream-100 p-3">
                <p className="font-display text-2xl font-bold">{v}</p>
                <p className="text-xs text-navy-500">{label}</p>
                {prev != null && <p className="text-[0.7rem] text-navy-400">Last month: {prev}</p>}
              </div>
            ))}
          </div>
          {r.summary.subjects.length > 0 && <p><strong>Subjects:</strong> {r.summary.subjects.map((s) => `${s.subject} (${s.lessons})`).join(', ')}</p>}
          {r.summary.tutors.length > 0 && <p><strong>Tutors:</strong> {r.summary.tutors.map((t) => t.name).join(', ')}</p>}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-mint-50/70 p-4">
              <p className="font-semibold text-mint-800">Strengths</p>
              {r.strengths.length ? <ul className="mt-2 list-disc space-y-1 pl-4">{r.strengths.map((s, i) => <li key={i}>{s.text} <span className="text-navy-400">({s.subject})</span></li>)}</ul> : <p className="mt-2 text-navy-500">No tutor notes this month.</p>}
            </div>
            <div className="rounded-2xl bg-amber-400/10 p-4">
              <p className="font-semibold text-[#8a5a00]">Areas to work on</p>
              {r.improvements.length ? <ul className="mt-2 list-disc space-y-1 pl-4">{r.improvements.map((s, i) => <li key={i}>{s.text} <span className="text-navy-400">({s.subject})</span></li>)}</ul> : <p className="mt-2 text-navy-500">No tutor notes this month.</p>}
            </div>
          </div>
          {r.summary.feedback.length > 0 && (
            <div>
              <p className="font-semibold">Tutor feedback</p>
              <ul className="mt-2 space-y-2">{r.summary.feedback.map((f, i) => <li key={i} className="rounded-xl border border-navy-900/8 p-3"><span className="text-xs text-navy-400">{f.subject} · {f.tutor} · {dateLong(f.date)}</span><br />{f.summary}</li>)}</ul>
            </div>
          )}
          {r.summary.goals.length > 0 && (
            <div>
              <p className="font-semibold">Goals</p>
              <ul className="mt-2 space-y-1">{r.summary.goals.map((g) => <li key={g.id}>{g.status === 'achieved' ? '✓' : '•'} {g.title} {g.status === 'active' ? `(${g.progress}%)` : `(${g.status})`}</li>)}</ul>
            </div>
          )}
          <Button variant="secondary" onClick={() => window.print()}>Print or save as PDF</Button>
        </div>
      )}
    </Modal>
  )
}
