// Runs the app's web build at iPhone size against an in-memory Supabase stand-in.
//   EXPO_PUBLIC_SUPABASE_URL=https://demo.tutorhaven.local EXPO_PUBLIC_SUPABASE_ANON_KEY=demo-anon-key-not-a-secret-123456 \
//     npx expo export --platform web --output-dir dist-web
//   node e2e/run.mjs            (needs the `playwright` package + Chromium)
// The stand-in reuses the web app's demo backend (../tutorhaven/src/demo), which mirrors the SQL rules.
import { createRequire } from 'module'
import { createServer } from 'http'
import { mkdirSync, readFileSync, writeFileSync, existsSync, statSync } from 'fs'
import { fileURLToPath, pathToFileURL } from 'url'
import path from 'path'

const require = createRequire(import.meta.url)
const { chromium } = require('playwright')
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DIST = path.join(ROOT, 'dist-web')
const SHOTS = path.join(ROOT, 'e2e', 'screenshots')
const ONLY = process.argv.find((a) => a.startsWith('--only='))?.slice(7)
const SUPABASE = 'https://demo.tutorhaven.local'
mkdirSync(SHOTS, { recursive: true })

// Load the demo backend (fix extension-less ESM import for Node).
const CACHE = path.join(ROOT, 'e2e', '.cache')
mkdirSync(CACHE, { recursive: true })
const DEMO = path.resolve(ROOT, '../tutorhaven/src/demo')
writeFileSync(path.join(CACHE, 'seed.js'), readFileSync(path.join(DEMO, 'seed.js'), 'utf8'))
writeFileSync(path.join(CACHE, 'backend.js'), readFileSync(path.join(DEMO, 'backend.js'), 'utf8').replace("from './seed'", "from './seed.js'"))
const backend = await import(pathToFileURL(path.join(CACHE, 'backend.js')).href)

// Static server with SPA fallback.
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.ttf': 'font/ttf', '.ico': 'image/x-icon', '.json': 'application/json' }
const server = createServer((req, res) => {
  let p = path.join(DIST, decodeURIComponent(new URL(req.url, 'http://x').pathname))
  if (!existsSync(p) || statSync(p).isDirectory()) p = path.join(DIST, 'index.html')
  res.setHeader('content-type', TYPES[path.extname(p)] ?? 'application/octet-stream')
  res.end(readFileSync(p))
}).listen(4330)
const ORIGIN = 'http://localhost:4330'

const browser = await chromium.launch()
const results = []
const IPHONE = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }

async function newPage() {
  backend.resetDemo()
  const ctx = await browser.newContext({ ...IPHONE })
  const page = await ctx.newPage()
  page.errors = []
  page.on('pageerror', (e) => page.errors.push('pageerror: ' + e.message))
  page.on('console', (m) => {
    if (m.type() === 'error' && !/status of (400|401|403|406|422)/.test(m.text())) page.errors.push('console: ' + m.text().slice(0, 240))
  })
  await page.route(`${SUPABASE}/**`, async (route) => {
    const req = route.request()
    const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' }
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 200, headers: cors })
    const res = await backend.demoFetch(req.url(), { method: req.method(), headers: req.headers(), body: req.postData() ?? undefined })
    await route.fulfill({ status: res.status, headers: { ...cors, 'content-type': 'application/json' }, body: res.status === 204 ? '' : await res.text() })
  })
  return { ctx, page }
}

const see = (page, text, timeout = 8000) => page.getByText(text, { exact: false }).first().waitFor({ state: 'visible', timeout })
const tapText = (page, text) => page.getByText(text, { exact: true }).first().click()
const shot = (page, name) => page.screenshot({ path: path.join(SHOTS, `${name}.png`) })

async function signIn(page, email) {
  await page.goto(ORIGIN + '/sign-in')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill('demo1234')
  await page.getByRole('button', { name: 'Sign in' }).click()
}

async function flow(name, fn) {
  if (ONLY && !name.includes(ONLY)) return
  const { ctx, page } = await newPage()
  try {
    await fn(page)
    if (page.errors.length) throw new Error(page.errors.join(' | '))
    results.push(`PASS  ${name}`)
  } catch (e) {
    results.push(`FAIL  ${name}: ${e.message.split('\n')[0]}`)
    await shot(page, 'fail-' + name.replace(/\W+/g, '-')).catch(() => {})
  }
  await ctx.close()
}

await flow('welcome → sign up → onboarding → home', async (page) => {
  await page.goto(ORIGIN + '/')
  await see(page, 'Find the right tutor.')
  await page.waitForTimeout(1200)
  await shot(page, '01-welcome')
  await page.getByRole('button', { name: 'Get started' }).click()
  await see(page, 'Create your account')
  await page.getByLabel('Full name').fill('Chioma Okeke')
  await page.getByLabel('Email').fill('chioma@example.com')
  await page.getByLabel('Password').fill('supersecret')
  await page.getByRole('button', { name: 'Create student account' }).click()
  await see(page, 'Welcome, Chioma!')
  await shot(page, '02-onboarding')
  await page.getByRole('button', { name: 'Let’s go' }).click()
  await tapText(page, 'WAEC')
  await page.getByRole('button', { name: 'Continue' }).click()
  await tapText(page, 'Chemistry')
  await page.getByRole('button', { name: 'Continue' }).click()
  await tapText(page, 'Score high in JAMB')
  await page.getByRole('button', { name: 'Finish' }).click()
  await see(page, 'You’re all set!')
  await page.getByRole('button', { name: 'Let’s go' }).click()
  await see(page, 'Hi, Chioma')
  await see(page, 'Based on Chemistry')
})

await flow('student: home, explore, profile, book, pay', async (page) => {
  await signIn(page, 'sam@demo.tutorhaven.app')
  await see(page, 'Hi, Sam')
  await page.waitForTimeout(1400)
  await shot(page, '03-student-home')
  await tapText(page, 'Find tutors')
  await see(page, '6 tutors found')
  await page.waitForTimeout(800)
  await shot(page, '04-explore')
  await page.getByPlaceholder('Name, subject or keyword').fill('physics')
  await see(page, '1 tutor found')
  await page.getByRole('button', { name: /Lucas Meyer/ }).click()
  await see(page, 'This week’s availability')
  await page.waitForTimeout(900)
  await shot(page, '05-tutor-profile')
  await page.getByRole('button', { name: 'Book a session' }).click()
  await see(page, 'Pick a time')
  await page.getByRole('button', { name: /^\d{1,2}:\d\d (AM|PM)$/ }).first().click()
  await page.waitForTimeout(500)
  await shot(page, '06-book')
  await page.getByRole('button', { name: 'Continue' }).click()
  await see(page, 'Slot held for')
  await see(page, 'Member discount')
  await shot(page, '07-checkout')
  await page.getByRole('button', { name: /^Pay ₦10,800/ }).click()
  await see(page, 'You’re booked!')
  await page.waitForTimeout(700)
  await shot(page, '08-booked')
})

await flow('student: sessions cancel + review + membership', async (page) => {
  await signIn(page, 'sam@demo.tutorhaven.app')
  await see(page, 'Hi, Sam')
  await page.getByRole('button', { name: 'Leave a review' }).first().click()
  await page.getByRole('button', { name: '4 stars' }).click()
  await page.getByPlaceholder('What went well? What could be better?').fill('Really clear explanations.')
  await shot(page, '09-review-sheet')
  await page.getByRole('button', { name: 'Submit review' }).click()
  await see(page, 'Thanks! Your review')
  await tapText(page, 'Sessions')
  await see(page, 'Upcoming  3')
  await page.waitForTimeout(600)
  await shot(page, '10-sessions')
  await page.getByRole('button', { name: 'Cancel' }).last().click()
  await page.getByRole('button', { name: 'Cancel session' }).click()
  await see(page, 'Session cancelled')
  await tapText(page, 'Account')
  await see(page, 'Membership')
  await shot(page, '11-account')
  await page.getByRole('button', { name: /Membership/ }).click()
  await see(page, 'Choose Family')
  await page.getByRole('button', { name: 'Choose Family' }).click()
  await see(page, 'Family is active')
})

await flow('parent: learners, link child, book for child', async (page) => {
  await signIn(page, 'jordan@demo.tutorhaven.app')
  await see(page, 'Hello, Jordan')
  await see(page, 'Sam Rivera')
  await page.waitForTimeout(1200)
  await shot(page, '12-parent-home')
  await page.getByRole('button', { name: 'Link a child' }).first().click()
  await page.getByLabel('Child’s email').fill('maya@demo.tutorhaven.app')
  await page.getByRole('button', { name: 'Link account' }).click()
  await see(page, 'Maya Chen is now linked')
  await tapText(page, 'Find tutors')
  await page.getByRole('button', { name: /Chloé Bennett/ }).click()
  await page.getByRole('button', { name: 'Book a session' }).click()
  await see(page, 'Who is this for?')
  await page.getByRole('radio', { name: /Maya Chen/ }).click()
  await page.getByRole('button', { name: /^\d{1,2}:\d\d (AM|PM)$/ }).first().click()
  await page.getByRole('button', { name: 'Continue' }).click()
  await see(page, 'For Maya Chen')
})

await flow('tutor: complete session, edit listing', async (page) => {
  await signIn(page, 'amara@demo.tutorhaven.app')
  await see(page, 'Hi, Amara')
  await see(page, 'Ready to complete')
  await page.waitForTimeout(1200)
  await shot(page, '13-tutor-home')
  await page.getByRole('button', { name: 'Mark complete' }).first().click()
  await page.getByRole('button', { name: 'Mark complete' }).last().click()
  await see(page, 'Session marked as complete')
  await tapText(page, 'Listing')
  await see(page, 'Weekly availability')
  await page.getByRole('button', { name: 'Increase rate' }).click()
  await see(page, '₦9,500')
  await page.getByRole('checkbox', { name: 'Sun morning' }).click()
  await shot(page, '14-listing')
  await page.getByRole('button', { name: 'Save listing' }).click()
  await see(page, 'Listing saved')
})

await flow('admin is pointed to the web panel', async (page) => {
  await signIn(page, 'ada@demo.tutorhaven.app')
  await see(page, 'use the web admin panel')
})

await flow('sign in error', async (page) => {
  await page.goto(ORIGIN + '/sign-in')
  await page.getByLabel('Email').fill('sam@demo.tutorhaven.app')
  await page.getByLabel('Password').fill('wrongpass')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await see(page, 'don’t match')
})

await browser.close()
server.close()
console.log(results.join('\n'))
process.exit(results.some((r) => r.startsWith('FAIL')) ? 1 : 0)
