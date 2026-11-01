import { Redirect, Tabs } from 'expo-router'
import { CalendarDays, House, Search, User, UserRoundPen } from 'lucide-react-native'
import { useAuth } from '../../context/AuthContext'
import { colors, fonts } from '../../theme'

export default function TabsLayout() {
  const { user, profile } = useAuth()
  if (!user || !profile) return <Redirect href="/" />
  const isTutor = profile.role === 'tutor'
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.navy950,
        tabBarInactiveTintColor: colors.navy400,
        tabBarStyle: { backgroundColor: colors.white, borderTopColor: colors.line, height: 84, paddingTop: 8 },
        tabBarLabelStyle: { fontFamily: fonts.semibold, fontSize: 11 },
        sceneStyle: { backgroundColor: colors.cream100 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ color }) => <House size={22} color={color} /> }} />
      <Tabs.Screen name="explore" options={{ title: 'Find tutors', href: isTutor ? null : undefined, tabBarIcon: ({ color }) => <Search size={22} color={color} /> }} />
      <Tabs.Screen name="sessions" options={{ title: 'Sessions', tabBarIcon: ({ color }) => <CalendarDays size={22} color={color} /> }} />
      <Tabs.Screen name="listing" options={{ title: 'Listing', href: isTutor ? undefined : null, tabBarIcon: ({ color }) => <UserRoundPen size={22} color={color} /> }} />
      <Tabs.Screen name="account" options={{ title: 'Account', tabBarIcon: ({ color }) => <User size={22} color={color} /> }} />
    </Tabs>
  )
}
