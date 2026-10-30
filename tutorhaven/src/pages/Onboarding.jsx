import { useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeft, ArrowRight, CalendarClock, GraduationCap, HeartHandshake, Link2, Presentation, Rocket, Sparkles } from 'lucide-react'
import { LogoMark } from '../motion/AnimatedLogo'
import Float from '../motion/Float'
import Button from '../components/ui/Button'
import { ChipGroup, Input, Textarea } from '../components/ui/Field'
import { SuccessMark } from './Checkout'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { linkChild, replaceAvailability, updateProfile, updateTutor } from '../lib/api'
import { GOALS, LANGUAGES, LEVELS, SUBJECTS } from '../lib/constants'
import { browserTimezone } from '../lib/time'
import { firstName } from '../lib/format'
import { ease } from '../motion/variants'

const PRESETS = {
  'Weekday mornings': [1, 2, 3, 4, 5].map((d) => ({ weekday: d, start_minute: 540, end_minute: 720 })),
  'Weekday afternoons': [1, 2, 3, 4, 5].map((d) => ({ weekday: d, start_minute: 780, end_minute: 1020 })),
  'Weekday evenings': [1, 2, 3, 4, 5].map((d) => ({ weekday: d, start_minute: 1020, end_minute: 1260 })),
  Weekends: [0, 6].map((d) => ({ weekday: d, start_minute: 600, end_minute: 1080 })),
}

const slide = {
  enter: (dir) => ({ opacity: 0, x: dir > 0 ? 60 : -60 }),
  center: { opacity: 1, x: 0, transition: { duration: 0.45, ease } },
  exit: (dir) => ({ opacity: 0, x: dir > 0 ? -60 : 60, transition: { duration: 0.25, ease } }),
}

export default function Onboarding() {
  const { profile, refreshProfile } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const role = profile.role
  const [[step, dir], setStep] = useState([0, 1])
  const [busy, setBusy] = useState(false)
  const [data, setData] = useState({
    grade_level: '', subjects: [], goals: [], childEmail: '',
    headline: '', levels: [], languages: ['English'], hourly_rate: 35, years_experience: 1, location: '', bio: '', presets: ['Weekday evenings'],
  })
  const set = (k) => (v) => setData((d) => ({ ...d, [k]: v?.target ? v.target.value : v }))

  const steps = useMemo(() => {
    const welcome = { key: 'welcome', valid: true }
    const done = { key: 'done', valid: true }
    if (role === 'tutor')
      return [welcome, { key: 'teach', valid: data.headline.trim().length >= 10 && data.subjects.length > 0 }, { key: 'levels', valid: data.levels.length > 0 && data.languages.length > 0 }, { key: 'rate', valid: data.hourly_rate >= 5 && data.hourly_rate <= 500 }, { key: 'bio', valid: data.bio.trim().length >= 40 }, { key: 'availability', valid: data.presets.length > 0 }, done]
    if (role === 'parent') return [welcome, { key: 'subjects', valid: data.subjects.length > 0 }, { key: 'goals', valid: data.goals.length > 0 }, { key: 'child', valid: true }, done]
    return [welcome, { key: 'grade', valid: !!data.grade_level }, { key: 'subjects', valid: data.subjects.length > 0 }, { key: 'goals', valid: data.goals.length > 0 }, done]
  }, [role, data])

  const current = steps[step]
  const isLastInput = step === steps.length - 2
  const go = (delta) => setStep(([s]) => [Math.min(steps.length - 1, Math.max(0, s + delta)), delta])

  const finish = async () => {
    setBusy(true)
    try {
      if (role === 'tutor') {
        await updateTutor(profile.id, {
          headline: data.headline.trim(), subjects: data.subjects, levels: data.levels, languages: data.languages,
          hourly_rate: Number(data.hourly_rate), years_experience: Number(data.years_experience), location: data.location.trim(),
          bio: data.bio.trim(), timezone: browserTimezone(),
        })
        await replaceAvailability(profile.id, data.presets.flatMap((p) => PRESETS[p]))
      }
      if (role === 'parent' && data.childEmail.trim()) {
        try {
          await linkChild(data.childEmail.trim())
        } catch (e) {
          toast.info(`${e.message} You can link them later from your dashboard.`)
        }
      }
      await updateProfile(profile.id, {
        grade_level: role === 'student' ? data.grade_level : null,
        subjects: role === 'tutor' ? [] : data.subjects,
        goals: role === 'tutor' ? [] : data.goals,
        onboarded: true,
      })
      go(1)
    } catch (e) {
      toast.error(e.message)
    } finally {
      setBusy(false)
    }
  }

  const enterDashboard = async () => {
    await refreshProfile()
    navigate('/dashboard', { replace: true })
  }

  if (profile.onboarded && step === 0) return <Navigate to="/dashboard" replace />

  const progress = step / (steps.length - 1)
  const RoleIcon = role === 'tutor' ? Presentation : role === 'parent' ? HeartHandshake : GraduationCap

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-cream-100">
      <div className="pointer-events-none absolute -top-40 -right-32 h-[30rem] w-[30rem] rounded-full bg-mint-200/50 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -bottom-40 -left-32 h-[28rem] w-[28rem] rounded-full bg-navy-200/40 blur-3xl" aria-hidden />

      <header className="relative flex items-center justify-between px-5 py-5 sm:px-10">
        <LogoMark size={34} />
        <div className="h-1.5 w-40 overflow-hidden rounded-full bg-navy-900/8 sm:w-64" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)} aria-label="Setup progress">
          <motion.div className="h-full origin-left rounded-full bg-gradient-to-r from-mint-500 to-mint-400" animate={{ scaleX: Math.max(0.04, progress) }} transition={{ duration: 0.6, ease }} />
        </div>
        <span className="w-[34px] text-right text-xs font-semibold text-navy-400 tabular-nums">{step + 1}/{steps.length}</span>
      </header>

      <main className="relative mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-5 pb-10">
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div key={current.key} custom={dir} variants={slide} initial="enter" animate="center" exit="exit">
            {current.key === 'welcome' && (
              <div className="text-center">
                <Float distance={10} duration={5}>
                  <div className="mx-auto grid h-24 w-24 place-items-center rounded-[2rem] bg-navy-900 shadow-lift">
                    <RoleIcon className="h-11 w-11 text-mint-300" strokeWidth={1.6} />
                  </div>
                </Float>
                <h1 className="mt-8 text-3xl font-bold sm:text-4xl">Welcome, {firstName(profile.full_name)}!</h1>
                <p className="mx-auto mt-3 max-w-md text-navy-600">
                  {role === 'tutor'
                    ? 'Let’s build a listing that helps the right students find you. It takes about two minutes.'
                    : role === 'parent'
                      ? 'A few quick questions so we can recommend tutors that fit your family.'
                      : 'A few quick questions so we can match you with tutors you’ll love.'}
                </p>
              </div>
            )}

            {current.key === 'grade' && (
              <Question title="What level are you studying at?" icon={GraduationCap}>
                <ChipGroup multiple={false} options={LEVELS} value={data.grade_level} onChange={set('grade_level')} label="Level" />
              </Question>
            )}
            {current.key === 'subjects' && (
              <Question title={role === 'parent' ? 'Which subjects does your child need help with?' : 'What would you like to learn?'} hint="Pick as many as you like." icon={Sparkles}>
                <ChipGroup options={SUBJECTS} value={data.subjects} onChange={set('subjects')} label="Subjects" />
              </Question>
            )}
            {current.key === 'goals' && (
              <Question title="What are you hoping to achieve?" icon={Rocket}>
                <ChipGroup options={GOALS} value={data.goals} onChange={set('goals')} label="Goals" />
              </Question>
            )}
            {current.key === 'child' && (
              <Question title="Link your child’s account" hint="Optional. Your child signs up as a student; enter the email they used. You can do this later too." icon={Link2}>
                <Input type="email" placeholder="child@example.com" value={data.childEmail} onChange={set('childEmail')} aria-label="Child’s email" />
              </Question>
            )}

            {current.key === 'teach' && (
              <Question title="What do you teach?" icon={Presentation}>
                <Input label="Your headline" placeholder="e.g. Cambridge maths graduate making calculus click" value={data.headline} onChange={set('headline')} maxLength={90} hint="One line that makes students want to learn with you." />
                <p className="mt-6 mb-2.5 text-sm font-medium text-navy-800">Subjects</p>
                <ChipGroup size="sm" options={SUBJECTS} value={data.subjects} onChange={set('subjects')} label="Subjects" />
              </Question>
            )}
            {current.key === 'levels' && (
              <Question title="Who do you teach?" icon={GraduationCap}>
                <p className="mb-2.5 text-sm font-medium text-navy-800">Levels</p>
                <ChipGroup size="sm" options={LEVELS} value={data.levels} onChange={set('levels')} label="Levels" />
                <p className="mt-6 mb-2.5 text-sm font-medium text-navy-800">Languages you teach in</p>
                <ChipGroup size="sm" options={LANGUAGES} value={data.languages} onChange={set('languages')} label="Languages" />
              </Question>
            )}
            {current.key === 'rate' && (
              <Question title="Set your rate" icon={Sparkles}>
                <div className="card p-6 text-center">
                  <p className="font-display text-5xl font-bold tabular-nums">${data.hourly_rate}<span className="text-lg font-medium text-navy-400">/hr</span></p>
                  <input type="range" min={10} max={150} step={1} value={data.hourly_rate} onChange={(e) => set('hourly_rate')(Number(e.target.value))} className="mt-5 w-full accent-mint-600" aria-label="Hourly rate" />
                </div>
                <div className="mt-5 grid grid-cols-2 gap-4">
                  <Input label="Years of experience" type="number" min={0} max={60} value={data.years_experience} onChange={set('years_experience')} />
                  <Input label="Location" placeholder="City, Country" value={data.location} onChange={set('location')} />
                </div>
              </Question>
            )}
            {current.key === 'bio' && (
              <Question title="Introduce yourself" hint="Share your background, teaching style and what students can expect. At least 40 characters." icon={Presentation}>
                <Textarea rows={6} value={data.bio} onChange={set('bio')} maxLength={1500} placeholder="I’ve taught GCSE and A-Level maths for six years…" aria-label="Bio" />
                <p className="mt-1 text-right text-xs text-navy-400 tabular-nums">{data.bio.trim().length}/40+</p>
              </Question>
            )}
            {current.key === 'availability' && (
              <Question title="When can you teach?" hint={`Times are in your timezone (${browserTimezone().replace(/_/g, ' ')}). Fine-tune them any time from My listing.`} icon={CalendarClock}>
                <ChipGroup options={Object.keys(PRESETS)} value={data.presets} onChange={set('presets')} label="Availability" />
              </Question>
            )}

            {current.key === 'done' && (
              <div className="text-center">
                <SuccessMark />
                <h1 className="mt-6 text-3xl font-bold">You’re all set!</h1>
                <p className="mx-auto mt-3 max-w-md text-navy-600">
                  {role === 'tutor'
                    ? 'Your listing has been submitted for review. We’ll make it visible to students as soon as it’s approved.'
                    : 'Your dashboard is ready, with tutor recommendations based on your answers.'}
                </p>
                <Button size="lg" className="mt-8" onClick={enterDashboard} iconRight={ArrowRight}>Go to my dashboard</Button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {current.key !== 'done' && (
          <div className="mt-10 flex items-center justify-between">
            <Button variant="ghost" icon={ArrowLeft} onClick={() => go(-1)} className={step === 0 ? 'invisible' : ''}>Back</Button>
            {isLastInput ? (
              <Button size="lg" onClick={finish} loading={busy} disabled={!current.valid} iconRight={ArrowRight}>Finish</Button>
            ) : (
              <Button size="lg" onClick={() => go(1)} disabled={!current.valid} iconRight={ArrowRight}>{step === 0 ? 'Let’s go' : 'Continue'}</Button>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

function Question({ title, hint, icon: Icon, children }) {
  return (
    <div>
      {Icon && <span className="grid h-12 w-12 place-items-center rounded-2xl bg-mint-100 text-mint-700"><Icon className="h-6 w-6" /></span>}
      <h1 className="mt-5 text-2xl font-bold sm:text-3xl">{title}</h1>
      {hint && <p className="mt-2 text-navy-500">{hint}</p>}
      <div className="mt-7">{children}</div>
    </div>
  )
}
