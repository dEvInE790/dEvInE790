import { Link } from 'react-router-dom'
import { Mail, MapPin, Phone } from 'lucide-react'
import { LogoMark, Wordmark } from '../../motion/AnimatedLogo'
import { WhatsAppIcon } from '../SupportCard'
import { useSettings } from '../../context/SettingsContext'
import { businessInfo, mailLink, telLink, whatsappLink } from '../../lib/business'

const cols = [
  { title: 'Learn', links: [['Find a tutor', '/tutors'], ['Pricing', '/pricing'], ['How it works', '/#how-it-works'], ['Parent accounts', '/signup?role=parent']] },
  { title: 'Teach', links: [['Become a tutor', '/signup?role=tutor'], ['Tutor dashboard', '/dashboard']] },
  { title: 'Help & legal', links: [['Contact us', '/contact'], ['Refund Policy', '/refunds'], ['Terms and Conditions', '/terms'], ['Privacy Policy', '/privacy']] },
]

export default function SiteFooter() {
  const { settings } = useSettings()
  const info = businessInfo(settings)
  const contact = [
    { icon: WhatsAppIcon, label: `WhatsApp ${info.whatsappDisplay}`, href: whatsappLink(info.whatsapp_number, `Hello ${info.business_name}, `), external: true },
    { icon: Mail, label: info.support_email, href: mailLink(info.support_email) },
    { icon: Phone, label: info.phoneDisplay, href: telLink(info.support_phone) },
    { icon: MapPin, label: info.location },
  ]
  return (
    <footer className="relative overflow-hidden bg-navy-950 text-navy-200">
      <div className="pointer-events-none absolute -top-40 left-1/2 h-80 w-[48rem] -translate-x-1/2 rounded-full bg-mint-500/10 blur-3xl" aria-hidden />
      <div className="container-page relative grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-[1.5fr_repeat(3,1fr)]">
        <div>
          <Link to="/" className="flex items-center gap-2.5">
            <LogoMark size={34} dark />
            <Wordmark light />
          </Link>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-navy-300">Find the right tutor. Unlock your potential. Verified tutors, flexible scheduling and progress you can see.</p>
          <ul className="mt-5 space-y-2 text-sm" aria-label="Contact details">
            {contact.map((c) => (
              <li key={c.label} className="flex items-center gap-2.5">
                <c.icon className="h-4 w-4 shrink-0 text-mint-300" aria-hidden />
                {c.href ? (
                  <a href={c.href} {...(c.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})} className="break-all text-navy-200 transition-colors hover:text-mint-300">{c.label}</a>
                ) : <span className="text-navy-300">{c.label}</span>}
              </li>
            ))}
          </ul>
        </div>
        {cols.map((c) => (
          <div key={c.title}>
            <h3 className="font-display text-sm font-semibold text-white">{c.title}</h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              {c.links.map(([label, to]) => (
                <li key={label}><Link to={to} className="text-navy-300 transition-colors hover:text-mint-300">{label}</Link></li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="container-page relative flex flex-col gap-2 border-t border-white/10 py-6 text-xs text-navy-400 sm:flex-row sm:justify-between">
        <p>© {new Date().getFullYear()} {info.business_name}. Operated by {info.operator_name}, {info.business_city}, {info.business_country}.</p>
        <p>Payments in Nigerian Naira (NGN), processed securely by Paystack.</p>
      </div>
    </footer>
  )
}
