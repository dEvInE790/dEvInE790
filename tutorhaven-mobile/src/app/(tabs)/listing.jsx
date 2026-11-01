import { useMemo, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { router } from 'expo-router'
import { Eye, Minus, Plus } from 'lucide-react-native'
import Screen from '../../components/Screen'
import { Badge, Button, Card, ChipGroup, Field, Skeleton, Tappable, Text } from '../../components/ui'
import useAsync from '../../lib/useAsync'
import { getOwnTutor, replaceAvailability, updateTutor } from '../../lib/api'
import { LANGUAGES, LEVELS, SUBJECTS } from '../../lib/constants'
import { money } from '../../lib/format'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { colors, fonts, radius } from '../../theme'

const DAYS = [[1, 'Mon'], [2, 'Tue'], [3, 'Wed'], [4, 'Thu'], [5, 'Fri'], [6, 'Sat'], [0, 'Sun']]
const BLOCKS = [['morning', 'Morning', 540, 720, '9–12'], ['afternoon', 'Afternoon', 780, 1020, '1–5'], ['evening', 'Evening', 1020, 1260, '5–9']]
const key = (d, b) => `${d}:${b}`

export default function Listing() {
  const { profile } = useAuth()
  const toast = useToast()
  const own = useAsync(() => getOwnTutor(profile.id), [profile.id])
  // Saved values from the server; local edits are layered on top.
  const loaded = useMemo(() => {
    if (!own.data?.tutor) return null
    const t = own.data.tutor
    const on = new Set()
    let other = false
    for (const a of own.data.availability) {
      const b = BLOCKS.find(([, , s, e]) => s === a.start_minute && e === a.end_minute)
      if (b) on.add(key(a.weekday, b[0]))
      else other = true
    }
    return {
      form: { headline: t.headline, bio: t.bio, subjects: t.subjects, levels: t.levels, languages: t.languages, hourly_rate: Number(t.hourly_rate), years_experience: String(t.years_experience), location: t.location },
      slots: on,
      custom: other,
    }
  }, [own.data])
  const [edits, setEdits] = useState(null)
  const [slotEdits, setSlots] = useState(null)
  const [savedOver, setSavedOver] = useState(false)
  const [saving, setSaving] = useState(false)

  if (own.error) return <Screen title="My listing"><Text style={{ color: colors.coralInk }}>{own.error}</Text></Screen>
  if (!loaded) return <Screen title="My listing"><Skeleton style={{ height: 400, borderRadius: 24 }} /></Screen>

  const form = edits ?? loaded.form
  const slots = slotEdits ?? loaded.slots
  const custom = loaded.custom && !savedOver
  const set = (k) => (v) => setEdits((f) => ({ ...(f ?? loaded.form), [k]: v }))
  const toggle = (d, b) => setSlots((cur) => {
    const n = new Set(cur ?? loaded.slots)
    if (n.has(key(d, b))) n.delete(key(d, b))
    else n.add(key(d, b))
    return n
  })
  const status = own.data.tutor.status

  const save = async () => {
    if (form.headline.trim().length < 10) return toast.error('Your headline should be at least 10 characters.')
    if (!form.subjects.length) return toast.error('Choose at least one subject.')
    setSaving(true)
    try {
      await updateTutor(profile.id, {
        headline: form.headline.trim(), bio: form.bio.trim(), subjects: form.subjects, levels: form.levels, languages: form.languages,
        hourly_rate: form.hourly_rate, years_experience: Number(form.years_experience) || 0, location: form.location.trim(),
      })
      const rows = [...slots].map((k) => {
        const [d, b] = k.split(':')
        const [, , s, e] = BLOCKS.find(([id]) => id === b)
        return { weekday: Number(d), start_minute: s, end_minute: e }
      })
      await replaceAvailability(profile.id, rows)
      setSavedOver(true)
      toast.success('Listing saved')
    } catch (e) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Screen title="My listing" subtitle="What learners see when they find you."
      right={<Badge tone={status === 'approved' ? 'mint' : status === 'pending' ? 'amber' : 'coral'}>{status === 'approved' ? 'Live' : status === 'pending' ? 'In review' : 'Hidden'}</Badge>}
      footer={<View style={styles.footer}><Button title="Save listing" size="lg" loading={saving} onPress={save} full /></View>}>
      {status === 'approved' && <Button title="Preview public profile" variant="secondary" icon={Eye} size="sm" style={{ alignSelf: 'flex-start' }} onPress={() => router.push(`/tutor/${profile.id}`)} />}
      <Card animated={false} style={{ gap: 14 }}>
        <Field label="Headline" value={form.headline} onChangeText={set('headline')} maxLength={90} />
        <Field label="About you" multiline value={form.bio} onChangeText={set('bio')} maxLength={1500} />
        <Text variant="label">Hourly rate</Text>
        <View style={styles.rate}>
          <Tappable onPress={() => set('hourly_rate')(Math.max(1000, form.hourly_rate - 500))} style={styles.stepper} accessibilityRole="button" accessibilityLabel="Decrease rate"><Minus size={18} color={colors.navy800} /></Tappable>
          <Text style={{ fontFamily: fonts.display, fontSize: 24, color: colors.navy950 }}>{money(form.hourly_rate)}<Text variant="small"> /hr</Text></Text>
          <Tappable onPress={() => set('hourly_rate')(form.hourly_rate + 500)} style={styles.stepper} accessibilityRole="button" accessibilityLabel="Increase rate"><Plus size={18} color={colors.navy800} /></Tappable>
        </View>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Field label="Years of experience" value={form.years_experience} onChangeText={set('years_experience')} keyboardType="number-pad" style={{ flex: 1 }} />
          <Field label="City" value={form.location} onChangeText={set('location')} style={{ flex: 1 }} />
        </View>
      </Card>
      <Card animated={false} style={{ gap: 12 }}>
        <Text variant="h3">What you teach</Text>
        <Text variant="label">Subjects</Text>
        <ChipGroup size="sm" options={[...new Set([...SUBJECTS, ...form.subjects])]} value={form.subjects} onChange={set('subjects')} />
        <Text variant="label">Levels</Text>
        <ChipGroup size="sm" options={LEVELS} value={form.levels} onChange={set('levels')} />
        <Text variant="label">Languages</Text>
        <ChipGroup size="sm" options={[...new Set([...LANGUAGES, ...form.languages])]} value={form.languages} onChange={set('languages')} />
      </Card>
      <Card animated={false} style={{ gap: 10 }}>
        <Text variant="h3">Weekly availability</Text>
        <Text variant="small">Tap the times you can teach. Learners see them in their own time zone.</Text>
        {custom && <Text variant="small" style={{ color: colors.amberInk, backgroundColor: colors.amberBg, padding: 10, borderRadius: 12 }}>You have custom hours set on the website. Saving here replaces them with the blocks below.</Text>}
        <View style={{ flexDirection: 'row', marginTop: 4 }}>
          <View style={{ width: 46 }} />
          {BLOCKS.map(([id, label, , , hint]) => (
            <View key={id} style={{ flex: 1, alignItems: 'center' }}><Text variant="small" style={{ color: colors.navy800 }}>{label}</Text><Text variant="small" style={{ fontSize: 10 }}>{hint}</Text></View>
          ))}
        </View>
        {DAYS.map(([d, label]) => (
          <View key={d} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text variant="label" style={{ width: 40 }}>{label}</Text>
            {BLOCKS.map(([id]) => {
              const on = slots.has(key(d, id))
              return (
                <Tappable key={id} onPress={() => toggle(d, id)} accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={`${label} ${id}`} style={[styles.cell, on && styles.cellOn]}>
                  <Text style={{ fontFamily: fonts.semibold, fontSize: 12, color: on ? colors.navy950 : colors.navy300 }}>{on ? 'Open' : '—'}</Text>
                </Tappable>
              )
            })}
          </View>
        ))}
      </Card>
      <View style={{ height: 70 }} />
    </Screen>
  )
}

const styles = StyleSheet.create({
  rate: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.cream100, borderRadius: radius.lg, padding: 10 },
  stepper: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  cell: { flex: 1, height: 40, borderRadius: 12, backgroundColor: colors.cream100, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(15,28,54,0.06)' },
  cellOn: { backgroundColor: colors.mint300, borderColor: colors.mint400 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, backgroundColor: 'rgba(253,252,249,0.96)', borderTopWidth: 1, borderColor: colors.line },
})
