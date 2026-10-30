// Timezone helpers: tutors publish availability in their own timezone and
// learners see the resulting slots in theirs.

const partsCache = new Map()
function formatter(tz) {
  if (!partsCache.has(tz)) {
    partsCache.set(
      tz,
      new Intl.DateTimeFormat('en-US', {
        timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
      }),
    )
  }
  return partsCache.get(tz)
}

export function zonedParts(date, tz) {
  const p = Object.fromEntries(formatter(tz).formatToParts(date).map((x) => [x.type, x.value]))
  return { year: +p.year, month: +p.month - 1, day: +p.day, hour: +p.hour % 24, minute: +p.minute, second: +p.second }
}

function offsetMs(date, tz) {
  const p = zonedParts(date, tz)
  const asUtc = Date.UTC(p.year, p.month, p.day, p.hour, p.minute, p.second)
  return asUtc - Math.floor(date.getTime() / 1000) * 1000
}

/** The instant at which the wall clock in `tz` reads year/month/day + minutes. */
export function zonedToUtc(year, month, day, minutes, tz) {
  const guess = Date.UTC(year, month, day, 0, minutes)
  const first = offsetMs(new Date(guess), tz)
  let t = guess - first
  const second = offsetMs(new Date(t), tz)
  if (second !== first) t = guess - second
  return new Date(t)
}

export const browserTimezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'

export function isValidTimezone(tz) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz })
    return true
  } catch {
    return false
  }
}

/**
 * Bookable start times for the next `days` days.
 * availability: [{ weekday, start_minute, end_minute }] in the tutor's timezone.
 * busy: [{ starts_at, ends_at }]
 */
export function generateSlots({ availability, timezone, busy = [], duration = 60, days = 14, step = 30, leadMinutes = 60 }) {
  const tz = isValidTimezone(timezone) ? timezone : 'UTC'
  const now = Date.now()
  const earliest = now + leadMinutes * 60000
  const today = zonedParts(new Date(now), tz)
  const busyRanges = busy.map((b) => [new Date(b.starts_at).getTime(), new Date(b.ends_at).getTime()])
  const slots = []

  for (let i = 0; i < days; i++) {
    const base = new Date(Date.UTC(today.year, today.month, today.day + i))
    const weekday = base.getUTCDay()
    for (const w of availability.filter((a) => a.weekday === weekday)) {
      for (let m = w.start_minute; m + duration <= w.end_minute; m += step) {
        const start = zonedToUtc(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate(), m, tz)
        const s = start.getTime()
        const e = s + duration * 60000
        if (s < earliest) continue
        if (busyRanges.some(([bs, be]) => s < be && e > bs)) continue
        slots.push(start)
      }
    }
  }
  slots.sort((a, b) => a - b)
  // De-duplicate (overlapping availability windows) while preserving order.
  return slots.filter((s, i) => i === 0 || s.getTime() !== slots[i - 1].getTime())
}

/** Group dates by the viewer's local calendar day. */
export function groupByLocalDay(dates) {
  const map = new Map()
  for (const d of dates) {
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
    if (!map.has(key)) map.set(key, { key, date: new Date(d.getFullYear(), d.getMonth(), d.getDate()), slots: [] })
    map.get(key).slots.push(d)
  }
  return [...map.values()]
}

export function startOfWeek(d) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7))
  return x
}

/** Downloadable calendar invite for a session. */
export function icsForBooking({ id, subject, starts_at, ends_at, withName }) {
  const fmt = (d) => new Date(d).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const body = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//TutorHaven//EN', 'BEGIN:VEVENT',
    `UID:${id}@tutorhaven`, `DTSTAMP:${fmt(new Date())}`, `DTSTART:${fmt(starts_at)}`, `DTEND:${fmt(ends_at)}`,
    `SUMMARY:${subject} with ${withName} — TutorHaven`, 'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n')
  return URL.createObjectURL(new Blob([body], { type: 'text/calendar' }))
}
