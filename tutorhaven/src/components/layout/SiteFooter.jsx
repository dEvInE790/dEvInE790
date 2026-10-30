import { Link } from 'react-router-dom'
import { LogoMark, Wordmark } from '../../motion/AnimatedLogo'

const cols = [
  { title: 'Learn', links: [['Find a tutor', '/tutors'], ['Pricing', '/pricing'], ['How it works', '/#how-it-works']] },
  { title: 'Teach', links: [['Become a tutor', '/signup?role=tutor'], ['Tutor dashboard', '/dashboard']] },
  { title: 'Families', links: [['Parent accounts', '/signup?role=parent'], ['Family plan', '/pricing']] },
]

export default function SiteFooter() {
  return (
    <footer className="relative overflow-hidden bg-navy-950 text-navy-200">
      <div className="pointer-events-none absolute -top-40 left-1/2 h-80 w-[48rem] -translate-x-1/2 rounded-full bg-mint-500/10 blur-3xl" aria-hidden />
      <div className="container-page relative grid gap-10 py-14 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div>
          <Link to="/" className="flex items-center gap-2.5">
            <LogoMark size={34} dark />
            <Wordmark light />
          </Link>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-navy-300">Find the right tutor. Unlock your potential. Verified tutors, flexible scheduling and progress you can see.</p>
        </div>
        {cols.map((c) => (
          <div key={c.title}>
            <h3 className="font-display text-sm font-semibold text-white">{c.title}</h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              {c.links.map(([label, to]) => (
                <li key={label}><Link to={to} className="text-navy-300 transition-colors hover:text-mint-300">{label}</Link></li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="container-page relative flex flex-col gap-2 border-t border-white/10 py-6 text-xs text-navy-400 sm:flex-row sm:justify-between">
        <p>© {new Date().getFullYear()} TutorHaven. All rights reserved.</p>
        <p>Built for learners everywhere.</p>
      </div>
    </footer>
  )
}
