#!/usr/bin/env node
/**
 * End-to-end checks with Playwright (dev-only dependency):
 *   NODE_PATH=$(npm root -g) npm test        (or install playwright locally)
 *
 * Builds four variants and tests them in Chromium at desktop and mobile sizes:
 *   prod    — current site.config.js (nothing verified yet)
 *   preview — design preview with sample placeholders
 *   live    — a fully configured fixture (fake details, test only) incl. a form endpoint
 *   email   — only an email address configured (mailto fallback)
 */
const { execFileSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const TMP = path.join(__dirname, '.tmp');
let failures = 0, passes = 0;
const ok = (cond, msg) => { if (cond) { passes++; } else { failures++; console.log('  ✗ ' + msg); } };

function build(name, override, preview) {
  const out = path.join(TMP, name);
  const env = { ...process.env };
  if (override) {
    const f = path.join(TMP, name + '.json');
    fs.writeFileSync(f, JSON.stringify(override));
    env.TUSH_CONFIG_OVERRIDE = f;
  }
  execFileSync('node', ['build.js', ...(preview ? ['--preview'] : []), '--out', out], { cwd: ROOT, env, stdio: 'ignore' });
  return out;
}
function serve(dir, port) {
  const p = spawn('node', [path.join(ROOT, 'serve.js'), dir, String(port)], { stdio: 'ignore' });
  return new Promise((r) => setTimeout(() => r(p), 400));
}

const LIVE = {
  siteUrl: 'https://www.example-spa.test',
  contact: { phone: '(713) 555-0100', phoneAcceptsTexts: true, email: 'hello@example-spa.test', instagram: 'examplespa', address: '100 Example St, Houston, TX 77002', addressParts: { street: '100 Example St', city: 'Houston', region: 'TX', postalCode: '77002' } },
  hours: [{ days: 'Tuesday – Saturday', hours: '10:00 am – 6:00 pm', schema: { days: ['Tu', 'We', 'Th', 'Fr', 'Sa'], opens: '10:00', closes: '18:00' } }],
  booking: { formEndpoint: 'https://forms.example.test/f/abc' },
};
const PAGES = ['index.html', 'services.html', 'about.html', 'gallery.html', 'contact.html', '404.html'];

async function crawl(page, base, label) {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  const seen = new Set();
  for (const p of PAGES) {
    const res = await page.goto(`${base}/${p}`, { waitUntil: 'load' });
    ok(res.status() === 200, `${label} ${p} returns 200`);
    ok((await page.title()).length > 10, `${label} ${p} has a title`);
    ok(await page.$('meta[name="description"]'), `${label} ${p} has a meta description`);
    ok((await page.$$('h1')).length === 1, `${label} ${p} has exactly one h1`);
    const imgsNoAlt = await page.$$eval('img:not([alt])', (els) => els.length);
    ok(imgsNoAlt === 0, `${label} ${p} every img has an alt attribute`);
    const broken = await page.$$eval('img', (els) => els.filter((i) => i.getAttribute('src') && i.complete && i.naturalWidth === 0 && i.getAttribute('loading') !== 'lazy').map((i) => i.src));
    ok(broken.length === 0, `${label} ${p} no broken images ${broken}`);
    const hrefs = await page.$$eval('a[href]', (as) => as.map((a) => a.getAttribute('href')));
    ok(!hrefs.includes('#') && !hrefs.includes(''), `${label} ${p} no dead # links`);
    hrefs.filter((h) => !/^(https?:|mailto:|tel:|sms:|#)/.test(h)).forEach((h) => seen.add(h.split('#')[0].split('?')[0]));
    const unlabeled = await page.$$eval('input:not([type=hidden]):not([type=radio]), select, textarea', (els) => els.filter((e) => !e.closest('.hp') && !(e.id && document.querySelector(`label[for="${e.id}"]`)) && !e.getAttribute('aria-label')).length);
    ok(unlabeled === 0, `${label} ${p} all form controls are labelled`);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    ok(overflow <= 1, `${label} ${p} no horizontal scroll (${overflow}px)`);
  }
  for (const h of seen) {
    const r = await page.request.get(`${base}/${h}`);
    ok(r.status() === 200, `${label} internal link ${h} resolves`);
  }
  ok(errors.length === 0, `${label} no console errors: ${errors.join(' | ')}`);
}

async function fillForm(page, { email = 'jane@example.test' } = {}) {
  await page.fill('#name', 'Jane Doe');
  await page.fill('#phone', '(713) 555-0199');
  if (email) await page.fill('#email', email);
  await page.selectOption('#service', { index: 1 });
  const d = new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10);
  await page.fill('#date', d);
  await page.selectOption('#time', 'Morning');
}

(async () => {
  fs.rmSync(TMP, { recursive: true, force: true });
  fs.mkdirSync(TMP, { recursive: true });
  const dirs = {
    prod: build('prod'),
    preview: build('preview', null, true),
    live: build('live', LIVE),
    email: build('email', { contact: { email: 'hello@example-spa.test' } }),
  };
  const ports = { prod: 9101, preview: 9102, live: 9103, email: 9104 };
  const servers = await Promise.all(Object.keys(dirs).map((k) => serve(dirs[k], ports[k])));
  const url = (k) => `http://localhost:${ports[k]}`;
  const browser = await chromium.launch();

  try {
    for (const [vw, vh, label] of [[1440, 900, 'desktop'], [390, 844, 'mobile']]) {
      for (const k of Object.keys(dirs)) {
        const page = await browser.newPage({ viewport: { width: vw, height: vh } });
        await crawl(page, url(k), `[${k}/${label}]`);
        await page.close();
      }
    }

    // ---- Production with no verified data: honest empty states ----
    {
      const page = await browser.newPage();
      await page.goto(url('prod') + '/index.html');
      ok(!(await page.$('.testimonial')), '[prod] no testimonials without real reviews');
      ok(!(await page.$('.announcement')), '[prod] no announcement bar when none configured');
      ok(await page.$('.notice-panel'), '[prod] services show "coming soon" note');
      const ld = JSON.parse(await page.$eval('script[type="application/ld+json"]', (s) => s.textContent));
      ok(!ld.telephone && !ld.address && !ld.openingHoursSpecification && !ld.aggregateRating, '[prod] structured data has no unverified fields');
      await page.goto(url('prod') + '/contact.html');
      ok(!(await page.$('#booking-form')), '[prod] no booking form when no channel can deliver it');
      ok(await page.$('.map--pending'), '[prod] map placeholder until address confirmed');
      ok(!fs.existsSync(path.join(dirs.prod, 'sitemap.xml')), '[prod] no sitemap without siteUrl');
      await page.close();
    }

    // ---- Preview: interactions ----
    {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
      await page.goto(url('preview') + '/index.html');
      ok(await page.$('meta[name="robots"][content*="noindex"]'), '[preview] is noindex');
      // Mobile menu
      await page.click('[data-menu-toggle]');
      ok(await page.isVisible('#mobile-menu'), '[preview] mobile menu opens');
      ok((await page.getAttribute('[data-menu-toggle]', 'aria-expanded')) === 'true', '[preview] aria-expanded=true when open');
      await page.keyboard.press('Escape');
      ok(!(await page.isVisible('#mobile-menu')), '[preview] Escape closes menu');
      await page.click('[data-menu-toggle]');
      await Promise.all([page.waitForNavigation(), page.click('#mobile-menu a[href="services.html"]')]);
      ok(page.url().endsWith('/services.html'), '[preview] mobile menu navigates');
      // Mobile bar appears after scrolling
      await page.goto(url('preview') + '/about.html');
      await page.mouse.wheel(0, 1200);
      await page.waitForTimeout(500);
      ok(await page.$('.mobile-bar.is-visible'), '[preview] mobile booking bar appears on scroll');
      await page.close();
    }
    {
      const page = await browser.newPage();
      await page.goto(url('preview') + '/gallery.html');
      const total = await page.$$eval('.gallery-item', (e) => e.length);
      await page.click('[data-filter="space"]');
      const shown = await page.$$eval('.gallery-item:not([hidden])', (e) => e.length);
      ok(shown > 0 && shown < total, `[preview] gallery filter narrows items (${shown}/${total})`);
      ok((await page.getAttribute('[data-filter="space"]', 'aria-pressed')) === 'true', '[preview] filter aria-pressed');
      await page.click('[data-filter="all"]');
      await page.click('.gallery-item >> nth=0');
      ok(await page.isVisible('[data-lightbox]'), '[preview] lightbox opens');
      const first = await page.getAttribute('[data-lightbox-img]', 'src');
      await page.keyboard.press('ArrowRight');
      ok((await page.getAttribute('[data-lightbox-img]', 'src')) !== first, '[preview] lightbox arrow key navigates');
      await page.keyboard.press('Escape');
      ok(!(await page.isVisible('[data-lightbox]')), '[preview] Escape closes lightbox');
      await page.close();
    }
    {
      const page = await browser.newPage();
      await page.goto(url('preview') + '/contact.html?service=service-2#booking');
      ok((await page.inputValue('#service')) === 'service-2', '[preview] ?service= preselects the service');
      ok(!(await page.isVisible('[data-form-success]')), '[preview] success panel hidden initially');
      await page.click('[data-submit]');
      ok((await page.textContent('[data-error-for="name"]')).length > 0, '[preview] empty submit shows name error');
      ok((await page.getAttribute('#name', 'aria-invalid')) === 'true', '[preview] invalid field gets aria-invalid');
      ok((await page.evaluate(() => document.activeElement.id)) === 'name', '[preview] focus moves to first invalid field');
      await page.fill('#email', 'not-an-email');
      await page.click('[data-submit]');
      ok((await page.textContent('[data-error-for="email"]')).includes('valid email'), '[preview] invalid email rejected');
      await fillForm(page);
      await page.click('[data-submit]');
      await page.waitForSelector('[data-form-success]:not([hidden])');
      const t = await page.textContent('[data-form-success]');
      ok(/NOT sent/.test(t) && /not a confirmed booking/.test(t), '[preview] simulated success is clearly marked and not a confirmation');
      await page.close();
    }

    // ---- Live fixture: real channels ----
    {
      const page = await browser.newPage();
      await page.goto(url('live') + '/index.html');
      ok(await page.$('a[href="tel:+17135550100"]'), '[live] click-to-call link present');
      ok(await page.$('a[href="https://www.instagram.com/examplespa/"]'), '[live] Instagram link present');
      const ld = JSON.parse(await page.$eval('script[type="application/ld+json"]', (s) => s.textContent));
      ok(ld.telephone === '+17135550100' && ld.address && ld.openingHoursSpecification, '[live] structured data uses configured details');
      ok(await page.$('link[rel=canonical][href="https://www.example-spa.test/"]'), '[live] canonical URL');
      ok(fs.readFileSync(path.join(dirs.live, 'sitemap.xml'), 'utf8').includes('https://www.example-spa.test/services.html'), '[live] sitemap generated');
      await page.goto(url('live') + '/contact.html');
      ok(await page.$('.map iframe'), '[live] map embed shown when address set');
      ok(await page.$('a[href^="sms:"]'), '[live] text-message link shown');

      // Endpoint success
      let posted = null;
      await page.route('https://forms.example.test/**', (route) => { posted = route.request().postData(); route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }); });
      await fillForm(page);
      await page.click('[data-submit]');
      await page.waitForSelector('[data-form-success]:not([hidden])');
      ok(posted && posted.includes('Jane Doe'), '[live] form POSTs to the endpoint');
      ok(/has been sent/.test(await page.textContent('[data-form-success]')), '[live] success message after real send');
      // Endpoint failure
      await page.click('[data-form-reset]');
      await page.unroute('https://forms.example.test/**');
      await page.route('https://forms.example.test/**', (route) => route.fulfill({ status: 500, body: 'err' }));
      await fillForm(page);
      await page.click('[data-submit]');
      await page.waitForSelector('[data-form-error]:not([hidden])');
      const err = await page.textContent('[data-form-error]');
      ok(/could not send/.test(err) && err.includes('(713) 555-0100'), '[live] error state offers direct contact');
      ok(await page.isEnabled('[data-submit]'), '[live] submit button re-enabled after error');
      await page.close();
    }

    // ---- Email-only fixture: mailto fallback ----
    {
      const page = await browser.newPage();
      await page.goto(url('email') + '/contact.html');
      await page.evaluate(() => { window.__nav = null; });
      await fillForm(page);
      // Capture mailto navigation instead of leaving the page.
      await page.route('mailto:*', (r) => r.abort());
      await page.click('[data-submit]');
      await page.waitForSelector('[data-form-success]:not([hidden])');
      const t = await page.textContent('[data-form-success]');
      ok(/email app/.test(t) && /press send/.test(t), '[email] success explains the email still has to be sent');
      ok(await page.$('[data-form-success] textarea'), '[email] copy-able fallback provided');
      await page.close();
    }
  } finally {
    await browser.close();
    servers.forEach((s) => s.kill());
    fs.rmSync(TMP, { recursive: true, force: true });
  }

  console.log(`\n${passes} passed, ${failures} failed`);
  process.exit(failures ? 1 : 0);
})();
