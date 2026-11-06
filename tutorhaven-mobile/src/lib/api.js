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
  if (!isSupabaseConfigured) throw new ApiError('Supabase is not configured yet. Add your project URL and anon key to tutorhaven-mobile/.env, then restart Expo.')
}

const BOOKING_SELECT = `
  *,
  tutor:tutors!bookings_tutor_id_fkey ( id, hourly_rate, timezone, profile:profiles!tutors_id_fkey ( full_name, avatar_url ) ),
  student:profiles!bookings_student_id_fkey ( id, full_name, avatar_url ),
  review:reviews ( id, rating ),
  feedback:lesson_feedback ( summary, strengths, improvements, next_steps, progress, updated_at )
`

async function invoke(name, body) {
  ensureConfigured()
  const { data, error } = await supabase.functions.invoke(name, { body })
  if (error) {
    let message = error.message
    try {
      const payload = await error.context?.json?.()
      if (payload?.error) message = payload.error
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(friendlyMessage({ message }))
  }
  return data
}

// ---------------------------------------------------------------------------
// Settings & payments (Paystack)
// ---------------------------------------------------------------------------
export async function getSettings() {
  ensureConfigured()
  return check(await supabase.from('platform_settings').select('*').eq('id', 1).maybeSingle())
}

/** Active plans for learners and tutors (prices set by admins). */
export async function listPlans() {
  ensureConfigured()
  return check(await supabase.from('subscription_plans').select('*').order('audience').order('sort_order').order('price'))
}

/** Creates a server-priced Paystack checkout. Returns { authorization_url, reference }. */
export const startPaystackCheckout = ({ kind, bookingId = null, planId = null, redirectUrl }) =>
  invoke('paystack-init', { kind, booking_id: bookingId, plan_id: planId, redirect_url: redirectUrl })

/** The server asks Paystack what happened; the app never decides a payment succeeded. */
export const verifyPaystack = (reference) => invoke('paystack-verify', { reference })

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
  return check(await query.order('rating', { ascending: false }).order('review_count', { ascending: false }).order('created_at', { ascending: true }).limit(limit))
}

export async function getTutor(id) {
  ensureConfigured()
  const [tutor, availability, listed] = await Promise.all([
    supabase.from('tutors').select('*, profile:profiles!tutors_id_fkey ( full_name, avatar_url )').eq('id', id).maybeSingle(),
    supabase.from('availability').select('weekday, start_minute, end_minute').eq('tutor_id', id).order('weekday').order('start_minute'),
    supabase.rpc('is_public_tutor', { p_id: id }),
  ])
  const t = check(tutor)
  if (!t) return null
  return { ...t, full_name: t.profile?.full_name ?? '', avatar_url: t.profile?.avatar_url, availability: check(availability), listed: !!check(listed) }
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

export async function setBookingStatus(id, status) {
  ensureConfigured()
  return check(await supabase.rpc('set_booking_status', { p_booking: id, p_status: status }))
}

/** One verified review per completed, paid session: overall stars plus four categories. */
export async function submitReview(bookingId, { rating, teaching, communication, punctuality, knowledge, comment = '' }) {
  ensureConfigured()
  return check(await supabase.rpc('submit_review', {
    p_booking: bookingId, p_rating: rating, p_teaching: teaching, p_communication: communication,
    p_punctuality: punctuality, p_knowledge: knowledge, p_comment: comment,
  }))
}

export async function getTutorReviewSummary(tutorId) {
  ensureConfigured()
  return check(await supabase.rpc('tutor_review_summary', { p_tutor: tutorId }))
}

export async function getMyTutorReviews() {
  ensureConfigured()
  return check(await supabase.rpc('my_tutor_reviews'))
}

export async function respondToReview(reviewId, body) {
  ensureConfigured()
  return check(await supabase.rpc('respond_to_review', { p_review: reviewId, p_body: body }))
}

export async function reportReview(reviewId, reason, details = '') {
  ensureConfigured()
  return check(await supabase.rpc('report_review', { p_review: reviewId, p_reason: reason, p_details: details }))
}

export async function saveLessonFeedback(bookingId, { summary, strengths = '', improvements = '', nextSteps = '', progress = null }) {
  ensureConfigured()
  return check(await supabase.rpc('save_lesson_feedback', {
    p_booking: bookingId, p_summary: summary, p_strengths: strengths, p_improvements: improvements, p_next_steps: nextSteps, p_progress: progress,
  }))
}

// TutorHaven Plus
export async function getMembership() {
  ensureConfigured()
  return check(await supabase.rpc('my_membership'))
}

export const askAssistant = ({ question, mode, subject, conversationId }) =>
  invoke('ai-assistant', { question, mode, subject, conversation_id: conversationId ?? null })

export async function getLearningAnalytics(studentId = null) {
  ensureConfigured()
  return check(await supabase.rpc('learning_analytics', { p_student: studentId }))
}

export async function saveGoal(goal) {
  ensureConfigured()
  return check(await supabase.rpc('save_learning_goal', { p: goal }))
}

export async function listReports(studentId) {
  ensureConfigured()
  return check(await supabase.rpc('list_learning_reports', { p_student: studentId }))
}

export async function requestReport(studentId, month = null) {
  ensureConfigured()
  return check(await supabase.rpc('request_learning_report', { p_student: studentId, p_month: month }))
}

export async function getTutorSections(limit = 6) {
  ensureConfigured()
  return check(await supabase.rpc('tutor_sections', { p_limit: limit }))
}

export async function getPersonalRecommendations(studentId = null, limit = 6) {
  ensureConfigured()
  return check(await supabase.rpc('recommend_tutors', { p_student: studentId, p_limit: limit }))
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
// Subscriptions & billing
// ---------------------------------------------------------------------------
export async function getSubscription(userId, audience = 'learner') {
  ensureConfigured()
  return check(
    await supabase.from('subscriptions').select('*, plan:subscription_plans ( * )').eq('user_id', userId).eq('audience', audience).maybeSingle(),
  )
}

/** Paid access runs until the end of the period, even after cancelling. */
export const isSubscriptionLive = (sub) =>
  !!sub && ['active', 'cancelled'].includes(sub.status) && !!sub.current_period_end && new Date(sub.current_period_end) > new Date()

export const activeDiscount = (sub) => (isSubscriptionLive(sub) ? Number(sub.plan?.session_discount ?? 0) : 0)

export async function cancelSubscription(audience = 'learner') {
  ensureConfigured()
  return check(await supabase.rpc('cancel_subscription', { p_audience: audience }))
}

export async function listPayments(userId) {
  ensureConfigured()
  return check(await supabase.from('payments').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(100))
}

/** Every checkout attempt: pending, succeeded, failed or abandoned. */
export async function listPaymentAttempts(userId) {
  ensureConfigured()
  return check(
    await supabase
      .from('payment_intents')
      .select('reference, kind, amount, status, failure_reason, created_at, booking_id, plan:subscription_plans ( name ), booking:bookings ( subject, starts_at )')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100),
  )
}

// ---------------------------------------------------------------------------
// Notifications & messages
// ---------------------------------------------------------------------------
export async function getUnreadCounts() {
  ensureConfigured()
  return check(await supabase.rpc('my_unread_counts'))
}

export async function listNotifications(limit = 40) {
  ensureConfigured()
  return check(await supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(limit))
}

export async function markNotificationsRead(ids = null) {
  ensureConfigured()
  return check(await supabase.rpc('mark_notifications_read', { p_ids: ids }))
}

export async function listConversations() {
  ensureConfigured()
  return check(await supabase.rpc('my_conversations'))
}

export async function getConversation(otherId) {
  ensureConfigured()
  const [partner, messages] = await Promise.all([
    supabase.rpc('conversation_partner', { p_other: otherId }),
    supabase.rpc('conversation_messages', { p_other: otherId }),
  ])
  return { partner: check(partner)?.[0] ?? null, messages: check(messages) }
}

export async function sendMessage(to, body) {
  ensureConfigured()
  return check(await supabase.rpc('send_message', { p_to: to, p_body: body }))
}

export async function markConversationRead(otherId) {
  ensureConfigured()
  return check(await supabase.rpc('mark_conversation_read', { p_other: otherId }))
}

export async function getPublicQualifications(tutorId) {
  ensureConfigured()
  return check(await supabase.rpc('tutor_public_qualifications', { p_tutor: tutorId }))
}

// ---------------------------------------------------------------------------
// Tutor payouts (Paystack split payments)
// ---------------------------------------------------------------------------
export async function getMyPayoutAccount(tutorId) {
  ensureConfigured()
  return check(await supabase.from('tutor_payout_accounts').select('*').eq('tutor_id', tutorId).maybeSingle())
}
export const listPayoutBanks = () => invoke('paystack-payout-account', { action: 'banks' }).then((r) => r.banks)
export const resolvePayoutAccount = (bankCode, accountNumber) =>
  invoke('paystack-payout-account', { action: 'resolve', bank_code: bankCode, account_number: accountNumber })
export const savePayoutAccount = (bankCode, accountNumber) =>
  invoke('paystack-payout-account', { action: 'save', bank_code: bankCode, account_number: accountNumber })
export async function getMyEarnings() {
  ensureConfigured()
  return check(await supabase.rpc('my_earnings'))
}
export async function isTutorListed(tutorId) {
  ensureConfigured()
  return check(await supabase.rpc('is_public_tutor', { p_id: tutorId }))
}
