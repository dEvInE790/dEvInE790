import { useState } from 'react'
import { View } from 'react-native'
import { BookOpenCheck, CalendarCheck, FileText, Hourglass, Lightbulb, Target } from 'lucide-react-native'
import Screen from '../components/Screen'
import PlusGate from '../components/PlusGate'
import { Button, Card, Chip, EmptyState, Field, Skeleton, Text } from '../components/ui'
import Sheet from '../components/Sheet'
import { StatCard } from '../components/Stats'
import useAsync from '../lib/useAsync'
import { getLearningAnalytics, listChildren, listReports, requestReport, saveGoal } from '../lib/api'
import { dateLong } from '../lib/format'
import { hoursFmt } from '../lib/stats'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { colors } from '../theme'

/** Plus analytics: lessons, subjects, goals, tutor feedback and monthly reports. Parents pick a child. */
export default function Progress() {
  const { profile } = useAuth()
  const isParent = profile.role === 'parent'
  const children = useAsync(() => listChildren(profile.id), [profile.id], { enabled: isParent })
  const [picked, setPicked] = useState(null)
  const studentId = isParent ? picked ?? children.data?.[0]?.id ?? null : profile.id
  return (
    <Screen back title="Progress" subtitle={isParent ? 'Each child’s lessons, goals, feedback and reports.' : 'Your lessons, goals, feedback and reports.'}>
      <PlusGate title="Learning analytics" body="Lessons completed, subjects studied, goals, tutor feedback and monthly reports in one place.">
        {isParent && children.data?.length > 1 && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {children.data.map((c) => <Chip key={c.id} size="sm" label={c.full_name} selected={c.id === studentId} onPress={() => setPicked(c.id)} />)}
          </View>
        )}
        {isParent && children.data && !children.data.length ? <EmptyState icon={Target} title="Link a child first" body="Progress appears once your child’s account is linked to yours." />
          : studentId ? <Analytics key={studentId} studentId={studentId} /> : <Skeleton style={{ height: 200, borderRadius: 20 }} />}
      </PlusGate>
    </Screen>
  )
}

function Analytics({ studentId }) {
  const toast = useToast()
  const a = useAsync(() => getLearningAnalytics(studentId), [studentId])
  const reports = useAsync(() => listReports(studentId), [studentId])
  const [goalOpen, setGoalOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [report, setReport] = useState(null)
  const [busy, setBusy] = useState(false)
  const d = a.data

  const addGoal = async () => {
    setBusy(true)
    try {
      await saveGoal({ student_id: studentId, title })
      setGoalOpen(false)
      setTitle('')
      a.reload({ silent: true })
    } catch (e) {
      toast.error(e.message)
    }
    setBusy(false)
  }
  const achieve = async (g) => {
    try {
      await saveGoal({ id: g.id, student_id: studentId, status: 'achieved' })
      a.reload({ silent: true })
      toast.success('Goal achieved. Well done!')
    } catch (e) {
      toast.error(e.message)
    }
  }
  const thisMonth = async () => {
    setBusy(true)
    try {
      setReport(await requestReport(studentId))
      reports.reload({ silent: true })
    } catch (e) {
      toast.error(e.message)
    }
    setBusy(false)
  }

  if (a.error) return <Text variant="muted">{a.error}</Text>
  if (a.loading) return <Skeleton style={{ height: 240, borderRadius: 20 }} />
  return (
    <View style={{ gap: 14 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        <StatCard icon={BookOpenCheck} label="Lessons" value={d.all_time.lessons_completed} />
        <StatCard icon={Hourglass} label="Hours" value={d.all_time.minutes / 60} format={hoursFmt} accent="navy" />
        <StatCard icon={CalendarCheck} label="This month" value={d.this_month.lessons_completed} accent="amber" />
        <StatCard icon={Target} label="Active goals" value={d.all_time.goals.filter((g) => g.status === 'active').length} accent="cream" />
      </View>
      <Card style={{ gap: 8 }}>
        <Text variant="h3">Subjects</Text>
        {!d.all_time.subjects.length ? <Text variant="muted">No completed lessons yet.</Text> : d.all_time.subjects.map((s) => (
          <Text key={s.subject} variant="muted">{s.subject}: {s.lessons} lesson{s.lessons === 1 ? '' : 's'} · {hoursFmt(s.minutes / 60)}h</Text>
        ))}
      </Card>
      <Card style={{ gap: 10 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text variant="h3">Goals</Text>
          <Button size="sm" title="Add goal" onPress={() => setGoalOpen(true)} />
        </View>
        {!d.all_time.goals.length ? <Text variant="muted">No goals yet.</Text> : d.all_time.goals.map((g) => (
          <View key={g.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, textDecorationLine: g.status === 'achieved' ? 'line-through' : 'none' }}>{g.title}</Text>
              <Text variant="small">{g.status === 'achieved' ? 'Achieved' : `${g.progress}%`}{g.subject ? ` · ${g.subject}` : ''}</Text>
            </View>
            {g.status === 'active' && <Button size="sm" variant="secondary" title="Done" onPress={() => achieve(g)} />}
          </View>
        ))}
      </Card>
      <Card style={{ gap: 10 }}>
        <Text variant="h3">Tutor feedback</Text>
        {d.recommendations.map((r) => (
          <View key={r.subject} style={{ flexDirection: 'row', gap: 8, backgroundColor: colors.amberBg, borderRadius: 12, padding: 10 }}>
            <Lightbulb size={16} color={colors.amberInk} />
            <Text style={{ flex: 1, fontSize: 13 }}>{r.subject}: {r.text}</Text>
          </View>
        ))}
        {!d.all_time.feedback.length ? <Text variant="muted">Feedback appears after tutors add notes to completed lessons.</Text> : d.all_time.feedback.slice(0, 6).map((f, i) => (
          <View key={i} style={{ borderTopWidth: i ? 1 : 0, borderColor: colors.line, paddingTop: i ? 10 : 0 }}>
            <Text variant="small">{f.subject} · {f.tutor} · {dateLong(f.date)}</Text>
            <Text style={{ fontSize: 14 }}>{f.summary}</Text>
          </View>
        ))}
      </Card>
      <Card style={{ gap: 10 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text variant="h3">Monthly reports</Text>
          <Button size="sm" variant="secondary" icon={FileText} title="This month" loading={busy} onPress={thisMonth} />
        </View>
        {!reports.data?.length ? <Text variant="muted">No reports yet.</Text> : reports.data.map((r) => (
          <Button key={r.id} variant="ghost" title={`${r.data.month} · ${r.data.summary.lessons_completed} lessons`} onPress={() => setReport(r)} />
        ))}
      </Card>

      <Sheet visible={goalOpen} onClose={() => setGoalOpen(false)} title="New goal">
        <Field label="Goal" value={title} onChangeText={setTitle} placeholder="e.g. Score B2 in WAEC Maths" maxLength={120} />
        <Button title="Add goal" full loading={busy} disabled={title.trim().length < 3} onPress={addGoal} />
      </Sheet>
      <Sheet visible={!!report} onClose={() => setReport(null)} title={report ? `${report.data.student_name} · ${report.data.month}` : ''} subtitle={report && !report.data.complete ? 'In progress: the final report is made on the 1st.' : 'Monthly report'}>
        {report && (
          <View style={{ gap: 8 }}>
            <Text>Lessons attended: {report.data.summary.lessons_completed} · Hours: {hoursFmt(report.data.summary.minutes / 60)}</Text>
            <Text variant="label">Strengths</Text>
            {report.data.strengths.length ? report.data.strengths.map((s, i) => <Text key={i} variant="muted">• {s.text} ({s.subject})</Text>) : <Text variant="muted">No tutor notes.</Text>}
            <Text variant="label">Areas to work on</Text>
            {report.data.improvements.length ? report.data.improvements.map((s, i) => <Text key={i} variant="muted">• {s.text} ({s.subject})</Text>) : <Text variant="muted">No tutor notes.</Text>}
          </View>
        )}
      </Sheet>
    </View>
  )
}
