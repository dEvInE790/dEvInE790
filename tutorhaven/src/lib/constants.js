export const SUBJECTS = [
  'Mathematics', 'Further Mathematics', 'English', 'Literature', 'Physics', 'Chemistry', 'Biology',
  'Economics', 'Commerce', 'Accounting', 'Government', 'Computer Science', 'Python', 'French',
  'Writing', 'Statistics', 'Calculus', 'Spanish', 'Music', 'Test Prep',
]

export const LEVELS = ['Primary', 'JSS', 'SSS', 'WAEC', 'NECO', 'JAMB', 'A-Level', 'IGCSE', 'University', 'Adult']

export const LANGUAGES = ['English', 'Yoruba', 'Igbo', 'Hausa', 'Pidgin', 'French', 'Arabic', 'Spanish', 'German', 'Mandarin']

export const GOALS = [
  'Improve grades', 'Pass WAEC / NECO', 'Score high in JAMB', 'Build confidence',
  'Get ahead', 'Learn a new skill', 'University applications',
]

export const DURATIONS = [30, 45, 60, 90]

// Defaults until platform_settings loads; admins change these in the admin panel.
export const DEFAULT_SETTINGS = { currency: 'NGN', hold_minutes: 30, tutor_subscription_required: true }

/** Booking without a plan: shown next to the paid plans on the pricing page. */
export const PAY_AS_YOU_GO = {
  id: 'free',
  code: 'free',
  name: 'Pay as you go',
  price: 0,
  tagline: 'Book any tutor, pay per session.',
  discount: 0,
  features: ['Access to every verified tutor', 'Secure Paystack payments in naira', 'Free cancellation up to 24h before'],
}

/** Shapes a subscription_plans row for display. */
export function toPlan(row) {
  const discount = Number(row.session_discount ?? 0)
  return {
    ...row,
    price: row.price == null ? null : Number(row.price),
    discount,
    tagline: row.description,
    features: row.features?.length ? row.features : discount ? [`${Math.round(discount * 100)}% off every session`] : [],
  }
}

export const ROLE_LABEL = { student: 'Student', parent: 'Parent', tutor: 'Tutor', admin: 'Admin' }


/** Fallback only; the live value comes from platform_settings via useSettings(). */
export const HOLD_MINUTES = DEFAULT_SETTINGS.hold_minutes
