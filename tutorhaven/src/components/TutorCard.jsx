import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { ArrowUpRight, BadgeCheck, Clock, Globe } from 'lucide-react'
import Avatar from './ui/Avatar'
import { Stars } from './ui/StarRating'
import FavouriteButton from './FavouriteButton'
import Skeleton from './ui/Skeleton'
import { money, pluralize } from '../lib/format'
import { fadeUp, spring } from '../motion/variants'

export default function TutorCard({ tutor, layout = false }) {
  const rating = Number(tutor.rating) || 0
  return (
    <motion.article
      layout={layout}
      variants={fadeUp}
      initial="hidden"
      animate="show"
      exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.2 } }}
      whileHover="hover"
      className="group relative h-full"
    >
      <motion.div
        variants={{ hover: { y: -6 } }}
        transition={spring}
        className="card flex h-full flex-col overflow-hidden transition-shadow duration-300 group-hover:shadow-lift"
      >
        <div className="relative h-20 overflow-hidden bg-gradient-to-br from-navy-900 via-navy-800 to-mint-700">
          <div className="grain absolute inset-0 opacity-60" aria-hidden />
          <motion.div
            className="absolute -right-6 -bottom-10 h-28 w-28 rounded-full bg-mint-400/25 blur-2xl"
            variants={{ hover: { scale: 1.4, opacity: 0.9 } }}
            transition={{ duration: 0.6 }}
            aria-hidden
          />
          <div className="absolute top-3 right-3 z-10">
            <FavouriteButton tutorId={tutor.id} className="h-9 w-9" />
          </div>
        </div>
        <div className="flex flex-1 flex-col px-5 pb-5">
          <motion.div className="-mt-8 mb-3 w-fit" variants={{ hover: { scale: 1.05, rotate: -2 } }} transition={spring}>
            <Avatar name={tutor.full_name} src={tutor.avatar_url} seed={tutor.id} size="lg" ring />
          </motion.div>
          <div className="flex items-center gap-1.5">
            <h3 className="truncate text-lg font-semibold">
              <Link to={`/tutors/${tutor.id}`} className="after:absolute after:inset-0 after:content-['']">
                {tutor.full_name}
              </Link>
            </h3>
            <BadgeCheck className="h-[18px] w-[18px] shrink-0 text-mint-600" aria-label="Verified tutor" />
          </div>
          <p className="mt-1 line-clamp-2 min-h-[2.6em] text-sm leading-snug text-navy-600">{tutor.headline || 'Tutor on TutorHaven'}</p>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {tutor.subjects?.slice(0, 3).map((s) => (
              <span key={s} className="rounded-full bg-cream-200 px-2.5 py-1 text-xs font-medium text-navy-700">{s}</span>
            ))}
            {tutor.subjects?.length > 3 && <span className="rounded-full px-1.5 py-1 text-xs text-navy-400">+{tutor.subjects.length - 3}</span>}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-navy-500">
            <span className="flex items-center gap-1.5">
              {tutor.review_count > 0 ? (
                <>
                  <Stars value={rating} size={13} />
                  <span className="font-semibold text-navy-800">{rating.toFixed(1)}</span>
                  <span>({tutor.review_count})</span>
                </>
              ) : (
                <span className="rounded-full bg-mint-50 px-2 py-0.5 font-semibold text-mint-700">New tutor</span>
              )}
            </span>
            <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" aria-hidden />{pluralize(tutor.years_experience, 'yr')} exp.</span>
            {tutor.languages?.length > 0 && (
              <span className="flex items-center gap-1"><Globe className="h-3.5 w-3.5" aria-hidden />{tutor.languages.slice(0, 2).join(', ')}</span>
            )}
          </div>

          <div className="min-h-4 flex-1" />
          <div className="flex items-end justify-between border-t border-navy-900/[0.06] pt-4">
            <p>
              <span className="font-display text-xl font-bold text-navy-950">{money(tutor.hourly_rate)}</span>
              <span className="text-sm text-navy-500"> / hour</span>
            </p>
            <motion.span
              variants={{ hover: { x: 2, y: -2, backgroundColor: '#4cc897', color: '#0a1428' } }}
              className="grid h-9 w-9 place-items-center rounded-full bg-navy-900 text-white"
              aria-hidden
            >
              <ArrowUpRight className="h-4 w-4" />
            </motion.span>
          </div>
        </div>
      </motion.div>
    </motion.article>
  )
}

export function TutorCardSkeleton() {
  return (
    <div className="card overflow-hidden" aria-hidden>
      <div className="skeleton h-20 rounded-none" />
      <div className="px-5 pb-5">
        <div className="skeleton -mt-8 mb-3 h-16 w-16 rounded-full ring-4 ring-white" />
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="mt-2.5 h-3.5 w-full" />
        <Skeleton className="mt-1.5 h-3.5 w-4/5" />
        <div className="mt-4 flex gap-1.5">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
        <div className="mt-6 flex items-center justify-between border-t border-navy-900/[0.06] pt-4">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-9 w-9 rounded-full" />
        </div>
      </div>
    </div>
  )
}
