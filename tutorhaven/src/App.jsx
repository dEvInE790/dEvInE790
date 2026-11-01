import { lazy, Suspense, useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AnimatePresence, MotionConfig } from 'motion/react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import { FavouritesProvider } from './context/FavouritesContext'
import { SettingsProvider } from './context/SettingsContext'
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
const AdminLayout = lazy(() => import('./components/layout/AdminLayout'))
const AdminOverview = lazy(() => import('./pages/admin/Overview'))
const AdminTutors = lazy(() => import('./pages/admin/Tutors'))
const AdminUsers = lazy(() => import('./pages/admin/Users'))
const AdminBookings = lazy(() => import('./pages/admin/Bookings'))
const AdminPayments = lazy(() => import('./pages/admin/Payments'))
const AdminSettings = lazy(() => import('./pages/admin/Settings'))
const DemoBar = import.meta.env.VITE_DEMO === 'true' ? lazy(() => import('./demo/DemoBar')) : null

// Admins use the separate admin panel; send them there before the learner dashboard mounts.
function DashboardGate() {
  const { profile } = useAuth()
  const location = useLocation()
  if (profile?.role === 'admin' && location.pathname === '/dashboard') return <Navigate to="/admin" replace />
  return <DashboardLayout />
}

function AnimatedRoutes() {
  const location = useLocation()
  // The dashboard animates its own outlet so the shell stays put between tabs.
  const key = location.pathname.startsWith('/dashboard') ? 'dashboard' : location.pathname.startsWith('/admin') ? 'admin' : location.pathname

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
        <Route path="/dashboard" element={<RequireAuth><DashboardGate /></RequireAuth>}>
          <Route index element={<DashboardHome />} />
          <Route path="sessions" element={<Sessions />} />
          <Route path="billing" element={<RequireAuth roles={['student', 'parent']}><Billing /></RequireAuth>} />
          <Route path="settings" element={<Settings />} />
          <Route path="listing" element={<RequireAuth roles={['tutor']}><TutorListing /></RequireAuth>} />
        </Route>
        <Route path="/admin" element={<RequireAuth roles={['admin']}><AdminLayout /></RequireAuth>}>
          <Route index element={<AdminOverview />} />
          <Route path="tutors" element={<AdminTutors />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="bookings" element={<AdminBookings />} />
          <Route path="payments" element={<AdminPayments />} />
          <Route path="settings" element={<AdminSettings />} />
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
        <SettingsProvider>
        <AuthProvider>
          <FavouritesProvider>
            <AnimatedRoutes />
            {DemoBar && <Suspense fallback={null}><DemoBar /></Suspense>}
          </FavouritesProvider>
        </AuthProvider>
        </SettingsProvider>
      </ToastProvider>
    </MotionConfig>
  )
}
