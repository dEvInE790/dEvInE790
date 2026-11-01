import { useEffect } from 'react'
import { View } from 'react-native'
import { router } from 'expo-router'
import { BellOff } from 'lucide-react-native'
import Screen from '../components/Screen'
import { Card, EmptyState, Skeleton, Tappable, Text } from '../components/ui'
import useAsync from '../lib/useAsync'
import { listNotifications, markNotificationsRead } from '../lib/api'
import { relativeFromNow } from '../lib/format'
import { useUnread } from '../context/UnreadContext'
import { colors } from '../theme'

// Web paths in notifications, mapped to app screens.
const ROUTES = { '/dashboard/sessions': '/(tabs)/sessions', '/dashboard/billing': '/payments', '/dashboard/subscription': '/subscription', '/pricing': '/membership', '/dashboard/listing': '/(tabs)/listing' }

export default function Notifications() {
  const { refresh } = useUnread()
  const list = useAsync(() => listNotifications(), [])
  const hasUnread = list.data?.some((n) => !n.read_at)
  useEffect(() => {
    if (hasUnread) markNotificationsRead().then(refresh).catch(() => {})
  }, [hasUnread, refresh])

  return (
    <Screen back title="Notifications" onRefresh={() => list.reload()}>
      {list.loading ? [0, 1, 2].map((i) => <Skeleton key={i} style={{ height: 64, borderRadius: 18 }} />) : !list.data?.length ? (
        <EmptyState icon={BellOff} title="You’re all caught up" body="Payment confirmations, bookings and renewal reminders appear here." />
      ) : (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          {list.data.map((n, i) => (
            <Tappable key={n.id} disabled={!ROUTES[n.link]} onPress={() => router.push(ROUTES[n.link])} style={{ flexDirection: 'row', gap: 12, padding: 16, borderTopWidth: i ? 1 : 0, borderColor: colors.line }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, marginTop: 7, backgroundColor: n.read_at ? 'transparent' : colors.mint500 }} />
              <View style={{ flex: 1 }}>
                <Text variant="label">{n.title}</Text>
                {!!n.body && <Text variant="muted" style={{ fontSize: 14 }}>{n.body}</Text>}
                <Text variant="small" style={{ marginTop: 4 }}>{relativeFromNow(n.created_at)}</Text>
              </View>
            </Tappable>
          ))}
        </Card>
      )}
    </Screen>
  )
}
