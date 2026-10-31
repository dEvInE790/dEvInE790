// Demo mode backend: an in-browser stand-in for Supabase (Auth + PostgREST + RPC).
// Only bundled when VITE_DEMO=true. It mirrors the rules in supabase/migrations so
// the demo behaves like the real app; data lives in this browser's localStorage.

import { seedDemoDb } from './seed'

const KEY = 'th:demo-db:v1'
const D = 864e5
let db = load()

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    /* storage unavailable: fall back to memory */
  }
  return seedDemoDb()
}
function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(db))
  } catch {
    /* memory only */
  }
}
export function resetDemo() {
  try {
    localStorage.removeItem(KEY)
    for (const k of Object.keys(localStorage)) if (k.startsWith('sb-')) localStorage.removeItem(k)
  } catch {
    /* ignore */
  }
  db = seedDemoDb()
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------
const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36))
const b64 = (o) => btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')
const unb64 = (s) => JSON.parse(decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/')))))
const round2 = (n) => Math.round(n * 100) / 100

class HttpError extends Error {
  constructor(status, body) {
    super(body.message || body.msg)
    this.status = status
    this.body = body
  }
}
const fail = (message, status = 400) => {
  throw new HttpError(status, { message, code: 'P0001' })
}
const authFail = (msg, status = 400) => {
  throw new HttpError(status, { error: 'invalid_request', error_description: msg, msg, code: 'invalid_credentials' })
}

function sessionFor(user) {
  const exp = Math.floor(Date.now() / 1000) + 7 * 86400
  const access_token = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: user.id, email: user.email, role: 'authenticated', aud: 'authenticated', exp })}.demo`
  return {
    access_token, token_type: 'bearer', expires_in: 7 * 86400, expires_at: exp, refresh_token: 'demo-refresh-' + user.id,
    user: authUser(user),
  }
}
const authUser = (u) => ({
  id: u.id, aud: 'authenticated', role: 'authenticated', email: u.email, email_confirmed_at: u.created_at,
  user_metadata: { full_name: profile(u.id)?.full_name }, app_metadata: { provider: 'email' }, created_at: u.created_at,
})

const profile = (id) => db.profiles.find((p) => p.id === id)
const tutor = (id) => db.tutors.find((t) => t.id === id)
const isAdmin = (uid) => profile(uid)?.role === 'admin'
const isParentOf = (uid, sid) => db.parent_links.some((l) => l.parent_id === uid && l.student_id === sid)
const discountFor = (uid) => {
  const s = db.subscriptions.find((x) => x.user_id === uid && new Date(x.current_period_end) > new Date())
  return s ? (s.plan === 'family' ? 0.15 : 0.1) : 0
}
const staleHold = (b) => b.status === 'pending_payment' && Date.now() - new Date(b.created_at).getTime() > 20 * 60000

function directoryRow(t) {
  const p = profile(t.id)
  return { ...t, full_name: p?.full_name ?? '', avatar_url: p?.avatar_url ?? null, subjects_text: t.subjects.join(' ') }
}

function bookingRow(b) {
  const tp = profile(b.tutor_id)
  const t = tutor(b.tutor_id)
  const sp = profile(b.student_id)
  const r = db.reviews.find((x) => x.booking_id === b.id)
  return {
    ...b,
    tutor: t ? { id: t.id, hourly_rate: t.hourly_rate, timezone: t.timezone, profile: { full_name: tp?.full_name, avatar_url: null } } : null,
    student: sp ? { id: sp.id, full_name: sp.full_name, avatar_url: null } : null,
    review: r ? { id: r.id, rating: r.rating } : null,
  }
}

function refreshRating(tutorId) {
  const t = tutor(tutorId)
  const rs = db.reviews.filter((r) => r.tutor_id === tutorId)
  t.rating = rs.length ? round2(rs.reduce((s, r) => s + r.rating, 0) / rs.length) : 0
  t.review_count = rs.length
}

function tzParts(date, tz) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', weekday: 'short', hour: '2-digit', minute: '2-digit' }).formatToParts(date).map((x) => [x.type, x.value]))
  return { dow: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday), minute: (+p.hour % 24) * 60 + +p.minute }
}

// ---------------------------------------------------------------------------
// RPCs (mirroring the SQL functions)
// ---------------------------------------------------------------------------
const rpc = {
  public_stats() {
    const approved = db.tutors.filter((t) => t.status === 'approved')
    return {
      tutors: approved.length,
      subjects: new Set(approved.flatMap((t) => t.subjects)).size,
      avg_rating: db.reviews.length ? Math.round((db.reviews.reduce((s, r) => s + r.rating, 0) / db.reviews.length) * 10) / 10 : null,
      reviews: db.reviews.length,
      sessions: db.bookings.filter((b) => b.status === 'completed').length,
    }
  },
  featured_reviews({ p_limit = 6 }) {
    return db.reviews
      .filter((r) => r.rating >= 4 && r.comment.length >= 20 && tutor(r.tutor_id)?.status === 'approved')
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, Math.min(p_limit, 20))
      .map((r) => ({ id: r.id, rating: r.rating, comment: r.comment, author_name: profile(r.author_id)?.full_name.split(' ')[0], tutor_name: profile(r.tutor_id)?.full_name, tutor_id: r.tutor_id, created_at: r.created_at }))
  },
  tutor_reviews({ p_tutor }) {
    if (tutor(p_tutor)?.status !== 'approved') return []
    return db.reviews
      .filter((r) => r.tutor_id === p_tutor)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map((r) => ({ id: r.id, rating: r.rating, comment: r.comment, author_name: profile(r.author_id)?.full_name.split(' ')[0], subject: db.bookings.find((b) => b.id === r.booking_id)?.subject ?? '', created_at: r.created_at }))
  },
  tutor_busy_slots({ p_tutor, p_from, p_to }) {
    return db.bookings
      .filter((b) => b.tutor_id === p_tutor && b.status !== 'cancelled' && !staleHold(b) && b.starts_at < p_to && b.ends_at > p_from)
      .map((b) => ({ starts_at: b.starts_at, ends_at: b.ends_at }))
  },
  create_booking({ p_tutor, p_student, p_subject, p_starts_at, p_duration, p_notes = '' }, uid) {
    if (!uid) fail('Please sign in to book a session')
    if (p_student !== uid && !isParentOf(uid, p_student)) fail('You can only book for yourself or a linked child')
    if (p_tutor === p_student) fail('You cannot book a session with yourself')
    const t = tutor(p_tutor)
    if (!t || t.status !== 'approved') fail('This tutor is not available for booking')
    if (![30, 45, 60, 90].includes(p_duration)) fail('Invalid session length')
    const start = new Date(p_starts_at)
    if (start.getTime() < Date.now() + 3600e3) fail('Sessions must be booked at least an hour in advance')
    if (start.getTime() > Date.now() + 60 * D) fail('Sessions can be booked up to 60 days ahead')
    if (!p_subject?.trim()) fail('Please choose a subject')
    const { dow, minute } = tzParts(start, t.timezone)
    if (minute % 15 !== 0 || !db.availability.some((a) => a.tutor_id === p_tutor && a.weekday === dow && a.start_minute <= minute && minute + p_duration <= a.end_minute)) {
      fail('That time is outside the tutor’s availability')
    }
    db.bookings.forEach((b) => { if (b.tutor_id === p_tutor && staleHold(b)) b.status = 'cancelled' })
    const end = new Date(start.getTime() + p_duration * 60000)
    if (db.bookings.some((b) => b.tutor_id === p_tutor && b.status !== 'cancelled' && new Date(b.starts_at) < end && new Date(b.ends_at) > start)) {
      fail('Sorry, that slot was just taken. Please pick another time.')
    }
    const b = {
      id: uuid(), tutor_id: p_tutor, student_id: p_student, booked_by: uid, subject: p_subject.trim(),
      starts_at: start.toISOString(), ends_at: end.toISOString(), duration_minutes: p_duration,
      price: round2((t.hourly_rate * p_duration) / 60), amount_paid: null, status: 'pending_payment',
      notes: (p_notes || '').slice(0, 1000), created_at: new Date().toISOString(),
    }
    db.bookings.push(b)
    return b
  },
  pay_for_booking({ p_booking }, uid) {
    const b = db.bookings.find((x) => x.id === p_booking && x.booked_by === uid)
    if (!b) fail('Booking not found')
    if (b.status !== 'pending_payment') fail('This booking has already been processed')
    if (staleHold(b)) { b.status = 'cancelled'; fail('This checkout expired. Please choose a time again.') }
    const amount = round2(b.price * (1 - discountFor(uid)))
    b.status = 'confirmed'
    b.amount_paid = amount
    const p = { id: uuid(), user_id: uid, booking_id: b.id, kind: 'session', amount, currency: 'USD', status: 'succeeded', description: `${b.subject} with ${profile(b.tutor_id)?.full_name}`, provider: 'test', created_at: new Date().toISOString() }
    db.payments.push(p)
    return p
  },
  set_booking_status({ p_booking, p_status }, uid) {
    const b = db.bookings.find((x) => x.id === p_booking)
    if (!b) fail('Booking not found')
    const isTutor = b.tutor_id === uid
    const learnerSide = b.student_id === uid || b.booked_by === uid || isParentOf(uid, b.student_id)
    if (!(isTutor || learnerSide || isAdmin(uid))) fail('Booking not found')
    if (p_status === 'cancelled') {
      if (!['pending_payment', 'confirmed'].includes(b.status)) fail('Only upcoming sessions can be cancelled')
      if (b.status === 'confirmed' && !isTutor && !isAdmin(uid)) {
        const windowH = discountFor(b.booked_by) > 0 ? 2 : 24
        if (new Date(b.starts_at).getTime() - Date.now() < windowH * 3600e3) fail(`Sessions can be cancelled up to ${windowH} hours before they start`)
      }
      b.status = 'cancelled'
      db.payments.forEach((p) => { if (p.booking_id === b.id && p.status === 'succeeded') p.status = 'refunded' })
    } else if (p_status === 'completed') {
      if (!(isTutor || isAdmin(uid))) fail('Only the tutor can complete a session')
      if (b.status !== 'confirmed') fail('Only confirmed sessions can be completed')
      if (new Date(b.starts_at) > new Date()) fail('This session has not started yet')
      b.status = 'completed'
      tutor(b.tutor_id).sessions_completed += 1
    } else fail('Unsupported status change')
    return b
  },
  submit_review({ p_booking, p_rating, p_comment }, uid) {
    const b = db.bookings.find((x) => x.id === p_booking && (x.student_id === uid || x.booked_by === uid))
    if (!b) fail('Booking not found')
    if (b.status !== 'completed') fail('You can review a session once it is completed')
    if (p_rating < 1 || p_rating > 5) fail('Rating must be between 1 and 5')
    let r = db.reviews.find((x) => x.booking_id === b.id)
    if (r) Object.assign(r, { rating: p_rating, comment: (p_comment || '').trim() })
    else {
      r = { id: uuid(), booking_id: b.id, tutor_id: b.tutor_id, author_id: uid, rating: p_rating, comment: (p_comment || '').trim().slice(0, 2000), created_at: new Date().toISOString() }
      db.reviews.push(r)
    }
    refreshRating(b.tutor_id)
    return r
  },
  link_child({ p_email }, uid) {
    if (profile(uid)?.role !== 'parent') fail('Only parent accounts can link a learner')
    const u = db.users.find((x) => x.email.toLowerCase() === (p_email || '').trim().toLowerCase())
    const child = u && profile(u.id)
    if (!child || child.role !== 'student') fail('No student account uses that email yet. Ask your child to sign up as a student first.')
    if (!isParentOf(uid, child.id)) db.parent_links.push({ parent_id: uid, student_id: child.id, created_at: new Date().toISOString() })
    return child
  },
  subscribe({ p_plan }, uid) {
    if (!uid) fail('Please sign in first')
    const price = { plus: 19, family: 39 }[p_plan]
    if (!price) fail('Unknown plan')
    let s = db.subscriptions.find((x) => x.user_id === uid)
    const base = s && new Date(s.current_period_end) > new Date() ? new Date(s.current_period_end) : new Date()
    const end = new Date(base); end.setMonth(end.getMonth() + 1)
    if (s) Object.assign(s, { plan: p_plan, status: 'active', current_period_end: end.toISOString() })
    else { s = { user_id: uid, plan: p_plan, status: 'active', current_period_end: end.toISOString(), created_at: new Date().toISOString() }; db.subscriptions.push(s) }
    db.payments.push({ id: uuid(), user_id: uid, booking_id: null, kind: 'subscription', amount: price, currency: 'USD', status: 'succeeded', description: `TutorHaven ${p_plan[0].toUpperCase() + p_plan.slice(1)} — monthly`, provider: 'test', created_at: new Date().toISOString() })
    return s
  },
  cancel_subscription(_, uid) {
    const s = db.subscriptions.find((x) => x.user_id === uid)
    if (!s) fail('No active subscription')
    s.status = 'canceled'
    return s
  },
  admin_overview(_, uid) {
    if (!isAdmin(uid)) fail('Admins only')
    const count = (arr, key) => arr.reduce((m, x) => ({ ...m, [x[key]]: (m[x[key]] ?? 0) + 1 }), {})
    const ok = db.payments.filter((p) => p.status === 'succeeded')
    const now = new Date()
    return {
      users_by_role: count(db.profiles, 'role'),
      tutors_pending: db.tutors.filter((t) => t.status === 'pending').length,
      bookings_by_status: count(db.bookings, 'status'),
      revenue_total: round2(ok.reduce((s, p) => s + p.amount, 0)),
      revenue_by_month: Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1)
        const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        return { month: m, amount: round2(ok.filter((p) => p.created_at.slice(0, 7) === m).reduce((s, p) => s + p.amount, 0)) }
      }),
      new_users_30d: db.profiles.filter((p) => Date.now() - new Date(p.created_at).getTime() < 30 * D).length,
      active_subscriptions: db.subscriptions.filter((s) => new Date(s.current_period_end) > now).length,
    }
  },
  admin_list_users({ p_search = '' }, uid) {
    if (!isAdmin(uid)) fail('Admins only')
    const q = p_search.toLowerCase()
    return db.profiles
      .map((p) => ({ id: p.id, email: db.users.find((u) => u.id === p.id)?.email ?? '', full_name: p.full_name, role: p.role, created_at: p.created_at, tutor_status: tutor(p.id)?.status ?? null }))
      .filter((u) => !q || u.full_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
  },
  admin_set_tutor_status({ p_tutor, p_status }, uid) {
    if (!isAdmin(uid)) fail('Admins only')
    const t = tutor(p_tutor)
    if (!t) fail('Tutor not found')
    t.status = p_status
    return t
  },
  admin_set_role({ p_user, p_role }, uid) {
    if (!isAdmin(uid)) fail('Admins only')
    if (p_user === uid && p_role !== 'admin') fail('You cannot remove your own admin access')
    const p = profile(p_user)
    if (!p) fail('User not found')
    p.role = p_role
    if (p_role === 'tutor' && !tutor(p_user)) db.tutors.push(newTutorRow(p_user))
    return p
  },
}

export function newTutorRow(id) {
  return {
    id, headline: '', bio: '', subjects: [], levels: [], languages: ['English'], hourly_rate: 35, years_experience: 0,
    location: '', timezone: 'UTC', status: 'pending', rating: 0, review_count: 0, sessions_completed: 0, created_at: new Date().toISOString(),
  }
}

// ---------------------------------------------------------------------------
// Tables (row level security mirrored per table)
// ---------------------------------------------------------------------------
function visible(table, uid) {
  const admin = isAdmin(uid)
  switch (table) {
    case 'tutor_directory': return db.tutors.filter((t) => t.status === 'approved').map(directoryRow)
    case 'tutors': return db.tutors.filter((t) => t.status === 'approved' || t.id === uid || admin).map((t) => ({ ...t, profile: { full_name: profile(t.id)?.full_name, avatar_url: null, created_at: profile(t.id)?.created_at } }))
    case 'availability': return db.availability.filter((a) => tutor(a.tutor_id)?.status === 'approved' || a.tutor_id === uid || admin)
    case 'profiles': return db.profiles.filter((p) => p.id === uid || tutor(p.id)?.status === 'approved' || isParentOf(uid, p.id) || db.bookings.some((b) => b.tutor_id === uid && b.student_id === p.id) || admin)
    case 'bookings': return db.bookings.filter((b) => b.student_id === uid || b.booked_by === uid || b.tutor_id === uid || isParentOf(uid, b.student_id) || admin).map(bookingRow)
    case 'payments': return db.payments.filter((p) => p.user_id === uid || admin)
    case 'subscriptions': return db.subscriptions.filter((s) => s.user_id === uid || admin)
    case 'favourites': return db.favourites.filter((f) => f.user_id === uid)
    case 'parent_links': return db.parent_links.filter((l) => l.parent_id === uid || l.student_id === uid || admin).map((l) => ({ ...l, child: profile(l.student_id) }))
    case 'reviews': return db.reviews
    default: return []
  }
}

function matcher(params) {
  const filters = [...params.entries()].filter(([k]) => !['select', 'order', 'limit', 'or', 'offset'].includes(k))
  const list = (v) => v.replace(/^\w+\.\(|^\w+\.\{|\)$|\}$/g, '').split(',').map((s) => s.replace(/^"|"$/g, ''))
  return (row) => filters.every(([k, v]) => {
    const val = row[k]
    if (v.startsWith('eq.')) return String(val) === v.slice(3)
    if (v.startsWith('neq.')) return String(val) !== v.slice(4)
    if (v.startsWith('lte.')) return Number(val) <= Number(v.slice(4))
    if (v.startsWith('gte.')) return String(val) >= v.slice(4)
    if (v.startsWith('lt.')) return String(val) < v.slice(3)
    if (v.startsWith('in.')) return list(v).includes(String(val))
    if (v.startsWith('cs.')) return list(v).every((x) => val?.includes(x))
    if (v.startsWith('ov.')) return list(v).some((x) => val?.includes(x))
    return true
  })
}

function orFilter(expr) {
  // supports or=(col.ilike.*term*,col2.ilike.*term*)
  const parts = expr.replace(/^\(|\)$/g, '').split(',').map((p) => p.match(/^(\w+)\.ilike\.\*(.*)\*$/)).filter(Boolean)
  return (row) => parts.some(([, col, term]) => String(row[col] ?? '').toLowerCase().includes(term.toLowerCase()))
}

function order(rows, spec) {
  if (!spec) return rows
  const keys = spec.split(',').map((s) => s.split('.'))
  return [...rows].sort((a, b) => {
    for (const [col, dir] of keys) {
      const x = a[col], y = b[col]
      if (x === y) continue
      const c = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y))
      return dir === 'desc' ? -c : c
    }
    return 0
  })
}

const TUTOR_EDITABLE = ['headline', 'bio', 'subjects', 'levels', 'languages', 'hourly_rate', 'years_experience', 'location', 'timezone']
const PROFILE_EDITABLE = ['full_name', 'avatar_url', 'grade_level', 'subjects', 'goals', 'onboarded']

function table(method, name, params, body, uid) {
  const match = matcher(params)
  if (method === 'GET') {
    let rows = visible(name, uid).filter(match)
    if (params.get('or')) rows = rows.filter(orFilter(params.get('or')))
    rows = order(rows, params.get('order'))
    if (params.get('limit')) rows = rows.slice(0, Number(params.get('limit')))
    return rows
  }
  if (!uid) fail('permission denied', 401)
  if (method === 'PATCH') {
    if (name === 'profiles') {
      const rows = db.profiles.filter(match).filter((p) => p.id === uid || isAdmin(uid))
      rows.forEach((r) => PROFILE_EDITABLE.forEach((k) => k in body && (r[k] = body[k])))
      return rows
    }
    if (name === 'tutors') {
      const rows = db.tutors.filter(match).filter((t) => t.id === uid || isAdmin(uid))
      rows.forEach((r) => TUTOR_EDITABLE.forEach((k) => k in body && (r[k] = body[k])))
      return rows
    }
    fail('permission denied', 403)
  }
  if (method === 'POST') {
    const rows = (Array.isArray(body) ? body : [body]).map((r) => ({ ...r }))
    if (name === 'availability') {
      if (rows.some((r) => r.tutor_id !== uid)) fail('new row violates row-level security policy for table "availability"', 403)
      rows.forEach((r) => { if (!(r.end_minute > r.start_minute)) fail('Each time window must end after it starts') })
      db.availability.push(...rows)
      return rows
    }
    if (name === 'favourites') {
      if (rows.some((r) => r.user_id !== uid)) fail('new row violates row-level security policy for table "favourites"', 403)
      rows.forEach((r) => { if (!db.favourites.some((f) => f.user_id === r.user_id && f.tutor_id === r.tutor_id)) db.favourites.push({ ...r, created_at: new Date().toISOString() }) })
      return rows
    }
    fail('permission denied', 403)
  }
  if (method === 'DELETE') {
    const own = { availability: (r) => r.tutor_id === uid, favourites: (r) => r.user_id === uid, parent_links: (r) => r.parent_id === uid }[name]
    if (!own) fail('permission denied', 403)
    db[name] = db[name].filter((r) => !(match(r) && own(r)))
    return []
  }
  fail('Unsupported request', 405)
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
function auth(method, path, params, body, uid) {
  if (path === 'token') {
    const grant = params.get('grant_type')
    if (grant === 'password') {
      const u = db.users.find((x) => x.email.toLowerCase() === (body.email || '').toLowerCase() && x.password === body.password)
      if (!u) authFail('Invalid login credentials')
      return sessionFor(u)
    }
    if (grant === 'refresh_token') {
      const u = db.users.find((x) => 'demo-refresh-' + x.id === body.refresh_token)
      if (!u) authFail('Invalid Refresh Token', 400)
      return sessionFor(u)
    }
  }
  if (path === 'signup') {
    const email = (body.email || '').trim()
    if (db.users.some((u) => u.email.toLowerCase() === email.toLowerCase())) authFail('User already registered', 422)
    if ((body.password || '').length < 6) authFail('Password should be at least 6 characters.', 422)
    const id = uuid()
    const now = new Date().toISOString()
    const meta = body.data || {}
    const role = ['parent', 'tutor'].includes(meta.role) ? meta.role : 'student'
    db.users.push({ id, email, password: body.password, created_at: now })
    db.profiles.push({ id, full_name: (meta.full_name || email.split('@')[0]).trim(), role, avatar_url: null, grade_level: null, subjects: [], goals: [], onboarded: false, created_at: now })
    if (role === 'tutor') db.tutors.push(newTutorRow(id))
    return sessionFor(db.users.at(-1))
  }
  if (path === 'logout') return null
  if (path === 'recover') return {}
  if (path === 'user') {
    const u = db.users.find((x) => x.id === uid)
    if (!u) authFail('User not found', 401)
    if (method === 'PUT' && body.password) {
      if (body.password.length < 6) authFail('Password should be at least 6 characters.', 422)
      u.password = body.password
    }
    return authUser(u)
  }
  return {}
}

// ---------------------------------------------------------------------------
// fetch entry point
// ---------------------------------------------------------------------------
function uidFrom(headers) {
  const token = (headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
  const parts = token.split('.')
  if (parts.length !== 3) return null
  try {
    return unb64(parts[1]).sub ?? null
  } catch {
    return null
  }
}

const json = (data, status = 200) =>
  new Response(data === null ? null : JSON.stringify(data), { status: data === null ? 204 : status, headers: { 'content-type': 'application/json' } })

export async function demoFetch(input, init = {}) {
  const url = new URL(typeof input === 'string' ? input : input.url)
  const method = (init.method || (typeof input === 'object' && input.method) || 'GET').toUpperCase()
  const headers = new Headers(init.headers || (typeof input === 'object' ? input.headers : undefined))
  const body = init.body ? JSON.parse(init.body) : {}
  const uid = uidFrom(headers)
  // Small, realistic latency so loading states are visible.
  await new Promise((r) => setTimeout(r, 120 + Math.random() * 180))
  try {
    let result
    if (url.pathname.startsWith('/auth/v1/')) result = auth(method, url.pathname.slice(9), url.searchParams, body, uid)
    else if (url.pathname.startsWith('/rest/v1/rpc/')) {
      const fn = rpc[url.pathname.slice(13)]
      if (!fn) fail('Function not found', 404)
      result = fn(body, uid)
    } else if (url.pathname.startsWith('/rest/v1/')) {
      result = table(method, url.pathname.slice(9), url.searchParams, body, uid)
      if ((headers.get('accept') || '').includes('vnd.pgrst.object')) {
        if (!result.length) fail('JSON object requested, multiple (or no) rows returned', 406)
        result = result[0]
      }
    } else fail('Not found', 404)
    save()
    return json(result)
  } catch (e) {
    if (e instanceof HttpError) return json(e.body, e.status)
    console.error(e)
    return json({ message: 'Demo backend error: ' + e.message }, 500)
  }
}
