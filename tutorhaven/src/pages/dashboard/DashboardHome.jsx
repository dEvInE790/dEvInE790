import { useAuth } from '../../context/AuthContext'
import StudentHome from './StudentHome'
import ParentHome from './ParentHome'
import TutorHome from './TutorHome'
import AdminHome from './AdminHome'

export default function DashboardHome() {
  const { profile } = useAuth()
  if (profile.role === 'admin') return <AdminHome />
  if (profile.role === 'tutor') return <TutorHome />
  if (profile.role === 'parent') return <ParentHome />
  return <StudentHome />
}
