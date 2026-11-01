import { useState } from 'react'
import { motion } from 'motion/react'
import { BadgeCheck, GraduationCap, Link2, Send, Sparkles } from 'lucide-react'
import Button from './ui/Button'
import Float from '../motion/Float'
import { useToast } from '../context/ToastContext'
import { ease } from '../motion/variants'

/** Shown when no tutors are listed yet: honest, warm, and with something useful to do. */
export default function NoTutorsYet({ filtered = false, onClear, compact = false }) {
  const toast = useToast()
  const [shared, setShared] = useState(false)
  const invite = async () => {
    const url = `${window.location.origin}/signup?role=tutor`
    const text = 'Teach on TutorHaven: set your own rate, get booked and get paid in naira.'
    try {
      if (navigator.share) await navigator.share({ title: 'Teach on TutorHaven', text, url })
      else {
        await navigator.clipboard.writeText(url)
        toast.success('Invite link copied. Share it with a great tutor you know!')
      }
      setShared(true)
    } catch {
      /* share sheet dismissed */
    }
  }

  if (filtered) {
    return (
      <div className="flex flex-col items-center px-6 py-14 text-center">
        <Float distance={6} duration={5}>
          <div className="mb-5 grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-mint-100 to-cream-200 text-mint-700 shadow-soft"><Sparkles className="h-7 w-7" /></div>
        </Float>
        <h3 className="text-lg font-semibold">No tutors match those filters</h3>
        <p className="mt-1.5 max-w-sm text-sm text-navy-500">Try a different subject or a higher price limit.</p>
        {onClear && <Button className="mt-6" variant="secondary" onClick={onClear}>Clear filters</Button>}
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease }}
      className={`relative overflow-hidden rounded-[2rem] border border-navy-900/[0.06] bg-gradient-to-br from-white via-cream-50 to-mint-50 text-center shadow-soft ${compact ? 'px-6 py-10' : 'px-6 py-14 sm:px-12 sm:py-16'}`}
    >
      <div className="pointer-events-none absolute -top-20 left-1/2 h-56 w-[36rem] -translate-x-1/2 rounded-full bg-mint-200/40 blur-3xl" aria-hidden />
      <div className="relative mx-auto h-28 w-40" aria-hidden>
        <Float distance={8} duration={6}>
          <div className="absolute left-1/2 top-2 grid h-20 w-20 -translate-x-1/2 place-items-center rounded-[1.75rem] bg-navy-900 shadow-lift">
            <GraduationCap className="h-10 w-10 text-mint-300" strokeWidth={1.6} />
          </div>
        </Float>
        <Float className="absolute bottom-1 left-0" distance={6} duration={5} delay={0.4}>
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-white shadow-soft"><BadgeCheck className="h-5 w-5 text-mint-600" /></div>
        </Float>
        <Float className="absolute top-0 right-0" distance={7} duration={5.5} delay={0.8}>
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-mint-400 shadow-glow"><Sparkles className="h-4.5 w-4.5 text-navy-950" /></div>
        </Float>
      </div>
      <h3 className="relative mt-6 text-2xl font-bold sm:text-3xl">Our first tutors are on their way</h3>
      <p className="relative mx-auto mt-3 max-w-lg text-navy-600">
        Every tutor is reviewed before they appear here, so the directory is still filling up. Check back soon, or help us grow it.
      </p>
      <div className="relative mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        <Button to="/signup?role=tutor" icon={GraduationCap}>Apply to teach</Button>
        <Button variant="secondary" onClick={invite} icon={shared ? Link2 : Send}>{shared ? 'Invite another tutor' : 'Invite a tutor you know'}</Button>
      </div>
    </motion.div>
  )
}
