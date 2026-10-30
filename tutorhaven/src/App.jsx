import { lazy, Suspense, useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AnimatePresence, MotionConfig } from 'motion/react'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import { FavouritesProvider } from './context/FavouritesContext'
import RequireAuth from './components/layout/RequireAuth'
import DashboardLayout from './components/layout/DashboardLayout'
import FullPageLoader from './components/layout/FullPageLoader'
import Landing from './pages/Landing'
const Tutors = lazy(() => import('./pages/Tutors'))
const TutorProfile = lazy(() => import('./pages/TutorProfile'))
const Pricing = lazy(() => import('./pages/Pricing'))
const SignIn = lazy(() => import('./pages/SignIn'))
const SignUp = lazy(() => import('./pages/SignUp'))
const Onboarding = lazy(() => import('./pages/Onboarding'))
const Book = lazy(() => import('./pages/Book'))
const Checkout = lazy(() => import('./pages/Checkout'))
const NotFound = lazy(() => import('./pages/NotFound'))
const DashboardHome = lazy(() => import('./pages/dashboard/DashboardHome'))
const Sessions = lazy(() => import('./pages/dashboard/Sessions'))
const Billing = lazy(() => import('./pages/dashboard/Billing'))
const Settings = lazy(() => import('./pages/dashboard/Settings'))
const TutorListing = lazy(() => import('./pages/dashboard/TutorListing'))
const AdminUsers = lazy(() => import('./pages/dashboard/AdminUsers'))

function AnimatedRoutes() {
  const location = useLocation()
  // The dashboard animates its own outlet so the shell stays put between tabs.
  const key = location.pathname.startsWith('/dashboard') ? 'dashboard' : location.pathname

  useEffect(() => {
    if (!location.hash) window.scrollTo({ top: 0, behavior: 'instant' })
  }, [location.pathname, location.hash])

  return (
    <Suspense fallback={<FullPageLoader />}>
    <AnimatePresence mode="wait">
      <Routes location={location} key={key}>
        <Route path="/" element={<Landing />} />
        <Route path="/tutors" element={<Tutors />} />
        <Route path="/tutors/:id" element={<TutorProfile />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/onboarding" element={<RequireAuth allowIncomplete><Onboarding /></RequireAuth>} />
        <Route path="/book/:tutorId" element={<RequireAuth roles={['student', 'parent']}><Book /></RequireAuth>} />
        <Route path="/checkout/:bookingId" element={<RequireAuth><Checkout /></RequireAuth>} />
        <Route path="/dashboard" element={<RequireAuth><DashboardLayout /></RequireAuth>}>
          <Route index element={<DashboardHome />} />
          <Route path="sessions" element={<Sessions />} />
          <Route path="billing" element={<RequireAuth roles={['student', 'parent']}><Billing /></RequireAuth>} />
          <Route path="settings" element={<Settings />} />
          <Route path="listing" element={<RequireAuth roles={['tutor']}><TutorListing /></RequireAuth>} />
          <Route path="users" element={<RequireAuth roles={['admin']}><AdminUsers /></RequireAuth>} />
        </Route>
        <Route path="/login" element={<Navigate to="/signin" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AnimatePresence>
    </Suspense>
  )
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <ToastProvider>
        <AuthProvider>
          <FavouritesProvider>
            <AnimatedRoutes />
          </FavouritesProvider>
        </AuthProvider>
      </ToastProvider>
    </MotionConfig>
  )
}
