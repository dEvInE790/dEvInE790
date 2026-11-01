// Runs the app's web build at iPhone size against the local test stack from the
// web project (../tutorhaven/e2e/stack): real Postgres + migrations + RLS, the real
// Paystack Edge Function code and a Paystack simulator with its own checkout page.
//
//   sudo bash ../tutorhaven/supabase/tests/db/setup.sh    (once: local Postgres 16)
//   node --experimental-strip-types e2e/run.mjs            (needs `playwright` + Chromium)
import { createRequire } from 'module'
import { createServer } from 'http'
import { spawnSync } from 'child_process'
import { mkdirSync, readFileSync, existsSync, statSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'
import { startStack } from '../../tutorhaven/e2e/stack/server.mjs'
import { PASSWORD, createUser, resetData, seedFixture } from '../../tutorhaven/e2e/stack/fixture.mjs'

const require = createRequire(import.meta.url)
const { chromium } = require('playwright')
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DIST = path.join(ROOT, 'dist-web')
const SHOTS = path.join(ROOT, 'e2e', 'screenshots')
const ONLY = process.argv.find((a) => a.startsWith('--only='))?.slice(7)
const ORIGIN = 'http://localhost:4330'
mkdirSync(SHOTS, { recursive: true })

const stack = await startStack({ port: 54330, appUrls: ORIGIN, webhookDelayMs: 200, databaseUrl: process.env.DATABASE_URL })
if (!process.argv.includes('--no-build')) {
  const r = spawnSync('npx', ['expo', 'export', '--platform', 'web', '--output-dir', 'dist-web'], {
    cwd: ROOT, stdio: 'inherit', env: { ...process.env, EXPO_OFFLINE: '1', EXPO_PUBLIC_SUPABASE_URL: stack.url, EXPO_PUBLIC_SUPABASE_ANON_KEY: stack.anonKey },
  })
  if (r.status) process.exit(1)
}

// Static server with SPA fallback.
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.ttf': 'font/ttf', '.ico': 'image/x-icon', '.json': 'application/json' }
const server = createServer((req, res) => {
  let p = path.join(DIST, decodeURIComponent(new URL(req.url, 'http://x').pathname))
  if (!existsSync(p) || statSync(p).isDirectory()) p = path.join(DIST, 'index.html')
  res.setHeader('content-type', TYPES[path.extname(p)] ?? 'application/octet-stream')
  res.end(readFileSync(p))
}).listen(4330)

const browser = await chromium.launch()
const results = []
const IPHONE = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
let F

async function newPage() {
  const ctx = await browser.newContext({ ...IPHONE })
  const page = await ctx.newPage()
  page.errors = []
  page.on('pageerror', (e) => page.errors.push('pageerror: ' + e.message))
  page.on('console', (m) => {
    if (m.type() === 'error' && !/status of (400|401|403|404|406|409|422)/.test(m.text())) page.errors.push('console: ' + m.text().slice(0, 240))
  })
  return { ctx, page }
}

const see = (page, text, timeout = 10000) => page.getByText(text, { exact: false }).first().waitFor({ state: 'visible', timeout })
const tapText = (page, text) => page.getByText(text, { exact: true }).first().click()
const shot = (page, name) => page.screenshot({ path: path.join(SHOTS, `${name}.png`) })

async function signIn(page, email) {
  await page.goto(ORIGIN + '/sign-in')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(PASSWORD)
  await page.getByRole('button', { name: 'Sign in' }).click()
}

/** Paystack opens in a popup (openAuthSessionAsync); act on the simulated checkout. */
async function payInPopup(page, trigger, action = 'Pay with test card') {
  const [popup] = await Promise.all([page.waitForEvent('popup'), trigger()])
  await popup.waitForLoadState()
  await popup.getByRole('button', { name: action }).click()
  await popup.waitForEvent('close', { timeout: 15000 }).catch(() => { console.log('popup still open at', popup.url()) })
}

async function bookFirstSlot(page, tutorName) {
  await tapText(page, 'Find tutors')
  await page.getByRole('button', { name: new RegExp(tutorName) }).click()
  await see(page, 'This week’s availability')
  await page.getByRole('button', { name: 'Book a session' }).click()
  // Earlier screens stay mounted (hidden) in the stack, so match exact visible text.
  await page.getByText('Pick a time', { exact: true }).waitFor()
  await page.waitForTimeout(1500)
  await page.getByRole('button', { name: /^\d{1,2}:\d\d (AM|PM)$/ }).nth(1).click()
  await page.getByText(/ · \d{1,2}:\d\d (AM|PM)$/).waitFor()
  await page.getByRole('button', { name: 'Continue' }).click()
  await see(page, 'Slot held for')
}

async function flow(name, fn, { empty = false } = {}) {
  if (ONLY && !name.includes(ONLY)) return
  F = await seedFixture(stack)
  if (empty) await resetData(stack)
  const { ctx, page } = await newPage()
  try {
    await fn(page)
    if (page.errors.length) throw new Error(page.errors.join(' | '))
    results.push(`PASS  ${name}`)
  } catch (e) {
    results.push(`FAIL  ${name}: ${e.message.split('\n')[0]}${page.errors.length ? ' | ' + page.errors.join(' | ') : ''}`)
    await shot(page, 'fail-' + name.replace(/\W+/g, '-')).catch(() => {})
  }
  await ctx.close()
}

await flow('welcome → sign up → onboarding → home (no invented content)', async (page) => {
  await page.goto(ORIGIN + '/')
  await see(page, 'Find the right tutor.')
  await see(page, 'BOOK IN THREE STEPS')
  if (await page.getByText('Adaeze').count()) throw new Error('invented tutor on welcome screen')
  await page.waitForTimeout(1200)
  await shot(page, '01-welcome')
  await page.getByRole('button', { name: 'Get started' }).click()
  await see(page, 'Create your account')
  await page.getByLabel('Full name').fill('Chioma Okeke')
  await page.getByLabel('Email').fill('chioma@example.test')
  await page.getByLabel('Password').fill('supersecret')
  await page.getByRole('button', { name: 'Create student account' }).click()
  await see(page, 'Welcome, Chioma!')
  await page.getByRole('button', { name: 'Let’s go' }).click()
  await tapText(page, 'WAEC')
  await page.getByRole('button', { name: 'Continue' }).click()
  await tapText(page, 'English')
  await page.getByRole('button', { name: 'Continue' }).click()
  await tapText(page, 'Score high in JAMB')
  await page.getByRole('button', { name: 'Finish' }).click()
  await see(page, 'You’re all set!')
  await page.getByRole('button', { name: 'Let’s go' }).click()
  await see(page, 'Hi, Chioma')
})

await flow('empty platform: honest empty state in Find tutors', async (page) => {
  await createUser(stack, { email: 'solo@example.test', name: 'Solo Learner' })
  await signIn(page, 'solo@example.test')
  await see(page, 'Hi, Solo')
  await tapText(page, 'Find tutors')
  await see(page, 'Our first tutors are on their way')
  await shot(page, '02-no-tutors')
}, { empty: true })

await flow('student: book → Paystack → server-confirmed booking', async (page) => {
  await signIn(page, F.student.email)
  await see(page, 'Hi, Sola')
  await bookFirstSlot(page, 'Tobi Tutor')
  await shot(page, '03-checkout')
  await payInPopup(page, () => page.getByRole('button', { name: /^Pay ₦8,000/ }).click())
  await see(page, 'You’re booked!')
  await see(page, 'confirmed by Paystack')
  await shot(page, '04-booked')
  const [b] = await stack.sql(`select status from bookings where student_id = $1`, [F.student.id])
  if (b.status !== 'confirmed') throw new Error('booking ' + b.status)
})

await flow('student: declined card shows the server’s answer', async (page) => {
  await signIn(page, F.student.email)
  await see(page, 'Hi, Sola')
  await bookFirstSlot(page, 'Bisi Bello')
  await payInPopup(page, () => page.getByRole('button', { name: /^Pay ₦6,000/ }).click(), 'Simulate declined card')
  await see(page, 'Payment failed')
  await see(page, 'Declined by test card')
  await shot(page, '05-declined')
  await tapText(page, 'Dismiss')
  await payInPopup(page, () => page.getByRole('button', { name: /^Pay ₦6,000/ }).click())
  await see(page, 'You’re booked!')
})

await flow('student: Plus membership via Paystack, history and notifications', async (page) => {
  await signIn(page, F.student.email)
  await see(page, 'Hi, Sola')
  await tapText(page, 'Account')
  await page.getByRole('button', { name: /Membership/ }).click()
  await see(page, 'Choose Plus')
  await payInPopup(page, () => page.getByRole('button', { name: 'Choose Plus' }).click())
  await see(page, 'Plus is active')
  await page.goto(ORIGIN + '/payments')
  await see(page, 'TutorHaven Plus')
  await tapText(page, 'All attempts')
  await see(page, 'Plus subscription')
  await shot(page, '06-payments')
  await page.goto(ORIGIN + '/notifications')
  await see(page, 'Plus is active')
})

await flow('tutor: unlisted → subscribe → listed', async (page) => {
  await signIn(page, F.newTutor.email)
  await see(page, 'Subscribe to appear in search')
  await shot(page, '07-tutor-unlisted')
  await page.getByRole('button', { name: 'Subscribe' }).click()
  await see(page, 'You’re not listed yet')
  await payInPopup(page, () => page.getByRole('button', { name: /Pay ₦5,000 with Paystack/ }).click())
  await see(page, 'You’re listed')
  await shot(page, '08-tutor-listed')
  const n = await stack.sql(`select count(*)::int c from tutor_directory`)
  if (n[0].c !== 3) throw new Error('directory size ' + n[0].c)
})

await flow('messages: learner asks, tutor replies', async (page) => {
  await signIn(page, F.student.email)
  await see(page, 'Hi, Sola')
  await tapText(page, 'Find tutors')
  await page.getByRole('button', { name: /Tobi Tutor/ }).click()
  await page.getByRole('button', { name: 'Message Tobi Tutor' }).click()
  await see(page, 'Say hello to Tobi')
  await page.getByLabel('Message', { exact: true }).fill('Hello! Can we focus on WAEC past questions?')
  await page.getByRole('button', { name: 'Send' }).click()
  await see(page, 'Can we focus on WAEC past questions?')
  await shot(page, '09-thread')
  const { ctx, page: tutor } = await newPage()
  await signIn(tutor, F.tutor.email)
  await see(tutor, 'Hi, Tobi')
  await tapText(tutor, 'Messages')
  await tutor.getByRole('button', { name: /Conversation with Sola Student/ }).click()
  await tutor.getByLabel('Message', { exact: true }).fill('Absolutely. See you soon!')
  await tutor.getByRole('button', { name: 'Send' }).click()
  await see(tutor, 'See you soon!')
  await ctx.close()
  await page.reload()
  await see(page, 'See you soon!')
})

await flow('suspended account sees an explanation', async (page) => {
  await stack.sql(`update profiles set suspended_at = now(), suspended_reason = 'Payment dispute' where id = $1`, [F.student.id])
  await signIn(page, F.student.email)
  await see(page, 'Your account is suspended')
  await see(page, 'Payment dispute')
})

await flow('admin is pointed to the web panel', async (page) => {
  await signIn(page, F.admin.email)
  await see(page, 'use the web admin panel')
})

await flow('sign in error', async (page) => {
  await page.goto(ORIGIN + '/sign-in')
  await page.getByLabel('Email').fill(F.student.email)
  await page.getByLabel('Password').fill('wrongpass')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await see(page, 'don’t match')
})

await resetData(stack)
await browser.close()
server.close()
await stack.close()
console.log(results.join('\n'))
process.exit(results.some((r) => r.startsWith('FAIL')) ? 1 : 0)
