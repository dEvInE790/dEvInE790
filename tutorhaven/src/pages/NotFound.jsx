import { Compass } from 'lucide-react'
import PublicLayout from '../components/layout/PublicLayout'
import PageTransition from '../motion/PageTransition'
import Float from '../motion/Float'
import Button from '../components/ui/Button'

export default function NotFound() {
  return (
    <PublicLayout footer={false}>
      <PageTransition className="container-page flex min-h-[80dvh] flex-col items-center justify-center pt-20 text-center">
        <Float distance={12} duration={5} rotate={6}>
          <div className="grid h-24 w-24 place-items-center rounded-[2rem] bg-navy-900 shadow-lift"><Compass className="h-11 w-11 text-mint-300" strokeWidth={1.6} /></div>
        </Float>
        <p className="mt-8 font-display text-sm font-bold tracking-widest text-mint-700">404</p>
        <h1 className="mt-2 text-3xl font-bold sm:text-4xl">This page took a different path</h1>
        <p className="mt-3 max-w-md text-navy-500">The page you’re looking for doesn’t exist or has moved.</p>
        <div className="mt-8 flex gap-3">
          <Button to="/">Go home</Button>
          <Button to="/tutors" variant="secondary">Find a tutor</Button>
        </div>
      </PageTransition>
    </PublicLayout>
  )
}
