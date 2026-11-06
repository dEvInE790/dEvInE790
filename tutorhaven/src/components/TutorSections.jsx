import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { Crown, Sparkles } from 'lucide-react'
import TutorCard, { TutorCardSkeleton } from './TutorCard'
import Tabs from './ui/Tabs'
import { PlusBadge } from './Plus'
import useAsync from '../lib/useAsync'
import { getPersonalRecommendations, getTutorSections } from '../lib/api'
import { useMembership } from '../context/MembershipContext'
import { useAuth } from '../context/AuthContext'

const SECTIONS = [
  ['for_you', 'Recommended for you', 'Matched to your subjects, goals, level and tutors’ verified ratings.'],
  ['top_rated', 'Top rated', 'Highest rated by verified learners. Ratings with few reviews are weighted towards the average, so one review can’t top the list.'],
  ['most_reviewed', 'Most reviewed', 'Tutors with the most verified reviews.'],
  ['newly_verified', 'Newly verified', 'Tutors approved in the last 60 days. Be one of their first learners.'],
  ['popular', 'Popular', 'Most booked in the last 90 days.'],
]

/**
 * Discovery sections built from real tutor data. Plus members also get
 * personal matches; everyone gets top-rated, most-reviewed, new and popular.
 */
export default function TutorSections({ studentId = null, limit = 6, title = 'Discover tutors', className = '' }) {
  const { user } = useAuth()
  const { isPlus, membership } = useMembership()
  const sections = useAsync(() => getTutorSections(limit), [limit])
  const personal = useAsync(() => getPersonalRecommendations(studentId, limit), [studentId, limit, isPlus], { enabled: isPlus })
  const data = useMemo(() => ({ ...(sections.data ?? {}), for_you: isPlus ? personal.data ?? [] : null }), [sections.data, personal.data, isPlus])
  const ordered = isPlus ? SECTIONS : [...SECTIONS.slice(1), SECTIONS[0]]
  const available = ordered.filter(([key]) => (key === 'for_you' ? !!user && (isPlus || membership) : data[key]?.length > 0))
  const [tab, setTab] = useState(null)
  const active = available.find(([k]) => k === tab) ?? available[0]

  if (sections.loading) {
    return <div className={`grid gap-5 sm:grid-cols-2 xl:grid-cols-3 ${className}`}>{[0, 1, 2].map((i) => <TutorCardSkeleton key={i} />)}</div>
  }
  if (!available.length || (available.length === 1 && available[0][0] === 'for_you' && !isPlus)) return null
  const [key, , blurb] = active
  const list = data[key] ?? []

  return (
    <section className={className} aria-label={title} data-testid="tutor-sections">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">{title}</h2>
          <p className="text-sm text-navy-500">{blurb}</p>
        </div>
      </div>
      <Tabs className="mb-5" value={key} onChange={setTab} tabs={available.map(([value, label]) => ({ value, label: value === 'for_you' ? <span className="flex items-center gap-1.5">{label}<Crown className="h-3.5 w-3.5 text-amber-500" /></span> : label }))} />
      <AnimatePresence mode="wait">
        <motion.div key={key} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.25 }}>
          {key === 'for_you' && !isPlus ? (
            <div className="flex flex-col items-start gap-3 rounded-3xl bg-navy-950 p-6 text-white sm:flex-row sm:items-center">
              <Sparkles className="h-8 w-8 shrink-0 text-amber-300" />
              <p className="flex-1 text-sm text-navy-200"><PlusBadge className="mr-2" />Plus members get tutors matched to their subjects, goals and level, with the reasons for each match.</p>
              <Link to="/plus" className="rounded-xl bg-mint-400 px-4 py-2 text-sm font-semibold text-navy-950">See Plus</Link>
            </div>
          ) : key === 'for_you' && personal.loading ? (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <TutorCardSkeleton key={i} />)}</div>
          ) : !list.length ? (
            <p className="rounded-2xl bg-cream-100 p-4 text-sm text-navy-500">No matches yet. Add subjects to your profile or set a learning goal.</p>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {list.map((t) => (
                <div key={t.id} className="flex flex-col gap-2">
                  <TutorCard tutor={t} />
                  {t.reasons?.length > 0 && (
                    <ul className="flex flex-wrap gap-1.5 px-1" aria-label={`Why ${t.full_name}`}>
                      {t.reasons.slice(0, 3).map((r) => <li key={r} className="rounded-full bg-mint-50 px-2.5 py-1 text-xs font-medium text-mint-800">{r}</li>)}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </section>
  )
}
