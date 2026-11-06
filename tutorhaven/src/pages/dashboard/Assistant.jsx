import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Bot, MessageSquarePlus, Send, Trash2, TriangleAlert } from 'lucide-react'
import { PageHeader } from '../../components/layout/DashboardLayout'
import { PlusBadge, PlusGate } from '../../components/Plus'
import PolicyText from '../../components/PolicyText'
import Button from '../../components/ui/Button'
import { Select } from '../../components/ui/Field'
import useAsync from '../../lib/useAsync'
import { askAssistant, deleteAiConversation, getAiMessages, listAiConversations } from '../../lib/api'
import { SUBJECTS } from '../../lib/constants'
import { useMembership } from '../../context/MembershipContext'
import { useToast } from '../../context/ToastContext'
import { spring } from '../../motion/variants'

const MODES = [
  ['explain', 'Explain'],
  ['simplify', 'Explain simply'],
  ['steps', 'Step by step'],
  ['practice', 'Practice questions'],
  ['revise', 'Revision notes'],
]
const STARTERS = [
  ['steps', 'Mathematics', 'How do I solve 2x² + 5x − 3 = 0?'],
  ['simplify', 'Biology', 'What is photosynthesis?'],
  ['practice', 'Physics', 'Practice questions on Newton’s laws of motion'],
  ['revise', 'Economics', 'Revision notes on demand and supply'],
]

export default function Assistant() {
  return (
    <>
      <PageHeader title={<span className="flex items-center gap-3">AI Learning Assistant <PlusBadge /></span>} subtitle="Ask about any topic. Get clear explanations, worked steps, practice questions and revision notes." />
      <PlusGate feature="AI Learning Assistant"><Chat /></PlusGate>
    </>
  )
}

function Chat() {
  const toast = useToast()
  const { membership, reload: reloadMembership } = useMembership()
  const conversations = useAsync(() => listAiConversations(), [])
  const [conversationId, setConversationId] = useState(null)
  const [messages, setMessages] = useState([])
  const [question, setQuestion] = useState('')
  const [mode, setMode] = useState('explain')
  const [subject, setSubject] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)
  const [usage, setUsage] = useState(null)
  const endRef = useRef(null)
  const used = usage?.used ?? membership?.ai_used ?? 0
  const limit = usage?.limit ?? membership?.ai_limit ?? 0

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }) }, [messages.length, sending])

  const open = async (id) => {
    setConversationId(id)
    setError(null)
    try {
      setMessages(await getAiMessages(id))
    } catch (e) {
      toast.error(e.message)
    }
  }
  const startNew = () => { setConversationId(null); setMessages([]); setError(null) }
  const remove = async (id) => {
    try {
      await deleteAiConversation(id)
      conversations.setData((list) => list.filter((c) => c.id !== id))
      if (id === conversationId) startNew()
    } catch (e) {
      toast.error(e.message)
    }
  }

  const send = async (e, preset) => {
    e?.preventDefault()
    const q = (preset?.[2] ?? question).trim()
    const m = preset?.[0] ?? mode
    const subj = preset?.[1] ?? subject
    if (q.length < 2 || sending) return
    setError(null)
    setSending(true)
    const temp = { id: 'pending', role: 'user', content: q, mode: m }
    setMessages((list) => [...list, temp])
    setQuestion('')
    try {
      const r = await askAssistant({ question: q, mode: m, subject: subj, conversationId })
      setMessages((list) => [...list.filter((x) => x.id !== 'pending'), { ...temp, id: r.question_id }, { id: r.answer.id, role: 'assistant', content: r.answer.content, mode: m }])
      setUsage(r.usage)
      if (!conversationId) {
        setConversationId(r.conversation_id)
        conversations.reload({ silent: true })
      }
      reloadMembership()
    } catch (err) {
      setMessages((list) => list.filter((x) => x.id !== 'pending'))
      setQuestion(q)
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[16rem_1fr]">
      <aside className="space-y-3">
        <Button className="w-full" variant="secondary" icon={MessageSquarePlus} onClick={startNew}>New conversation</Button>
        <div className="card p-4" aria-live="polite">
          <p className="text-xs font-semibold tracking-wide text-navy-400 uppercase">This month</p>
          <p className="mt-1 text-sm"><strong className="font-display text-2xl">{used}</strong> <span className="text-navy-500">of {limit} questions</span></p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-navy-900/[0.06]">
            <motion.div className="h-full rounded-full bg-gradient-to-r from-mint-400 to-amber-400" animate={{ width: `${limit ? Math.min(100, (used / limit) * 100) : 0}%` }} transition={spring} />
          </div>
          <p className="mt-2 text-xs text-navy-400">Your allowance resets on the 1st. Questions that fail aren’t counted.</p>
        </div>
        {conversations.data?.length > 0 && (
          <nav className="card max-h-80 overflow-y-auto p-2" aria-label="Conversations">
            {conversations.data.map((c) => (
              <div key={c.id} className={`group flex items-center gap-1 rounded-xl ${c.id === conversationId ? 'bg-navy-900 text-white' : 'hover:bg-navy-900/[0.04]'}`}>
                <button type="button" onClick={() => open(c.id)} className="min-w-0 flex-1 truncate px-3 py-2 text-left text-sm">{c.title}</button>
                <button type="button" onClick={() => remove(c.id)} className="mr-1 rounded-lg p-1.5 opacity-60 hover:opacity-100" aria-label={`Delete ${c.title}`}><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            ))}
          </nav>
        )}
      </aside>

      <section className="card flex min-h-[32rem] flex-col overflow-hidden" aria-label="Conversation">
        <div className="flex-1 space-y-4 overflow-y-auto p-5 sm:p-6">
          {!messages.length && (
            <div className="py-6 text-center">
              <motion.span initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={spring} className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-navy-950 text-mint-300"><Bot className="h-8 w-8" /></motion.span>
              <h2 className="mt-4 text-lg font-semibold">What would you like to learn?</h2>
              <p className="mx-auto mt-1 max-w-md text-sm text-navy-500">Pick a style below, or try one of these.</p>
              <div className="mx-auto mt-5 grid max-w-xl gap-2 sm:grid-cols-2">
                {STARTERS.map((st) => (
                  <button key={st[2]} type="button" disabled={sending} onClick={() => send(null, st)} className="rounded-2xl border border-navy-900/8 bg-white p-3 text-left text-sm transition-colors hover:border-mint-500/50">
                    <span className="block text-xs font-semibold text-mint-700">{MODES.find((m) => m[0] === st[0])[1]} · {st[1]}</span>{st[2]}
                  </button>
                ))}
              </div>
            </div>
          )}
          <AnimatePresence initial={false}>
            {messages.map((m) => (
              <motion.div key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
                className={m.role === 'user' ? 'ml-auto max-w-[85%] rounded-3xl rounded-br-lg bg-navy-900 px-4 py-3 text-white' : 'max-w-[95%] rounded-3xl rounded-bl-lg bg-cream-100 px-4 py-3'}
                data-testid={m.role === 'assistant' ? 'ai-answer' : 'ai-question'}>
                {m.role === 'user' ? <p className="whitespace-pre-wrap">{m.content}</p> : <PolicyText text={m.content} className="!space-y-2.5 !text-[0.95rem]" />}
              </motion.div>
            ))}
          </AnimatePresence>
          {sending && (
            <div className="flex w-fit gap-1.5 rounded-3xl bg-cream-100 px-4 py-4" role="status" aria-label="The assistant is writing">
              {[0, 1, 2].map((i) => <motion.span key={i} className="h-2 w-2 rounded-full bg-navy-400" animate={{ y: [0, -5, 0] }} transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }} />)}
            </div>
          )}
          {error && (
            <p className="flex items-start gap-2 rounded-2xl bg-coral-50 p-3 text-sm text-coral-700" role="alert"><TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />{error}</p>
          )}
          <div ref={endRef} />
        </div>
        <form onSubmit={send} className="border-t border-navy-900/[0.06] bg-cream-50/60 p-4">
          <div className="scrollbar-none -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-3" role="radiogroup" aria-label="Answer style">
            {MODES.map(([v, label]) => (
              <button key={v} type="button" role="radio" aria-checked={mode === v} onClick={() => setMode(v)}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${mode === v ? 'border-navy-900 bg-navy-900 text-white' : 'border-navy-900/12 bg-white text-navy-600'}`}>{label}</button>
            ))}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <Select aria-label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} className="sm:w-44">
              <option value="">Any subject</option>
              {SUBJECTS.map((s) => <option key={s}>{s}</option>)}
            </Select>
            <textarea value={question} onChange={(e) => setQuestion(e.target.value)} rows={2} maxLength={4000} placeholder="Ask a question…" aria-label="Your question"
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) send(e) }}
              className="min-h-11 flex-1 resize-none rounded-xl border border-navy-900/12 bg-white px-3.5 py-2.5 text-[0.95rem] outline-none focus:border-mint-500 focus:ring-4 focus:ring-mint-400/20" />
            <Button type="submit" icon={Send} loading={sending} disabled={question.trim().length < 2}>Ask</Button>
          </div>
          <p className="mt-2 text-xs text-navy-400">Answers come from an AI and can be wrong. Check important work with your tutor.</p>
        </form>
      </section>
    </div>
  )
}
