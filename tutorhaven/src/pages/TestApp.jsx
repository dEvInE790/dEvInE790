import { CheckCircle2, Clock, Smartphone, UserPlus } from 'lucide-react'
import PublicLayout from '../components/layout/PublicLayout'
import PageTransition from '../motion/PageTransition'
import { Reveal } from '../motion/Reveal'
import Button from '../components/ui/Button'
import { WhatsAppIcon } from '../components/SupportCard'
import { useSettings } from '../context/SettingsContext'
import { businessInfo, whatsappLink } from '../lib/business'

const PACKAGE = 'ng.tutorhaven.app'
const STORE_LINK = `https://play.google.com/store/apps/details?id=${PACKAGE}`
const OPT_IN_LINK = `https://play.google.com/apps/testing/${PACKAGE}`
// Testers join this Google Group; the group is the tester list in Play Console.
const GROUP_LINK = 'https://groups.google.com/g/tutorhaven737'

const PROBLEMS = [
  ['“Item not found” or “App not available”', 'You haven’t joined the group yet (step 1), or you joined less than an hour ago. Join the group, wait a little, then try step 2 again.'],
  ['I can’t join the group', 'Send us the Gmail you use on the Play Store on WhatsApp and we’ll add you ourselves.'],
  ['It still says not found after joining', 'The Play Store on your phone is signed in to a different Google account. Open the Play Store, tap your profile picture at the top right, switch to the Gmail you joined the group with, then open the links again.'],
  ['I’m on an iPhone', 'This test is for Android phones only. The iPhone app comes later.'],
  ['The link opens a web page instead of the app', 'That’s fine. Sign in to the same Gmail in the browser, tap “Become a tester”, then tap the Google Play link on that page.'],
]

/** Public page for friends and family joining the Google Play closed test. */
export default function TestApp() {
  const { settings } = useSettings()
  const info = businessInfo(settings)
  const joinMessage = `Hello ${info.business_name}, I'd like to test the Android app. The Gmail I use on the Play Store is: `

  return (
    <PublicLayout>
      <PageTransition>
        <section className="container-page max-w-3xl pt-32 pb-24 lg:pt-40">
          <Reveal><span className="eyebrow"><Smartphone className="h-3.5 w-3.5" />Android early access</span></Reveal>
          <Reveal delay={0.05} as="h1" className="mt-5 text-4xl font-extrabold sm:text-5xl">Help us test the {info.business_name} app</Reveal>
          <Reveal delay={0.1} as="p" className="mt-4 text-lg text-navy-600">
            Before {info.business_name} goes live on Google Play, Google asks for a small group of real people to use it for 14 days. Thank you for helping. It takes about two minutes.
          </Reveal>

          <Reveal className="card mt-8 space-y-8 p-6 sm:p-10 text-navy-700">
            <div>
              <h2 className="flex items-center gap-2 text-xl font-semibold text-navy-950"><UserPlus className="h-5 w-5 text-mint-600" />1. Join our tester group</h2>
              <p className="mt-2">Only members of our tester group can download the test app. Open the group with the Gmail you use on the <strong>Play Store on your Android phone</strong> and tap <strong>Join group</strong>.</p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Button href={GROUP_LINK} target="_blank" rel="noopener noreferrer">Join the tester group</Button>
                <Button variant="secondary" icon={WhatsAppIcon} href={whatsappLink(info.whatsapp_number, joinMessage)} target="_blank" rel="noopener noreferrer">Or send us your Gmail</Button>
              </div>
            </div>

            <div>
              <h2 className="flex items-center gap-2 text-xl font-semibold text-navy-950"><CheckCircle2 className="h-5 w-5 text-mint-600" />2. Join the test and install</h2>
              <p className="mt-2">After joining (give it a few minutes), open this on your Android phone, signed in with the same Gmail. Tap <strong>Become a tester</strong>, then <strong>Download it on Google Play</strong>.</p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Button href={OPT_IN_LINK} target="_blank" rel="noopener noreferrer">Become a tester</Button>
                <Button variant="secondary" href={STORE_LINK} target="_blank" rel="noopener noreferrer">Open in Google Play</Button>
              </div>
            </div>

            <div>
              <h2 className="flex items-center gap-2 text-xl font-semibold text-navy-950"><Clock className="h-5 w-5 text-mint-600" />3. Keep it for 14 days</h2>
              <p className="mt-2">Please keep the app installed for at least 14 days and open it every few days: browse tutors, open a profile, or send a message. You don’t need to pay for anything. If something looks wrong, tell us on WhatsApp.</p>
            </div>
          </Reveal>

          <Reveal className="mt-10">
            <h2 className="text-2xl font-semibold">If the link doesn’t work</h2>
            <dl className="mt-4 space-y-3">
              {PROBLEMS.map(([q, a]) => (
                <div key={q} className="rounded-2xl bg-cream-100 p-4">
                  <dt className="font-semibold text-navy-950">{q}</dt>
                  <dd className="mt-1 text-sm text-navy-600">{a}</dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </section>
      </PageTransition>
    </PublicLayout>
  )
}
