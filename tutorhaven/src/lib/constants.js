export const SUBJECTS = [
  'Mathematics', 'Calculus', 'Statistics', 'Physics', 'Chemistry', 'Biology',
  'English', 'Writing', 'Spanish', 'French', 'Computer Science', 'Python',
  'History', 'Economics', 'Music', 'Test Prep',
]

export const LEVELS = ['Primary', 'Middle School', 'High School', 'GCSE', 'A-Level', 'IB', 'University', 'Adult']

export const LANGUAGES = ['English', 'Spanish', 'French', 'German', 'Mandarin', 'Arabic', 'Hindi', 'Portuguese', 'Yoruba', 'Igbo', 'Korean', 'Tamil']

export const GOALS = [
  'Improve grades', 'Prepare for exams', 'Build confidence', 'Get ahead',
  'Learn a new skill', 'University applications',
]

export const DURATIONS = [30, 45, 60, 90]

export const PLANS = [
  {
    id: 'free',
    name: 'Pay as you go',
    price: 0,
    tagline: 'Book any tutor, pay per session.',
    discount: 0,
    features: ['Access to every verified tutor', 'Secure booking & payments', 'Free cancellation up to 24h before'],
  },
  {
    id: 'plus',
    name: 'Plus',
    price: 19,
    tagline: 'For committed learners who book weekly.',
    discount: 0.1,
    featured: true,
    features: ['10% off every session', 'Free cancellation up to 2h before', 'Everything in Pay as you go'],
  },
  {
    id: 'family',
    name: 'Family',
    price: 39,
    tagline: 'One plan for every learner at home.',
    discount: 0.15,
    features: ['15% off sessions for all linked children', 'Free cancellation up to 2h before', 'Parent dashboard with spending insights'],
  },
]

export const ROLE_LABEL = { student: 'Student', parent: 'Parent', tutor: 'Tutor', admin: 'Admin' }

export const HOLD_MINUTES = 20
