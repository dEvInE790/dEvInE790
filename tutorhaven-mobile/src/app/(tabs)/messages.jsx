import { View } from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { useCallback } from 'react'
import { MessageCircle, Search } from 'lucide-react-native'
import Screen from '../../components/Screen'
import { Avatar, Button, Card, EmptyState, Skeleton, Tappable, Text } from '../../components/ui'
import useAsync from '../../lib/useAsync'
import { listConversations } from '../../lib/api'
import { relativeFromNow } from '../../lib/format'
import { useAuth } from '../../context/AuthContext'
import { useUnread } from '../../context/UnreadContext'
import { colors, fonts } from '../../theme'

export default function Messages() {
  const { profile } = useAuth()
  const { refresh } = useUnread()
  const list = useAsync(listConversations, [])
  const isTutor = profile.role === 'tutor'
  const reload = list.reload
  useFocusEffect(useCallback(() => { reload({ silent: true }); refresh() }, [reload, refresh]))

  return (
    <Screen title="Messages" subtitle={isTutor ? 'Questions from learners and parents.' : 'Talk to tutors before and after you book.'} onRefresh={() => list.reload()}>
      {list.loading ? [0, 1, 2].map((i) => <Skeleton key={i} style={{ height: 72, borderRadius: 20 }} />) : list.error ? <Text variant="muted">{list.error}</Text> : !list.data.length ? (
        <EmptyState
          icon={MessageCircle}
          title="No conversations yet"
          body={isTutor ? 'When a learner or parent messages you, it shows up here.' : 'Open a tutor’s profile and tap Message to ask about times, subjects or goals.'}
          action={!isTutor && <Button title="Find a tutor" icon={Search} onPress={() => router.push('/(tabs)/explore')} />}
        />
      ) : (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          {list.data.map((c, i) => (
            <Tappable key={c.other_id} onPress={() => router.push(`/messages/${c.other_id}`)} accessibilityRole="button" accessibilityLabel={`Conversation with ${c.other_name}`}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderTopWidth: i ? 1 : 0, borderColor: colors.line }}>
              <Avatar name={c.other_name} seed={c.other_id} size={46} />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                  <Text variant="h3" numberOfLines={1} style={{ flex: 1, fontSize: 16 }}>{c.other_name}</Text>
                  <Text variant="small">{relativeFromNow(c.last_at)}</Text>
                </View>
                <Text variant="muted" numberOfLines={1} style={{ fontSize: 14, color: c.unread ? colors.navy900 : colors.navy500 }}>{c.last_from_me ? 'You: ' : ''}{c.last_body}</Text>
              </View>
              {c.unread > 0 && (
                <View style={{ minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6, backgroundColor: colors.mint500, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: colors.white, fontFamily: fonts.semibold, fontSize: 12 }}>{c.unread}</Text>
                </View>
              )}
            </Tappable>
          ))}
        </Card>
      )}
    </Screen>
  )
}
