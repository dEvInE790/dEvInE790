import { useMemo, useState } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import Animated, { FadeIn, SlideInLeft, SlideInRight, SlideOutLeft, SlideOutRight, useAnimatedStyle, withTiming } from 'react-native-reanimated'
import { ArrowLeft, ArrowRight, CalendarClock, GraduationCap, HeartHandshake, Link2, Minus, Plus, Presentation, Rocket, Sparkles } from 'lucide-react-native'
import { LogoMark } from '../components/Logo'
import { Button, ChipGroup, Field, Floating, Tappable, Text } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { linkChild, replaceAvailability, updateProfile, updateTutor } from '../lib/api'
import { GOALS, LANGUAGES, LEVELS, SUBJECTS } from '../lib/constants'
import { browserTimezone } from '../lib/time'
import { firstName, money } from '../lib/format'
import { colors, fonts } from '../theme'

const PRESETS = {
  'Weekday mornings': [1, 2, 3, 4, 5].map((d) => ({ weekday: d, start_minute: 540, end_minute: 720 })),
  'Weekday afternoons': [1, 2, 3, 4, 5].map((d) => ({ weekday: d, start_minute: 780, end_minute: 1020 })),
  'Weekday evenings': [1, 2, 3, 4, 5].map((d) => ({ weekday: d, start_minute: 1020, end_minute: 1260 })),
  Weekends: [0, 6].map((d) => ({ weekday: d, start_minute: 600, end_minute: 1080 })),
}

export default function Onboarding() {
  const { profile, refreshProfile } = useAuth()
  const toast = useToast()
  const role = profile?.role ?? 'student'
  const [[step, dir], setStep] = useState([0, 1])
  const [busy, setBusy] = useState(false)
  const [d, setD] = useState({
    grade_level: '', subjects: [], goals: [], childEmail: '',
    headline: '', levels: [], languages: ['English'], hourly_rate: 5000, years_experience: '1', location: '', bio: '', presets: ['Weekday evenings'],
  })
  const set = (k) => (v) => setD((x) => ({ ...x, [k]: v }))

  const steps = useMemo(() => {
    const W = { key: 'welcome', valid: true }
    const done = { key: 'done', valid: true }
    if (role === 'tutor') return [W, { key: 'teach', valid: d.headline.trim().length >= 10 && d.subjects.length > 0 }, { key: 'levels', valid: d.levels.length > 0 && d.languages.length > 0 }, { key: 'rate', valid: d.hourly_rate >= 1000 }, { key: 'bio', valid: d.bio.trim().length >= 40 }, { key: 'availability', valid: d.presets.length > 0 }, done]
    if (role === 'parent') return [W, { key: 'subjects', valid: d.subjects.length > 0 }, { key: 'goals', valid: d.goals.length > 0 }, { key: 'child', valid: true }, done]
    return [W, { key: 'grade', valid: !!d.grade_level }, { key: 'subjects', valid: d.subjects.length > 0 }, { key: 'goals', valid: d.goals.length > 0 }, done]
  }, [role, d])

  if (!profile) return null
  const cur = steps[step]
  const isLastInput = step === steps.length - 2
  const go = (delta) => setStep(([s]) => [Math.min(steps.length - 1, Math.max(0, s + delta)), delta])

  const finish = async () => {
    setBusy(true)
    try {
      if (role === 'tutor') {
        await updateTutor(profile.id, {
          headline: d.headline.trim(), subjects: d.subjects, levels: d.levels, languages: d.languages,
          hourly_rate: Number(d.hourly_rate), years_experience: Number(d.years_experience) || 0, location: d.location.trim(),
          bio: d.bio.trim(), timezone: browserTimezone(),
        })
        await replaceAvailability(profile.id, d.presets.flatMap((p) => PRESETS[p]))
      }
      if (role === 'parent' && d.childEmail.trim()) {
        try {
          await linkChild(d.childEmail.trim())
        } catch (e) {
          toast.info(`${e.message} You can link them later from your account.`)
        }
      }
      await updateProfile(profile.id, {
        grade_level: role === 'student' ? d.grade_level : null,
        subjects: role === 'tutor' ? [] : d.subjects,
        goals: role === 'tutor' ? [] : d.goals,
        onboarded: true,
      })
      go(1)
    } catch (e) {
      toast.error(e.message)
    } finally {
      setBusy(false)
    }
  }

  const progress = step / (steps.length - 1)
  const RoleIcon = role === 'tutor' ? Presentation : role === 'parent' ? HeartHandshake : GraduationCap
  const entering = (dir > 0 ? SlideInRight : SlideInLeft).duration(380)
  const exiting = (dir > 0 ? SlideOutLeft : SlideOutRight).duration(240)

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream100 }}>
      <View style={styles.top}>
        <LogoMark size={30} />
        <ProgressBar value={Math.max(0.04, progress)} />
        <Text variant="small">{step + 1}/{steps.length}</Text>
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 22, paddingBottom: 40, flexGrow: 1, justifyContent: 'center' }} keyboardShouldPersistTaps="handled">
          <Animated.View key={cur.key} entering={entering} exiting={exiting}>
            {cur.key === 'welcome' && (
              <View style={{ alignItems: 'center' }}>
                <Floating distance={8}>
                  <View style={styles.bigIcon}><RoleIcon size={44} color={colors.mint300} strokeWidth={1.6} /></View>
                </Floating>
                <Text variant="h1" style={{ marginTop: 28, textAlign: 'center' }}>Welcome, {firstName(profile.full_name)}!</Text>
                <Text variant="muted" style={{ marginTop: 10, textAlign: 'center', fontSize: 16, lineHeight: 24 }}>
                  {role === 'tutor' ? 'Let’s build a listing that helps the right students find you. It takes about two minutes.'
                    : role === 'parent' ? 'A few quick questions so we can recommend tutors that fit your family.'
                      : 'A few quick questions so we can match you with tutors you’ll love.'}
                </Text>
              </View>
            )}
            {cur.key === 'grade' && <Q icon={GraduationCap} title="What level are you studying at?"><ChipGroup multiple={false} options={LEVELS} value={d.grade_level} onChange={set('grade_level')} /></Q>}
            {cur.key === 'subjects' && <Q icon={Sparkles} title={role === 'parent' ? 'Which subjects does your child need help with?' : 'What would you like to learn?'} hint="Pick as many as you like."><ChipGroup options={SUBJECTS} value={d.subjects} onChange={set('subjects')} /></Q>}
            {cur.key === 'goals' && <Q icon={Rocket} title="What are you hoping to achieve?"><ChipGroup options={GOALS} value={d.goals} onChange={set('goals')} /></Q>}
            {cur.key === 'child' && (
              <Q icon={Link2} title="Link your child’s account" hint="Optional. Your child signs up as a student; enter the email they used. You can do this later too.">
                <Field value={d.childEmail} onChangeText={set('childEmail')} placeholder="child@example.com" autoCapitalize="none" keyboardType="email-address" />
              </Q>
            )}
            {cur.key === 'teach' && (
              <Q icon={Presentation} title="What do you teach?">
                <Field label="Your headline" value={d.headline} onChangeText={set('headline')} placeholder="e.g. First-class maths graduate for WAEC & JAMB" maxLength={90} hint="One line that makes students want to learn with you." />
                <Text variant="label" style={{ marginTop: 18, marginBottom: 10 }}>Subjects</Text>
                <ChipGroup size="sm" options={SUBJECTS} value={d.subjects} onChange={set('subjects')} />
              </Q>
            )}
            {cur.key === 'levels' && (
              <Q icon={GraduationCap} title="Who do you teach?">
                <Text variant="label" style={{ marginBottom: 10 }}>Levels</Text>
                <ChipGroup size="sm" options={LEVELS} value={d.levels} onChange={set('levels')} />
                <Text variant="label" style={{ marginTop: 18, marginBottom: 10 }}>Languages you teach in</Text>
                <ChipGroup size="sm" options={LANGUAGES} value={d.languages} onChange={set('languages')} />
              </Q>
            )}
            {cur.key === 'rate' && (
              <Q icon={Sparkles} title="Set your hourly rate">
                <View style={styles.rateBox}>
                  <Tappable onPress={() => set('hourly_rate')(Math.max(1000, d.hourly_rate - 500))} style={styles.stepper} accessibilityRole="button" accessibilityLabel="Decrease rate"><Minus size={20} color={colors.navy800} /></Tappable>
                  <Text style={{ fontFamily: fonts.displayHeavy, fontSize: 36, color: colors.navy950 }}>{money(d.hourly_rate)}</Text>
                  <Tappable onPress={() => set('hourly_rate')(Math.min(1000000, d.hourly_rate + 500))} style={styles.stepper} accessibilityRole="button" accessibilityLabel="Increase rate"><Plus size={20} color={colors.navy800} /></Tappable>
                </View>
                <Text variant="small" style={{ textAlign: 'center', marginTop: 8 }}>per hour · adjust in steps of ₦500</Text>
                <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
                  <Field label="Years of experience" value={d.years_experience} onChangeText={set('years_experience')} keyboardType="number-pad" style={{ flex: 1 }} />
                  <Field label="City" value={d.location} onChangeText={set('location')} placeholder="Lagos" style={{ flex: 1 }} />
                </View>
              </Q>
            )}
            {cur.key === 'bio' && (
              <Q icon={Presentation} title="Introduce yourself" hint="Your background, teaching style and what students can expect. At least 40 characters.">
                <Field multiline value={d.bio} onChangeText={set('bio')} maxLength={1500} placeholder="I’ve taught SSS maths for six years…" />
                <Text variant="small" style={{ textAlign: 'right', marginTop: 6 }}>{d.bio.trim().length}/40+</Text>
              </Q>
            )}
            {cur.key === 'availability' && (
              <Q icon={CalendarClock} title="When can you teach?" hint="Fine-tune these any time from your Listing tab.">
                <ChipGroup options={Object.keys(PRESETS)} value={d.presets} onChange={set('presets')} />
              </Q>
            )}
            {cur.key === 'done' && (
              <Animated.View entering={FadeIn.duration(400)} style={{ alignItems: 'center' }}>
                <SuccessCheck />
                <Text variant="h1" style={{ marginTop: 22 }}>You’re all set!</Text>
                <Text variant="muted" style={{ marginTop: 10, textAlign: 'center', fontSize: 16, lineHeight: 24 }}>
                  {role === 'tutor' ? 'Your listing has been submitted for review. Once it’s approved and you’ve started a tutor subscription, students can find and book you.' : 'Your home screen is ready, with tutor recommendations based on your answers.'}
                </Text>
                <Button title="Let’s go" size="lg" iconRight={ArrowRight} style={{ marginTop: 28 }} onPress={async () => { await refreshProfile(); router.replace('/(tabs)') }} />
              </Animated.View>
            )}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
      {cur.key !== 'done' && (
        <View style={styles.bottom}>
          {step > 0 ? <Button title="Back" variant="ghost" icon={ArrowLeft} onPress={() => go(-1)} /> : <View />}
          {isLastInput
            ? <Button title="Finish" size="lg" iconRight={ArrowRight} loading={busy} disabled={!cur.valid} onPress={finish} />
            : <Button title={step === 0 ? 'Let’s go' : 'Continue'} size="lg" iconRight={ArrowRight} disabled={!cur.valid} onPress={() => go(1)} />}
        </View>
      )}
    </SafeAreaView>
  )
}

function Q({ icon: Icon, title, hint, children }) {
  return (
    <View>
      <View style={styles.qIcon}><Icon size={24} color={colors.mint700} /></View>
      <Text variant="h1" style={{ marginTop: 16 }}>{title}</Text>
      {hint && <Text variant="muted" style={{ marginTop: 8 }}>{hint}</Text>}
      <View style={{ marginTop: 22 }}>{children}</View>
    </View>
  )
}

function ProgressBar({ value }) {
  const anim = useAnimatedStyle(() => ({ transform: [{ scaleX: withTiming(value, { duration: 500 }) }] }))
  return (
    <View style={styles.track} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(value * 100) }}>
      <Animated.View style={[styles.fill, anim]} />
    </View>
  )
}

export function SuccessCheck({ size = 96 }) {
  return (
    <Animated.View entering={FadeIn.springify()} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.mint400, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: size * 0.48, color: colors.navy950, fontFamily: fonts.displayHeavy }}>✓</Text>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 22, paddingTop: 8 },
  track: { flex: 1, height: 6, borderRadius: 3, backgroundColor: 'rgba(15,28,54,0.08)', overflow: 'hidden' },
  fill: { height: '100%', width: '100%', borderRadius: 3, backgroundColor: colors.mint500, transformOrigin: 'left' },
  bigIcon: { width: 96, height: 96, borderRadius: 32, backgroundColor: colors.navy900, alignItems: 'center', justifyContent: 'center' },
  qIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: colors.mint100, alignItems: 'center', justifyContent: 'center' },
  rateBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.white, borderRadius: 24, padding: 14, borderWidth: 1, borderColor: colors.line },
  stepper: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.cream200, alignItems: 'center', justifyContent: 'center' },
  bottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 22, paddingVertical: 12, borderTopWidth: 1, borderColor: colors.line, backgroundColor: colors.cream50 },
})
