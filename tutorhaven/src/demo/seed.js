// Demo data, generated relative to "now" so upcoming sessions are always upcoming.
export const DEMO_PASSWORD = 'demo1234'

export const DEMO_ACCOUNTS = [
  { role: 'student', email: 'sam@demo.tutorhaven.app', name: 'Sam Rivera', blurb: 'A-Level learner with sessions, reviews and a Plus membership' },
  { role: 'parent', email: 'jordan@demo.tutorhaven.app', name: 'Jordan Rivera', blurb: 'Parent of Sam: book for a child, track family spending' },
  { role: 'tutor', email: 'amara@demo.tutorhaven.app', name: 'Amara Okafor', blurb: 'Maths tutor: schedule, earnings, listing editor' },
  { role: 'admin', email: 'ada@demo.tutorhaven.app', name: 'Ada Admin', blurb: 'Platform overview, tutor approvals, user roles' },
]

const D = 864e5
const id = (n) => `d0000000-0000-4000-8000-${String(n).padStart(12, '0')}`

const TUTORS = [
  [101, 'Amara Okafor', 'amara', 'Cambridge maths graduate making calculus click', 'I help secondary and university students turn maths anxiety into confidence. Sessions blend worked examples with exam technique, and every learner leaves with a clear plan for the week ahead.', ['Mathematics', 'Calculus', 'Statistics'], ['GCSE', 'A-Level', 'University'], ['English', 'Igbo'], 42, 8, 'London, UK', 'Europe/London'],
  [102, 'Lucas Meyer', 'lucas', 'Physics PhD who teaches with experiments you can do at home', 'Former lab researcher, now a full-time tutor. I make mechanics, electricity and modern physics intuitive through real-world demos and lots of practice questions.', ['Physics', 'Mathematics'], ['IB', 'A-Level', 'University'], ['English', 'German'], 55, 11, 'Berlin, Germany', 'Europe/Berlin'],
  [103, 'Priya Raman', 'priya', 'Software engineer teaching Python and computer science', 'Eight years shipping production code. I teach programming fundamentals, algorithms and AP/IB Computer Science with small projects that build real portfolios.', ['Computer Science', 'Python', 'Mathematics'], ['Middle School', 'High School', 'University'], ['English', 'Tamil'], 48, 6, 'Toronto, Canada', 'America/Toronto'],
  [104, 'Sofía Álvarez', 'sofia', 'Native Spanish speaker focused on real conversation', 'Conversation-first Spanish lessons for all ages. We read, listen and speak from day one, with grammar introduced exactly when you need it.', ['Spanish', 'English'], ['Primary', 'Middle School', 'High School', 'Adult'], ['Spanish', 'English'], 30, 5, 'Madrid, Spain', 'Europe/Madrid'],
  [105, 'Daniel Kim', 'daniel', 'Chemistry & biology tutor for pre-med and IB students', 'Medical school graduate who loves explaining why reactions happen. Structured revision plans, past-paper drills and memory techniques that stick.', ['Chemistry', 'Biology'], ['IB', 'A-Level', 'University'], ['English', 'Korean'], 50, 7, 'Seoul, South Korea', 'Asia/Seoul'],
  [106, 'Chloé Bennett', 'chloe', 'English literature & essay writing coach', 'Former secondary English teacher. I help students find their voice in essays, analyse texts with confidence and prepare for SAT, IELTS and university applications.', ['English', 'Writing', 'French'], ['Middle School', 'High School', 'Adult'], ['English', 'French'], 38, 9, 'New York, USA', 'America/New_York'],
]

export function seedDemoDb() {
  const now = Date.now()
  const iso = (t) => new Date(t).toISOString()
  const users = []
  const profiles = []
  const person = (n, email, full_name, role, extra = {}) => {
    const created = iso(now - (90 - (n % 60)) * D)
    users.push({ id: id(n), email, password: DEMO_PASSWORD, created_at: created })
    profiles.push({ id: id(n), full_name, role, avatar_url: null, grade_level: null, subjects: [], goals: [], onboarded: true, created_at: created, ...extra })
  }

  person(1, 'sam@demo.tutorhaven.app', 'Sam Rivera', 'student', { grade_level: 'A-Level', subjects: ['Mathematics', 'Physics'], goals: ['Prepare for exams'] })
  person(2, 'jordan@demo.tutorhaven.app', 'Jordan Rivera', 'parent', { subjects: ['Mathematics', 'English'], goals: ['Improve grades'] })
  person(3, 'ada@demo.tutorhaven.app', 'Ada Admin', 'admin')
  person(4, 'maya@demo.tutorhaven.app', 'Maya Chen', 'student', { grade_level: 'IB', subjects: ['Physics', 'Chemistry'] })
  person(5, 'leo@demo.tutorhaven.app', 'Leo Martins', 'student', { grade_level: 'High School', subjects: ['Python'] })
  person(6, 'zara@demo.tutorhaven.app', 'Zara Ahmed', 'student', { grade_level: 'GCSE', subjects: ['English', 'Spanish'] })

  const tutors = TUTORS.map(([n, name, handle, headline, bio, subjects, levels, languages, rate, years, location, tz]) => {
    person(n, `${handle}@demo.tutorhaven.app`, name, 'tutor')
    return { id: id(n), headline, bio, subjects, levels, languages, hourly_rate: rate, years_experience: years, location, timezone: tz, status: 'approved', rating: 0, review_count: 0, sessions_completed: 0, created_at: iso(now - (120 - n) * D) }
  })
  person(107, 'theo@demo.tutorhaven.app', 'Theo Laurent', 'tutor')
  tutors.push({ id: id(107), headline: 'Piano and music theory for curious beginners', bio: 'Conservatoire-trained pianist teaching technique, sight-reading and theory to adults and teens, from first notes to grade 8.', subjects: ['Music'], levels: ['Middle School', 'High School', 'Adult'], languages: ['English', 'French'], hourly_rate: 40, years_experience: 10, location: 'Lyon, France', timezone: 'Europe/Paris', status: 'pending', rating: 0, review_count: 0, sessions_completed: 0, created_at: iso(now - 2 * D) })

  const availability = []
  for (const t of tutors) {
    for (let d = 1; d <= 5; d++) {
      availability.push({ tutor_id: t.id, weekday: d, start_minute: 540, end_minute: 720 })
      availability.push({ tutor_id: t.id, weekday: d, start_minute: 900, end_minute: 1200 })
    }
    availability.push({ tutor_id: t.id, weekday: 6, start_minute: 600, end_minute: 900 })
  }

  // Sessions — times are on the hour in the viewer's local time; past ones are completed.
  const bookings = []
  const payments = []
  const reviews = []
  let seq = 1
  const at = (dayOffset, hour) => { const d = new Date(now + dayOffset * D); d.setHours(hour, 0, 0, 0); return d.getTime() }
  const book = (tutorIdx, studentN, dayOffset, hour, dur, status, opts = {}) => {
    const t = tutors[tutorIdx]
    const start = opts.startAt ?? at(dayOffset, hour)
    const price = Math.round(((t.hourly_rate * dur) / 60) * 100) / 100
    const paid = opts.discount ? Math.round(price * (1 - opts.discount) * 100) / 100 : price
    const b = {
      id: `b0000000-0000-4000-8000-${String(seq++).padStart(12, '0')}`, tutor_id: t.id, student_id: id(studentN), booked_by: id(opts.by ?? studentN),
      subject: opts.subject ?? t.subjects[0], starts_at: iso(start), ends_at: iso(start + dur * 60000), duration_minutes: dur, price,
      amount_paid: status === 'cancelled' ? null : paid, status, notes: opts.notes ?? '', created_at: iso(Math.min(now, start) - 4 * D),
    }
    bookings.push(b)
    if (status !== 'cancelled' || opts.refunded) {
      payments.push({ id: 'p-' + b.id, user_id: b.booked_by, booking_id: b.id, kind: 'session', amount: paid, currency: 'USD', status: opts.refunded ? 'refunded' : 'succeeded', description: `${b.subject} with ${profiles.find((p) => p.id === t.id).full_name}`, provider: 'test', created_at: b.created_at })
    }
    if (status === 'completed') t.sessions_completed += 1
    if (opts.review) reviews.push({ id: 'r-' + b.id, booking_id: b.id, tutor_id: t.id, author_id: b.booked_by, rating: opts.review[0], comment: opts.review[1], created_at: iso(start + 2 * 3600e3) })
    return b
  }

  // Sam (Plus member from ~10 days ago)
  book(0, 1, -41, 17, 60, 'completed', { review: [5, 'Amara made integration finally make sense. Patient, clear and genuinely encouraging.'] })
  book(1, 1, -27, 18, 45, 'completed', { review: [4, 'Great demos — circuits finally clicked for me. Would love a bit more homework.'] })
  book(0, 1, -20, 17, 60, 'completed', { review: [5, 'Worked through three past papers together. My confidence is so much higher now.'] })
  book(2, 1, -12, 16, 90, 'completed')
  book(0, 1, -6, 17, 60, 'completed', { discount: 0.1 })
  const startedAt = new Date(now - 90 * 60000); startedAt.setMinutes(0, 0, 0)
  book(0, 1, 0, 0, 60, 'confirmed', { discount: 0.1, startAt: startedAt.getTime() }) // already started → tutor can mark complete
  book(0, 1, 2, 16, 60, 'confirmed', { discount: 0.1, notes: 'Integration by parts before Friday’s mock exam, please!' })
  book(1, 1, 5, 17, 60, 'confirmed', { discount: 0.1, subject: 'Physics' })
  book(3, 1, 9, 16, 30, 'cancelled', { refunded: true })
  // Booked by Jordan (parent) for Sam
  book(5, 1, 3, 18, 45, 'confirmed', { by: 2, subject: 'Writing' })
  book(5, 1, -16, 18, 45, 'completed', { by: 2, subject: 'Writing', review: [5, 'Chloé gave Sam brilliant, specific feedback on his essay structure.'] })

  // Other learners — gives tutors reviews and the admin real revenue history
  const others = [
    [1, 4, -150, 'Lucas explains physics with real-world demos. My predicted grade went up a full band.'],
    [4, 4, -120, 'Daniel’s memory techniques for organic chemistry are genius. Highly recommend.'],
    [2, 5, -100, 'Great structured sessions, and Priya always sends practice questions afterwards.'],
    [3, 6, -80, 'Sofía makes speaking Spanish feel natural. I actually look forward to lessons.'],
    [5, 6, -64, 'Helpful essay feedback and lots of encouragement before my exams.'],
    [1, 4, -50, 'Clear, calm and incredibly knowledgeable. Best physics tutor I’ve had.'],
    [2, 5, -35, 'We built a small game together and I finally understand classes and objects.'],
    [4, 4, -24, 'Excellent past-paper strategy — I know exactly what examiners want now.'],
    [3, 6, -9, 'Fun, patient and very well prepared every single time.'],
  ]
  others.forEach(([ti, sn, day, comment], i) => book(ti, sn, day, 15 + (i % 3), 60, 'completed', { review: [i % 4 === 3 ? 4 : 5, comment] }))
  for (let m = 5; m >= 0; m--) book(m % 6, 4 + (m % 3), -m * 28 - 3, 10, 60, 'completed')
  book(4, 4, 6, 10, 60, 'confirmed')
  book(2, 5, 4, 15, 60, 'confirmed')

  for (const t of tutors) {
    const rs = reviews.filter((r) => r.tutor_id === t.id)
    t.rating = rs.length ? Math.round((rs.reduce((s, r) => s + r.rating, 0) / rs.length) * 100) / 100 : 0
    t.review_count = rs.length
  }

  const subscriptions = [{ user_id: id(1), plan: 'plus', status: 'active', current_period_end: iso(now + 20 * D), created_at: iso(now - 10 * D) }]
  payments.push({ id: 'p-sub-1', user_id: id(1), booking_id: null, kind: 'subscription', amount: 19, currency: 'USD', status: 'succeeded', description: 'TutorHaven Plus — monthly', provider: 'test', created_at: iso(now - 10 * D) })

  return {
    users, profiles, tutors, availability, bookings, payments, reviews, subscriptions,
    parent_links: [{ parent_id: id(2), student_id: id(1), created_at: iso(now - 40 * D) }],
    favourites: [{ user_id: id(1), tutor_id: tutors[1].id, created_at: iso(now - 5 * D) }],
  }
}
