import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { FileText, Lock, RotateCcw } from 'lucide-react'
import PublicLayout from '../components/layout/PublicLayout'
import PageTransition from '../motion/PageTransition'
import { Reveal } from '../motion/Reveal'
import PolicyText from '../components/PolicyText'
import SupportCard from '../components/SupportCard'
import { useSettings } from '../context/SettingsContext'
import { businessInfo, POLICY_KINDS, policyText } from '../lib/business'
import { dateLong } from '../lib/format'

const ICONS = { terms: FileText, privacy: Lock, refund: RotateCcw }

/** Terms, Privacy and Refund Policy pages. Text is managed in Admin → Business & policies. */
export default function Policy({ kind }) {
  const { settings } = useSettings()
  const info = businessInfo(settings)
  const { title } = POLICY_KINDS[kind]
  const Icon = ICONS[kind]
  useEffect(() => {
    document.title = `${title} · ${info.business_name}`
    return () => { document.title = info.business_name }
  }, [title, info.business_name])

  return (
    <PublicLayout>
      <PageTransition>
        <section className="relative overflow-hidden pt-32 pb-10 lg:pt-40">
          <div className="pointer-events-none absolute top-0 left-1/2 h-80 w-[44rem] -translate-x-1/2 rounded-full bg-mint-200/40 blur-3xl" aria-hidden />
          <div className="container-page relative max-w-3xl">
            <Reveal><span className="eyebrow"><Icon className="h-3.5 w-3.5" />Legal</span></Reveal>
            <Reveal delay={0.05} as="h1" className="mt-5 text-4xl font-extrabold sm:text-5xl">{title}</Reveal>
            <Reveal delay={0.1} as="p" className="mt-4 text-sm text-navy-500">
              {info.updatedAt ? <>Last updated {dateLong(info.updatedAt)} · </> : null}{info.business_name}, operated by {info.operator_name} · {info.location}
            </Reveal>
          </div>
        </section>
        <section className="container-page max-w-3xl pb-24">
          <Reveal className="card p-6 sm:p-10">
            <PolicyText text={policyText(kind, settings)} />
          </Reveal>
          <SupportCard className="mt-6" title="Questions about this policy?" subtitle={`Contact ${info.business_name}. We usually reply within one working day.`} />
          <nav className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm" aria-label="Policies">
            {Object.entries(POLICY_KINDS).filter(([k]) => k !== kind).map(([k, p]) => (
              <Link key={k} to={p.path} className="font-semibold text-navy-700 underline-offset-2 hover:underline">{p.title}</Link>
            ))}
            <Link to="/contact" className="font-semibold text-navy-700 underline-offset-2 hover:underline">Contact us</Link>
          </nav>
        </section>
      </PageTransition>
    </PublicLayout>
  )
}
