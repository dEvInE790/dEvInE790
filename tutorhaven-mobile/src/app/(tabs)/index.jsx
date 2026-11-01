import { useAuth } from '../../context/AuthContext'
import StudentHome from '../../components/home/StudentHome'
import ParentHome from '../../components/home/ParentHome'
import TutorHome from '../../components/home/TutorHome'

export default function Home() {
  const { profile } = useAuth()
  if (profile?.role === 'tutor') return <TutorHome />
  if (profile?.role === 'parent') return <ParentHome />
  return <StudentHome />
}
