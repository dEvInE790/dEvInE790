import { motion } from 'motion/react'
import { CalendarCheck2, CircleCheck, Sparkles, Star, Video } from 'lucide-react'
import Float from '../../motion/Float'
import { ease } from '../../motion/variants'

const enter = (delay) => ({
  initial: { opacity: 0, y: 24, scale: 0.96 },
  animate: { opacity: 1, y: 0, scale: 1 },
  transition: { duration: 0.8, ease, delay },
})

/** Decorative hero composition: a learning journey told through floating product moments. */
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

      {/* Next session card */}
      <motion.div {...enter(0.35)} className="absolute top-[22%] left-[2%] w-[68%]">
        <Float distance={8} duration={7}>
          <div className="rounded-3xl bg-white p-5 shadow-lift">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold tracking-wide text-navy-400 uppercase">Next session</span>
              <span className="flex items-center gap-1 rounded-full bg-mint-50 px-2 py-0.5 text-[0.7rem] font-semibold text-mint-700">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-mint-500" />Confirmed
              </span>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-navy-900 to-mint-500 font-display text-sm font-bold text-white">MK</span>
              <div>
                <p className="font-display font-semibold text-navy-950">Algebra II</p>
                <p className="text-sm text-navy-500">Tomorrow · 4:00 PM</p>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-xs text-navy-500"><span>Weekly goal</span><span className="font-semibold text-navy-800">3 of 4</span></div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-navy-50">
                <motion.div className="h-full origin-left rounded-full bg-gradient-to-r from-mint-500 to-mint-400" initial={{ scaleX: 0 }} animate={{ scaleX: 0.75 }} transition={{ duration: 1.2, delay: 1, ease }} />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <span className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-navy-900 py-2 text-xs font-semibold text-white"><Video className="h-3.5 w-3.5" />Join</span>
              <span className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-navy-900/10 py-2 text-xs font-semibold text-navy-800"><CalendarCheck2 className="h-3.5 w-3.5" />Reschedule</span>
            </div>
          </div>
        </Float>
      </motion.div>

      {/* Rating chip */}
      <motion.div {...enter(0.6)} className="absolute top-[4%] right-[4%]">
        <Float distance={12} duration={6} delay={0.6}>
          <div className="flex items-center gap-2.5 rounded-2xl bg-white px-4 py-3 shadow-lift">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-amber-400/15"><Star className="h-5 w-5 fill-amber-400 text-amber-400" /></span>
            <div>
              <p className="font-display text-sm font-bold text-navy-950">Top-rated</p>
              <p className="text-xs text-navy-500">Verified tutors</p>
            </div>
          </div>
        </Float>
      </motion.div>

      {/* Booked toast */}
      <motion.div {...enter(0.85)} className="absolute right-[0%] bottom-[16%] hidden sm:block">
        <Float distance={9} duration={6.5} delay={1.2}>
          <div className="flex items-center gap-3 rounded-2xl bg-white/95 px-4 py-3 shadow-lift backdrop-blur">
            <CircleCheck className="h-6 w-6 text-mint-500" />
            <div>
              <p className="text-sm font-semibold text-navy-950">Session booked</p>
              <p className="text-xs text-navy-500">Physics · Thu 6:30 PM</p>
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
