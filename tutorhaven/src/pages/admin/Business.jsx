import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, PencilLine, RotateCcw } from 'lucide-react'
import { PageHeader } from '../../components/layout/DashboardLayout'
import Button from '../../components/ui/Button'
import { Input, Textarea } from '../../components/ui/Field'
import Tabs from '../../components/ui/Tabs'
import PolicyText from '../../components/PolicyText'
import { Reveal } from '../../motion/Reveal'
import { adminUpdateSettings } from '../../lib/api'
import { BUSINESS_DEFAULTS, businessInfo, DEFAULT_POLICIES, fillPlaceholders, PLACEHOLDER_HELP, POLICY_KINDS } from '../../lib/business'
import { dateLong } from '../../lib/format'
import { useSettings } from '../../context/SettingsContext'
import { useToast } from '../../context/ToastContext'

const FIELDS = [
  ['business_name', 'Business name'],
  ['operator_name', 'Owner / operator'],
  ['support_email', 'Support email', 'email'],
  ['support_phone', 'Phone (international format)', 'tel', 'For example +2348028139086'],
  ['whatsapp_number', 'WhatsApp number (international format)', 'tel', 'Used for the WhatsApp chat links'],
  ['business_city', 'City'],
  ['business_state', 'State'],
  ['business_country', 'Country'],
]
const PHONE = /^\+[1-9][0-9]{7,14}$/
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
const cleanPhone = (v) => v.replace(/[\s()-]/g, '')

const toForm = (s) => Object.fromEntries(Object.keys(BUSINESS_DEFAULTS).map((k) => [k, s[k] ?? BUSINESS_DEFAULTS[k]]))
const toPolicies = (s) => ({ terms: s.terms_text ?? '', privacy: s.privacy_text ?? '', refund: s.refund_text ?? '' })

/** Business contact details and the Terms, Privacy and Refund pages, editable without code changes. */
export default function Business() {
  const { settings, setSettings } = useSettings()
  const toast = useToast()
  const [form, setForm] = useState(() => toForm(settings))
  const [policies, setPolicies] = useState(() => toPolicies(settings))
  const [kind, setKind] = useState('refund')
  const [preview, setPreview] = useState(false)
  const [saving, setSaving] = useState(null)
  const shown = useRef(settings)
  useEffect(() => {
    if (shown.current === settings) return
    shown.current = settings
    setForm(toForm(settings))
    setPolicies(toPolicies(settings))
  }, [settings])

  const info = businessInfo({ ...settings, ...form, support_phone: cleanPhone(form.support_phone), whatsapp_number: cleanPhone(form.whatsapp_number) })
  const errors = {
    support_email: form.support_email && !EMAIL.test(form.support_email.trim()) ? 'Enter a valid email address.' : null,
    support_phone: form.support_phone && !PHONE.test(cleanPhone(form.support_phone)) ? 'Use international format, like +2348028139086.' : null,
    whatsapp_number: form.whatsapp_number && !PHONE.test(cleanPhone(form.whatsapp_number)) ? 'Use international format, like +2348028139086.' : null,
  }

  const save = async (patch, what) => {
    setSaving(what)
    try {
      setSettings(await adminUpdateSettings(patch))
      toast.success(what === 'details' ? 'Business details saved. They show across the site and app right away.' : `${POLICY_KINDS[kind].title} saved.`)
    } catch (err) {
      toast.error(err.message)
    }
    setSaving(null)
  }

  const saveDetails = (e) => {
    e.preventDefault()
    if (Object.values(errors).some(Boolean)) return toast.error('Please fix the highlighted fields.')
    if (FIELDS.some(([k]) => !String(form[k]).trim())) return toast.error('All business details are required.')
    save({ ...form, support_phone: cleanPhone(form.support_phone), whatsapp_number: cleanPhone(form.whatsapp_number) }, 'details')
  }

  const text = policies[kind]
  const usingDefault = !(settings[`${kind}_text`] ?? '').trim()
  const effective = text.trim() ? text : DEFAULT_POLICIES[kind]

  return (
    <>
      <PageHeader title="Business & policies" subtitle="Contact details and legal pages shown in the footer, Contact page, checkout and the mobile app." />
      <form onSubmit={saveDetails}>
        <Reveal className="card p-6 sm:p-8">
          <h2 className="text-lg font-semibold">Business details</h2>
          <p className="mt-1 text-sm text-navy-500">Only add details you can verify. Don’t add a registered company name, CAC number or street address until you have them.</p>
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            {FIELDS.map(([key, label, type = 'text', hint]) => (
              <Input key={key} label={label} type={type} value={form[key]} error={errors[key]} hint={hint} maxLength={120}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} />
            ))}
          </div>
          <p className="mt-5 rounded-xl bg-cream-100 p-3 text-sm text-navy-600">
            Shown as: <strong>{info.business_name}</strong>, operated by {info.operator_name} · {info.location} · {info.support_email} · {info.phoneDisplay} · WhatsApp {info.whatsappDisplay}
          </p>
          <Button type="submit" className="mt-5" loading={saving === 'details'}>Save business details</Button>
        </Reveal>
      </form>

      <Reveal className="card mt-6 p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Policies</h2>
            <p className="mt-1 text-sm text-navy-500">
              {settings.policies_updated_at ? `Last updated ${dateLong(settings.policies_updated_at)}. ` : ''}
              Saving any policy updates the “Last updated” date on all three pages.
            </p>
          </div>
          <Link to={POLICY_KINDS[kind].path} target="_blank" className="text-sm font-semibold text-navy-800 underline-offset-2 hover:underline">Open the live page</Link>
        </div>
        <Tabs className="mt-5" value={kind} onChange={(v) => { setKind(v); setPreview(false) }}
          tabs={Object.entries(POLICY_KINDS).map(([value, p]) => ({ value, label: p.title }))} />

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <p className={`rounded-full px-3 py-1 text-xs font-semibold ${usingDefault ? 'bg-mint-50 text-mint-700' : 'bg-amber-400/15 text-[#8a5a00]'}`}>
            {usingDefault ? 'Using the built-in TutorHaven text' : 'Using your custom text'}
          </p>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" icon={preview ? PencilLine : Eye} onClick={() => setPreview((p) => !p)}>{preview ? 'Edit' : 'Preview'}</Button>
            {!text.trim() && (
              <Button size="sm" variant="ghost" icon={PencilLine} onClick={() => setPolicies((p) => ({ ...p, [kind]: DEFAULT_POLICIES[kind] }))}>Start from the built-in text</Button>
            )}
          </div>
        </div>

        {preview ? (
          <div className="mt-4 max-h-[36rem] overflow-y-auto rounded-2xl border border-navy-900/8 p-5 sm:p-8">
            <PolicyText text={fillPlaceholders(effective, info)} />
          </div>
        ) : (
          <Textarea className="mt-4" label={`${POLICY_KINDS[kind].title} text`} rows={18} value={text}
            placeholder="Leave empty to use the built-in text. Press “Start from the built-in text” to edit a copy."
            onChange={(e) => setPolicies((p) => ({ ...p, [kind]: e.target.value }))}
            hint={`Format: “## ” for a heading, “- ” for a bullet, a blank line between paragraphs and **bold**. Placeholders: ${PLACEHOLDER_HELP}`} />
        )}

        <div className="mt-5 flex flex-wrap gap-3">
          <Button loading={saving === 'policy'} onClick={() => save({ [`${kind}_text`]: text }, 'policy')}>Save {POLICY_KINDS[kind].title}</Button>
          {!usingDefault && (
            <Button variant="danger" icon={RotateCcw} disabled={!!saving} onClick={() => { setPolicies((p) => ({ ...p, [kind]: '' })); save({ [`${kind}_text`]: '' }, 'policy') }}>
              Reset to built-in text
            </Button>
          )}
        </div>
      </Reveal>
    </>
  )
}
