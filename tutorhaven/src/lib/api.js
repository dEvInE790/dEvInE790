import { supabase, isSupabaseConfigured } from './supabase'

export class ApiError extends Error {}

function check({ data, error }) {
  if (error) throw new ApiError(friendlyMessage(error))
  return data
}

function friendlyMessage(error) {
  const msg = error?.message || 'Something went wrong'
  if (/Failed to fetch|NetworkError|fetch failed/i.test(msg)) return 'We could not reach the server. Check your connection and try again.'
  if (/JWT|token/i.test(msg) && /expired|invalid/i.test(msg)) return 'Your session expired. Please sign in again.'
  return msg
}

function ensureConfigured() {
  if (!isSupabaseConfigured) throw new ApiError('Supabase is not configured yet. Add your project URL and anon key to tutorhaven/.env.')
}

const BOOKING_SELECT = `
  *,
  tutor:tutors!bookings_tutor_id_fkey ( id, hourly_rate, timezone, profile:profiles!tutors_id_fkey ( full_name, avatar_url ) ),
  student:profiles!bookings_student_id_fkey ( id, full_name, avatar_url ),
  review:reviews ( id, rating )
`

// ---------------------------------------------------------------------------
// Public
// ---------------------------------------------------------------------------
export async function getPublicStats() {
  ensureConfigured()
  return check(await supabase.rpc('public_stats'))
}

export async function getFeaturedReviews(limit = 6) {
  ensureConfigured()
  return check(await supabase.rpc('featured_reviews', { p_limit: limit }))
}

const sanitize = (q) => q.replace(/[,()*%\\:"']/g, ' ').trim()

export async function searchTutors({ q = '', subject = '', level = '', maxRate = null, sort = 'rating', limit = 48, ids = null } = {}) {
  ensureConfigured()
  let query = supabase.from('tutor_directory').select('*')
  const term = sanitize(q)
  if (term) query = query.or(`full_name.ilike.*${term}*,headline.ilike.*${term}*,subjects_text.ilike.*${term}*,bio.ilike.*${term}*`)
  if (subject) query = query.contains('subjects', [subject])
  if (level) query = query.contains('levels', [level])
  if (maxRate) query = query.lte('hourly_rate', maxRate)
  if (ids) query = query.in('id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000'])
  if (sort === 'price_asc') query = query.order('hourly_rate', { ascending: true })
  else if (sort === 'price_desc') query = query.order('hourly_rate', { ascending: false })
  else if (sort === 'experience') query = query.order('years_experience', { ascending: false })
  else query = query.order('rating', { ascending: false }).order('review_count', { ascending: false })
  return check(await query.order('created_at', { ascending: true }).limit(limit))
}

export async function getRecommendedTutors(subjects = [], limit = 3) {
  ensureConfigured()
  let query = supabase.from('tutor_directory').select('*')
  if (subjects.length) query = query.overlaps('subjects', subjects)
  return check(await query.order('rating', { ascending: false }).limit(limit))
}

export async function getTutor(id) {
  ensureConfigured()
  const [tutor, availability] = await Promise.all([
    supabase.from('tutors').select('*, profile:profiles!tutors_id_fkey ( full_name, avatar_url )').eq('id', id).maybeSingle(),
    supabase.from('availability').select('weekday, start_minute, end_minute').eq('tutor_id', id).order('weekday').order('start_minute'),
  ])
  const t = check(tutor)
  if (!t) return null
  return { ...t, full_name: t.profile?.full_name ?? '', avatar_url: t.profile?.avatar_url, availability: check(availability) }
}

export async function getTutorReviews(id) {
  ensureConfigured()
  return check(await supabase.rpc('tutor_reviews', { p_tutor: id }))
}

export async function getBusySlots(tutorId, from, to) {
  ensureConfigured()
  return check(await supabase.rpc('tutor_busy_slots', { p_tutor: tutorId, p_from: from.toISOString(), p_to: to.toISOString() }))
}

// ---------------------------------------------------------------------------
// Profile & onboarding
// ---------------------------------------------------------------------------
export async function getProfile(id) {
  ensureConfigured()
  return check(await supabase.from('profiles').select('*').eq('id', id).maybeSingle())
}

export async function updateProfile(id, patch) {
  ensureConfigured()
  return check(await supabase.from('profiles').update(patch).eq('id', id).select().single())
}

export async function getOwnTutor(id) {
  ensureConfigured()
  const [tutor, availability] = await Promise.all([
    supabase.from('tutors').select('*').eq('id', id).maybeSingle(),
    supabase.from('availability').select('weekday, start_minute, end_minute').eq('tutor_id', id).order('weekday').order('start_minute'),
  ])
  return { tutor: check(tutor), availability: check(availability) }
}

export async function updateTutor(id, patch) {
  ensureConfigured()
  return check(await supabase.from('tutors').update(patch).eq('id', id).select().single())
}

export async function replaceAvailability(tutorId, rows) {
  ensureConfigured()
  check(await supabase.from('availability').delete().eq('tutor_id', tutorId))
  if (!rows.length) return []
  return check(
    await supabase
      .from('availability')
      .insert(rows.map((r) => ({ tutor_id: tutorId, weekday: r.weekday, start_minute: r.start_minute, end_minute: r.end_minute })))
      .select(),
  )
}

// ---------------------------------------------------------------------------
// Bookings
// ---------------------------------------------------------------------------
export async function createBooking({ tutorId, studentId, subject, startsAt, duration, notes }) {
  ensureConfigured()
  return check(
    await supabase.rpc('create_booking', {
      p_tutor: tutorId, p_student: studentId, p_subject: subject,
      p_starts_at: startsAt.toISOString(), p_duration: duration, p_notes: notes ?? '',
    }),
  )
}

export async function getBooking(id) {
  ensureConfigured()
  return check(await supabase.from('bookings').select(BOOKING_SELECT).eq('id', id).maybeSingle())
}

/** All bookings visible to the signed-in user (RLS scopes them by role). */
export async function listBookings({ from = null, to = null, limit = 200 } = {}) {
  ensureConfigured()
  let q = supabase.from('bookings').select(BOOKING_SELECT)
  if (from) q = q.gte('starts_at', from.toISOString())
  if (to) q = q.lt('starts_at', to.toISOString())
  return check(await q.order('starts_at', { ascending: true }).limit(limit))
}

export async function payForBooking(id) {
  ensureConfigured()
  return check(await supabase.rpc('pay_for_booking', { p_booking: id }))
}

export async function setBookingStatus(id, status) {
  ensureConfigured()
  return check(await supabase.rpc('set_booking_status', { p_booking: id, p_status: status }))
}

export async function submitReview(bookingId, rating, comment) {
  ensureConfigured()
  return check(await supabase.rpc('submit_review', { p_booking: bookingId, p_rating: rating, p_comment: comment }))
}

// ---------------------------------------------------------------------------
// Family
// ---------------------------------------------------------------------------
export async function listChildren(parentId) {
  ensureConfigured()
  const rows = check(
    await supabase
      .from('parent_links')
      .select('created_at, child:profiles!parent_links_student_id_fkey ( id, full_name, avatar_url, grade_level, subjects )')
      .eq('parent_id', parentId)
      .order('created_at'),
  )
  return rows.map((r) => r.child).filter(Boolean)
}

export async function linkChild(email) {
  ensureConfigured()
  return check(await supabase.rpc('link_child', { p_email: email }))
}

export async function unlinkChild(parentId, studentId) {
  ensureConfigured()
  return check(await supabase.from('parent_links').delete().eq('parent_id', parentId).eq('student_id', studentId))
}

// ---------------------------------------------------------------------------
// Favourites
// ---------------------------------------------------------------------------
export async function listFavouriteIds(userId) {
  ensureConfigured()
  const rows = check(await supabase.from('favourites').select('tutor_id').eq('user_id', userId))
  return rows.map((r) => r.tutor_id)
}

export async function setFavourite(userId, tutorId, on) {
  ensureConfigured()
  if (on) return check(await supabase.from('favourites').insert({ user_id: userId, tutor_id: tutorId }))
  return check(await supabase.from('favourites').delete().eq('user_id', userId).eq('tutor_id', tutorId))
}

// ---------------------------------------------------------------------------
// Billing
// ---------------------------------------------------------------------------
export async function getSubscription(userId) {
  ensureConfigured()
  return check(await supabase.from('subscriptions').select('*').eq('user_id', userId).maybeSingle())
}

export async function listPayments(userId) {
  ensureConfigured()
  return check(await supabase.from('payments').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(100))
}

export async function subscribe(plan) {
  ensureConfigured()
  return check(await supabase.rpc('subscribe', { p_plan: plan }))
}

export async function cancelSubscription() {
  ensureConfigured()
  return check(await supabase.rpc('cancel_subscription'))
}

export const activeDiscount = (sub, plans) => {
  if (!sub || new Date(sub.current_period_end) <= new Date()) return 0
  return plans.find((p) => p.id === sub.plan)?.discount ?? 0
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------
export async function getAdminOverview() {
  ensureConfigured()
  return check(await supabase.rpc('admin_overview'))
}

export async function listPendingTutors() {
  ensureConfigured()
  return check(
    await supabase
      .from('tutors')
      .select('*, profile:profiles!tutors_id_fkey ( full_name, avatar_url, created_at )')
      .eq('status', 'pending')
      .order('created_at', { ascending: true }),
  )
}

export async function adminListUsers(search = '') {
  ensureConfigured()
  return check(await supabase.rpc('admin_list_users', { p_search: search, p_limit: 100 }))
}

export async function adminSetTutorStatus(id, status) {
  ensureConfigured()
  return check(await supabase.rpc('admin_set_tutor_status', { p_tutor: id, p_status: status }))
}

export async function adminSetRole(id, role) {
  ensureConfigured()
  return check(await supabase.rpc('admin_set_role', { p_user: id, p_role: role }))
}

export async function adminRecentBookings(limit = 8) {
  ensureConfigured()
  return check(await supabase.from('bookings').select(BOOKING_SELECT).order('created_at', { ascending: false }).limit(limit))
}
