import { Mail, Trash2 } from 'lucide-react'
import PublicLayout from '../components/layout/PublicLayout'
import PageTransition from '../motion/PageTransition'
import { Reveal } from '../motion/Reveal'
import Button from '../components/ui/Button'
import { WhatsAppIcon } from '../components/SupportCard'
import { useSettings } from '../context/SettingsContext'
import { businessInfo, mailLink, whatsappLink } from '../lib/business'

/** Public account-deletion page (linked from Google Play's Data safety section). */
export default function DeleteAccount() {
  const { settings } = useSettings()
  const info = businessInfo(settings)
  return (
    <PublicLayout>
      <PageTransition>
        <section className="container-page max-w-3xl pt-32 pb-24 lg:pt-40">
          <Reveal><span className="eyebrow"><Trash2 className="h-3.5 w-3.5" />Your data</span></Reveal>
          <Reveal delay={0.05} as="h1" className="mt-5 text-4xl font-extrabold sm:text-5xl">Delete your {info.business_name} account</Reveal>
          <Reveal className="card mt-8 space-y-6 p-6 sm:p-10 text-navy-700">
            <div>
              <h2 className="text-xl font-semibold text-navy-950">Delete it yourself</h2>
              <ol className="mt-3 list-decimal space-y-1.5 pl-5">
                <li>Sign in on the website or in the {info.business_name} app.</li>
                <li>Website: open <strong>Settings</strong> and choose <strong>Delete account</strong>. App: open <strong>Account</strong> and tap <strong>Delete account</strong>.</li>
                <li>Type <strong>DELETE</strong> to confirm. Your account is deleted straight away.</li>
              </ol>
              <Button className="mt-4" to="/dashboard/settings">Go to Settings</Button>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-navy-950">Can’t sign in?</h2>
              <p className="mt-2">Message us from the email address or phone number on your account, with “Delete my account” in the message. We confirm it’s you and delete the account within 7 days.</p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Button variant="secondary" icon={Mail} href={mailLink(info.support_email, 'Delete my account')}>{info.support_email}</Button>
                <Button variant="secondary" icon={WhatsAppIcon} href={whatsappLink(info.whatsapp_number, 'Hello, please delete my TutorHaven account. My email is: ')} target="_blank" rel="noopener noreferrer">WhatsApp {info.whatsappDisplay}</Button>
              </div>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-navy-950">What is deleted</h2>
              <p className="mt-2">Your profile, sessions and booking history, messages, reviews you wrote, goals, learning reports, AI assistant conversations, saved tutors and uploaded documents. For tutors, also your listing, availability and payout details.</p>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-navy-950">What we keep</h2>
              <p className="mt-2">Records of payments (amount, date and payment reference) without your name or email, for as long as Nigerian financial and tax rules require. Paystack keeps its own records of card payments. Accounts with an upcoming paid session or a refund in progress can be deleted once the session is cancelled or the refund is finished.</p>
            </div>
          </Reveal>
        </section>
      </PageTransition>
    </PublicLayout>
  )
}
