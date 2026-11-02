import { Mail, MapPin, Phone } from 'lucide-react'
import { useSettings } from '../context/SettingsContext'
import { businessInfo, mailLink, telLink, whatsappLink } from '../lib/business'

export function WhatsAppIcon({ className = 'h-5 w-5' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21h.01c5.46 0 9.9-4.45 9.9-9.91A9.85 9.85 0 0 0 12.04 2Zm0 18.15h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.23 8.23 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24a8.2 8.2 0 0 1 8.24 8.25c0 4.54-3.7 8.23-8.24 8.23Zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.17.25-.64.81-.78.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.13-.15.17-.25.25-.42.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48a.92.92 0 0 0-.66.31c-.23.25-.87.85-.87 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.06-.1-.23-.16-.48-.29Z" />
    </svg>
  )
}

/** WhatsApp, email and phone for customer support, using the details admins manage. */
export default function SupportCard({ title = 'Need help?', subtitle, message = 'Hello TutorHaven, I need help with ', reference, compact = false, className = '' }) {
  const { settings } = useSettings()
  const info = businessInfo(settings)
  const text = reference ? `${message}payment ${reference}` : message
  const rows = [
    { icon: WhatsAppIcon, label: 'WhatsApp', value: info.whatsappDisplay, href: whatsappLink(info.whatsapp_number, text), external: true, tone: 'bg-[#25d366]/15 text-[#128c4b]' },
    { icon: Mail, label: 'Email', value: info.support_email, href: mailLink(info.support_email, reference ? `Payment ${reference}` : `${info.business_name} support`), tone: 'bg-mint-100 text-mint-700' },
    { icon: Phone, label: 'Phone', value: info.phoneDisplay, href: telLink(info.support_phone), tone: 'bg-cream-200 text-navy-800' },
  ]
  return (
    <section className={`card p-6 sm:p-8 ${className}`} aria-label="Customer support">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-navy-500">{subtitle ?? `Contact ${info.business_name} support. Include your payment reference (TH-…) for anything about a payment.`}</p>
      <ul className="mt-5 grid gap-3 md:grid-cols-3">
        {rows.map((r) => (
          <li key={r.label}>
            <a href={r.href} {...(r.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              className="flex h-full items-center gap-3 rounded-2xl border border-navy-900/8 bg-white p-4 transition-[border-color,box-shadow] hover:border-mint-500/50 hover:shadow-soft">
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${r.tone}`}><r.icon className="h-5 w-5" /></span>
              <span className="min-w-0">
                <span className="block text-xs font-medium text-navy-400">{r.label}</span>
                <span className="block text-sm font-semibold break-all text-navy-900">{r.value}</span>
              </span>
            </a>
          </li>
        ))}
      </ul>
      {!compact && <p className="mt-4 flex items-center gap-1.5 text-xs text-navy-400"><MapPin className="h-3.5 w-3.5" />{info.location}</p>}
    </section>
  )
}
