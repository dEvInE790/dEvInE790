import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import FullPageLoader from './FullPageLoader'
import SetupRequired from '../../pages/SetupRequired'
import Button from '../ui/Button'

/** Gate for signed-in areas. Sends new users through onboarding first. */
export default function RequireAuth({ children, roles, allowIncomplete = false }) {
  const { configured, loading, user, profile } = useAuth()
  const location = useLocation()

  if (!configured) return <SetupRequired />
  if (loading) return <FullPageLoader />
  if (!user) return <Navigate to="/signin" replace state={{ from: location.pathname + location.search }} />
  if (!profile) return <ProfileMissing />
  if (!profile.onboarded && !allowIncomplete) return <Navigate to="/onboarding" replace />
  if (roles && !roles.includes(profile.role)) return <Navigate to="/dashboard" replace />
  return children
}

function ProfileMissing() {
  const { refreshProfile, signOut } = useAuth()
  return (
    <div className="grid min-h-dvh place-items-center bg-cream-100 px-6 text-center">
      <div className="max-w-sm">
        <h1 className="text-2xl font-bold">We couldn’t load your profile</h1>
        <p className="mt-2 text-navy-500">Check your connection. If this is a new project, make sure the database migration has been run.</p>
        <div className="mt-6 flex justify-center gap-3">
          <Button onClick={refreshProfile}>Try again</Button>
          <Button variant="secondary" onClick={signOut}>Sign out</Button>
        </div>
      </div>
    </div>
  )
}
