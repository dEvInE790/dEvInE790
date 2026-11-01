import { useEffect, useRef, useState } from 'react'
import { FlatList, KeyboardAvoidingView, Platform, TextInput, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import Animated, { FadeInUp } from 'react-native-reanimated'
import { ChevronLeft, MessageCircle, Send } from 'lucide-react-native'
import { Avatar, Button, EmptyState, Skeleton, Tappable, Text } from '../../components/ui'
import useAsync from '../../lib/useAsync'
import { getConversation, markConversationRead, sendMessage } from '../../lib/api'
import { ROLE_LABEL } from '../../lib/constants'
import { time } from '../../lib/format'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useUnread } from '../../context/UnreadContext'
import { colors, fonts } from '../../theme'

export default function Conversation() {
  const { id } = useLocalSearchParams()
  const { user } = useAuth()
  const toast = useToast()
  const { refresh } = useUnread()
  const convo = useAsync(() => getConversation(String(id)), [id])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const listRef = useRef(null)

  const reload = convo.reload
  useEffect(() => {
    const t = setInterval(() => reload({ silent: true }), 8000)
    return () => clearInterval(t)
  }, [reload])
  const unread = convo.data?.messages?.some((m) => m.recipient_id === user.id && !m.read_at)
  useEffect(() => {
    if (unread) markConversationRead(String(id)).then(refresh).catch(() => {})
  }, [unread, id, refresh])

  const send = async () => {
    const body = draft.trim()
    if (!body) return
    setSending(true)
    try {
      const msg = await sendMessage(String(id), body)
      convo.setData((d) => ({ ...d, messages: [...d.messages, msg] }))
      setDraft('')
    } catch (e) {
      toast.error(e.message)
    }
    setSending(false)
  }

  const partner = convo.data?.partner
  const messages = convo.data?.messages ?? []

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: colors.cream100 }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderColor: colors.line }}>
          <Tappable onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/messages'))} accessibilityRole="button" accessibilityLabel="Back"
            style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.line }}>
            <ChevronLeft size={22} color={colors.navy900} />
          </Tappable>
          {convo.loading ? <Skeleton style={{ height: 36, flex: 1 }} /> : partner ? (
            <>
              <Avatar name={partner.full_name} seed={partner.id} size={38} />
              <View style={{ flex: 1 }}>
                <Text variant="h3" numberOfLines={1}>{partner.full_name}</Text>
                <Text variant="small">{ROLE_LABEL[partner.role]}</Text>
              </View>
              {partner.role === 'tutor' && <Button title="Profile" size="sm" variant="secondary" onPress={() => router.push(`/tutor/${partner.id}`)} />}
            </>
          ) : <Text variant="h3">Conversation</Text>}
        </View>

        {!convo.loading && !partner ? (
          <EmptyState icon={MessageCircle} title="You can’t message this person" body="Learners can message listed tutors; tutors can reply to people who contacted or booked them." />
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            contentContainerStyle={{ padding: 16, gap: 8, flexGrow: 1 }}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
            ListEmptyComponent={!convo.loading && partner ? <EmptyState icon={MessageCircle} title={`Say hello to ${partner.full_name.split(' ')[0]}`} body="Introduce yourself, share what you’d like help with and when you’re free." /> : null}
            renderItem={({ item: m }) => {
              const mine = m.sender_id === user.id
              return (
                <Animated.View entering={FadeInUp.duration(250)} style={{ alignItems: mine ? 'flex-end' : 'flex-start' }}>
                  <View style={{ maxWidth: '82%', backgroundColor: mine ? colors.navy900 : colors.white, borderRadius: 18, borderBottomRightRadius: mine ? 6 : 18, borderBottomLeftRadius: mine ? 18 : 6, paddingHorizontal: 14, paddingVertical: 10, borderWidth: mine ? 0 : 1, borderColor: colors.line }}>
                    <Text style={{ color: mine ? colors.white : colors.navy900, fontSize: 15, lineHeight: 21 }}>{m.body}</Text>
                    <Text style={{ color: mine ? colors.navy300 : colors.navy400, fontSize: 11, marginTop: 4, textAlign: 'right' }}>{time(m.created_at)}{mine && m.read_at ? ' · Read' : ''}</Text>
                  </View>
                </Animated.View>
              )
            }}
          />
        )}

        {partner && (
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10, padding: 12, borderTopWidth: 1, borderColor: colors.line, backgroundColor: colors.white }}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Write a message…"
              placeholderTextColor={colors.navy300}
              multiline
              maxLength={2000}
              accessibilityLabel="Message"
              style={{ flex: 1, minHeight: 44, maxHeight: 120, borderRadius: 14, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 10, fontFamily: fonts.body, fontSize: 15, color: colors.navy900, backgroundColor: colors.cream50 }}
            />
            <Button title="Send" icon={Send} loading={sending} disabled={!draft.trim()} onPress={send} accessibilityLabel="Send" />
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
