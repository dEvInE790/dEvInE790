// Formatting without relying on Intl features that vary between JS engines.
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DAYS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export const money = (n) => {
  const v = Math.round(Number(n || 0))
  return `₦${String(Math.abs(v)).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`
}

export const time = (d) => {
  const x = new Date(d)
  const h = x.getHours()
  return `${h % 12 || 12}:${String(x.getMinutes()).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`
}
export const dayShort = (d) => DAYS[new Date(d).getDay()]
export const dateShort = (d) => { const x = new Date(d); return `${DAYS[x.getDay()]}, ${x.getDate()} ${MONTHS[x.getMonth()]}` }
export const dateLong = (d) => { const x = new Date(d); return `${DAYS_LONG[x.getDay()]}, ${x.getDate()} ${MONTHS_LONG[x.getMonth()]}` }
export const monthShort = (d) => MONTHS[new Date(d).getMonth()]

export function relativeFromNow(d) {
  const mins = Math.round((new Date(d).getTime() - Date.now()) / 60000)
  const abs = Math.abs(mins)
  const say = (n, unit) => (mins >= 0 ? `in ${n} ${unit}${n === 1 ? '' : 's'}` : `${n} ${unit}${n === 1 ? '' : 's'} ago`)
  if (abs < 60) return say(abs, 'minute')
  if (abs < 60 * 24) return say(Math.round(abs / 60), 'hour')
  const days = Math.round(abs / 1440)
  if (mins >= 0 && days === 1) return 'tomorrow'
  return say(days, 'day')
}

export const firstName = (name = '') => name.trim().split(/\s+/)[0] || 'there'
export function initials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase() || '?'
}
export const greeting = () => {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}
export const minutesToLabel = (m) => {
  if (m === 1440) return 'Midnight'
  const h = Math.floor(m / 60)
  return `${h % 12 || 12}:${String(m % 60).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`
}
export const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`
