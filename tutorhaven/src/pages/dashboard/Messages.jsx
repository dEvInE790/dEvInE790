import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeft, MessageCircle, Search, Send } from 'lucide-react'
import { PageHeader } from '../../components/layout/DashboardLayout'
import Avatar from '../../components/ui/Avatar'
import Button from '../../components/ui/Button'
import Skeleton from '../../components/ui/Skeleton'
import EmptyState, { ErrorState } from '../../components/ui/EmptyState'
import useAsync from '../../lib/useAsync'
import { getConversation, listConversations, markConversationRead, sendMessage } from '../../lib/api'
import { ROLE_LABEL } from '../../lib/constants'
import { relativeFromNow, time, dateShort } from '../../lib/format'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useUnread } from '../../context/UnreadContext'
import { ease } from '../../motion/variants'

const POLL_MS = 8000

export default function Messages() {
  const { userId } = useParams()
  return userId ? <Thread otherId={userId} /> : <Inbox />
}

function Inbox() {
  const { profile } = useAuth()
  const list = useAsync(listConversations, [])
  const isTutor = profile?.role === 'tutor'
  return (
    <>
      <PageHeader title="Messages" subtitle={isTutor ? 'Questions from learners and parents.' : 'Talk to tutors before and after you book.'} />
      <section className="card overflow-hidden">
        {list.error ? <div className="p-6"><ErrorState message={list.error} onRetry={list.reload} /></div> : list.loading ? (
          <div className="space-y-3 p-6">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-16" />)}</div>
        ) : !list.data.length ? (
          <EmptyState
            icon={MessageCircle}
            title="No conversations yet"
            action={!isTutor && <Button to="/tutors" icon={Search}>Find a tutor</Button>}
          >
            {isTutor ? 'When a learner or parent messages you, the conversation appears here.' : 'Open any tutor’s profile and tap “Message” to ask about availability, subjects or goals.'}
          </EmptyState>
        ) : (
          <motion.ul className="divide-y divide-navy-900/[0.06]" initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.04 } } }}>
            {list.data.map((c) => (
              <motion.li key={c.other_id} variants={{ hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0 } }}>
                <Link to={`/dashboard/messages/${c.other_id}`} className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-cream-50">
                  <Avatar name={c.other_name} seed={c.other_id} size="md" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className={`truncate ${c.unread ? 'font-bold' : 'font-semibold'}`}>{c.other_name}</p>
                      <span className="shrink-0 text-xs text-navy-400">{relativeFromNow(c.last_at)}</span>
                    </div>
                    <p className={`truncate text-sm ${c.unread ? 'text-navy-800' : 'text-navy-500'}`}>{c.last_from_me ? 'You: ' : ''}{c.last_body}</p>
                  </div>
                  {c.unread > 0 && <span className="grid h-6 min-w-6 place-items-center rounded-full bg-mint-500 px-1.5 text-xs font-bold text-white">{c.unread}</span>}
                </Link>
              </motion.li>
            ))}
          </motion.ul>
        )}
      </section>
    </>
  )
}

function Thread({ otherId }) {
  const { user } = useAuth()
  const toast = useToast()
  const { refresh } = useUnread()
  const convo = useAsync(() => getConversation(otherId), [otherId])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const endRef = useRef(null)

  // New messages arrive by polling while the thread is open.
  const reload = convo.reload
  useEffect(() => {
    const t = setInterval(() => document.visibilityState === 'visible' && reload({ silent: true }), POLL_MS)
    return () => clearInterval(t)
  }, [reload])

  const unreadHere = convo.data?.messages?.some((m) => m.recipient_id === user.id && !m.read_at)
  useEffect(() => {
    if (unreadHere) markConversationRead(otherId).then(refresh).catch(() => {})
  }, [unreadHere, otherId, refresh])

  const count = convo.data?.messages?.length ?? 0
  useLayoutEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [count])

  const onSend = async (e) => {
    e.preventDefault()
    const body = draft.trim()
    if (!body) return
    setSending(true)
    try {
      const msg = await sendMessage(otherId, body)
      convo.setData((d) => ({ ...d, messages: [...d.messages, msg] }))
      setDraft('')
    } catch (err) {
      toast.error(err.message)
    }
    setSending(false)
  }

  const partner = convo.data?.partner
  const messages = convo.data?.messages ?? []

  return (
    <div className="flex h-[calc(100dvh-10.5rem)] flex-col lg:h-[calc(100dvh-5rem)]">
      <div className="mb-4 flex items-center gap-3">
        <Link to="/dashboard/messages" className="grid h-10 w-10 place-items-center rounded-xl text-navy-600 hover:bg-navy-900/[0.05]" aria-label="Back to messages"><ArrowLeft className="h-5 w-5" /></Link>
        {convo.loading ? <Skeleton className="h-10 w-48" /> : partner ? (
          <>
            <Avatar name={partner.full_name} seed={partner.id} size="sm" />
            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold">{partner.full_name}</h1>
              <p className="text-xs text-navy-400">{ROLE_LABEL[partner.role]}</p>
            </div>
            {partner.role === 'tutor' && <Button size="sm" variant="secondary" className="ml-auto" to={`/tutors/${partner.id}`}>View profile</Button>}
          </>
        ) : <h1 className="text-lg font-bold">Conversation</h1>}
      </div>

      <section className="card flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6" aria-live="polite">
          {convo.error ? <ErrorState message={convo.error} onRetry={convo.reload} /> : convo.loading ? (
            <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className={`h-10 w-2/3 ${i % 2 ? 'ml-auto' : ''}`} />)}</div>
          ) : !partner ? (
            <EmptyState icon={MessageCircle} title="You can’t message this person">Learners can message listed tutors; tutors can reply to people who contacted or booked them.</EmptyState>
          ) : !messages.length ? (
            <EmptyState icon={MessageCircle} title={`Say hello to ${partner.full_name.split(' ')[0]}`}>Introduce yourself, share what you’d like help with and when you’re free.</EmptyState>
          ) : (
            <ul className="space-y-2">
              <AnimatePresence initial={false}>
                {messages.map((m, i) => {
                  const mine = m.sender_id === user.id
                  const newDay = i === 0 || new Date(m.created_at).toDateString() !== new Date(messages[i - 1].created_at).toDateString()
                  return (
                    <motion.li key={m.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, ease }}>
                      {newDay && <p className="my-3 text-center text-xs font-medium text-navy-400">{dateShort(m.created_at)}</p>}
                      <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap shadow-soft ${mine ? 'rounded-br-md bg-navy-900 text-white' : 'rounded-bl-md bg-cream-100 text-navy-900'}`}>
                          {m.body}
                          <span className={`mt-1 block text-right text-[0.65rem] ${mine ? 'text-navy-300' : 'text-navy-400'}`}>{time(m.created_at)}{mine && m.read_at ? ' · Read' : ''}</span>
                        </div>
                      </div>
                    </motion.li>
                  )
                })}
              </AnimatePresence>
            </ul>
          )}
          <div ref={endRef} />
        </div>
        {partner && (
          <form onSubmit={onSend} className="flex items-end gap-2 border-t border-navy-900/[0.06] p-3">
            <label htmlFor="message" className="sr-only">Message</label>
            <textarea
              id="message"
              rows={1}
              value={draft}
              maxLength={2000}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) onSend(e) }}
              placeholder="Write a message…"
              className="max-h-32 min-h-11 flex-1 resize-none rounded-xl border border-navy-900/12 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-mint-500 focus:ring-2 focus:ring-mint-400/30"
            />
            <Button type="submit" icon={Send} loading={sending} disabled={!draft.trim()} aria-label="Send">Send</Button>
          </form>
        )}
      </section>
    </div>
  )
}
