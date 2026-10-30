import { Suspense } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { CalendarDays, CreditCard, LayoutDashboard, LogOut, Search, Settings, ShieldCheck, UserRoundPen, Users } from 'lucide-react'
import { LogoMark, Wordmark } from '../../motion/AnimatedLogo'
import Avatar from '../ui/Avatar'
import { useAuth } from '../../context/AuthContext'
import { ROLE_LABEL } from '../../lib/constants'
import { ease, spring } from '../../motion/variants'
import SetupBanner from './SetupBanner'

const NAV = {
  student: [
    { to: '/dashboard', label: 'Overview', icon: LayoutDashboard, end: true },
    { to: '/tutors', label: 'Find tutors', icon: Search },
    { to: '/dashboard/sessions', label: 'Sessions', icon: CalendarDays },
    { to: '/dashboard/billing', label: 'Billing', icon: CreditCard },
    { to: '/dashboard/settings', label: 'Settings', icon: Settings },
  ],
  parent: [
    { to: '/dashboard', label: 'Overview', icon: LayoutDashboard, end: true },
    { to: '/tutors', label: 'Find tutors', icon: Search },
    { to: '/dashboard/sessions', label: 'Sessions', icon: CalendarDays },
    { to: '/dashboard/billing', label: 'Billing', icon: CreditCard },
    { to: '/dashboard/settings', label: 'Settings', icon: Settings },
  ],
  tutor: [
    { to: '/dashboard', label: 'Overview', icon: LayoutDashboard, end: true },
    { to: '/dashboard/sessions', label: 'Sessions', icon: CalendarDays },
    { to: '/dashboard/listing', label: 'My listing', icon: UserRoundPen },
    { to: '/dashboard/settings', label: 'Settings', icon: Settings },
  ],
  admin: [
    { to: '/dashboard', label: 'Overview', icon: LayoutDashboard, end: true },
    { to: '/dashboard/users', label: 'Users', icon: Users },
    { to: '/dashboard/sessions', label: 'Sessions', icon: CalendarDays },
    { to: '/dashboard/settings', label: 'Settings', icon: Settings },
  ],
}

export default function DashboardLayout() {
  const { profile, user, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const items = NAV[profile?.role] ?? NAV.student
  const isActive = (it) => (it.end ? location.pathname === it.to : location.pathname.startsWith(it.to))

  return (
    <div className="min-h-dvh bg-cream-100 lg:grid lg:grid-cols-[17rem_1fr]">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-navy-900/[0.06] bg-cream-50 px-4 py-6 lg:flex">
        <Link to="/" className="flex items-center gap-2.5 px-2">
          <LogoMark size={34} />
          <Wordmark />
        </Link>
        <nav className="mt-10 flex-1 space-y-1" aria-label="Dashboard">
          {items.map((it) => {
            const active = isActive(it)
            return (
              <NavLink key={it.to} to={it.to} end={it.end} className={`relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors ${active ? 'text-white' : 'text-navy-600 hover:bg-navy-900/[0.04] hover:text-navy-950'}`}>
                {active && <motion.span layoutId="side-active" className="absolute inset-0 rounded-xl bg-navy-900 shadow-[0_8px_20px_-10px_rgb(15_28_54/0.6)]" transition={spring} />}
                <it.icon className={`relative h-[18px] w-[18px] ${active ? 'text-mint-300' : ''}`} aria-hidden />
                <span className="relative">{it.label}</span>
              </NavLink>
            )
          })}
        </nav>
        {profile?.role === 'admin' && (
          <p className="mb-3 flex items-center gap-2 rounded-xl bg-mint-50 px-3 py-2 text-xs font-semibold text-mint-700"><ShieldCheck className="h-4 w-4" />Admin access</p>
        )}
        <div className="flex items-center gap-3 rounded-2xl border border-navy-900/[0.06] bg-white p-3 shadow-soft">
          <Avatar name={profile?.full_name} seed={user?.id} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{profile?.full_name}</p>
            <p className="text-xs text-navy-400">{ROLE_LABEL[profile?.role]}</p>
          </div>
          <button type="button" onClick={async () => { await signOut(); navigate('/') }} className="rounded-lg p-2 text-navy-400 transition-colors hover:bg-coral-50 hover:text-coral-600" aria-label="Sign out">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </aside>

      <div className="min-w-0">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-navy-900/[0.06] bg-cream-50/85 px-4 backdrop-blur-xl lg:hidden">
          <Link to="/" className="flex items-center gap-2" aria-label="TutorHaven home">
            <LogoMark size={30} />
            <Wordmark className="!text-lg" />
          </Link>
          <Link to="/dashboard/settings" aria-label="Settings"><Avatar name={profile?.full_name} seed={user?.id} size="sm" /></Link>
        </header>

        <main className="mx-auto w-full max-w-6xl px-4 pt-6 pb-28 sm:px-6 lg:px-10 lg:pt-10 lg:pb-12">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0, transition: { duration: 0.4, ease } }}
              exit={{ opacity: 0, y: -6, transition: { duration: 0.15 } }}
            >
              <Suspense fallback={<div className="space-y-4" aria-busy="true"><div className="skeleton h-10 w-56 rounded-xl" /><div className="skeleton h-52 rounded-3xl" /></div>}>
                <Outlet />
              </Suspense>
            </motion.div>
          </AnimatePresence>
        </main>
        <SetupBanner />
      </div>

      {/* Mobile bottom navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-navy-900/[0.06] bg-white/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden" aria-label="Dashboard">
        <ul className="mx-auto flex max-w-md justify-around px-2">
          {items.map((it) => {
            const active = isActive(it)
            return (
              <li key={it.to} className="flex-1">
                <NavLink to={it.to} end={it.end} className={`relative flex flex-col items-center gap-1 py-2.5 text-[0.68rem] font-semibold ${active ? 'text-navy-950' : 'text-navy-400'}`}>
                  {active && <motion.span layoutId="bottom-active" className="absolute top-0 h-0.5 w-8 rounded-full bg-mint-500" transition={spring} />}
                  <motion.span animate={{ y: active ? -1 : 0, scale: active ? 1.08 : 1 }} transition={spring}>
                    <it.icon className="h-5 w-5" aria-hidden />
                  </motion.span>
                  {it.label}
                </NavLink>
              </li>
            )
          })}
        </ul>
      </nav>
    </div>
  )
}

export function PageHeader({ title, subtitle, action, eyebrow }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <p className="mb-2 text-sm font-medium text-mint-700">{eyebrow}</p>}
        <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1.5 text-navy-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}
