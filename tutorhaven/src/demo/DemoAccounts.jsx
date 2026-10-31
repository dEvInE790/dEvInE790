import { useState } from 'react'
import { motion } from 'motion/react'
import { ArrowRight, GraduationCap, HeartHandshake, LoaderCircle, Presentation, ShieldCheck } from 'lucide-react'
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from './seed'

const icons = { student: GraduationCap, parent: HeartHandshake, tutor: Presentation, admin: ShieldCheck }

/** One-click sign-in for each seeded demo role. */
export default function DemoAccounts({ onSignIn }) {
  const [busy, setBusy] = useState(null)
  const go = async (a) => {
    setBusy(a.role)
    try {
      await onSignIn(a.email, DEMO_PASSWORD)
    } finally {
      setBusy(null)
    }
  }
  return (
    <div className="mb-8 rounded-3xl border border-mint-500/25 bg-mint-50/60 p-4">
      <p className="px-1 text-sm font-semibold text-navy-900">Explore with a demo account</p>
      <p className="mt-0.5 px-1 text-xs text-navy-500">One click, no password. Or sign up to try onboarding.</p>
      <motion.ul className="mt-3 space-y-2" initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.05 } } }}>
        {DEMO_ACCOUNTS.map((a) => {
          const Icon = icons[a.role]
          return (
            <motion.li key={a.role} variants={{ hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0 } }}>
              <motion.button
                type="button"
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                disabled={!!busy}
                onClick={() => go(a)}
                className="group flex w-full items-center gap-3 rounded-2xl border border-navy-900/8 bg-white p-3 text-left shadow-soft transition-shadow hover:shadow-lift disabled:opacity-60"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-navy-900 text-mint-300"><Icon className="h-5 w-5" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-navy-950">{a.name} <span className="font-normal text-navy-400">· {a.role[0].toUpperCase() + a.role.slice(1)}</span></span>
                  <span className="block truncate text-xs text-navy-500">{a.blurb}</span>
                </span>
                {busy === a.role ? <LoaderCircle className="h-4 w-4 animate-spin text-navy-400" /> : <ArrowRight className="h-4 w-4 text-navy-300 transition-transform group-hover:translate-x-0.5" />}
              </motion.button>
            </motion.li>
          )
        })}
      </motion.ul>
    </div>
  )
}
