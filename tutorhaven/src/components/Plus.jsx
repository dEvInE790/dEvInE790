import { motion } from 'motion/react'
import { BarChart3, Bot, Crown, FileText, Headphones, Sparkles, Users } from 'lucide-react'
import Button from './ui/Button'
import { useAuth } from '../context/AuthContext'
import { useMembership } from '../context/MembershipContext'
import { spring } from '../motion/variants'

/** Gold "Plus" badge for members. */
export function PlusBadge({ className = '', size = 'sm' }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-300 via-amber-400 to-[#f0b429] font-bold text-navy-950 shadow-[0_6px_16px_-8px_rgb(240_180_41/0.9)] ${size === 'lg' ? 'px-3 py-1 text-sm' : 'px-2 py-0.5 text-[0.7rem]'} ${className}`} data-testid="plus-badge">
      <Crown className={size === 'lg' ? 'h-4 w-4' : 'h-3 w-3'} aria-hidden />Plus
    </span>
  )
}

export const PLUS_FEATURES = [
  { icon: Bot, title: 'AI Learning Assistant', text: 'Ask questions any time and get simple explanations, step-by-step working, practice questions and revision notes.' },
  { icon: BarChart3, title: 'Learning analytics', text: 'Lessons completed, subjects studied, goals and progress over time, with tutor feedback in one place.' },
  { icon: FileText, title: 'Monthly reports', text: 'A report each month: lessons attended, tutor feedback, strengths and areas to work on.' },
  { icon: Sparkles, title: 'Priority tutor matching', text: 'Personal tutor recommendations based on your subjects, goals, level and tutors’ verified ratings.' },
  { icon: Users, title: 'Family dashboard', text: 'Every child’s bookings, tutors, goals and progress in one place for parents.' },
  { icon: Headphones, title: 'Priority support', text: 'Your support requests go to the front of the queue.' },
]

/**
 * Shown instead of a Plus feature for Standard members. The server refuses the
 * feature anyway; this explains what it is and how to get it.
 */
export function PlusGate({ feature, children }) {
  const { profile } = useAuth()
  const { isPlus, loading, membership } = useMembership()
  if (isPlus) return children
  if (loading && !membership) return <div className="skeleton h-64 rounded-3xl" aria-busy="true" />
  const f = PLUS_FEATURES.find((x) => x.title === feature) ?? PLUS_FEATURES[0]
  const learner = profile?.role === 'student' || profile?.role === 'parent'
  return (
    <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={spring}
      className="relative overflow-hidden rounded-[1.75rem] bg-navy-950 p-8 text-white shadow-lift sm:p-10" data-testid="plus-gate">
      <div className="pointer-events-none absolute -top-20 -right-16 h-64 w-64 rounded-full bg-amber-400/20 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -bottom-24 -left-10 h-64 w-64 rounded-full bg-mint-400/20 blur-3xl" aria-hidden />
      <div className="relative max-w-xl">
        <PlusBadge size="lg" />
        <h2 className="mt-5 flex items-center gap-3 text-2xl font-bold text-white sm:text-3xl"><f.icon className="h-7 w-7 text-amber-300" />{f.title}</h2>
        <p className="mt-3 text-navy-200">{f.text}</p>
        <p className="mt-2 text-sm text-navy-300">This is part of TutorHaven Plus. Your Standard account keeps browsing, booking, paying per lesson and reviewing tutors.</p>
        <ul className="mt-6 grid gap-2 text-sm text-navy-100 sm:grid-cols-2">
          {PLUS_FEATURES.filter((x) => x !== f).slice(0, 4).map((x) => <li key={x.title} className="flex items-center gap-2"><x.icon className="h-4 w-4 text-mint-300" />{x.title}</li>)}
        </ul>
        {learner ? <Button className="mt-8" variant="mint" size="lg" to="/plus" icon={Crown}>See Plus plans</Button>
          : <p className="mt-6 text-sm text-navy-300">Plus is for student and parent accounts.</p>}
      </div>
    </motion.section>
  )
}

