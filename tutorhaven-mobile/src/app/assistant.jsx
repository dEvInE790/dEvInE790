import { useRef, useState } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { Bot, Send } from 'lucide-react-native'
import Screen from '../components/Screen'
import PlusGate from '../components/PlusGate'
import { Button, Chip, Text } from '../components/ui'
import { askAssistant } from '../lib/api'
import { useMembership } from '../context/MembershipContext'
import { colors, fonts, radius } from '../theme'

const MODES = [['explain', 'Explain'], ['simplify', 'Simply'], ['steps', 'Step by step'], ['practice', 'Practice'], ['revise', 'Revision']]

/** Light Markdown: headings, bullets, numbered steps and **bold**. */
function Answer({ text }) {
  return (
    <View style={{ gap: 6 }}>
      {text.split('\n').filter((l) => l.trim()).map((raw, i) => {
        const line = raw.trim()
        const h = line.match(/^#{1,4}\s+(.*)$/)
        const item = line.match(/^(?:[-*•]|(\d+)[.)])\s+(.*)$/)
        const body = (h?.[1] ?? item?.[2] ?? line).split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
          part.startsWith('**') && part.endsWith('**') ? <Text key={j} style={{ fontFamily: fonts.semibold, color: colors.navy950 }}>{part.slice(2, -2)}</Text> : part)
        if (h) return <Text key={i} variant="h3" style={{ marginTop: 4 }}>{body}</Text>
        if (item) return <Text key={i} variant="body" style={{ fontSize: 14 }}>{item[1] ? `${item[1]}. ` : '•  '}{body}</Text>
        return <Text key={i} variant="body" style={{ fontSize: 14 }}>{body}</Text>
      })}
    </View>
  )
}

export default function Assistant() {
  const { membership, reload } = useMembership()
  const [messages, setMessages] = useState([])
  const [conversationId, setConversationId] = useState(null)
  const [question, setQuestion] = useState('')
  const [mode, setMode] = useState('explain')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)
  const [usage, setUsage] = useState(null)
  const scroll = useRef(null)
  const used = usage?.used ?? membership?.ai_used ?? 0
  const limit = usage?.limit ?? membership?.ai_limit ?? 0

  const send = async () => {
    const q = question.trim()
    if (q.length < 2 || sending) return
    setError(null)
    setSending(true)
    setMessages((m) => [...m, { id: `q${m.length}`, role: 'user', content: q }])
    setQuestion('')
    try {
      const r = await askAssistant({ question: q, mode, conversationId })
      setConversationId(r.conversation_id)
      setMessages((m) => [...m, { id: r.answer.id, role: 'assistant', content: r.answer.content }])
      setUsage(r.usage)
      reload()
    } catch (e) {
      setMessages((m) => m.slice(0, -1))
      setQuestion(q)
      setError(e.message)
    } finally {
      setSending(false)
      setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 50)
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <Screen back title="AI assistant" subtitle="Explanations, worked steps, practice questions and revision notes." scroll={false}
      footer={membership?.tier === 'plus' ? (
        <View style={{ padding: 14, paddingBottom: 30, backgroundColor: colors.white, borderTopWidth: 1, borderColor: colors.line, gap: 10 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
            {MODES.map(([v, label]) => <Chip key={v} size="sm" label={label} selected={mode === v} onPress={() => setMode(v)} />)}
          </ScrollView>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
            <TextInput value={question} onChangeText={setQuestion} placeholder="Ask a question…" multiline maxLength={4000} accessibilityLabel="Your question"
              style={{ flex: 1, minHeight: 44, maxHeight: 120, borderWidth: 1, borderColor: colors.line, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, fontFamily: fonts.body, fontSize: 15, color: colors.navy950 }} />
            <Button title="Ask" icon={Send} loading={sending} disabled={question.trim().length < 2} onPress={send} />
          </View>
          <Text variant="small">{used} of {limit} questions this month · Answers come from an AI and can be wrong.</Text>
        </View>
      ) : null}>
      <PlusGate title="AI Learning Assistant" body="Ask questions any time and get simple explanations, step-by-step working, practice questions and revision notes.">
        <ScrollView ref={scroll} style={{ flex: 1 }} contentContainerStyle={{ paddingVertical: 8, gap: 12, paddingBottom: 40 }}>
          {!messages.length && (
            <View style={{ alignItems: 'center', gap: 10, paddingVertical: 30 }}>
              <View style={{ width: 60, height: 60, borderRadius: 20, backgroundColor: colors.navy950, alignItems: 'center', justifyContent: 'center' }}><Bot size={28} color={colors.mint300} /></View>
              <Text variant="h3">What would you like to learn?</Text>
              <Text variant="muted" style={{ textAlign: 'center' }}>Pick a style, then type your question below.</Text>
            </View>
          )}
          {messages.map((m) => (
            <Animated.View key={m.id} entering={FadeInDown.duration(250)}
              style={m.role === 'user'
                ? { alignSelf: 'flex-end', maxWidth: '85%', backgroundColor: colors.navy900, borderRadius: radius.lg, borderBottomRightRadius: 6, padding: 12 }
                : { alignSelf: 'flex-start', maxWidth: '95%', backgroundColor: colors.cream100, borderRadius: radius.lg, borderBottomLeftRadius: 6, padding: 12 }}>
              {m.role === 'user' ? <Text style={{ color: colors.white, fontSize: 15 }}>{m.content}</Text> : <Answer text={m.content} />}
            </Animated.View>
          ))}
          {sending && <Text variant="muted">Thinking…</Text>}
          {!!error && <Text style={{ color: colors.coralInk, backgroundColor: colors.coralBg, padding: 12, borderRadius: 12, fontSize: 14 }}>{error}</Text>}
        </ScrollView>
      </PlusGate>
    </Screen>
    </KeyboardAvoidingView>
  )
}
