import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'motion/react'
import { ChevronDown, LayoutDashboard, LogOut, Menu, X, CalendarDays } from 'lucide-react'
import { LogoMark, Wordmark } from '../../motion/AnimatedLogo'
import Button from '../ui/Button'
import Avatar from '../ui/Avatar'
import { useAuth } from '../../context/AuthContext'
import { ease, spring } from '../../motion/variants'

const links = [
  { to: '/tutors', label: 'Find tutors' },
  { to: '/#how-it-works', label: 'How it works' },
  { to: '/pricing', label: 'Pricing' },
  { to: '/signup?role=tutor', label: 'Become a tutor' },
]

export default function SiteHeader({ transparent = false }) {
  const { user, profile, signOut } = useAuth()
  const { scrollY } = useScroll()
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const [menu, setMenu] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  useMotionValueEvent(scrollY, 'change', (v) => setScrolled(v > 12))
  useEffect(() => {
    setOpen(false)
    setMenu(false)
  }, [location.pathname, location.hash])
  useEffect(() => {
    if (!menu) return
    const close = (e) => !e.target.closest?.('[data-user-menu]') && setMenu(false)
    const esc = (e) => e.key === 'Escape' && setMenu(false)
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('pointerdown', close)
      document.removeEventListener('keydown', esc)
    }
  }, [menu])

  const solid = scrolled || !transparent || open
  const onSignOut = async () => {
    await signOut()
    navigate('/')
  }

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <motion.div
        className="absolute inset-0 border-b bg-cream-50/80 backdrop-blur-xl"
        initial={false}
        animate={{ opacity: solid ? 1 : 0, borderColor: solid ? 'rgba(15,28,54,0.07)' : 'rgba(15,28,54,0)' }}
        transition={{ duration: 0.3 }}
      />
      <nav className="container-page relative flex h-16 items-center justify-between gap-4 lg:h-[4.5rem]" aria-label="Main">
        <Link to="/" className="flex items-center gap-2.5" aria-label="TutorHaven home">
          <motion.span whileHover={{ rotate: -6, scale: 1.05 }} transition={spring}>
            <LogoMark size={34} />
          </motion.span>
          <Wordmark />
        </Link>

        <ul className="hidden items-center gap-1 md:flex">
          {links.map((l) => {
            const active = l.to === '/tutors' ? location.pathname.startsWith('/tutors') : l.to === location.pathname
            return (
              <li key={l.to} className="relative">
                <NavLink to={l.to} className={`relative block rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${active ? 'text-navy-950' : 'text-navy-600 hover:text-navy-950'}`}>
                  {l.label}
                  {active && <motion.span layoutId="nav-underline" className="absolute inset-x-3.5 -bottom-0.5 h-0.5 rounded-full bg-mint-500" transition={spring} />}
                </NavLink>
              </li>
            )
          })}
        </ul>

        <div className="flex items-center gap-2">
          {user ? (
            <div className="relative" data-user-menu>
              <button
                type="button"
                onClick={() => setMenu((m) => !m)}
                aria-expanded={menu}
                aria-haspopup="menu"
                className="flex items-center gap-2 rounded-full border border-navy-900/10 bg-white py-1 pr-2.5 pl-1 shadow-soft transition-colors hover:border-navy-900/20"
              >
                <Avatar name={profile?.full_name || user.email} seed={user.id} size="xs" />
                <span className="hidden max-w-[8rem] truncate text-sm font-medium sm:block">{profile?.full_name?.split(' ')[0] || 'Account'}</span>
                <motion.span animate={{ rotate: menu ? 180 : 0 }}><ChevronDown className="h-4 w-4 text-navy-400" /></motion.span>
              </button>
              <AnimatePresence>
                {menu && (
                  <motion.div
                    role="menu"
                    initial={{ opacity: 0, y: -6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.98 }}
                    transition={{ duration: 0.18, ease }}
                    className="absolute right-0 mt-2 w-56 origin-top-right rounded-2xl border border-navy-900/8 bg-white p-1.5 shadow-lift"
                  >
                    <p className="truncate px-3 pt-2 pb-2.5 text-xs text-navy-400">{user.email}</p>
                    <Link role="menuitem" to="/dashboard" className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-navy-50"><LayoutDashboard className="h-4 w-4 text-navy-400" />Dashboard</Link>
                    <Link role="menuitem" to="/dashboard/sessions" className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-navy-50"><CalendarDays className="h-4 w-4 text-navy-400" />Sessions</Link>
                    <button role="menuitem" type="button" onClick={onSignOut} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-coral-600 hover:bg-coral-50"><LogOut className="h-4 w-4" />Sign out</button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <>
              <span className="hidden sm:block"><Button to="/signin" variant="ghost" size="sm">Sign in</Button></span>
              <Button to="/signup" size="sm">Get started</Button>
            </>
          )}
          <button type="button" className="grid h-10 w-10 place-items-center rounded-xl text-navy-800 md:hidden" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label={open ? 'Close menu' : 'Open menu'}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.span key={open ? 'x' : 'm'} initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.18 }}>
                {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </motion.span>
            </AnimatePresence>
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            className="relative border-b border-navy-900/5 bg-cream-50/95 backdrop-blur-xl md:hidden"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease }}
          >
            <motion.ul className="container-page space-y-1 py-4" initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.05, delayChildren: 0.05 } } }}>
              {links.map((l) => (
                <motion.li key={l.to} variants={{ hidden: { opacity: 0, x: -12 }, show: { opacity: 1, x: 0 } }}>
                  <Link to={l.to} className="block rounded-xl px-3 py-3 text-base font-medium text-navy-800 hover:bg-navy-900/5">{l.label}</Link>
                </motion.li>
              ))}
              {!user && (
                <motion.li variants={{ hidden: { opacity: 0, x: -12 }, show: { opacity: 1, x: 0 } }}>
                  <Link to="/signin" className="block rounded-xl px-3 py-3 text-base font-medium text-navy-800 hover:bg-navy-900/5">Sign in</Link>
                </motion.li>
              )}
            </motion.ul>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
