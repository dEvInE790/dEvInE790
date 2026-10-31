import { lazy, Suspense, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Lock, Mail } from 'lucide-react'
import AuthShell from './AuthShell'
import { Input } from '../components/ui/Field'
import Button from '../components/ui/Button'
import { ErrorState } from '../components/ui/EmptyState'
import { useAuth } from '../context/AuthContext'
import { isDemo, supabase } from '../lib/supabase'
import { useToast } from '../context/ToastContext'

const DemoAccounts = import.meta.env.VITE_DEMO === 'true' ? lazy(() => import('../demo/DemoAccounts')) : null

export default function SignIn() {
  const { signIn, user, profile, configured } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const from = location.state?.from || '/dashboard'

  if (user && profile) return <Navigate to={profile.onboarded ? from : '/onboarding'} replace />

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const p = await signIn(email.trim(), password)
      navigate(p && !p.onboarded ? '/onboarding' : from, { replace: true })
    } catch (err) {
      setError(/invalid login/i.test(err.message) ? 'That email and password don’t match. Please try again.' : err.message)
    } finally {
      setBusy(false)
    }
  }

  const onReset = async () => {
    if (!email.trim()) return setError('Enter your email above and we’ll send a reset link.')
    if (isDemo) return toast.info('Password reset emails aren’t sent in demo mode. Demo accounts use the password demo1234.')
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/dashboard/settings` })
    if (err) setError(err.message)
    else toast.success('Check your inbox for a password reset link.')
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to continue your learning journey."
      footer={<>New to TutorHaven? <Link to="/signup" className="font-semibold text-mint-700 hover:underline">Create an account</Link></>}
    >
      {DemoAccounts && (
        <Suspense fallback={null}>
          <DemoAccounts
            onSignIn={async (em, pw) => {
              try {
                const p = await signIn(em, pw)
                navigate(p && !p.onboarded ? '/onboarding' : from, { replace: true })
              } catch (err) {
                setError(err.message)
              }
            }}
          />
        </Suspense>
      )}
      {!configured && <div className="mb-6"><ErrorState message="Supabase isn’t configured yet. Add your keys to tutorhaven/.env to enable sign in." /></div>}
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Input label="Email" type="email" icon={Mail} autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" />
        <Input label="Password" type="password" icon={Lock} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" />
        <div className="flex justify-end">
          <button type="button" onClick={onReset} className="text-sm font-medium text-navy-500 hover:text-navy-900">Forgot password?</button>
        </div>
        {error && <p role="alert" className="rounded-xl bg-coral-50 px-4 py-3 text-sm text-coral-600">{error}</p>}
        <Button type="submit" size="lg" className="w-full" loading={busy} disabled={!configured || !email || !password}>Sign in</Button>
      </form>
    </AuthShell>
  )
}
