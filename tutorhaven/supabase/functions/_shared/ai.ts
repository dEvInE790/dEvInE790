// AI Learning Assistant (TutorHaven Plus). Free of Deno and Supabase imports so
// the integration tests run this exact code against a real Postgres.
//
// Rules this file enforces:
// * Only the server decides who may ask: ai_begin checks Plus membership, the
//   monthly allowance and suspensions inside the database.
// * The AI key never leaves the server, and every answer comes from the AI
//   API. If the AI can't answer, the student sees an error, never a made-up
//   reply, and the question doesn't count against their allowance.
import type { Rpc } from './core.ts'
import { corsHeaders } from './core.ts'

export type AiMessage = { role: 'user' | 'assistant'; content: string }
export type AiReply = { text: string; inputTokens: number; outputTokens: number; stopReason: string | null }
export type AiApi = { ask(input: { system: string; messages: AiMessage[] }): Promise<AiReply> }

export type AiDeps = {
  /** Service role (ai_begin / ai_finish / ai_abort are server-only). */
  service: Rpc
  /** The signed-in caller's user id, from their access token; null if not signed in. */
  userId: (req: Request) => Promise<string | null>
  /** null when ANTHROPIC_API_KEY isn't set. */
  ai: AiApi | null
}

export const MODES = {
  explain: 'Explain the concept clearly and accurately, with one short worked example where it helps.',
  simplify: 'Explain it in very simple language, as you would to a younger student. Use an everyday example or analogy and avoid jargon; define any term you must use.',
  steps: 'Give a step-by-step explanation or worked solution. Number each step, show the working, and say why each step follows. End with the final answer in bold.',
  practice: 'Write 5 practice questions on the topic, from easier to harder, in the style of Nigerian school exams where that fits. Put the answers with brief explanations in a separate "Answers" section at the end, so the student can try first.',
  revise: 'Write concise revision notes: the key ideas as short bullet points, important formulas or definitions in bold, common mistakes to avoid, and finish with a 3-question quick quiz with answers at the end.',
} as const
export type Mode = keyof typeof MODES

export function systemPrompt(mode: Mode, opts: { gradeLevel?: string | null; subject?: string; role?: string } = {}) {
  const who = opts.role === 'parent'
    ? 'You are speaking with a parent who wants to understand a topic so they can support their child.'
    : `You are speaking with a student${opts.gradeLevel ? ` at ${opts.gradeLevel} level` : ''}.`
  return [
    'You are the TutorHaven Learning Assistant, a patient and encouraging tutor for learners in Nigeria (primary, JSS, SSS, WAEC, NECO, JAMB, IGCSE and university). ' + who,
    opts.subject ? `The topic is ${opts.subject}.` : '',
    'Your job is to help the learner understand. When a question looks like homework or an exam question, teach the method and check understanding rather than only handing over an answer, and invite them to try the next step.',
    'Be accurate. If you are not sure about a fact, say so plainly. Never invent sources, statistics or quotations.',
    'Stay on learning and study topics. If the learner seems distressed or unsafe, respond kindly and encourage them to talk to a parent, teacher or another trusted adult.',
    'Format for a phone screen: short paragraphs, "## " for headings, "- " for bullet points and **bold** for key terms. Write maths in plain text (for example x^2 + 3x = 10) and do not use LaTeX or tables.',
    'For this request: ' + MODES[mode],
  ].filter(Boolean).join('\n\n')
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

/** POST { question, mode?, subject?, conversation_id? } → the assistant's answer. */
export async function handleAiAssistant(req: Request, deps: AiDeps): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const userId = await deps.userId(req)
  if (!userId) return json({ error: 'Please sign in first' }, 401)
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid request' }, 400)
  }
  const mode = (typeof body.mode === 'string' && body.mode in MODES ? body.mode : 'explain') as Mode
  const question = typeof body.question === 'string' ? body.question.trim() : ''
  const subject = typeof body.subject === 'string' ? body.subject.trim().slice(0, 60) : ''
  const conversationId = typeof body.conversation_id === 'string' && body.conversation_id ? body.conversation_id : null
  if (question.length < 2) return json({ error: 'Please type a question' }, 400)

  if (!deps.ai) {
    return json({ error: 'The AI Learning Assistant isn’t switched on yet. Please try again later.', code: 'not_configured' }, 503)
  }

  // Membership, allowance and suspension are checked in the database.
  const begin = await deps.service<{ conversation_id: string; message_id: string; history: AiMessage[]; used: number; limit: number; grade_level: string | null; role: string }>(
    'ai_begin', { p_user: userId, p_conversation: conversationId, p_mode: mode, p_subject: subject, p_question: question })
  if (begin.error || !begin.data) {
    const message = begin.error?.message ?? 'Not allowed'
    const code = /Plus feature/.test(message) ? 'plus_required' : /used all/.test(message) ? 'limit_reached' : 'not_allowed'
    return json({ error: message, code }, code === 'not_allowed' && /not found|type a question|under 4,000/i.test(message) ? 400 : 403)
  }
  const b = begin.data

  let reply: AiReply
  try {
    reply = await deps.ai.ask({
      system: systemPrompt(mode, { gradeLevel: b.grade_level, subject, role: b.role }),
      messages: [...(b.history ?? []), { role: 'user', content: question }],
    })
  } catch (e) {
    console.error('AI request failed', (e as Error).message)
    await deps.service('ai_abort', { p_message: b.message_id })
    return json({ error: 'The learning assistant is unavailable right now. Your question wasn’t counted; please try again in a moment.', code: 'ai_unavailable' }, 502)
  }
  if (reply.stopReason === 'refusal' || !reply.text.trim()) {
    await deps.service('ai_abort', { p_message: b.message_id })
    return json({
      error: reply.stopReason === 'refusal'
        ? 'The assistant can’t help with that question. Try asking it as a study question. It wasn’t counted.'
        : 'The assistant didn’t return an answer. Your question wasn’t counted; please try again.',
      code: reply.stopReason === 'refusal' ? 'declined' : 'empty',
    }, 422)
  }

  const saved = await deps.service<{ id: string; content: string; created_at: string }>('ai_finish', {
    p_message: b.message_id, p_answer: reply.text, p_input_tokens: reply.inputTokens, p_output_tokens: reply.outputTokens,
  })
  if (saved.error || !saved.data) return json({ error: saved.error?.message ?? 'Could not save the answer' }, 500)
  return json({
    conversation_id: b.conversation_id,
    question_id: b.message_id,
    answer: { id: saved.data.id, content: saved.data.content, created_at: saved.data.created_at, truncated: reply.stopReason === 'max_tokens' },
    usage: { used: b.used, limit: b.limit },
  })
}
