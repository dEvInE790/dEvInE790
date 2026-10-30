import { motion } from 'motion/react'
import { ArrowRight, CalendarDays, Clock, Search } from 'lucide-react'
import Avatar from './ui/Avatar'
import Button from './ui/Button'
import Float from '../motion/Float'
import { dateLong, relativeFromNow, time } from '../lib/format'
import { fadeUp } from '../motion/variants'

/** Hero card for a dashboard: the next confirmed session, or a call to action. */
export default function NextSessionCard({ booking, viewer = 'learner', emptyTitle, emptyBody, emptyAction }) {
  return (
    <motion.div variants={fadeUp} className="relative overflow-hidden rounded-3xl bg-navy-950 p-6 text-white shadow-lift sm:p-8">
      <div className="grain absolute inset-0" aria-hidden />
      <div className="pointer-events-none absolute -top-20 -right-10 h-64 w-64 rounded-full bg-mint-400/25 blur-3xl" aria-hidden />
      <Float className="pointer-events-none absolute right-6 bottom-6 hidden sm:block" distance={8} duration={6}>
        <div className="grid h-16 w-16 place-items-center rounded-2xl border border-white/10 bg-white/5 backdrop-blur" aria-hidden>
          <CalendarDays className="h-7 w-7 text-mint-300" />
        </div>
      </Float>
      {booking ? (
        <div className="relative">
          <p className="flex items-center gap-2 text-sm font-medium text-mint-300">
            <span className="h-2 w-2 animate-pulse rounded-full bg-mint-400" />Next session · {relativeFromNow(booking.starts_at)}
          </p>
          <h2 className="mt-3 text-2xl font-bold text-white sm:text-3xl">{booking.subject}</h2>
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-navy-200">
            <span className="flex items-center gap-2">
              <Avatar
                name={viewer === 'tutor' ? booking.student?.full_name : booking.tutor?.profile?.full_name}
                seed={viewer === 'tutor' ? booking.student_id : booking.tutor_id}
                size="xs"
              />
              {viewer === 'tutor' ? booking.student?.full_name : booking.tutor?.profile?.full_name}
              {viewer === 'parent' && booking.student && <span className="text-navy-300">· for {booking.student.full_name}</span>}
            </span>
            <span className="flex items-center gap-1.5"><CalendarDays className="h-4 w-4" />{dateLong(booking.starts_at)}</span>
            <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" />{time(booking.starts_at)} – {time(booking.ends_at)}</span>
          </div>
          <Button to="/dashboard/sessions" variant="mint" size="sm" className="mt-6" iconRight={ArrowRight}>View sessions</Button>
        </div>
      ) : (
        <div className="relative max-w-md">
          <h2 className="text-2xl font-bold text-white">{emptyTitle}</h2>
          <p className="mt-2 text-navy-200">{emptyBody}</p>
          {emptyAction ?? <Button to="/tutors" variant="mint" size="sm" className="mt-6" icon={Search}>Find a tutor</Button>}
        </div>
      )}
    </motion.div>
  )
}
