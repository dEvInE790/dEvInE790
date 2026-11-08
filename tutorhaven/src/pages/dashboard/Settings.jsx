import { useState } from 'react'
import { LogOut, Trash2 } from 'lucide-react'
import Modal from '../../components/ui/Modal'
import { Textarea } from '../../components/ui/Field'
import { deleteMyAccount, getDeletionBlockers } from '../../lib/api'
import { Link, useNavigate } from 'react-router-dom'
import SupportCard from '../../components/SupportCard'
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

        <Reveal>
          <SupportCard title="Help & support" />
          <p className="mt-3 flex flex-wrap gap-x-5 gap-y-1 px-1 text-sm">
            {[['Contact us', '/contact'], ['Refund Policy', '/refunds'], ['Terms and Conditions', '/terms'], ['Privacy Policy', '/privacy']].map(([label, to]) => (
              <Link key={to} to={to} className="font-semibold text-navy-700 underline-offset-2 hover:underline">{label}</Link>
            ))}
          </p>
        </Reveal>

        <Reveal className="card flex items-center justify-between gap-4 p-6 sm:p-8">
          <div>
            <h2 className="text-lg font-semibold">Sign out</h2>
            <p className="text-sm text-navy-500">Sign out of TutorHaven on this device.</p>
          </div>
          <Button variant="danger" icon={LogOut} onClick={async () => { await signOut(); navigate('/') }}>Sign out</Button>
        </Reveal>

        {profile.role !== 'admin' && <DeleteAccount onDeleted={() => {
          // Leave the protected page first; sign out once its exit animation is over,
          // so it can't redirect to Sign in on the way out.
          navigate('/', { replace: true })
          setTimeout(() => signOut(), 800)
        }} />}
      </div>
    </>
  )
}

/** Permanently deletes the account (Google Play and App Store requirement). */
function DeleteAccount({ onDeleted }) {
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [blockers, setBlockers] = useState(null)
  const [typed, setTyped] = useState('')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const start = async () => {
    setTyped('')
    setOpen(true)
    try {
      setBlockers(await getDeletionBlockers())
    } catch {
      setBlockers(null)
    }
  }
  const confirm = async () => {
    setBusy(true)
    try {
      await deleteMyAccount(reason)
      toast.success('Your account has been deleted.')
      setOpen(false)
      await onDeleted()
    } catch (e) {
      toast.error(e.message)
      setBusy(false)
    }
  }
  const blocked = blockers && (blockers.upcoming_sessions > 0 || blockers.refunds_in_progress > 0)
  return (
    <Reveal className="card flex flex-col gap-4 border-coral-500/20 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
      <div>
        <h2 className="text-lg font-semibold">Delete account</h2>
        <p className="text-sm text-navy-500">Permanently delete your account and data. This can’t be undone.</p>
      </div>
      <Button variant="danger" icon={Trash2} onClick={start}>Delete account</Button>
      <Modal open={open} onClose={() => !busy && setOpen(false)} title="Delete your account?" description="This permanently deletes your account. It can’t be undone.">
        <div className="space-y-3 text-sm text-navy-600">
          <p><strong className="text-navy-900">Deleted:</strong> your profile, sessions and booking history, messages, reviews you wrote, goals, reports, AI assistant conversations, saved tutors and any documents you uploaded. Tutors: your listing and payout details too.</p>
          <p><strong className="text-navy-900">Kept:</strong> records of payments you made, without your name or email, because financial and tax rules require it. Paystack keeps its own records of card payments.</p>
          <p>Any membership or subscription ends immediately and isn’t refunded.</p>
          {blocked && (
            <p className="rounded-xl bg-amber-400/15 p-3 text-[#6b4700]" role="alert">
              {blockers.upcoming_sessions > 0 ? `You have ${blockers.upcoming_sessions} upcoming session(s). Cancel them first in Sessions (paid sessions are refunded).` : 'A refund linked to your account is still being processed. Please try again once it has finished.'}
            </p>
          )}
          <Textarea label="Why are you leaving? (optional)" rows={2} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />
          <label className="block">
            <span className="mb-1.5 block font-medium text-navy-800">Type DELETE to confirm</span>
            <input value={typed} onChange={(e) => setTyped(e.target.value)} autoCapitalize="characters" aria-label="Type DELETE to confirm"
              className="h-11 w-full rounded-xl border border-navy-900/12 px-3.5 outline-none focus:border-coral-500" />
          </label>
        </div>
        <div className="mt-5 flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={() => setOpen(false)} disabled={busy}>Keep my account</Button>
          <Button variant="danger" className="flex-1" loading={busy} disabled={typed !== 'DELETE' || blocked} onClick={confirm}>Delete permanently</Button>
        </div>
      </Modal>
    </Reveal>
  )
}
