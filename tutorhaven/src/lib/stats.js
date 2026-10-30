import { startOfWeek } from './time'

/** Sum `value(item)` into the last `weeks` calendar weeks (Mon–Sun), oldest first. */
export function weeklySeries(items, { weeks = 8, date = (x) => x.starts_at, value = () => 1 } = {}) {
  const thisWeek = startOfWeek(new Date())
  const buckets = Array.from({ length: weeks }, (_, i) => {
    const start = new Date(thisWeek)
    start.setDate(start.getDate() - (weeks - 1 - i) * 7)
    return { start, value: 0 }
  })
  for (const it of items) {
    const d = new Date(date(it))
    for (let i = buckets.length - 1; i >= 0; i--) {
      if (d >= buckets[i].start) {
        const end = new Date(buckets[i].start)
        end.setDate(end.getDate() + 7)
        if (d < end) buckets[i].value += value(it)
        break
      }
    }
  }
  return buckets.map((b, i) => ({
    label: i === buckets.length - 1 ? 'This wk' : b.start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    detail: `Week of ${b.start.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}`,
    value: Math.round(b.value * 100) / 100,
  }))
}

/** Sum `value(item)` into the last `months` calendar months, oldest first. */
export function monthlySeries(items, { months = 6, date = (x) => x.created_at, value = (x) => Number(x.amount) } = {}) {
  const now = new Date()
  const buckets = Array.from({ length: months }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (months - 1 - i), 1)
    return { key: `${d.getFullYear()}-${d.getMonth()}`, d, value: 0 }
  })
  for (const it of items) {
    const d = new Date(date(it))
    const b = buckets.find((x) => x.key === `${d.getFullYear()}-${d.getMonth()}`)
    if (b) b.value += value(it)
  }
  return buckets.map((b) => ({
    label: b.d.toLocaleDateString(undefined, { month: 'short' }),
    detail: b.d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
    value: Math.round(b.value * 100) / 100,
  }))
}

export const isThisMonth = (d) => {
  const x = new Date(d)
  const n = new Date()
  return x.getFullYear() === n.getFullYear() && x.getMonth() === n.getMonth()
}

export const hours = (b) => b.duration_minutes / 60
export const isLive = (b) => b.status === 'confirmed' || b.status === 'completed'
export const isUpcoming = (b) => b.status === 'confirmed' && new Date(b.ends_at) > new Date()
export const hoursFmt = (v) => (v % 1 === 0 ? String(v) : v.toFixed(1))
