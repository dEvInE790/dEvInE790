import { useState } from 'react'
import { LogOut } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '../../components/layout/DashboardLayout'
import Button from '../../components/ui/Button'
import Avatar from '../../components/ui/Avatar'
import { ChipGroup, Input } from '../../components/ui/Field'
import { Reveal } from '../../motion/Reveal'
import { updateProfile } from '../../lib/api'
import { supabase } from '../../lib/supabase'
import { GOALS, LEVELS, ROLE_LABEL, SUBJECTS } from '../../lib/constants'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'

export default function Settings() {
  const { profile, user, setProfile, signOut } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    full_name: profile.full_name, grade_level: profile.grade_level ?? '', subjects: profile.subjects ?? [], goals: profile.goals ?? [],
  })
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [pwSaving, setPwSaving] = useState(false)
  const learner = profile.role === 'student' || profile.role === 'parent'

  const save = async (e) => {
    e.preventDefault()
    if (form.full_name.trim().length < 2) return toast.error('Please enter your name.')
    setSaving(true)
    try {
      const patch = { full_name: form.full_name.trim() }
      if (learner) Object.assign(patch, { subjects: form.subjects, goals: form.goals })
      if (profile.role === 'student') patch.grade_level = form.grade_level || null
      setProfile(await updateProfile(profile.id, patch))
      toast.success('Profile saved')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const changePassword = async (e) => {
    e.preventDefault()
    if (password.length < 8) return toast.error('Use at least 8 characters.')
    setPwSaving(true)
    const { error } = await supabase.auth.updateUser({ password })
    setPwSaving(false)
    if (error) return toast.error(error.message)
    setPassword('')
    toast.success('Password updated')
  }

  return (
    <>
      <PageHeader title="Settings" subtitle="Manage your profile and account." />
      <div className="space-y-6">
        <Reveal className="card p-6 sm:p-8">
          <div className="flex items-center gap-4">
            <Avatar name={form.full_name} seed={user.id} size="lg" />
            <div>
              <p className="font-semibold">{form.full_name || 'Your name'}</p>
              <p className="text-sm text-navy-500">{user.email} · {ROLE_LABEL[profile.role]}</p>
            </div>
          </div>
          <form onSubmit={save} className="mt-8 space-y-6">
            <Input label="Full name" value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} autoComplete="name" className="max-w-md" />
            {profile.role === 'student' && (
              <div>
                <p className="mb-2.5 text-sm font-medium text-navy-800">Level</p>
                <ChipGroup size="sm" multiple={false} options={LEVELS} value={form.grade_level} onChange={(v) => setForm((f) => ({ ...f, grade_level: v }))} label="Level" />
              </div>
            )}
            {learner && (
              <>
                <div>
                  <p className="mb-2.5 text-sm font-medium text-navy-800">Subjects of interest</p>
                  <ChipGroup size="sm" options={SUBJECTS} value={form.subjects} onChange={(v) => setForm((f) => ({ ...f, subjects: v }))} label="Subjects" />
                </div>
                <div>
                  <p className="mb-2.5 text-sm font-medium text-navy-800">Goals</p>
                  <ChipGroup size="sm" options={GOALS} value={form.goals} onChange={(v) => setForm((f) => ({ ...f, goals: v }))} label="Goals" />
                </div>
              </>
            )}
            <Button type="submit" loading={saving}>Save changes</Button>
          </form>
        </Reveal>

        <Reveal className="card p-6 sm:p-8">
          <h2 className="text-lg font-semibold">Password</h2>
          <form onSubmit={changePassword} className="mt-5 flex max-w-md flex-col gap-3 sm:flex-row sm:items-end">
            <Input label="New password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className="flex-1" />
            <Button type="submit" variant="secondary" loading={pwSaving}>Update</Button>
          </form>
        </Reveal>

        <Reveal className="card flex items-center justify-between gap-4 p-6 sm:p-8">
          <div>
            <h2 className="text-lg font-semibold">Sign out</h2>
            <p className="text-sm text-navy-500">Sign out of TutorHaven on this device.</p>
          </div>
          <Button variant="danger" icon={LogOut} onClick={async () => { await signOut(); navigate('/') }}>Sign out</Button>
        </Reveal>
      </div>
    </>
  )
}
