import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { BadgeCheck, CalendarCheck2, LineChart } from 'lucide-react'
import { LogoMark, Wordmark } from '../motion/AnimatedLogo'
import Float from '../motion/Float'
import PageTransition from '../motion/PageTransition'
import { ease } from '../motion/variants'

export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_1.05fr]">
      <PageTransition className="flex flex-col px-5 py-6 sm:px-10 lg:px-16">
        <Link to="/" className="flex w-fit items-center gap-2.5" aria-label="TutorHaven home">
          <LogoMark size={34} />
          <Wordmark />
        </Link>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
          <h1 className="text-3xl font-bold sm:text-4xl">{title}</h1>
          {subtitle && <p className="mt-2 text-navy-500">{subtitle}</p>}
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-8 text-center text-sm text-navy-500">{footer}</div>}
        </div>
      </PageTransition>

      <div className="relative hidden overflow-hidden bg-navy-950 lg:block" aria-hidden>
        <div className="grain absolute inset-0" />
        <div className="absolute -top-24 -right-24 h-[30rem] w-[30rem] rounded-full bg-mint-500/25 blur-3xl" />
        <div className="absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-navy-500/30 blur-3xl" />
        <div className="relative flex h-full flex-col justify-center px-16">
          <motion.h2 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease, delay: 0.2 }} className="max-w-md text-4xl font-bold text-white">
            Find the right tutor.<br /><span className="text-mint-300">Unlock your potential.</span>
          </motion.h2>
          <div className="mt-12 space-y-4">
            {[
              { icon: BadgeCheck, title: 'Verified tutors', body: 'Every profile is reviewed before it goes live.' },
              { icon: CalendarCheck2, title: 'Live availability', body: 'Book real openings in your own timezone.' },
              { icon: LineChart, title: 'Visible progress', body: 'Dashboards for learners, parents and tutors.' },
            ].map((f, i) => (
              <Float key={f.title} distance={6} duration={6 + i} delay={i * 0.4}>
                <motion.div
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, ease, delay: 0.35 + i * 0.12 }}
                  className="flex max-w-sm items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur"
                  style={{ marginLeft: i * 32 }}
                >
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-mint-400 text-navy-950"><f.icon className="h-5 w-5" /></span>
                  <div>
                    <p className="font-semibold text-white">{f.title}</p>
                    <p className="text-sm text-navy-300">{f.body}</p>
                  </div>
                </motion.div>
              </Float>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
