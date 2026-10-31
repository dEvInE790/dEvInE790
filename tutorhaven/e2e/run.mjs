// End-to-end checks against the demo build (no Supabase needed).
//   npm run build:demo && npm run test:e2e            flows + click-every-button crawl
//   npm run test:e2e -- --shots                       also save screenshots to e2e/screenshots
// Requires the `playwright` package and a Chromium install.
import { createRequire } from 'module'
import { spawn } from 'child_process'
import { mkdirSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

const require = createRequire(import.meta.url)
const { chromium } = require('playwright')
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const PORT = 4317
const ORIGIN = `http://localhost:${PORT}/`
const SHOTS = process.argv.includes('--shots')
const ONLY = process.argv.find((a) => a.startsWith('--only='))?.slice(7)

const server = spawn('npx', ['vite', 'preview', '--outDir', 'dist-demo', '--port', String(PORT), '--strictPort'], { cwd: ROOT, stdio: 'ignore' })
await new Promise((r) => setTimeout(r, 2500))

const browser = await chromium.launch()
const results = []
const problems = []
const report = (msg) => { problems.push(msg); console.log('PROBLEM ' + msg) }
const DESKTOP = { width: 1280, height: 860 }
const MOBILE = { width: 390, height: 844 }
const url = (route) => ORIGIN + '#' + route

async function newPage({ viewport = DESKTOP, intro = false, reducedMotion = 'no-preference' } = {}) {
  const ctx = await browser.newContext({ viewport, reducedMotion })
  if (!intro) await ctx.addInitScript(() => { try { sessionStorage.setItem('th:intro-seen', '1') } catch {} })
  const page = await ctx.newPage()
  page.errors = []
  page.on('pageerror', (e) => page.errors.push('pageerror: ' + e.message))
  page.on('console', (m) => {
    if (m.type() !== 'error') return
    const t = m.text()
    if (/status of (400|401|403|406|409|422)/.test(t)) return // expected validation responses
    page.errors.push('console: ' + t.slice(0, 200))
  })
  return { ctx, page }
}

const see = (page, text, timeout = 6000) => page.getByText(text, { exact: false }).first().waitFor({ state: 'visible', timeout })

async function signIn(page, who) {
  await page.goto(url('/signin'))
  await page.getByRole('button', { name: new RegExp(who) }).first().click()
  await page.waitForURL(/#\/(dashboard|onboarding)/)
  await page.waitForLoadState('networkidle')
}

async function flow(name, opts, fn) {
  if (ONLY && !name.includes(ONLY)) return
  const { ctx, page } = await newPage(opts)
  try {
    await fn(page)
    if (page.errors.length) throw new Error(page.errors.join(' | '))
    results.push(`PASS  ${name}`)
  } catch (e) {
    results.push(`FAIL  ${name}: ${e.message.split('\n')[0]}`)
    if (SHOTS) await page.screenshot({ path: `${ROOT}/e2e/screenshots/fail-${name.replace(/\W+/g, '-')}.png` }).catch(() => {})
  }
  await ctx.close()
}

if (SHOTS) mkdirSync(`${ROOT}/e2e/screenshots`, { recursive: true })

// ---------------------------------------------------------------------------
// Flows
// ---------------------------------------------------------------------------
await flow('public: landing CTAs, search, how-it-works anchor', {}, async (page) => {
  await page.goto(url('/'))
  await see(page, 'verified tutors')
  await page.getByRole('link', { name: 'How it works' }).first().click()
  await see(page, 'From first search to real progress')
  await page.getByLabel('What do you want to learn?').fill('physics')
  await page.getByRole('button', { name: /Find tutors/ }).click()
  await page.waitForURL(/#\/tutors\?q=physics/)
  await see(page, 'Lucas Meyer')
  await page.goto(url('/'))
  await page.getByRole('link', { name: 'Mathematics' }).first().click()
  await page.waitForURL(/subject=Mathematics/)
})

await flow('public: filters, sort, search, clear', {}, async (page) => {
  await page.goto(url('/tutors'))
  await see(page, '6 tutors found')
  await page.locator('aside').getByRole('button', { name: 'Physics', exact: true }).click()
  await see(page, '1 tutor found')
  await page.getByRole('button', { name: 'Clear all' }).click()
  await see(page, '6 tutors found')
  await page.getByLabel('Search tutors').fill('spanish')
  await see(page, '1 tutor found')
  await page.getByRole('button', { name: 'Clear search' }).click()
  await see(page, '6 tutors found')
  await page.getByRole('button', { name: /Sort:/ }).click()
  await page.getByRole('option', { name: 'Price: low to high' }).click()
  await page.waitForURL(/sort=price_asc/)
  await page.waitForTimeout(900)
  const first = await page.locator('article h3').first().innerText()
  if (!first.includes('Sofía')) throw new Error('price sort: first was ' + first)
  await page.locator('aside').getByRole('button', { name: 'Up to $40' }).click()
  await see(page, '2 tutors found')
})

await flow('public: tutor profile, reviews, book requires sign-in', {}, async (page) => {
  await page.goto(url('/tutors'))
  await page.getByRole('link', { name: 'Amara Okafor' }).click()
  await see(page, 'This week’s availability')
  await see(page, 'Amara made integration finally make sense')
  await page.getByRole('link', { name: 'Book a session' }).first().click()
  await page.waitForURL(/#\/signin/)
})

await flow('mobile: menu, filter sheet, sticky booking bar', { viewport: MOBILE }, async (page) => {
  await page.goto(url('/'))
  await page.getByRole('button', { name: 'Open menu' }).click()
  await page.locator('header').getByRole('link', { name: 'Find tutors' }).click()
  await page.waitForURL(/#\/tutors/)
  await page.getByRole('button', { name: /^Filters/ }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Chemistry', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: /Show 1 tutor/ }).click()
  await page.getByRole('dialog').waitFor({ state: 'detached' })
  await see(page, 'Daniel Kim')
})

await flow('auth: wrong password, protected redirect, sign out', {}, async (page) => {
  await page.goto(url('/dashboard/billing'))
  await page.waitForURL(/#\/signin/)
  await page.getByLabel('Email').fill('sam@demo.tutorhaven.app')
  await page.getByLabel('Password').fill('nope')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await see(page, 'don’t match')
  await page.getByLabel('Password').fill('demo1234')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await see(page, 'Total spent') // returned to the page they asked for
  await page.getByRole('link', { name: 'Settings' }).first().click()
  await page.getByRole('button', { name: 'Sign out' }).last().click()
  await see(page, 'Find the')
})

await flow('student: book a session and pay with member discount', {}, async (page) => {
  await signIn(page, 'Sam Rivera')
  await see(page, 'Welcome back, Sam')
  await page.goto(url('/book/d0000000-0000-4000-8000-000000000102'))
  await page.getByRole('tab', { name: '45 min' }).click()
  await page.locator('button[aria-pressed]').filter({ hasText: /\d:\d\d/ }).nth(1).click()
  await page.getByLabel('Notes for your tutor').fill('Projectile motion please')
  await see(page, 'Member discount (10%)')
  await page.getByRole('button', { name: /Continue to payment/ }).click()
  await page.waitForURL(/#\/checkout\//)
  await see(page, 'Slot held for')
  await page.getByRole('button', { name: /^Pay \$37\.13/ }).click()
  await see(page, 'You’re booked!')
  await page.getByRole('link', { name: /View my sessions/ }).click()
  await see(page, 'Projectile motion please')
})

await flow('student: cancel, review, favourite, billing, settings', {}, async (page) => {
  await signIn(page, 'Sam Rivera')
  await page.getByRole('button', { name: 'Leave a review' }).first().click()
  await page.getByRole('radio', { name: '4 stars' }).click()
  await page.getByLabel('Review').fill('Clear explanations and a great project to practise with.')
  await page.getByRole('button', { name: 'Submit review' }).click()
  await see(page, 'Thanks! Your review')
  await page.getByRole('link', { name: 'Sessions' }).first().click()
  await page.getByRole('button', { name: 'Cancel' }).last().click()
  await page.getByRole('dialog').getByRole('button', { name: 'Cancel session' }).click()
  await see(page, 'Session cancelled')
  await page.getByRole('tab', { name: /Cancelled/ }).click()
  await see(page, 'Cancelled')
  await page.goto(url('/tutors'))
  await page.getByRole('button', { name: 'Save to favourites' }).first().click()
  await see(page, 'Saved to your favourites')
  await page.goto(url('/dashboard/billing'))
  await see(page, 'Renews')
  await page.getByRole('button', { name: 'Cancel renewal' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Cancel renewal' }).click()
  await see(page, 'Benefits end')
  await page.goto(url('/dashboard/settings'))
  await page.getByLabel('Full name').fill('Sam R. Rivera')
  await page.getByRole('button', { name: 'Save changes' }).click()
  await see(page, 'Profile saved')
  await page.getByLabel('New password').fill('newpass123')
  await page.getByRole('button', { name: 'Update' }).click()
  await see(page, 'Password updated')
})

await flow('parent: link child, subscribe Family, book for child', {}, async (page) => {
  await signIn(page, 'Jordan Rivera')
  await see(page, 'Your learners')
  await page.getByRole('button', { name: 'Link a child' }).first().click()
  await page.getByLabel('Child’s email').fill('nobody@example.com')
  await page.getByRole('button', { name: 'Link account' }).click()
  await see(page, 'No student account uses that email')
  await page.getByLabel('Child’s email').fill('maya@demo.tutorhaven.app')
  await page.getByRole('button', { name: 'Link account' }).click()
  await see(page, 'Maya Chen is now linked')
  await page.goto(url('/pricing'))
  await page.getByRole('button', { name: 'Choose Family' }).click()
  await page.getByRole('dialog').getByRole('button', { name: /Pay \$39/ }).click()
  await see(page, 'Welcome to Family')
  await page.goto(url('/book/d0000000-0000-4000-8000-000000000106'))
  await page.getByRole('button', { name: /Maya Chen/ }).click()
  await page.locator('button[aria-pressed]').filter({ hasText: /\d:\d\d/ }).first().click()
  await see(page, 'Member discount (15%)')
  await page.getByRole('button', { name: /Continue to payment/ }).click()
  await see(page, 'For Maya Chen')
  await page.getByRole('button', { name: /^Pay/ }).click()
  await see(page, 'You’re booked!')
})

await flow('tutor: complete session, edit listing, preview profile', {}, async (page) => {
  await signIn(page, 'Amara Okafor')
  await see(page, 'Ready to complete')
  await page.getByRole('button', { name: 'Mark complete' }).first().click()
  await page.getByRole('dialog').getByRole('button', { name: 'Mark complete' }).click()
  await see(page, 'Session marked as complete')
  await page.getByRole('link', { name: 'My listing' }).first().click()
  await page.locator('li').filter({ hasText: 'Sunday' }).getByRole('button', { name: 'Add' }).click()
  await page.getByLabel('Hourly rate (USD)').fill('45')
  await page.getByRole('button', { name: 'Save listing' }).click()
  await see(page, 'Listing saved')
  await page.getByRole('link', { name: 'Preview' }).click()
  await see(page, '$45')
})

await flow('admin: approve tutor, change role, tutor appears in search', {}, async (page) => {
  await signIn(page, 'Ada Admin')
  await see(page, 'Platform overview')
  await see(page, 'Theo Laurent')
  await page.getByRole('button', { name: 'Approve' }).click()
  await see(page, 'is now live')
  await page.getByRole('link', { name: 'Manage users' }).click()
  await page.getByLabel('Search users').fill('zara')
  await see(page, 'Zara Ahmed')
  await page.locator('li').filter({ hasText: 'Zara Ahmed' }).getByRole('button', { name: /Student/ }).click()
  await page.getByRole('option', { name: 'Parent' }).click()
  await see(page, 'is now parent')
  await page.goto(url('/tutors?q=piano'))
  await see(page, 'Theo Laurent')
})

await flow('new tutor: sign up → onboarding → pending dashboard', {}, async (page) => {
  await page.goto(url('/signup?role=tutor'))
  await page.getByLabel('Full name').fill('Rita Novak')
  await page.getByLabel('Email').fill('rita@example.com')
  await page.getByLabel('Password').fill('supersecret')
  await page.getByRole('button', { name: /Create tutor account/ }).click()
  await page.waitForURL(/#\/onboarding/)
  await page.getByRole('button', { name: 'Let’s go' }).click()
  await page.getByLabel('Your headline').fill('Economics made intuitive for A-Level students')
  await page.getByRole('button', { name: 'Economics' }).click()
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByRole('button', { name: 'A-Level' }).click()
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByLabel('Bio').fill('Former central bank analyst who loves turning graphs into stories students remember.')
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByRole('button', { name: 'Finish' }).click()
  await see(page, 'submitted for review')
  await page.getByRole('button', { name: 'Go to my dashboard' }).click()
  await see(page, 'Your listing is being reviewed')
})

await flow('new student: sign up → onboarding → recommendations', { viewport: MOBILE }, async (page) => {
  await page.goto(url('/signup'))
  await page.getByLabel('Full name').fill('Ivy Park')
  await page.getByLabel('Email').fill('ivy@example.com')
  await page.getByLabel('Password').fill('supersecret')
  await page.getByRole('button', { name: /Create student account/ }).click()
  await page.getByRole('button', { name: 'Let’s go' }).click()
  await page.getByRole('button', { name: 'IB' }).click()
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByRole('button', { name: 'Chemistry' }).click()
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByRole('button', { name: 'Get ahead' }).click()
  await page.getByRole('button', { name: 'Finish' }).click()
  await page.getByRole('button', { name: 'Go to my dashboard' }).click()
  await see(page, 'Based on your interest in Chemistry')
  await see(page, 'Daniel Kim')
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

await flow('misc: 404 page and demo reset', {}, async (page) => {
  await page.goto(url('/does-not-exist'))
  await see(page, 'This page took a different path')
  await page.getByRole('button', { name: 'Demo' }).click()
  await page.getByRole('button', { name: 'Reset demo data' }).click()
  await see(page, 'Find the')
})

// ---------------------------------------------------------------------------
// Crawl: click every distinct button, link and tab on each page, per role.
// ---------------------------------------------------------------------------
const CRAWL = [
  [null, ['/', '/tutors', '/tutors/d0000000-0000-4000-8000-000000000101', '/pricing', '/signin', '/signup']],
  ['Sam Rivera', ['/dashboard', '/dashboard/sessions', '/dashboard/billing', '/dashboard/settings', '/book/d0000000-0000-4000-8000-000000000104', '/pricing']],
  ['Jordan Rivera', ['/dashboard', '/dashboard/sessions', '/dashboard/billing']],
  ['Amara Okafor', ['/dashboard', '/dashboard/sessions', '/dashboard/listing']],
  ['Ada Admin', ['/dashboard', '/dashboard/users', '/dashboard/sessions']],
]
const SEL = 'a[href], button, [role="tab"], [role="option"]'
const SKIP = /^(Sign out|Reset demo data|Demo)$/ // covered by flows; would end the session
let clicks = 0
if (!ONLY || ONLY === 'crawl') {
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
  const shots = [
    [null, '/', 'landing'], [null, '/tutors', 'tutors'], [null, '/tutors/d0000000-0000-4000-8000-000000000101', 'profile'], [null, '/pricing', 'pricing'], [null, '/signin', 'signin'],
    ['Sam Rivera', '/dashboard', 'student'], ['Sam Rivera', '/book/d0000000-0000-4000-8000-000000000102', 'book'], ['Sam Rivera', '/dashboard/sessions', 'sessions'], ['Sam Rivera', '/dashboard/billing', 'billing'],
    ['Jordan Rivera', '/dashboard', 'parent'], ['Amara Okafor', '/dashboard', 'tutor'], ['Amara Okafor', '/dashboard/listing', 'listing'], ['Ada Admin', '/dashboard', 'admin'], ['Ada Admin', '/dashboard/users', 'users'],
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

await browser.close()
server.kill()
console.log(results.join('\n'))
console.log(`\nCrawler clicked ${clicks} controls.`)
console.log(problems.length ? `\nPROBLEMS (${problems.length}):\n` + problems.join('\n') : '\nNo problems found.')
process.exit(results.some((r) => r.startsWith('FAIL')) || problems.length ? 1 : 0)
