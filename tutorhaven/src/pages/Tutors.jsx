import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { Search, SearchX, SlidersHorizontal, X } from 'lucide-react'
import PublicLayout from '../components/layout/PublicLayout'
import PageTransition from '../motion/PageTransition'
import TutorCard, { TutorCardSkeleton } from '../components/TutorCard'
import Dropdown from '../components/ui/Dropdown'
import Modal from '../components/ui/Modal'
import Button from '../components/ui/Button'
import EmptyState, { ErrorState } from '../components/ui/EmptyState'
import { ChipGroup } from '../components/ui/Field'
import { LoadingRegion } from '../components/ui/Skeleton'
import useAsync from '../lib/useAsync'
import { searchTutors } from '../lib/api'
import { LEVELS, SUBJECTS } from '../lib/constants'
import { money, pluralize } from '../lib/format'
import { ease } from '../motion/variants'

const SORTS = [
  { value: 'rating', label: 'Top rated' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'experience', label: 'Most experienced' },
]
const PRICE_STEPS = [0, 30, 40, 50, 75]

export default function Tutors() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const subject = params.get('subject') ?? ''
  const level = params.get('level') ?? ''
  const maxRate = Number(params.get('max')) || 0
  const sort = params.get('sort') ?? 'rating'
  const [draft, setDraft] = useState(q)
  const [filtersOpen, setFiltersOpen] = useState(false)

  useEffect(() => setDraft(q), [q])

  // Debounce free-text search into the URL.
  useEffect(() => {
    if (draft === q) return
    const t = setTimeout(() => update({ q: draft.trim() }), 350)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft])

  const update = (patch) => {
    const next = new URLSearchParams(params)
    for (const [k, v] of Object.entries(patch)) {
      if (v === '' || v == null || v === 0) next.delete(k)
      else next.set(k, String(v))
    }
    setParams(next, { replace: true })
  }

  const results = useAsync(() => searchTutors({ q, subject, level, maxRate: maxRate || null, sort }), [q, subject, level, maxRate, sort])
  const activeCount = [subject, level, maxRate].filter(Boolean).length

  const filters = (
    <div className="space-y-7">
      <div>
        <h3 className="mb-3 text-sm font-semibold text-navy-800">Subject</h3>
        <ChipGroup size="sm" multiple={false} options={['All', ...SUBJECTS]} value={subject || 'All'} onChange={(v) => update({ subject: v === 'All' ? '' : v })} label="Subject" />
      </div>
      <div>
        <h3 className="mb-3 text-sm font-semibold text-navy-800">Level</h3>
        <ChipGroup size="sm" multiple={false} options={['All', ...LEVELS]} value={level || 'All'} onChange={(v) => update({ level: v === 'All' ? '' : v })} label="Level" />
      </div>
      <div>
        <h3 className="mb-3 text-sm font-semibold text-navy-800">Max hourly rate</h3>
        <ChipGroup
          size="sm"
          multiple={false}
          options={PRICE_STEPS.map((p) => (p ? `Up to ${money(p)}` : 'Any price'))}
          value={maxRate ? `Up to ${money(maxRate)}` : 'Any price'}
          onChange={(v) => update({ max: PRICE_STEPS.find((p) => (p ? `Up to ${money(p)}` : 'Any price') === v) })}
          label="Max hourly rate"
        />
      </div>
    </div>
  )

  const chips = useMemo(
    () => [
      subject && { key: 'subject', label: subject },
      level && { key: 'level', label: level },
      maxRate && { key: 'max', label: `≤ ${money(maxRate)}/hr` },
      q && { key: 'q', label: `“${q}”` },
    ].filter(Boolean),
    [subject, level, maxRate, q],
  )

  return (
    <PublicLayout>
      <PageTransition>
        <section className="relative overflow-hidden border-b border-navy-900/5 bg-cream-50 pt-28 pb-10 lg:pt-32">
          <div className="pointer-events-none absolute -top-24 right-0 h-80 w-80 rounded-full bg-mint-200/50 blur-3xl" aria-hidden />
          <div className="container-page relative">
            <h1 className="text-3xl font-bold sm:text-5xl">Find your tutor</h1>
            <p className="mt-3 max-w-xl text-navy-500">Browse verified tutors, compare reviews and book a time that suits you.</p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1" role="search">
                <Search className="pointer-events-none absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-navy-300" aria-hidden />
                <label htmlFor="tutor-search" className="sr-only">Search tutors</label>
                <input
                  id="tutor-search"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Search by name, subject or keyword"
                  className="h-13 w-full rounded-2xl border border-navy-900/10 bg-white pr-11 pl-12 text-base shadow-soft outline-none transition focus:border-mint-500 focus:ring-4 focus:ring-mint-400/20"
                />
                <AnimatePresence>
                  {draft && (
                    <motion.button
                      type="button"
                      initial={{ opacity: 0, scale: 0.6 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.6 }}
                      onClick={() => setDraft('')}
                      className="absolute top-1/2 right-3 -translate-y-1/2 rounded-full p-1.5 text-navy-400 hover:bg-navy-50"
                      aria-label="Clear search"
                    >
                      <X className="h-4 w-4" />
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>
              <div className="flex gap-3">
                <Button variant="secondary" className="!h-13 lg:hidden" icon={SlidersHorizontal} onClick={() => setFiltersOpen(true)}>
                  Filters{activeCount ? ` (${activeCount})` : ''}
                </Button>
                <Dropdown value={sort} onChange={(v) => update({ sort: v === 'rating' ? '' : v })} options={SORTS} label="Sort:" align="right" className="min-w-[13rem] flex-1" buttonClassName="!h-13 !rounded-2xl" />
              </div>
            </div>

            <AnimatePresence initial={false}>
              {chips.length > 0 && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25, ease }} className="overflow-hidden">
                  <div className="flex flex-wrap items-center gap-2 pt-4">
                    <AnimatePresence>
                      {chips.map((c) => (
                        <motion.button
                          layout
                          key={c.key}
                          type="button"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          onClick={() => (c.key === 'q' ? setDraft('') : update({ [c.key]: '' }))}
                          className="flex items-center gap-1.5 rounded-full bg-navy-900 py-1.5 pr-2 pl-3 text-xs font-semibold text-white"
                          aria-label={`Remove filter ${c.label}`}
                        >
                          {c.label}<X className="h-3.5 w-3.5 text-navy-300" />
                        </motion.button>
                      ))}
                    </AnimatePresence>
                    <button type="button" onClick={() => { setDraft(''); setParams({}, { replace: true }) }} className="px-2 text-xs font-semibold text-navy-500 hover:text-navy-900">
                      Clear all
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>

        <section className="container-page grid gap-10 py-10 lg:grid-cols-[16rem_1fr]">
          <aside className="hidden lg:block">
            <div className="sticky top-24">{filters}</div>
          </aside>

          <div className="min-w-0">
            <p className="mb-5 h-5 text-sm text-navy-500" aria-live="polite">
              {!results.loading && !results.error && results.data && pluralize(results.data.length, 'tutor') + ' found'}
            </p>
            {results.error ? (
              <ErrorState message={results.error} onRetry={results.reload} />
            ) : results.loading && !results.data ? (
              <LoadingRegion label="Loading tutors">
                <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, i) => <TutorCardSkeleton key={i} />)}
                </div>
              </LoadingRegion>
            ) : results.data.length === 0 ? (
              <EmptyState
                icon={SearchX}
                title="No tutors match those filters"
                action={<Button variant="secondary" onClick={() => { setDraft(''); setParams({}, { replace: true }) }}>Reset filters</Button>}
              >
                Try a broader subject, a higher budget or a different keyword.
              </EmptyState>
            ) : (
              <motion.div layout className={`grid gap-6 transition-opacity sm:grid-cols-2 xl:grid-cols-3 ${results.loading ? 'opacity-60' : ''}`}>
                <AnimatePresence mode="popLayout">
                  {results.data.map((t) => <TutorCard key={t.id} tutor={t} layout />)}
                </AnimatePresence>
              </motion.div>
            )}
          </div>
        </section>

        <Modal open={filtersOpen} onClose={() => setFiltersOpen(false)} title="Filters">
          {filters}
          <div className="mt-8 flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setParams(q ? { q } : {}, { replace: true })}>Reset</Button>
            <Button className="flex-1" onClick={() => setFiltersOpen(false)}>
              Show {results.data ? pluralize(results.data.length, 'tutor') : 'tutors'}
            </Button>
          </div>
        </Modal>
      </PageTransition>
    </PublicLayout>
  )
}
