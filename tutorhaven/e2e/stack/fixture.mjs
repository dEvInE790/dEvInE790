// Test-only fixture accounts for the local stack (never used against Supabase).
// Everyone uses @example.test addresses and the password below.
export const PASSWORD = 'test-password-123'

export async function resetData(stack) {
  await stack.sql(`delete from auth.users where email like '%@example.test'`)
  await stack.sql(`delete from payment_events`)
  await stack.sql(`update platform_settings set tutor_subscription_required = true, payout_account_required = true, commission_rate = 0.15, hold_minutes = 30,
    business_name = 'TutorHaven', operator_name = 'Ojigbani Divine', support_email = 'tutorhaven737@gmail.com', support_phone = '+2348028139086',
    whatsapp_number = '+2348028139086', business_city = 'Lagos', business_state = 'Lagos State', business_country = 'Nigeria',
    terms_text = null, privacy_text = null, refund_text = null where id = 1`)
  await stack.sql(`update subscription_plans set price = case code when 'plus' then 7500 when 'family' then 15000 when 'tutor_pro' then 5000 else price end`)
  await stack.sql(`update subscription_plans set price = null, is_active = false where code = 'plus_annual'`)
  await stack.sql(`update subscription_plans set ai_monthly_limit = 100 where audience = 'learner'`)
  stack.paystack.tx.clear()
  stack.paystack.refunds.length = 0
}

const hashOf = async (s) => (await import('node:crypto')).createHash('sha256').update(s).digest('hex')

export async function createUser(stack, { email, name, role = 'student', onboarded = true }) {
  const [u] = await stack.sql(
    `insert into auth.users (email, encrypted_password, raw_user_meta_data, email_confirmed_at) values ($1, $2, $3, now()) returning id`,
    [email, await hashOf(PASSWORD), JSON.stringify({ full_name: name, role: role === 'admin' ? 'student' : role })],
  )
  await stack.sql(`update profiles set onboarded = $2, role = $3 where id = $1`, [u.id, onboarded, role])
  return { id: u.id, email, name }
}

/** An approved tutor, optionally with an active subscription paid "earlier". */
export async function createTutor(stack, { email, name, rate = 8000, subjects = ['Mathematics', 'Physics'], subscribed = true, payout = true }) {
  const t = await createUser(stack, { email, name, role: 'tutor' })
  await stack.sql(
    `update tutors set status = 'approved', hourly_rate = $2, subjects = $3, levels = '{SSS,WAEC}', headline = $4, bio = $5, location = 'Lagos', timezone = 'Africa/Lagos' where id = $1`,
    [t.id, rate, subjects, `${subjects[0]} tutor for exam success`, 'Test fixture tutor used by the automated end-to-end tests.'],
  )
  await stack.sql(`insert into availability (tutor_id, weekday, start_minute, end_minute) select $1, d, 420, 1260 from generate_series(0, 6) d`, [t.id])
  if (payout) {
    await stack.sql(
      `insert into tutor_payout_accounts (tutor_id, bank_code, bank_name, account_number_last4, account_name, subaccount_code)
       values ($1, '044', 'Access Bank', '6789', $2, $3)`,
      [t.id, name.toUpperCase(), 'ACCT_fixture_' + t.id.slice(0, 8)],
    )
  }
  if (subscribed) {
    await stack.sql(
      `insert into subscriptions (user_id, audience, plan_id, status, current_period_start, current_period_end)
       select $1, 'tutor', id, 'active', now(), now() + interval '1 month' from subscription_plans where code = 'tutor_pro'`,
      [t.id],
    )
  }
  return t
}

export async function seedFixture(stack) {
  await resetData(stack)
  const admin = await createUser(stack, { email: 'admin@example.test', name: 'Ada Admin', role: 'admin' })
  const student = await createUser(stack, { email: 'student@example.test', name: 'Sola Student' })
  const parent = await createUser(stack, { email: 'parent@example.test', name: 'Pat Parent', role: 'parent' })
  const child = await createUser(stack, { email: 'child@example.test', name: 'Kemi Child' })
  await stack.sql(`insert into parent_links (parent_id, student_id) values ($1, $2)`, [parent.id, child.id])
  const tutor = await createTutor(stack, { email: 'tutor@example.test', name: 'Tobi Tutor', rate: 8000 })
  const tutor2 = await createTutor(stack, { email: 'tutor2@example.test', name: 'Bisi Bello', rate: 6000, subjects: ['English', 'Literature'] })
  const newTutor = await createTutor(stack, { email: 'newtutor@example.test', name: 'Uche Unlisted', subscribed: false, payout: false })
  return { admin, student, parent, child, tutor, tutor2, newTutor }
}

/** A learner subscription that was paid "earlier" (the payment flow itself is tested separately). */
export async function givePlus(stack, userId, code = 'plus') {
  await stack.sql(`insert into subscriptions (user_id, audience, plan_id, status, current_period_start, current_period_end)
    select $1, 'learner', id, 'active', now(), now() + interval '1 month' from subscription_plans where code = $2
    on conflict (user_id, audience) do update set plan_id = excluded.plan_id, status = 'active', current_period_end = excluded.current_period_end`, [userId, code])
}

/** A completed lesson paid through Paystack some days ago. */
export async function pastPaidSession(stack, { tutorId, studentId, bookedBy = studentId, subject = 'Mathematics', daysAgo = 2 }) {
  const [b] = await stack.sql(`insert into bookings (tutor_id, student_id, booked_by, subject, starts_at, ends_at, duration_minutes, price, amount_paid, status, completed_at)
    values ($1, $2, $3, $4, now() - make_interval(days => $5), now() - make_interval(days => $5) + interval '1 hour', 60, 8000, 8000, 'completed', now() - make_interval(days => $5))
    returning *`, [tutorId, studentId, bookedBy, subject, daysAgo])
  await stack.sql(`insert into payments (user_id, booking_id, kind, amount, currency, status, description, provider, provider_ref)
    values ($1, $2::uuid, 'session', 8000, 'NGN', 'succeeded', $3, 'paystack', 'TH-FIXTURE-' || substr(md5($2::uuid::text), 1, 12))`, [bookedBy, b.id, subject + ' session'])
  return b
}
