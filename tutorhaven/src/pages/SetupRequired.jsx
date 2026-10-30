import { motion } from 'motion/react'
import { Database, KeyRound, Play } from 'lucide-react'
import PublicLayout from '../components/layout/PublicLayout'
import Button from '../components/ui/Button'
import { Stagger, StaggerItem } from '../motion/Reveal'

const STEPS = [
  { icon: Database, title: 'Create the database', body: 'In your Supabase project, open the SQL editor and run supabase/migrations/20261030000000_init.sql (and optionally supabase/seed.sql for demo tutors).' },
  { icon: KeyRound, title: 'Add your keys', body: 'Copy the Project URL and anon public key from Project Settings → API into tutorhaven/.env.' },
  { icon: Play, title: 'Restart the app', body: 'Stop and re-run npm run dev so Vite picks up the new environment variables.' },
]

export default function SetupRequired() {
  return (
    <PublicLayout footer={false}>
      <div className="container-page max-w-3xl pt-32 pb-24">
        <motion.h1 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="text-3xl font-bold sm:text-4xl">Connect your database</motion.h1>
        <p className="mt-3 text-navy-500">Accounts, bookings and dashboards run on Supabase. Three quick steps and you’re live.</p>
        <Stagger onMount className="mt-10 space-y-4" gap={0.1}>
          {STEPS.map((s, i) => (
            <StaggerItem key={s.title} className="card flex gap-5 p-6">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-navy-900 text-mint-300"><s.icon className="h-5 w-5" /></span>
              <div>
                <p className="text-xs font-semibold text-navy-400">Step {i + 1}</p>
                <h2 className="text-lg font-semibold">{s.title}</h2>
                <p className="mt-1 text-sm text-navy-600">{s.body}</p>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
        <Button to="/" variant="secondary" className="mt-10">Back to home</Button>
      </div>
    </PublicLayout>
  )
}
