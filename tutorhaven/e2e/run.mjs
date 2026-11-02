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
import { PASSWORD, resetData, seedFixture } from './stack/fixture.mjs'

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
  await page.getByRole('dialog').getByRole('button', { name: /Pay ₦7,500/ }).click()
  await paystack(page)
  await see(page, 'Your plan is active')
  await page.getByRole('link', { name: /View subscription/ }).click()
  await see(page, 'Active until')
  await bookFirstSlot(page, F.tutor.id)
  await see(page, 'Member discount')
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
  await page.getByLabel('Bank').selectOption('044')
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
  await see(page, 'Based on your interest in English')
  await see(page, 'Bisi Bello')
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
  const CRAWL = [
    [null, ['/', '/tutors', `/tutors/${F.tutor.id}`, '/pricing', '/signin', '/signup']],
    [F.student.email, ['/dashboard', '/dashboard/sessions', '/dashboard/messages', '/dashboard/billing', '/dashboard/settings', `/book/${F.tutor.id}`, '/pricing']],
    [F.parent.email, ['/dashboard', '/dashboard/billing']],
    [F.tutor.email, ['/dashboard', '/dashboard/sessions', '/dashboard/listing', '/dashboard/subscription', '/dashboard/payouts']],
    [F.admin.email, ['/admin', '/admin/tutors', '/admin/users', '/admin/bookings', '/admin/qualifications', '/admin/payments', '/admin/payments?view=attempts', '/admin/payments?view=events', '/admin/payouts', '/admin/subscriptions', '/admin/plans', '/admin/settings']],
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
          if (SKIP.test(t.label) || t.href?.startsWith('blob:')) continue
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
    [null, '/', 'landing'], [null, '/tutors', 'tutors'], [null, `/tutors/${F.tutor.id}`, 'profile'], [null, '/pricing', 'pricing'],
    [F.student.email, '/dashboard', 'student'], [F.student.email, `/book/${F.tutor.id}`, 'book'], [F.student.email, '/dashboard/billing', 'billing'], [F.student.email, '/dashboard/messages', 'messages'],
    [F.tutor.email, '/dashboard', 'tutor'], [F.tutor.email, '/dashboard/subscription', 'tutor-subscription'], [F.tutor.email, '/dashboard/payouts', 'tutor-payouts'], [F.newTutor.email, '/dashboard/payouts', 'tutor-connect-bank'],
    [F.admin.email, '/admin', 'admin'], [F.admin.email, '/admin/plans', 'admin-plans'], [F.admin.email, '/admin/payments', 'admin-payments'], [F.admin.email, '/admin/settings', 'admin-settings'],
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
