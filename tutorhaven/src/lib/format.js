// All prices are in Nigerian naira.
const currencyFmt = new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', currencyDisplay: 'narrowSymbol', maximumFractionDigits: 2 })
const currencyWholeFmt = new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', currencyDisplay: 'narrowSymbol', maximumFractionDigits: 0 })

export const money = (n) => {
  const v = Number(n || 0)
  return Number.isInteger(v) ? currencyWholeFmt.format(v) : currencyFmt.format(v)
}

/** Compact naira for chart axes: ₦12.5k, ₦1.2m. */
export const moneyShort = (n) => {
  const v = Number(n || 0)
  if (v >= 1e6) return `₦${+(v / 1e6).toFixed(1)}m`
  if (v >= 1e3) return `₦${+(v / 1e3).toFixed(1)}k`
  return `₦${Math.round(v)}`
}

export const dateLong = (d) =>
  new Date(d).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
export const dateShort = (d) =>
  new Date(d).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
export const time = (d) => new Date(d).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
export const monthDay = (d) => new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

export function relativeFromNow(d) {
  const diff = new Date(d).getTime() - Date.now()
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })
  const mins = Math.round(diff / 60000)
  if (Math.abs(mins) < 60) return rtf.format(mins, 'minute')
  const hours = Math.round(mins / 60)
  if (Math.abs(hours) < 24) return rtf.format(hours, 'hour')
  return rtf.format(Math.round(hours / 24), 'day')
}

export const firstName = (name = '') => name.trim().split(/\s+/)[0] || 'there'

export function initials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase() || '?'
}

export const minutesToLabel = (m) => {
  const h = Math.floor(m / 60)
  const mm = m % 60
  const d = new Date(2000, 0, 1, h, mm)
  return m === 1440 ? 'Midnight' : d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

export const pluralize = (n, word, plural = word + 's') => `${n} ${n === 1 ? word : plural}`

export const greeting = () => {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}
