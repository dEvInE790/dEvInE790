import { motion } from 'motion/react'
import { BadgeCheck, CalendarCheck2, Lock, Search, ShieldCheck, Sparkles, Wallet } from 'lucide-react'
import Float from '../../motion/Float'
import { ease } from '../../motion/variants'

const enter = (delay) => ({
  initial: { opacity: 0, y: 24, scale: 0.96 },
  animate: { opacity: 1, y: 0, scale: 1 },
  transition: { duration: 0.8, ease, delay },
})

/**
 * Decorative hero composition. It illustrates how TutorHaven works (no invented
 * people, sessions or numbers), so it stays truthful on a brand-new platform.
 */
export default function HeroArt() {
  return (
    <div className="relative mx-auto aspect-[1/1] w-full max-w-[34rem]" aria-hidden>
      {/* Backdrop panel */}
      <motion.div
        {...enter(0.1)}
        className="absolute inset-[6%] overflow-hidden rounded-[2.5rem] bg-navy-900 shadow-lift"
      >
        <div className="grain absolute inset-0" />
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice">
          <defs>
            <radialGradient id="hero-glow" cx="70%" cy="25%" r="70%">
              <stop offset="0%" stopColor="#4cc897" stopOpacity="0.45" />
              <stop offset="60%" stopColor="#4cc897" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="400" height="400" fill="url(#hero-glow)" />
          {[70, 120, 170, 220].map((r, i) => (
            <motion.circle
              key={r}
              cx="290" cy="110" r={r}
              fill="none" stroke="#7fdcb8" strokeOpacity={0.14 - i * 0.025}
              initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
              transition={{ duration: 1.6, delay: 0.4 + i * 0.12, ease }}
            />
          ))}
          <motion.path
            d="M40 330 C 120 300, 150 230, 220 230 S 320 170, 360 90"
            fill="none" stroke="#4cc897" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="1 9"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 2, delay: 0.6, ease }}
          />
        </svg>
        <div className="absolute bottom-8 left-8 flex items-end gap-2">
          {[38, 54, 46, 70, 62, 88].map((h, i) => (
            <motion.span
              key={i}
              className="w-3 origin-bottom rounded-t-[4px] bg-mint-400/80"
              style={{ height: h }}
              initial={{ scaleY: 0 }} animate={{ scaleY: 1 }}
              transition={{ duration: 0.7, delay: 0.9 + i * 0.07, ease }}
            />
          ))}
        </div>
      </motion.div>

      {/* How booking works */}
      <motion.div {...enter(0.35)} className="absolute top-[22%] left-[2%] w-[68%]">
        <Float distance={8} duration={7}>
          <div className="rounded-3xl bg-white p-5 shadow-lift">
            <span className="text-xs font-semibold tracking-wide text-navy-400 uppercase">Book in three steps</span>
            <ol className="mt-4 space-y-3">
              {[
                [Search, 'Find a verified tutor', 'Search by subject, level and price'],
                [CalendarCheck2, 'Pick a time that suits you', 'Live availability in your time zone'],
                [Lock, 'Pay securely with Paystack', 'Confirmed the moment payment clears'],
              ].map(([Icon, title, hint], i) => (
                <motion.li
                  key={title}
                  className="flex items-center gap-3"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.8 + i * 0.18, ease }}
                >
                  <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${i === 2 ? 'bg-mint-400 text-navy-950' : 'bg-cream-200 text-navy-800'}`}><Icon className="h-4.5 w-4.5" /></span>
                  <div className="min-w-0">
                    <p className="truncate font-display text-sm font-semibold text-navy-950">{title}</p>
                    <p className="truncate text-xs text-navy-500">{hint}</p>
                  </div>
                </motion.li>
              ))}
            </ol>
          </div>
        </Float>
      </motion.div>

      {/* Verification chip */}
      <motion.div {...enter(0.6)} className="absolute top-[4%] right-[4%]">
        <Float distance={12} duration={6} delay={0.6}>
          <div className="flex items-center gap-2.5 rounded-2xl bg-white px-4 py-3 shadow-lift">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-mint-100"><BadgeCheck className="h-5 w-5 text-mint-700" /></span>
            <div>
              <p className="font-display text-sm font-bold text-navy-950">Reviewed tutors</p>
              <p className="text-xs text-navy-500">Qualifications checked</p>
            </div>
          </div>
        </Float>
      </motion.div>

      {/* Naira payments chip */}
      <motion.div {...enter(0.85)} className="absolute right-[0%] bottom-[16%] hidden sm:block">
        <Float distance={9} duration={6.5} delay={1.2}>
          <div className="flex items-center gap-3 rounded-2xl bg-white/95 px-4 py-3 shadow-lift backdrop-blur">
            <Wallet className="h-6 w-6 text-mint-500" />
            <div>
              <p className="flex items-center gap-1 text-sm font-semibold text-navy-950">Pay in naira <ShieldCheck className="h-3.5 w-3.5 text-mint-600" /></p>
              <p className="text-xs text-navy-500">Card, bank transfer or USSD</p>
            </div>
          </div>
        </Float>
      </motion.div>

      {/* Sparkle */}
      <motion.div {...enter(1)} className="absolute top-[7%] left-[12%]">
        <Float distance={14} duration={8} rotate={8}>
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-mint-400 shadow-glow">
            <Sparkles className="h-7 w-7 text-navy-950" />
          </div>
        </Float>
      </motion.div>
    </div>
  )
}
