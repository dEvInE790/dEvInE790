import { TIME_OPTIONS } from '../config.js'

// Dates are kept as local "YYYY-MM-DD" strings so no timezone can shift her pick by a day.

const pad = (n) => String(n).padStart(2, '0')

export const toKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

export const fromKey = (key) => {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const todayKey = () => toKey(new Date())

export const formatLong = (key) =>
  fromKey(key).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

export const timeOption = (id) => TIME_OPTIONS.find((t) => t.id === id)

/** The WhatsApp message she sends back: her date, time and optional note. */
export function buildAnswerMessage({ date, time, note }) {
  const t = timeOption(time)
  const lines = [
    'It’s Hiqmoh 🥹❤️',
    'I said YESSS! Here’s our date:',
    '',
    `📅 Date: ${formatLong(date)}`,
    `🕰️ Time: ${t.label} ${t.icon}`,
  ]
  if (note.trim()) lines.push(`💭 Let’s plan: ${note.trim()}`)
  lines.push('', 'Can’t wait to see you ❤️')
  return lines.join('\n')
}
