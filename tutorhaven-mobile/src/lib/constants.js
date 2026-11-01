export const SUBJECTS = [
  'Mathematics', 'Further Mathematics', 'English', 'Literature', 'Physics', 'Chemistry', 'Biology',
  'Economics', 'Commerce', 'Accounting', 'Government', 'Computer Science', 'Python', 'French', 'Writing', 'Music',
]
export const LEVELS = ['Primary', 'JSS', 'SSS', 'WAEC', 'NECO', 'JAMB', 'A-Level', 'IGCSE', 'University', 'Adult']
export const LANGUAGES = ['English', 'Yoruba', 'Igbo', 'Hausa', 'Pidgin', 'French', 'Arabic']
export const GOALS = ['Improve grades', 'Pass WAEC / NECO', 'Score high in JAMB', 'Build confidence', 'Get ahead', 'Learn a new skill']
export const DURATIONS = [30, 45, 60, 90]

export const DEFAULT_SETTINGS = { plus_price: 7500, family_price: 15000, plus_discount: 0.1, family_discount: 0.15, hold_minutes: 30, test_mode: false }

export function buildPlans(s = DEFAULT_SETTINGS) {
  const pct = (d) => `${Math.round(Number(d) * 100)}%`
  return [
    { id: 'free', name: 'Pay as you go', price: 0, discount: 0, tagline: 'Book any tutor, pay per session.', features: ['Every verified tutor', 'Secure Paystack payments', 'Free cancellation up to 24h before'] },
    { id: 'plus', name: 'Plus', price: Number(s.plus_price), discount: Number(s.plus_discount), featured: true, tagline: 'For learners who book weekly.', features: [`${pct(s.plus_discount)} off every session`, 'Free cancellation up to 2h before', 'Everything in Pay as you go'] },
    { id: 'family', name: 'Family', price: Number(s.family_price), discount: Number(s.family_discount), tagline: 'One plan for every learner at home.', features: [`${pct(s.family_discount)} off for all linked children`, 'Free cancellation up to 2h before', 'Family spending insights'] },
  ]
}

export const ROLE_LABEL = { student: 'Student', parent: 'Parent', tutor: 'Tutor', admin: 'Admin' }
