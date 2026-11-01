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
export const DEFAULT_SETTINGS = {
  currency: 'NGN', plus_price: 7500, family_price: 15000, plus_discount: 0.1, family_discount: 0.15, hold_minutes: 30, test_mode: false,
}

export function buildPlans(s = DEFAULT_SETTINGS) {
  const pct = (d) => `${Math.round(Number(d) * 100)}%`
  return [
    {
      id: 'free',
      name: 'Pay as you go',
      price: 0,
      tagline: 'Book any tutor, pay per session.',
      discount: 0,
      features: ['Access to every verified tutor', 'Secure Paystack payments in naira', 'Free cancellation up to 24h before'],
    },
    {
      id: 'plus',
      name: 'Plus',
      price: Number(s.plus_price),
      tagline: 'For committed learners who book weekly.',
      discount: Number(s.plus_discount),
      featured: true,
      features: [`${pct(s.plus_discount)} off every session`, 'Free cancellation up to 2h before', 'Everything in Pay as you go'],
    },
    {
      id: 'family',
      name: 'Family',
      price: Number(s.family_price),
      tagline: 'One plan for every learner at home.',
      discount: Number(s.family_discount),
      features: [`${pct(s.family_discount)} off sessions for all linked children`, 'Free cancellation up to 2h before', 'Parent dashboard with spending insights'],
    },
  ]
}

export const PLANS = buildPlans()

export const ROLE_LABEL = { student: 'Student', parent: 'Parent', tutor: 'Tutor', admin: 'Admin' }

export const HOLD_MINUTES = DEFAULT_SETTINGS.hold_minutes
