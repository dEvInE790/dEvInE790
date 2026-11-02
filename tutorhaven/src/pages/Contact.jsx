import { Link } from 'react-router-dom'
import { ArrowRight, Clock, FileText, Lock, Mail, MapPin, MessageCircle, Phone, RotateCcw, UserRound } from 'lucide-react'
import PublicLayout from '../components/layout/PublicLayout'
import PageTransition from '../motion/PageTransition'
import { Reveal, Stagger, StaggerItem } from '../motion/Reveal'
import Button from '../components/ui/Button'
import { WhatsAppIcon } from '../components/SupportCard'
import { useSettings } from '../context/SettingsContext'
import { businessInfo, mailLink, telLink, whatsappLink } from '../lib/business'

const HELP = [
  { icon: RotateCcw, title: 'Refunds', text: 'Cancel at least 24 hours before a session (2 hours for members) for a full refund. Include your payment reference when you contact us.', to: '/refunds', link: 'Refund Policy' },
  { icon: FileText, title: 'Bookings & accounts', text: 'How bookings, memberships, tutor subscriptions and payouts work on TutorHaven.', to: '/terms', link: 'Terms and Conditions' },
  { icon: Lock, title: 'Your data', text: 'What we collect, who we share it with and how to ask for a copy or deletion.', to: '/privacy', link: 'Privacy Policy' },
]

export default function Contact() {
  const { settings } = useSettings()
  const info = businessInfo(settings)
  const details = [
    { icon: UserRound, label: 'Business', value: `${info.business_name}, operated by ${info.operator_name}` },
    { icon: Mail, label: 'Email', value: info.support_email, href: mailLink(info.support_email, `${info.business_name} support`) },
    { icon: Phone, label: 'Phone', value: `${info.phoneDisplay} (${info.support_phone})`, href: telLink(info.support_phone) },
    { icon: MessageCircle, label: 'WhatsApp', value: info.whatsappDisplay, href: whatsappLink(info.whatsapp_number), external: true },
    { icon: MapPin, label: 'Location', value: info.location },
    { icon: Clock, label: 'Currency', value: 'All prices and payments are in Nigerian Naira (NGN)' },
  ]

  return (
    <PublicLayout>
      <PageTransition>
        <section className="relative overflow-hidden pt-32 pb-12 lg:pt-40">
          <div className="pointer-events-none absolute top-0 left-1/2 h-96 w-[52rem] -translate-x-1/2 rounded-full bg-mint-200/45 blur-3xl" aria-hidden />
          <div className="container-page relative max-w-5xl text-center">
            <Reveal><span className="eyebrow">Contact</span></Reveal>
            <Reveal delay={0.05} as="h1" className="mx-auto mt-5 max-w-3xl text-4xl font-extrabold sm:text-6xl">We’re here to help</Reveal>
            <Reveal delay={0.1} as="p" className="mx-auto mt-5 max-w-xl text-lg text-navy-500">Questions about a booking, a payment or a refund? Message us on WhatsApp or send an email.</Reveal>
            <Reveal delay={0.15} className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button size="lg" href={whatsappLink(info.whatsapp_number, `Hello ${info.business_name}, `)} target="_blank" rel="noopener noreferrer" icon={WhatsAppIcon}>Chat on WhatsApp</Button>
              <Button size="lg" variant="secondary" href={mailLink(info.support_email, `${info.business_name} support`)} icon={Mail}>Send an email</Button>
            </Reveal>
          </div>
        </section>

        <section className="container-page max-w-5xl pb-24">
          <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
            <Reveal className="card p-6 sm:p-8">
              <h2 className="text-lg font-semibold">Business information</h2>
              <dl className="mt-5 divide-y divide-navy-900/[0.06]">
                {details.map((d) => (
                  <div key={d.label} className="flex gap-4 py-3.5">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-cream-200 text-navy-700"><d.icon className="h-4 w-4" /></span>
                    <div className="min-w-0">
                      <dt className="text-xs font-medium text-navy-400">{d.label}</dt>
                      <dd className="text-sm font-semibold break-words text-navy-900">
                        {d.href ? <a href={d.href} {...(d.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})} className="underline-offset-2 hover:text-mint-700 hover:underline">{d.value}</a> : d.value}
                      </dd>
                    </div>
                  </div>
                ))}
              </dl>
              <p className="mt-4 text-xs text-navy-400">Payments are processed by Paystack. We will never ask for your card PIN, OTP or password.</p>
            </Reveal>
            <Stagger className="space-y-4" gap={0.08}>
              {HELP.map((h) => (
                <StaggerItem key={h.title} className="card p-6">
                  <div className="flex items-start gap-4">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-mint-100 text-mint-700"><h.icon className="h-5 w-5" /></span>
                    <div>
                      <h3 className="font-semibold">{h.title}</h3>
                      <p className="mt-1 text-sm text-navy-500">{h.text}</p>
                      <Link to={h.to} className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-navy-800 hover:text-mint-700">{h.link}<ArrowRight className="h-3.5 w-3.5" /></Link>
                    </div>
                  </div>
                </StaggerItem>
              ))}
            </Stagger>
          </div>
        </section>
      </PageTransition>
    </PublicLayout>
  )
}
