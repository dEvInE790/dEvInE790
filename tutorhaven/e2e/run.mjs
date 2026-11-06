// End-to-end tests of the production web build against the local test stack:
// real Postgres + migrations + Row Level Security, the real Paystack Edge Function
// code, and a Paystack simulator with its own checkout page (e2e/stack).
//
//   sudo bash supabase/tests/db/setup.sh      (once: local Postgres 16 with the migrations)
//   npm run test:e2e                          flows + click-every-button crawl
//   npm run test:e2e -- --shots               also save mobile/tablet/desktop screenshots
//   npm run test:e2e -- --only=<text>         run matching flows only
// Requires the `playwright` package and Chromium.
import { createRequire } from 'module'
import { spawn, spawnSync } from 'child_process'
import { mkdirSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'
import { startStack } from './stack/server.mjs'
import { PASSWORD, resetData, seedFixture, givePlus, pastPaidSession } from './stack/fixture.mjs'

const require = createRequire(import.meta.url)
const { chromium } = require('playwright')
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const PORT = 4317
const ORIGIN = `http://localhost:${PORT}`
const SHOTS = process.argv.includes('--shots')
const ONLY = process.argv.find((a) => a.startsWith('--only='))?.slice(7)
const STACK_PORT = 54329

const stack = await startStack({ port: STACK_PORT, appUrls: ORIGIN, webhookDelayMs: 200 })
const build = spawnSync('npx', ['vite', 'build', '--outDir', 'dist-e2e', '--emptyOutDir', ...(process.env.E2E_DEBUG ? ['--minify', 'false'] : [])], {
  cwd: ROOT, stdio: 'inherit', env: { ...process.env, ...(process.env.E2E_DEBUG ? { NODE_ENV: 'development' } : {}), VITE_SUPABASE_URL: stack.url, VITE_SUPABASE_ANON_KEY: stack.anonKey },
})
if (build.status) process.exit(1)
const server = spawn('npx', ['vite', 'preview', '--outDir', 'dist-e2e', '--port', String(PORT), '--strictPort'], { cwd: ROOT, stdio: 'ignore' })
await new Promise((r) => setTimeout(r, 2500))

const browser = await chromium.launch()
const results = []
const problems = []
const report = (msg) => { problems.push(msg); console.log('PROBLEM ' + msg) }
const DESKTOP = { width: 1280, height: 860 }
const MOBILE = { width: 390, height: 844 }
const url = (route) => ORIGIN + route
let F // fixture accounts for the current flow
const openContexts = []

async function newPage({ viewport = DESKTOP, intro = false, reducedMotion = 'no-preference' } = {}) {
  const ctx = await browser.newContext({ viewport, reducedMotion, permissions: ['clipboard-read', 'clipboard-write'] })
  if (!intro) await ctx.addInitScript(() => { try { sessionStorage.setItem('th:intro-seen', '1') } catch {} })
  const page = await ctx.newPage()
  openContexts.push(ctx)
  page.errors = []
  page.on('pageerror', (e) => page.errors.push('pageerror: ' + (process.env.E2E_DEBUG ? e.stack : e.message)))
  page.on('console', (m) => {
    if (m.type() !== 'error') return
    const t = m.text()
    if (/status of (400|401|403|404|406|409|422)/.test(t)) return // expected validation responses
    if (/status of (502|503)/.test(t) && m.location()?.url?.includes('/functions/v1/ai-assistant')) return // simulated AI outage
    page.errors.push('console: ' + (process.env.E2E_DEBUG ? t + ' @ ' + JSON.stringify(m.location()) : t.slice(0, 200)))
  })
  return { ctx, page }
}

const see = (page, text, timeout = 8000) => page.getByText(text, { exact: false }).first().waitFor({ state: 'visible', timeout })

async function signIn(page, email) {
  await page.goto(url('/signin'))
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(PASSWORD)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await page.waitForURL(/\/(dashboard|onboarding|admin)/)
  await page.waitForLoadState('networkidle')
}

/** On the simulated Paystack page: 'Pay with test card' | 'Simulate declined card' | 'Cancel payment'. */
async function paystack(page, action = 'Pay with test card') {
  await page.waitForURL(/\/paystack\/checkout\//)
  await see(page, 'LOCAL PAYSTACK SIMULATOR')
  await page.getByRole('button', { name: action }).click()
  await page.waitForURL(/\/payment\/return/)
}

async function bookFirstSlot(page, tutorId, { learner, day = 0 } = {}) {
  await page.goto(url(`/book/${tutorId}`))
  if (learner) await page.getByRole('button', { name: new RegExp(learner) }).click()
  if (day) await page.getByRole('listbox', { name: 'Day' }).getByRole('option').nth(day).click()
  await page.locator('button[aria-pressed]').filter({ hasText: /\d:\d\d/ }).first().click()
  await page.getByRole('button', { name: /Continue to payment/ }).click()
  await page.waitForURL(/\/checkout\//)
  await see(page, 'Slot held for')
}

async function flow(name, opts, fn) {
  if (ONLY && !name.includes(ONLY)) return
  F = await seedFixture(stack)
  if (opts.empty) await resetData(stack)
  const { ctx, page } = await newPage(opts)
  try {
    await fn(page, ctx)
    if (page.errors.length) throw new Error(page.errors.join(' | '))
    results.push(`PASS  ${name}`)
  } catch (e) {
    const errs = openContexts.flatMap((c) => c.pages().flatMap((p) => p.errors ?? []))
    results.push(`FAIL  ${name}: ${e.message.split('\n')[0]}${errs.length ? ' | page errors: ' + errs.join(' | ') : ''}`)
    let n = 0
    for (const c of openContexts) for (const p of c.pages()) await p.screenshot({ path: `${ROOT}/e2e/screenshots/fail-${name.replace(/\W+/g, '-')}-${n++}.png` }).catch(() => {})
  }
  while (openContexts.length) await openContexts.pop().close().catch(() => {})
}

mkdirSync(`${ROOT}/e2e/screenshots`, { recursive: true })

// ---------------------------------------------------------------------------
// Empty platform: no invented tutors anywhere
// ---------------------------------------------------------------------------
await flow('empty platform: friendly empty states, plans from the database', { empty: true }, async (page) => {
  await page.goto(url('/'))
  await see(page, 'Our first tutors are on their way')
  if (await page.getByText('verified tutors across').count()) throw new Error('landing shows tutor stats with no tutors')
  await page.goto(url('/tutors'))
  await see(page, 'Our first tutors are on their way')
  await page.getByRole('button', { name: 'Invite a tutor you know' }).click()
  await see(page, 'Invite link copied')
  const copied = await page.evaluate(() => navigator.clipboard.readText())
  if (!copied.endsWith('/signup?role=tutor')) throw new Error('invite link: ' + copied)
  await page.getByRole('link', { name: 'Apply to teach' }).first().click()
  await page.waitForURL(/\/signup\?role=tutor/)
  await page.goto(url('/pricing'))
  await see(page, '₦7,500')
  await see(page, 'Are you a tutor?')
})

// ---------------------------------------------------------------------------
// Public
// ---------------------------------------------------------------------------
await flow('public: only listed tutors are shown; search and profile', {}, async (page) => {
  await page.goto(url('/tutors'))
  await see(page, '2 tutors found')
  if (await page.getByText('Uche Unlisted').count()) throw new Error('unsubscribed tutor is listed')
  await page.getByLabel('Search tutors').fill('literature')
  await see(page, '1 tutor found')
  await page.getByRole('link', { name: 'Bisi Bello' }).click()
  await see(page, 'This week’s availability')
  await see(page, 'No reviews yet')
  await page.getByRole('link', { name: 'Book a session' }).first().click()
  await page.waitForURL(/\/signin/)
  await page.goto(url(`/tutors/${F.newTutor.id}`))
  await see(page, 'Tutor not found')
})

await flow('auth: wrong password, protected redirect, sign out', {}, async (page) => {
  await page.goto(url('/dashboard/billing'))
  await page.waitForURL(/\/signin/)
  await page.getByLabel('Email').fill(F.student.email)
  await page.getByLabel('Password').fill('nope-nope')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await see(page, 'don’t match')
  await page.getByLabel('Password').fill(PASSWORD)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await see(page, 'Total spent')
  await page.getByRole('link', { name: 'Settings' }).first().click()
  await page.getByRole('button', { name: 'Sign out' }).last().click()
  await see(page, 'Find the')
})

// ---------------------------------------------------------------------------
// Session payments
// ---------------------------------------------------------------------------
await flow('student: book → Paystack → server-verified booking → notification', {}, async (page) => {
  await signIn(page, F.student.email)
  await bookFirstSlot(page, F.tutor.id)
  // Refund terms are visible next to the Pay button, before Paystack.
  const notice = page.getByTestId('refund-notice')
  await notice.getByText('24 hours').waitFor()
  await notice.getByText('if the tutor cancels').waitFor()
  if (await notice.getByRole('link', { name: 'Refund Policy' }).getAttribute('href') !== '/refunds') throw new Error('refund policy link')
  await page.getByRole('button', { name: /^Pay ₦8,000/ }).click()
  await paystack(page)
  await see(page, 'You’re booked!')
  await see(page, 'Ref TH-')
  await page.getByRole('link', { name: /View my sessions/ }).click()
  await see(page, 'Confirmed')
  await page.getByRole('button', { name: /Notifications/ }).first().click()
  await see(page, 'Booking confirmed')
  await page.goto(url('/dashboard/billing'))
  await see(page, 'Mathematics with Tobi Tutor')
  const [b] = await stack.sql(`select status, amount_paid from bookings where student_id = $1`, [F.student.id])
  if (b.status !== 'confirmed' || Number(b.amount_paid) !== 8000) throw new Error('db booking ' + JSON.stringify(b))
  // Paystack split: 15% to TutorHaven, the rest to the tutor's subaccount.
  const tx = [...stack.paystack.tx.values()].at(-1)
  if (!tx.subaccount?.startsWith('ACCT_fixture_') || tx.transaction_charge !== 120000 || tx.bearer !== 'account') throw new Error('split ' + JSON.stringify(tx))
  const [p] = await stack.sql(`select tutor_share, platform_fee from payments where tutor_id = $1`, [F.tutor.id])
  if (Number(p.tutor_share) !== 6800 || Number(p.platform_fee) !== 1200) throw new Error('payment split ' + JSON.stringify(p))
})

await flow('student: declined card shows failure, retry succeeds', {}, async (page) => {
  await signIn(page, F.student.email)
  await bookFirstSlot(page, F.tutor2.id)
  await page.getByRole('button', { name: /^Pay ₦6,000/ }).click()
  await paystack(page, 'Simulate declined card')
  await see(page, 'Payment failed')
  await see(page, 'Declined by test card')
  await page.getByRole('link', { name: 'Try again' }).click()
  await page.waitForURL(/\/checkout\//)
  await page.getByRole('button', { name: /^Pay ₦6,000/ }).click()
  await paystack(page)
  await see(page, 'You’re booked!')
  await page.goto(url('/dashboard/billing'))
  await page.getByRole('tab', { name: 'All attempts' }).click()
  await see(page, 'Failed')
  await see(page, 'Declined by test card')
})

await flow('student: cancelled checkout is "not completed", booking stays unpaid', {}, async (page) => {
  await signIn(page, F.student.email)
  await bookFirstSlot(page, F.tutor.id)
  await page.getByRole('button', { name: /^Pay/ }).click()
  await paystack(page, 'Cancel payment')
  await see(page, 'Payment not completed')
  const [b] = await stack.sql(`select status from bookings where student_id = $1`, [F.student.id])
  if (b.status !== 'pending_payment') throw new Error('booking ' + b.status)
})

await flow('security: a forged "success" return URL confirms nothing', {}, async (page) => {
  await signIn(page, F.student.email)
  await bookFirstSlot(page, F.tutor.id)
  await page.getByRole('button', { name: /^Pay/ }).click()
  await page.waitForURL(/\/paystack\/checkout\//)
  const ref = page.url().split('/').pop()
  await page.goto(url(`/payment/return?reference=${ref}&status=succeeded&trxref=${ref}`))
  await see(page, 'Payment not completed')
  const [b] = await stack.sql(`select status from bookings where student_id = $1`, [F.student.id])
  if (b.status !== 'pending_payment') throw new Error('booking ' + b.status)
})

await flow('student: Plus membership → discount at checkout → cancel keeps benefits', {}, async (page) => {
  await signIn(page, F.student.email)
  await page.goto(url('/pricing'))
  await page.getByRole('button', { name: 'Choose Plus' }).click()
  await page.getByRole('dialog').getByText('Non-refundable once paid').waitFor()
  await page.getByRole('dialog').getByText('Nothing renews automatically').waitFor()
  await page.getByRole('dialog').getByText('access continues until the end of the paid period').waitFor()
  await page.getByRole('dialog').getByRole('button', { name: /Pay ₦7,500/ }).click()
  await paystack(page)
  await see(page, 'Your plan is active')
  await page.getByRole('link', { name: /View subscription/ }).click()
  await see(page, 'Active until')
  await bookFirstSlot(page, F.tutor.id)
  await see(page, 'Member discount')
  await page.getByTestId('refund-notice').getByText('2 hours').waitFor()
  await page.getByRole('button', { name: /^Pay ₦7,200/ }).waitFor()
  await page.goto(url('/dashboard/billing'))
  await page.getByRole('button', { name: 'Cancel plan' }).click()
  await see(page, 'Your benefits continue until')
  await page.goto(url('/tutors'))
  await page.getByRole('button', { name: 'Save to favourites' }).first().click()
  await see(page, 'Saved to your favourites')
})

await flow('parent: pays for a linked child’s session', {}, async (page) => {
  await signIn(page, F.parent.email)
  await bookFirstSlot(page, F.tutor2.id, { learner: 'Kemi Child' })
  await see(page, 'For Kemi Child')
  await page.getByRole('button', { name: /^Pay/ }).click()
  await paystack(page)
  await see(page, 'You’re booked!')
})

// ---------------------------------------------------------------------------
// Tutors
// ---------------------------------------------------------------------------
await flow('tutor: connect bank + subscribe → listed and bookable', {}, async (page) => {
  await signIn(page, F.newTutor.email)
  await see(page, 'Add the bank account your earnings should be paid into')
  await page.getByRole('link', { name: 'Add bank account' }).click()
  await see(page, 'Connect your bank account')
  await page.getByRole('combobox', { name: 'Bank' }).click()
  await see(page, 'Popular')
  await page.getByRole('combobox', { name: 'Bank' }).fill('acc')
  await page.getByRole('option', { name: 'Access Bank' }).click()
  await page.getByLabel('Account number').fill('9999999999')
  await see(page, 'couldn’t verify')
  await page.getByLabel('Account number').fill('0123456789')
  await see(page, 'TEST ACCOUNT HOLDER')
  await page.getByRole('button', { name: 'Save payout account' }).click()
  await see(page, 'Payouts will go to Access Bank ••••6789')
  await see(page, 'Connected')
  await page.goto(url('/dashboard'))
  await see(page, 'Subscribe to appear in search')
  await page.getByRole('link', { name: 'Subscribe' }).first().click()
  await see(page, 'You’re not listed yet')
  await page.getByRole('button', { name: /Pay ₦5,000 with Paystack/ }).click()
  await paystack(page)
  await see(page, 'Your plan is active')
  await page.getByRole('link', { name: /View subscription/ }).click()
  await see(page, 'You’re listed')
  await see(page, 'TutorHaven Tutor Pro')
  await page.goto(url('/tutors'))
  await see(page, '3 tutors found')
})

await flow('tutor: expired subscription hides the profile', {}, async (page) => {
  await stack.sql(`update subscriptions set current_period_end = now() - interval '1 minute' where user_id = $1`, [F.tutor.id])
  await stack.rpc('service', 'run_maintenance')
  await page.goto(url('/tutors'))
  await see(page, '1 tutor found')
  await signIn(page, F.tutor.email)
  await see(page, 'Your subscription has expired')
  await page.getByRole('button', { name: /Notifications/ }).first().click()
  await see(page, 'has expired')
})

await flow('tutor → admin: qualification upload, review, public badge', {}, async (page) => {
  await signIn(page, F.tutor.email)
  await page.goto(url('/dashboard/listing'))
  await page.getByRole('button', { name: 'Add qualification' }).click()
  await page.getByLabel('Qualification').fill('B.Sc. Physics')
  await page.getByLabel('Institution').fill('University of Lagos')
  await page.getByLabel('Year', { exact: true }).fill('2016')
  await page.locator('#qual-file').setInputFiles({ name: 'degree.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 test certificate') })
  await page.getByRole('button', { name: 'Submit for review' }).click()
  await see(page, 'An admin will review it shortly')
  await see(page, 'In review')
  const { page: admin } = await newPage()
  await signIn(admin, F.admin.email)
  await admin.goto(url('/admin/qualifications'))
  await see(admin, 'B.Sc. Physics')
  const [signed] = await Promise.all([
    admin.waitForResponse((r) => r.url().includes('/storage/v1/object/sign/')),
    admin.getByRole('button', { name: 'View document' }).click(),
  ])
  const link = stack.url + '/storage/v1' + (await signed.json()).signedURL
  if (!(await (await fetch(link)).text()).includes('test certificate')) throw new Error('document not served via signed link')
  await admin.getByRole('button', { name: 'Verify' }).click()
  await see(admin, 'Verified “B.Sc. Physics”')
  await page.goto(url(`/tutors/${F.tutor.id}`))
  await see(page, 'Verified qualifications')
  await see(page, 'University of Lagos · 2016')
})

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------
await flow('messages: learner contacts tutor, tutor replies', {}, async (page) => {
  await signIn(page, F.student.email)
  await page.goto(url(`/tutors/${F.tutor.id}`))
  await page.getByRole('link', { name: /Message Tobi/ }).click()
  await page.waitForURL(/\/dashboard\/messages\//)
  await see(page, 'Say hello to Tobi')
  await page.getByLabel('Message', { exact: true }).fill('Hello! Do you prepare students for WAEC physics?')
  await page.getByRole('button', { name: 'Send' }).click()
  await see(page, 'Do you prepare students for WAEC physics?')
  const { page: tutor } = await newPage()
  await signIn(tutor, F.tutor.email)
  await tutor.getByRole('link', { name: /Messages/ }).first().waitFor()
  await see(tutor, '1') // unread badge
  await tutor.goto(url('/dashboard/messages'))
  await tutor.getByRole('link', { name: /Sola Student/ }).click()
  await see(tutor, 'Do you prepare students for WAEC physics?')
  await tutor.getByLabel('Message', { exact: true }).fill('Yes! I have past questions ready for you.')
  await tutor.keyboard.press('Enter')
  await see(tutor, 'I have past questions ready')
  await page.reload()
  await see(page, 'I have past questions ready')
  await page.goto(url('/dashboard/messages'))
  await see(page, 'Tobi Tutor')
})

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------
await flow('admin: change a plan price, waive tutor subscriptions', {}, async (page) => {
  await signIn(page, F.admin.email)
  await page.goto(url('/admin/plans'))
  await page.locator('div.card').filter({ hasText: 'Tutor Pro' }).getByRole('button', { name: 'Edit' }).click()
  await page.getByRole('dialog').getByLabel('Price (₦)').fill('6500')
  await page.getByRole('dialog').getByRole('button', { name: 'Save plan' }).click()
  await see(page, 'Plan saved')
  await see(page, '₦6,500')
  await page.goto(url('/admin/settings'))
  await page.getByRole('switch').first().click()
  await page.getByRole('switch', { name: 'Require a payout account' }).click()
  await page.getByLabel('TutorHaven commission (%)').fill('20')
  await page.getByRole('button', { name: 'Save settings' }).click()
  await see(page, 'Settings saved')
  await page.goto(url('/tutors'))
  await see(page, '3 tutors found')
  const [{ commission_rate }] = await stack.sql(`select commission_rate from platform_settings`)
  if (Number(commission_rate) !== 0.2) throw new Error('commission ' + commission_rate)
  await page.goto(url('/admin/payouts'))
  await see(page, 'Uche Unlisted')
  await see(page, 'Not connected')
  const [{ price }] = await stack.sql(`select price from subscription_plans where code = 'tutor_pro'`)
  if (Number(price) !== 6500) throw new Error('price ' + price)
})

await flow('admin: refund a cancelled paid session through Paystack', {}, async (page) => {
  const { page: student } = await newPage()
  await signIn(student, F.student.email)
  await bookFirstSlot(student, F.tutor.id, { day: 3 }) // learners can cancel up to 24h before
  await student.getByRole('button', { name: /^Pay/ }).click()
  await paystack(student)
  await see(student, 'You’re booked!')
  await student.goto(url('/dashboard/sessions'))
  await student.getByRole('button', { name: 'Cancel' }).first().click()
  await student.getByRole('dialog').getByRole('button', { name: 'Cancel session' }).click()
  await see(student, 'Session cancelled')
  await signIn(page, F.admin.email)
  await see(page, '1 refund waiting')
  await page.getByRole('link', { name: /refund waiting/ }).click()
  await page.getByRole('button', { name: 'Refund' }).first().click()
  await page.getByRole('dialog').getByRole('button', { name: 'Issue refund' }).click()
  await see(page, 'Refund sent to Paystack')
  await page.waitForTimeout(800) // Paystack's refund.processed webhook
  await page.reload()
  await page.getByRole('tab', { name: /^All/ }).click()
  await see(page, 'Refunded')
  await page.getByRole('tab', { name: 'Event log' }).click()
  await see(page, 'webhook.refund.processed')
  await see(page, 'webhook.charge.success')
  await student.goto(url('/dashboard/billing'))
  await see(student, 'Refunded')
})

await flow('admin: suspend and reinstate an account', {}, async (page) => {
  await signIn(page, F.admin.email)
  await page.goto(url('/admin/users'))
  await page.getByLabel('Search users').fill('Sola')
  await see(page, 'Sola Student')
  await page.locator('li').filter({ hasText: 'Sola Student' }).getByRole('button', { name: 'Suspend' }).click()
  await page.getByRole('dialog').getByLabel(/Reason/).fill('Payment dispute under review')
  await page.getByRole('dialog').getByRole('button', { name: 'Suspend account' }).click()
  await see(page, 'is suspended')
  const { page: student } = await newPage()
  await signIn(student, F.student.email)
  await see(student, 'Your account is suspended')
  await see(student, 'Payment dispute under review')
  await page.locator('li').filter({ hasText: 'Sola Student' }).getByRole('button', { name: 'Reinstate' }).click()
  await see(page, 'is reinstated')
  await student.reload()
  await see(student, 'Welcome back')
})

await flow('admin: overview, subscriptions, attempts and maintenance', {}, async (page) => {
  await signIn(page, F.admin.email)
  await page.waitForURL(/\/admin/)
  await see(page, 'Platform overview')
  await see(page, 'Tutors listed')
  await page.goto(url('/admin/subscriptions'))
  await see(page, 'Tobi Tutor')
  await page.goto(url('/admin/payments?view=attempts'))
  await see(page, 'No checkout attempts')
  await page.goto(url('/admin/settings'))
  await page.getByRole('button', { name: 'Run maintenance' }).click()
  await see(page, 'Done:')
  await page.getByRole('button', { name: 'Check with Paystack' }).click()
  await see(page, 'No pending payments to check')
})

// ---------------------------------------------------------------------------
// Sign-up journeys
// ---------------------------------------------------------------------------
await flow('new tutor: sign up → onboarding → pending review', {}, async (page) => {
  await page.goto(url('/signup?role=tutor'))
  await page.getByLabel('Full name').fill('Rita Novak')
  await page.getByLabel('Email').fill('rita@example.test')
  await page.getByLabel('Password').fill('supersecret')
  await page.getByRole('button', { name: /Create tutor account/ }).click()
  await page.waitForURL(/\/onboarding/)
  await page.getByRole('button', { name: 'Let’s go' }).click()
  await page.getByLabel('Your headline').fill('Economics made intuitive for SSS students')
  await page.getByRole('button', { name: 'Economics' }).click()
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByRole('button', { name: 'SSS', exact: true }).click()
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByLabel('Bio').fill('Former bank analyst who loves turning graphs into stories students remember.')
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByRole('button', { name: 'Finish' }).click()
  await see(page, 'submitted for review')
  await page.getByRole('button', { name: 'Go to my dashboard' }).click()
  await see(page, 'Your listing is being reviewed')
})

await flow('new student: sign up → onboarding → recommendations', { viewport: MOBILE }, async (page) => {
  await page.goto(url('/signup'))
  await page.getByLabel('Full name').fill('Ivy Okon')
  await page.getByLabel('Email').fill('ivy@example.test')
  await page.getByLabel('Password').fill('supersecret')
  await page.getByRole('button', { name: /Create student account/ }).click()
  await page.getByRole('button', { name: 'Let’s go' }).click()
  await page.getByRole('button', { name: 'WAEC', exact: true }).click()
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByRole('button', { name: 'English', exact: true }).click()
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByRole('button', { name: 'Get ahead' }).click()
  await page.getByRole('button', { name: 'Finish' }).click()
  await page.getByRole('button', { name: 'Go to my dashboard' }).click()
  await page.getByTestId('tutor-sections').getByText('Bisi Bello').waitFor()
  await page.getByTestId('tutor-sections').getByRole('tab', { name: /Recommended for you/ }).waitFor()
})

await flow('motion: intro plays once; reduced motion skips it', { intro: true }, async (page) => {
  await page.goto(url('/'))
  await page.locator('.z-\\[100\\]').waitFor({ state: 'visible', timeout: 2000 })
  await page.locator('.z-\\[100\\]').waitFor({ state: 'detached', timeout: 4000 })
})
await flow('motion: reduced motion', { intro: true, reducedMotion: 'reduce' }, async (page) => {
  await page.goto(url('/'))
  await page.waitForTimeout(300)
  if (await page.locator('.z-\\[100\\]').count()) throw new Error('intro shown with reduced motion')
})
// ---------------------------------------------------------------------------
// Business information and policies
// ---------------------------------------------------------------------------
await flow('legal: footer, contact and policy pages show the business details', { viewport: MOBILE }, async (page) => {
  await page.goto(url('/'))
  const footer = page.locator('footer')
  for (const t of ['Ojigbani Divine', 'tutorhaven737@gmail.com', '0802 813 9086', 'Lagos, Lagos State, Nigeria', 'Refund Policy', 'Terms and Conditions', 'Privacy Policy', 'Contact us']) {
    await footer.getByText(t).first().waitFor({ timeout: 8000 })
  }
  const wa = await footer.getByRole('link', { name: /WhatsApp/ }).getAttribute('href')
  if (!wa.startsWith('https://wa.me/2348028139086')) throw new Error('whatsapp link ' + wa)
  if (await footer.getByRole('link', { name: 'tutorhaven737@gmail.com' }).getAttribute('href') !== 'mailto:tutorhaven737@gmail.com') throw new Error('mail link')
  await footer.getByRole('link', { name: 'Contact us' }).click()
  await see(page, 'We’re here to help')
  await see(page, '+2348028139086')
  if (!(await page.getByRole('link', { name: 'Chat on WhatsApp' }).getAttribute('href')).startsWith('https://wa.me/2348028139086')) throw new Error('contact whatsapp')
  await page.goto(url('/refunds'))
  await see(page, 'Refund Policy')
  await see(page, 'Last updated')
  for (const t of ['Cancelled at least 24 hours before the start:', 'Members (Plus or Family plan):', 'Cancelled by the tutor:', 'Duplicate or mistaken payments:', 'non-refundable once paid', 'Nothing renews automatically.', 'consumer protection law']) await see(page, t)
  await page.goto(url('/terms'))
  await see(page, 'operated by Ojigbani Divine from Lagos, Lagos State, Nigeria')
  await see(page, 'Federal Republic of Nigeria')
  await see(page, '85%')
  await page.goto(url('/privacy'))
  await see(page, 'Nigeria Data Protection Act 2023')
  for (const route of ['/', '/contact', '/terms', '/privacy', '/refunds']) {
    await page.goto(url(route))
    const body = await page.locator('body').innerText()
    if (/\bCAC\b|RC\s?\d|Ltd\b|Limited\b|\{\{/.test(body)) throw new Error(`${route} shows an invented registration detail or a raw placeholder`)
  }
})

await flow('admin: edit business details and the refund policy without code', {}, async (page) => {
  await signIn(page, F.admin.email)
  await page.goto(url('/admin/business'))
  await page.getByLabel('WhatsApp number (international format)').fill('0803 000 0000')
  await see(page, 'Use international format')
  await page.getByLabel('WhatsApp number (international format)').fill('+234 803 000 0000')
  await page.getByLabel('Support email').fill('help@example.test')
  await page.getByRole('button', { name: 'Save business details' }).click()
  await see(page, 'Business details saved')
  await page.getByRole('button', { name: 'Start from the built-in text' }).click()
  const box = page.getByLabel('Refund Policy text')
  if (!(await box.inputValue()).includes('## Tutoring sessions')) throw new Error('built-in text not loaded')
  await box.fill('Our custom refund promise.\n\n## Custom heading\n- Write to {{support_email}} or WhatsApp {{whatsapp}}.')
  await page.getByRole('button', { name: 'Preview' }).click()
  await see(page, 'Write to help@example.test or WhatsApp 0803 000 0000.')
  await page.getByRole('button', { name: 'Save Refund Policy' }).click()
  await see(page, 'Refund Policy saved')
  await see(page, 'Using your custom text')
  // Visitors see the change straight away, with no code change or redeploy.
  const visitor = await newPage()
  await visitor.page.goto(url('/refunds'))
  await see(visitor.page, 'Custom heading')
  await see(visitor.page, 'Write to help@example.test or WhatsApp 0803 000 0000.')
  if (!(await visitor.page.locator('footer').getByRole('link', { name: /WhatsApp/ }).getAttribute('href')).startsWith('https://wa.me/2348030000000')) throw new Error('footer whatsapp not updated')
  // Stored in the database, not in the code.
  const [{ refund_text }] = await stack.sql(`select refund_text from platform_settings`)
  if (!refund_text.startsWith('Our custom refund promise.')) throw new Error('db refund_text ' + refund_text)
  await page.getByRole('button', { name: 'Reset to built-in text' }).click()
  await see(page, 'Using the built-in TutorHaven text')
  await visitor.page.goto(url('/refunds'))
  await see(visitor.page, 'Cancelled at least 24 hours before the start:')
  const [{ refund_text: after }] = await stack.sql(`select refund_text from platform_settings`)
  if (after !== null) throw new Error('reset failed')
})


// ---------------------------------------------------------------------------
// TutorHaven Plus, reviews and recommendations
// ---------------------------------------------------------------------------
await flow('plus: Standard is gated, upgrade through Paystack unlocks the AI assistant', {}, async (page) => {
  await signIn(page, F.student.email)
  await page.goto(url('/dashboard/assistant'))
  await page.getByTestId('plus-gate').waitFor()
  await page.goto(url('/plus'))
  await see(page, 'Standard and Plus compared')
  await see(page, 'Monthly allowance')
  if (await page.getByRole('tab', { name: 'Annual' }).count()) throw new Error('unpriced annual plan shown')
  await page.getByRole('button', { name: 'Upgrade to Plus' }).click()
  await page.getByRole('dialog').getByText('Non-refundable once paid').waitFor()
  await page.getByRole('dialog').getByRole('button', { name: /Pay ₦7,500/ }).click()
  await paystack(page)
  await see(page, 'Your plan is active')
  await page.goto(url('/dashboard/assistant'))
  await see(page, '0 of 100')
  await page.getByRole('radio', { name: 'Step by step' }).click()
  await page.getByLabel('Your question').fill('How do I solve 3x + 2 = 11?')
  await page.getByRole('button', { name: 'Ask' }).click()
  await page.getByTestId('ai-answer').getByText('You asked: How do I solve 3x + 2 = 11?').waitFor()
  await see(page, '1 of 100')
  const last = stack.ai.calls.at(-1)
  if (!last.system.includes('step-by-step')) throw new Error('mode not sent to the AI')
  await page.getByTestId('plus-badge').first().waitFor()
  // An outage is reported honestly and not counted.
  stack.ai.down = true
  await page.getByLabel('Your question').fill('Will this fail?')
  await page.getByRole('button', { name: 'Ask' }).click()
  await see(page, 'Your question wasn’t counted')
  stack.ai.down = false
  await see(page, '1 of 100')
  // Priority support.
  await page.goto(url('/dashboard/support'))
  await see(page, 'Priority support is on')
  await page.getByLabel('Subject').fill('Question about my plan')
  await page.getByLabel('Details').fill('When does my Plus plan renew?')
  await page.getByRole('button', { name: 'Send request' }).click()
  await see(page, 'priority queue')
})

await flow('reviews: verified learner rates four categories; tutor replies; profile shows it', {}, async (page, ctx) => {
  await pastPaidSession(stack, { tutorId: F.tutor.id, studentId: F.student.id })
  await signIn(page, F.student.email)
  await page.goto(url('/dashboard/sessions'))
  await page.getByRole('tab', { name: /Past/ }).click().catch(() => {})
  await page.getByRole('button', { name: 'Leave a review' }).first().click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('radio', { name: '5 stars', exact: true }).click()
  for (const [label, n] of [['Teaching quality', 5], ['Communication', 4], ['Punctuality', 5], ['Subject knowledge', 5]]) {
    await dialog.getByRole('radio', { name: `${label}: ${n} stars` }).click()
  }
  await dialog.getByLabel('Written feedback').fill('Tobi explained simultaneous equations step by step. Very patient.')
  await dialog.getByRole('button', { name: 'Submit review' }).click()
  await see(page, 'Thanks! Your review helps other learners.')
  await see(page, 'You rated 5/5')
  const tutorCtx = await newPage()
  await signIn(tutorCtx.page, F.tutor.email)
  await tutorCtx.page.goto(url('/dashboard/reviews'))
  await tutorCtx.page.getByRole('button', { name: 'Reply' }).click()
  await tutorCtx.page.getByLabel('Your reply').fill('Thank you, Sola! Keep practising.')
  await tutorCtx.page.getByRole('button', { name: 'Publish reply' }).click()
  await see(tutorCtx.page, 'Reply published')
  const visitor = await newPage({ viewport: MOBILE })
  await visitor.page.goto(url(`/tutors/${F.tutor.id}`))
  await visitor.page.getByTestId('review-summary').waitFor()
  const card = visitor.page.getByTestId('review-card').first()
  await card.getByText('Verified lesson').waitFor()
  await card.getByText('Thank you, Sola! Keep practising.').waitFor()
  await card.getByText('Communication').waitFor()
})

await flow('admin: investigate a reported review, hide it with a reason, restore, audit log', {}, async (page) => {
  const b = await pastPaidSession(stack, { tutorId: F.tutor2.id, studentId: F.student.id, subject: 'English' })
  const r = await stack.rpc(F.student.id, 'submit_review', { p_booking: b.id, p_rating: 1, p_teaching: 5, p_communication: 5, p_punctuality: 5, p_knowledge: 5, p_comment: 'Call me on 0803 000 0000 for lessons' })
  await stack.rpc(F.tutor2.id, 'report_review', { p_review: r.id, p_reason: 'personal_info', p_details: 'Phone number' })
  await signIn(page, F.admin.email)
  await page.goto(url('/admin/reviews'))
  const item = page.getByTestId('admin-review').filter({ hasText: 'Call me on' })
  await item.getByText('Report: personal info: Phone number').waitFor()
  await item.getByText(/Signal: inconsistent/).waitFor()
  await item.getByRole('button', { name: 'Hide' }).click()
  await page.getByRole('dialog').getByLabel(/Reason/).fill('Contains a phone number')
  await page.getByRole('dialog').getByRole('button', { name: 'Hide review' }).click()
  await see(page, 'recorded in the moderation log')
  const visitor = await newPage()
  await visitor.page.goto(url(`/tutors/${F.tutor2.id}`))
  await see(visitor.page, 'No reviews yet')
  await page.getByRole('tab', { name: 'Hidden' }).click()
  await page.getByTestId('admin-review').filter({ hasText: 'Call me on' }).getByRole('button', { name: 'Restore' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Restore review' }).click()
  await see(page, 'recorded in the moderation log')
  await page.getByRole('tab', { name: 'Moderation log' }).click()
  await see(page, 'Contains a phone number')
  await see(page, 'restore')
})

await flow('family: Plus parent sees each child, edits a profile, sets a goal and opens a report', { viewport: MOBILE }, async (page) => {
  await givePlus(stack, F.parent.id, 'family')
  const b = await pastPaidSession(stack, { tutorId: F.tutor.id, studentId: F.child.id, bookedBy: F.parent.id, subject: 'Physics', daysAgo: 1 })
  await stack.rpc(F.tutor.id, 'save_lesson_feedback', { p_booking: b.id, p_summary: 'Worked through Newton’s second law.', p_strengths: 'Confident with formulas', p_improvements: 'Show units', p_next_steps: 'Five motion questions', p_progress: 4 })
  await signIn(page, F.parent.email)
  await page.goto(url('/dashboard/family'))
  const card = page.getByTestId('family-child').first()
  await card.getByText('Kemi Child').waitFor()
  await card.getByText('Worked through Newton’s second law.').waitFor()
  await card.getByRole('button', { name: /learning profile/ }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'SSS', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Save profile' }).click()
  await see(page, 'learning profile saved')
  await card.getByText('SSS').first().waitFor()
  await card.getByRole('link', { name: /Progress & reports/ }).click()
  await page.getByTestId('analytics').waitFor()
  await see(page, 'Five motion questions')
  await page.getByRole('button', { name: 'Add goal' }).click()
  await page.getByRole('dialog').getByLabel('Goal').fill('Score A1 in WAEC Physics')
  await page.getByRole('dialog').getByRole('button', { name: 'Add goal' }).click()
  await see(page, 'Score A1 in WAEC Physics')
  await page.getByRole('button', { name: 'This month so far' }).click()
  await page.getByTestId('report').getByText('Confident with formulas').waitFor()
  await page.getByTestId('report').getByText('Show units').waitFor()
  // The child sees their own progress too; a stranger parent can't.
  const kid = await newPage()
  await signIn(kid.page, F.child.email)
  await kid.page.goto(url('/dashboard/progress'))
  await see(kid.page, 'Score A1 in WAEC Physics')
})

await flow('recommendations: real sections for everyone, personal matches for Plus', {}, async (page) => {
  await pastPaidSession(stack, { tutorId: F.tutor.id, studentId: F.student.id })
  await signIn(page, F.student.email)
  await page.goto(url('/tutors'))
  const sections = page.getByTestId('tutor-sections')
  await sections.waitFor()
  await sections.getByRole('tab', { name: 'Newly verified' }).click()
  await sections.getByText('Bisi Bello').waitFor()
  await sections.getByRole('tab', { name: /Recommended for you/ }).click()
  await sections.getByText('See Plus').waitFor()
  await givePlus(stack, F.student.id)
  await stack.sql(`update profiles set subjects = '{English}' where id = $1`, [F.student.id])
  await page.reload()
  await page.getByTestId('tutor-sections').getByRole('tab', { name: /Recommended for you/ }).click()
  await page.getByTestId('tutor-sections').getByText('Teaches English').waitFor()
})

await flow('admin: Plus Annual stays off sale until the admin sets its price', {}, async (page) => {
  await signIn(page, F.admin.email)
  await page.goto(url('/admin/plans'))
  const annual = page.locator('div.card').filter({ hasText: 'Plus Annual' })
  await annual.getByText('No price set yet').waitFor()
  await annual.getByRole('button', { name: 'Edit' }).click()
  await page.getByRole('dialog').getByLabel('Price (₦)').fill('75000')
  await page.getByRole('dialog').getByLabel('AI questions / month').fill('250')
  await page.getByRole('dialog').getByLabel('On sale').check()
  await page.getByRole('dialog').getByRole('button', { name: 'Save plan' }).click()
  await see(page, 'Plan saved')
  const visitor = await newPage()
  await visitor.page.goto(url('/plus'))
  await visitor.page.getByRole('tab', { name: 'Annual' }).click()
  await see(visitor.page, '₦75,000')
  await see(visitor.page, '250 AI assistant questions a month')
})

await flow('misc: 404 page', {}, async (page) => {
  await page.goto(url('/does-not-exist'))
  await see(page, 'This page took a different path')
})

// ---------------------------------------------------------------------------
// Crawl: click every distinct button, link and tab on each page, per role.
// ---------------------------------------------------------------------------
const SEL = 'a[href], button, [role="tab"], [role="option"]'
// Covered by flows; these change account state or leave the session.
const SKIP = /^(Sign out|Suspend|Reinstate|Cancel plan|Cancel subscription|Verify|Reject|Send|Save to favourites|Remove from favourites)$/
let clicks = 0
if (!ONLY || ONLY === 'crawl') {
  F = await seedFixture(stack)
  await givePlus(stack, F.parent.id, 'family')
  const CRAWL = [
    [null, ['/', '/tutors', `/tutors/${F.tutor.id}`, '/pricing', '/signin', '/signup', '/contact', '/refunds', '/terms', '/privacy']],
    [F.student.email, ['/dashboard', '/dashboard/sessions', '/dashboard/messages', '/dashboard/billing', '/dashboard/settings', `/book/${F.tutor.id}`, '/pricing', '/plus', '/dashboard/assistant', '/dashboard/progress', '/dashboard/support']],
    [F.parent.email, ['/dashboard', '/dashboard/billing', '/dashboard/family', '/dashboard/progress', '/dashboard/assistant']],
    [F.tutor.email, ['/dashboard', '/dashboard/sessions', '/dashboard/listing', '/dashboard/subscription', '/dashboard/payouts', '/dashboard/reviews']],
    [F.admin.email, ['/admin', '/admin/tutors', '/admin/users', '/admin/bookings', '/admin/qualifications', '/admin/payments', '/admin/payments?view=attempts', '/admin/payments?view=events', '/admin/payouts', '/admin/subscriptions', '/admin/plans', '/admin/business', '/admin/reviews', '/admin/support', '/admin/settings']],
  ]
  for (const [who, routes] of CRAWL) {
    for (const viewport of [DESKTOP, MOBILE]) {
      const { ctx, page } = await newPage({ viewport })
      if (who) await signIn(page, who)
      for (const route of routes) {
        await page.goto('about:blank')
        await page.goto(url(route))
        await page.waitForLoadState('networkidle')
        await page.waitForTimeout(600)
        const targets = await page.evaluate((sel) => {
          const seen = new Set()
          const out = []
          document.querySelectorAll(sel).forEach((el, i) => {
            const r = el.getBoundingClientRect()
            const style = getComputedStyle(el)
            if (!r.width || !r.height || style.visibility === 'hidden' || el.disabled) return
            const label = (el.getAttribute('aria-label') || el.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 60)
            if (!label) return
            const key = el.tagName + '|' + label + '|' + (el.getAttribute('href') || '')
            if (seen.has(key)) return
            seen.add(key)
            out.push({ i, label, href: el.getAttribute('href') })
          })
          return out
        }, SEL)
        for (const t of targets) {
          if (SKIP.test(t.label) || /^(blob:|mailto:|tel:|https?:)/.test(t.href ?? '')) continue
          const where = `[${who ?? 'visitor'} ${viewport.width}px] ${route} → "${t.label}"`
          await page.goto('about:blank')
          await page.goto(url(route))
          await page.waitForLoadState('networkidle')
          await page.waitForTimeout(600)
          page.errors.length = 0
          const target = page.locator(SEL).nth(t.i)
          try {
            const label = await target.evaluate((el) => (el.getAttribute('aria-label') || el.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 60), null, { timeout: 4000 })
            if (label !== t.label) { report(`${where}: control moved after reload (now "${label}")`); continue }
            await target.click({ timeout: 4000 })
            clicks++
            await page.waitForTimeout(450)
            if (await page.getByText('This page took a different path').count()) report(`${where} led to a 404`)
            if (page.errors.length) report(`${where}: ${page.errors.join(' | ')}`)
            await page.keyboard.press('Escape')
          } catch (e) {
            report(`${where}: could not click: ${e.message.split('\n')[0]}`)
          }
        }
      }
      await ctx.close()
    }
  }
}

// ---------------------------------------------------------------------------
// Screenshots
// ---------------------------------------------------------------------------
if (SHOTS) {
  F = await seedFixture(stack)
  const shots = [
    [null, '/', 'landing'], [null, '/tutors', 'tutors'], [null, `/tutors/${F.tutor.id}`, 'profile'], [null, '/pricing', 'pricing'], [null, '/contact', 'contact'], [null, '/refunds', 'refunds'],
    [F.student.email, '/dashboard', 'student'], [F.student.email, `/book/${F.tutor.id}`, 'book'], [F.student.email, '/dashboard/billing', 'billing'], [F.student.email, '/dashboard/messages', 'messages'],
    [F.tutor.email, '/dashboard', 'tutor'], [F.tutor.email, '/dashboard/subscription', 'tutor-subscription'], [F.tutor.email, '/dashboard/payouts', 'tutor-payouts'], [F.newTutor.email, '/dashboard/payouts', 'tutor-connect-bank'],
    [F.admin.email, '/admin', 'admin'], [F.admin.email, '/admin/plans', 'admin-plans'], [F.admin.email, '/admin/payments', 'admin-payments'], [F.admin.email, '/admin/settings', 'admin-settings'], [F.admin.email, '/admin/business', 'admin-business'],
  ]
  for (const [vpName, viewport] of [['mobile', MOBILE], ['tablet', { width: 820, height: 1180 }], ['desktop', { width: 1440, height: 900 }]]) {
    for (const [who, route, name] of shots) {
      const { ctx, page } = await newPage({ viewport })
      if (who) await signIn(page, who)
      await page.goto('about:blank')
      await page.goto(url(route))
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(700)
      const h = await page.evaluate(() => document.documentElement.scrollHeight)
      for (let y = 0; y < h; y += 400) { await page.evaluate((yy) => window.scrollTo(0, yy), y); await page.waitForTimeout(70) }
      await page.waitForTimeout(600)
      await page.evaluate(() => window.scrollTo(0, 0))
      await page.waitForTimeout(300)
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
      if (overflow > 0) report(`[${vpName}] ${route} has ${overflow}px horizontal overflow`)
      if (page.errors.length) report(`[${vpName}] ${route}: ${page.errors.join(' | ')}`)
      await page.screenshot({ path: `${ROOT}/e2e/screenshots/${vpName}-${name}.png`, fullPage: true })
      await ctx.close()
    }
  }
}

await resetData(stack)
await browser.close()
server.kill()
await stack.close()
console.log(results.join('\n'))
console.log(`\nCrawler clicked ${clicks} controls.`)
console.log(problems.length ? `\nPROBLEMS (${problems.length}):\n` + problems.join('\n') : '\nNo problems found.')
process.exit(results.some((r) => r.startsWith('FAIL')) || problems.length ? 1 : 0)
