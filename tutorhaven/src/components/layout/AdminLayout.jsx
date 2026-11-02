import { Suspense } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import FrozenOutlet from './FrozenOutlet'
import { AnimatePresence, motion } from 'motion/react'
import { BadgeCheck, Building2, CalendarDays, ExternalLink, FileCheck2, GraduationCap, Landmark, LayoutDashboard, LogOut, Settings, ShieldCheck, Tags, Users, Wallet } from 'lucide-react'
import { LogoMark, Wordmark } from '../../motion/AnimatedLogo'
import Avatar from '../ui/Avatar'
import { useAuth } from '../../context/AuthContext'
import { ease, spring } from '../../motion/variants'

const NAV = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/admin/tutors', label: 'Tutors', icon: GraduationCap },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/bookings', label: 'Bookings', icon: CalendarDays },
  { to: '/admin/qualifications', label: 'Qualifications', icon: FileCheck2 },
  { to: '/admin/payments', label: 'Payments', icon: Wallet },
  { to: '/admin/payouts', label: 'Tutor payouts', icon: Landmark },
  { to: '/admin/subscriptions', label: 'Subscriptions', icon: BadgeCheck },
  { to: '/admin/plans', label: 'Plans & prices', icon: Tags },
  { to: '/admin/business', label: 'Business & policies', icon: Building2 },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
]

/** Desktop-first admin console with its own navigation, separate from the learner app. */
export default function AdminLayout() {
  const { profile, user, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const isActive = (it) => (it.end ? location.pathname === it.to : location.pathname.startsWith(it.to))

  return (
    <div className="min-h-dvh bg-cream-100 lg:grid lg:grid-cols-[16rem_1fr]">
      <aside className="sticky top-0 hidden h-dvh flex-col bg-navy-950 px-4 py-6 text-navy-200 lg:flex">
        <Link to="/admin" className="flex items-center gap-2.5 px-2">
          <LogoMark size={34} dark />
          <Wordmark light />
        </Link>
        <p className="mt-3 ml-2 flex w-fit items-center gap-1.5 rounded-full bg-mint-400/15 px-2.5 py-1 text-[0.7rem] font-semibold tracking-wide text-mint-300 uppercase">
          <ShieldCheck className="h-3.5 w-3.5" />Admin panel
        </p>
        <nav className="mt-8 flex-1 space-y-1 overflow-y-auto" aria-label="Admin">
          {NAV.map((it) => {
            const active = isActive(it)
            return (
              <NavLink key={it.to} to={it.to} end={it.end} className={`relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors ${active ? 'text-navy-950' : 'text-navy-200 hover:bg-white/5 hover:text-white'}`}>
                {active && <motion.span layoutId="admin-active" className="absolute inset-0 rounded-xl bg-mint-400" transition={spring} />}
                <it.icon className="relative h-[18px] w-[18px]" aria-hidden />
                <span className="relative">{it.label}</span>
              </NavLink>
            )
          })}
        </nav>
        <Link to="/" className="mb-3 flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm text-navy-300 hover:bg-white/5 hover:text-white">
          <ExternalLink className="h-4 w-4" />View site
        </Link>
        <div className="flex items-center gap-3 rounded-2xl bg-white/5 p-3">
          <Avatar name={profile?.full_name} seed={user?.id} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">{profile?.full_name}</p>
            <p className="truncate text-xs text-navy-300">{user?.email}</p>
          </div>
          <button type="button" onClick={async () => { await signOut(); navigate('/') }} className="rounded-lg p-2 text-navy-300 transition-colors hover:bg-white/10 hover:text-white" aria-label="Sign out">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </aside>

      <div className="min-w-0">
        {/* Mobile / tablet header with scrollable section tabs */}
        <header className="sticky top-0 z-30 bg-navy-950 lg:hidden">
          <div className="flex h-14 items-center justify-between px-4">
            <Link to="/admin" className="flex items-center gap-2"><LogoMark size={30} dark /><Wordmark light className="!text-lg" /></Link>
            <button type="button" onClick={async () => { await signOut(); navigate('/') }} className="rounded-lg p-2 text-navy-300" aria-label="Sign out"><LogOut className="h-4 w-4" /></button>
          </div>
          <nav className="scrollbar-none flex gap-1 overflow-x-auto px-3 pb-3" aria-label="Admin">
            {NAV.map((it) => (
              <NavLink key={it.to} to={it.to} end={it.end} className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium ${isActive(it) ? 'bg-mint-400 text-navy-950' : 'text-navy-200'}`}>
                {it.label}
              </NavLink>
            ))}
          </nav>
        </header>
        <main className="mx-auto w-full max-w-7xl px-4 pt-6 pb-16 sm:px-6 lg:px-10 lg:pt-10">
          <AnimatePresence mode="wait">
            <motion.div key={location.pathname} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0, transition: { duration: 0.35, ease } }} exit={{ opacity: 0, y: -6, transition: { duration: 0.15 } }}>
              <Suspense fallback={<div className="space-y-4" aria-busy="true"><div className="skeleton h-10 w-56 rounded-xl" /><div className="skeleton h-52 rounded-3xl" /></div>}>
                <FrozenOutlet />
              </Suspense>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}
