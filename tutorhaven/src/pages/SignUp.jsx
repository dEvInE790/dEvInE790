import { useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { GraduationCap, HeartHandshake, Lock, Mail, MailCheck, Presentation, User } from 'lucide-react'
import AuthShell from './AuthShell'
import { Input } from '../components/ui/Field'
import Button from '../components/ui/Button'
import { ErrorState } from '../components/ui/EmptyState'
import { useAuth } from '../context/AuthContext'
import { spring } from '../motion/variants'

const ROLES = [
  { value: 'student', label: 'Student', body: 'I want to learn', icon: GraduationCap },
  { value: 'parent', label: 'Parent', body: 'I’m booking for my child', icon: HeartHandshake },
  { value: 'tutor', label: 'Tutor', body: 'I want to teach', icon: Presentation },
]

export default function SignUp() {
  const { signUp, user, profile, configured } = useAuth()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [role, setRole] = useState(ROLES.some((r) => r.value === params.get('role')) ? params.get('role') : 'student')
  const [form, setForm] = useState({ fullName: '', email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [sentTo, setSentTo] = useState('')

  if (user && profile) return <Navigate to={profile.onboarded ? '/dashboard' : '/onboarding'} replace />

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const onSubmit = async (e) => {
    e.preventDefault()
    const errs = {}
    if (form.fullName.trim().length < 2) errs.fullName = 'Please enter your full name.'
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) errs.email = 'Please enter a valid email address.'
    if (form.password.length < 8) errs.password = 'Use at least 8 characters.'
    setErrors(errs)
    if (Object.keys(errs).length) return
    setBusy(true)
    try {
      const data = await signUp({ email: form.email.trim(), password: form.password, fullName: form.fullName.trim(), role })
      if (data.session) navigate('/onboarding', { replace: true })
      else setSentTo(form.email.trim())
    } catch (err) {
      setErrors({ form: /already registered/i.test(err.message) ? 'An account with this email already exists. Try signing in.' : err.message })
    } finally {
      setBusy(false)
    }
  }

  if (sentTo) {
    return (
      <AuthShell title="Check your inbox" footer={<Link to="/signin" className="font-semibold text-mint-700 hover:underline">Back to sign in</Link>}>
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="card p-8 text-center">
          <motion.div initial={{ rotate: -12, scale: 0.6 }} animate={{ rotate: 0, scale: 1 }} transition={spring} className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-mint-100 text-mint-700">
            <MailCheck className="h-8 w-8" />
          </motion.div>
          <p className="mt-5 text-navy-600">We sent a confirmation link to <strong className="text-navy-900">{sentTo}</strong>. Open it to activate your account and finish setting up.</p>
        </motion.div>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="Join TutorHaven in under a minute."
      footer={<>Already have an account? <Link to="/signin" className="font-semibold text-mint-700 hover:underline">Sign in</Link></>}
    >
      {!configured && <div className="mb-6"><ErrorState message="Supabase isn’t configured yet. Add your keys to tutorhaven/.env to enable sign up." /></div>}
      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        <fieldset>
          <legend className="mb-2.5 text-sm font-medium text-navy-800">I am a…</legend>
          <div className="grid grid-cols-3 gap-2.5">
            {ROLES.map((r) => {
              const on = role === r.value
              return (
                <motion.label key={r.value} whileTap={{ scale: 0.97 }} className={`relative flex cursor-pointer flex-col items-center gap-1.5 rounded-2xl border px-2 py-4 text-center transition-colors ${on ? 'border-transparent' : 'border-navy-900/10 bg-white hover:border-navy-900/25'}`}>
                  <input type="radio" name="role" value={r.value} checked={on} onChange={() => setRole(r.value)} className="sr-only" />
                  <AnimatePresence>{on && <motion.span layoutId="role-pill" className="absolute inset-0 rounded-2xl bg-navy-900 shadow-lift" transition={spring} />}</AnimatePresence>
                  <r.icon className={`relative h-6 w-6 ${on ? 'text-mint-300' : 'text-navy-500'}`} aria-hidden />
                  <span className={`relative text-sm font-semibold ${on ? 'text-white' : 'text-navy-900'}`}>{r.label}</span>
                  <span className={`relative hidden text-[0.7rem] leading-tight sm:block ${on ? 'text-navy-200' : 'text-navy-400'}`}>{r.body}</span>
                </motion.label>
              )
            })}
          </div>
        </fieldset>
        <Input label="Full name" icon={User} autoComplete="name" value={form.fullName} onChange={set('fullName')} error={errors.fullName} placeholder="Alex Morgan" />
        <Input label="Email" type="email" icon={Mail} autoComplete="email" value={form.email} onChange={set('email')} error={errors.email} placeholder="you@example.com" />
        <Input label="Password" type="password" icon={Lock} autoComplete="new-password" value={form.password} onChange={set('password')} error={errors.password} hint="At least 8 characters" placeholder="••••••••" />
        {errors.form && <p role="alert" className="rounded-xl bg-coral-50 px-4 py-3 text-sm text-coral-600">{errors.form}</p>}
        <Button type="submit" size="lg" className="w-full" loading={busy} disabled={!configured}>
          Create {role} account
        </Button>
        <p className="text-center text-xs text-navy-400">By continuing you agree to TutorHaven’s terms and privacy policy.</p>
      </form>
    </AuthShell>
  )
}
