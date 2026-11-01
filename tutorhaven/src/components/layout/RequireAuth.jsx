import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import FullPageLoader from './FullPageLoader'
import SetupRequired from '../../pages/SetupRequired'
import { ShieldAlert } from 'lucide-react'
import Button from '../ui/Button'

/** Gate for signed-in areas. Sends new users through onboarding first. */
export default function RequireAuth({ children, roles, allowIncomplete = false }) {
  const { configured, loading, user, profile } = useAuth()
  const location = useLocation()

  if (!configured) return <SetupRequired />
  if (loading) return <FullPageLoader />
  if (!user) return <Navigate to="/signin" replace state={{ from: location.pathname + location.search }} />
  if (!profile) return <ProfileMissing />
  if (profile.suspended_at && profile.role !== 'admin') return <Suspended reason={profile.suspended_reason} />
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

/** Suspended accounts can’t book, pay or message (enforced in the database too). */
function Suspended({ reason }) {
  const { signOut } = useAuth()
  return (
    <div className="grid min-h-dvh place-items-center bg-cream-100 px-6 text-center">
      <div className="card max-w-md p-8">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-coral-50 text-coral-600"><ShieldAlert className="h-7 w-7" /></span>
        <h1 className="mt-5 text-2xl font-bold">Your account is suspended</h1>
        <p className="mt-2 text-navy-500">
          You can’t book sessions, make payments or send messages right now.{reason ? ` Reason: ${reason}.` : ''} If you think this is a mistake, contact TutorHaven support.
        </p>
        <Button className="mt-6" variant="secondary" onClick={signOut}>Sign out</Button>
      </div>
    </div>
  )
}
