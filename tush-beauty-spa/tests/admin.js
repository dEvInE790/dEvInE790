#!/usr/bin/env node
/**
 * Admin panel tests. Runs against a temporary COPY of the project, so real
 * content in src/data/ is never touched.
 *   NODE_PATH=$(npm root -g) node tests/admin.js
 */
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const PORT = 4987;
const BASE = `http://localhost:${PORT}`;
const PASSWORD = 'correct horse battery staple';
let passes = 0, failures = 0;
const ok = (c, m) => { if (c) passes++; else { failures++; console.log('  ✗ ' + m); } };

function copyProject() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tush-admin-'));
  for (const f of ['admin', 'src', 'build.js', 'package.json']) fs.cpSync(path.join(ROOT, f), path.join(dir, f), { recursive: true });
  return dir;
}
function makeImages(dir) {
  // Tiny valid images generated in the browser later; a fake one for rejection tests.
  fs.writeFileSync(path.join(dir, 'not-an-image.jpg'), 'hello');
}

(async () => {
  const dir = copyProject();
  makeImages(dir);
  const server = spawn(process.execPath, ['admin/server.js'], { cwd: dir, env: { ...process.env, ADMIN_PORT: String(PORT), ADMIN_PASSWORD: PASSWORD }, stdio: 'ignore' });
  await new Promise((r) => setTimeout(r, 2500)); // first build runs at startup
  const browser = await chromium.launch();

  try {
    // ---------- HTTP-level security ----------
    const raw = async (p, opts = {}) => fetch(BASE + p, opts);
    ok((await raw('/api/state')).status === 403, 'API without token is refused');
    ok((await raw('/api/state', { headers: { 'X-Admin-Token': 'wrong' } })).status === 403, 'API with wrong token is refused');
    const hostStatus = await new Promise((res) => require('http').get({ host: '127.0.0.1', port: PORT, path: '/admin/', headers: { Host: 'evil.example' } }, (r) => { r.resume(); res(r.statusCode); }));
    ok(hostStatus === 403, 'foreign Host header is refused (DNS rebinding)');
    const html = await (await raw('/admin/')).text();
    const token = html.match(/name="admin-token" content="([a-f0-9]+)"/)[1];
    const H = { 'X-Admin-Token': token, 'Content-Type': 'application/json' };
    ok((await raw('/api/state', { headers: H })).status === 401, 'state requires sign-in when a password is set');
    ok((await raw('/site/index.html')).status === 401, 'built site preview requires sign-in');
    ok((await raw('/api/login', { method: 'POST', headers: H, body: JSON.stringify({ password: 'nope' }) })).status === 401, 'wrong password rejected');
    const login = await raw('/api/login', { method: 'POST', headers: H, body: JSON.stringify({ password: PASSWORD }) });
    const cookie = (login.headers.get('set-cookie') || '').split(';')[0];
    ok(login.status === 200 && /HttpOnly/.test(login.headers.get('set-cookie')) && /SameSite=Strict/.test(login.headers.get('set-cookie')), 'login sets HttpOnly SameSite cookie');
    const A = { ...H, Cookie: cookie };
    const state = await (await raw('/api/state', { headers: A })).json();
    ok(state.data && state.checklist.length > 5, 'state returns data and checklist');

    // ---------- Validation ----------
    const put = (name, value) => raw('/api/data/' + name, { method: 'PUT', headers: A, body: JSON.stringify({ value }) });
    let r = await put('site', { ...state.data.site, contact: { ...state.data.site.contact, email: 'bad', phone: '12' }, siteUrl: 'http://insecure.test' });
    let j = await r.json();
    ok(r.status === 422 && ['contact.email', 'contact.phone', 'siteUrl'].every((p) => j.errors.some((e) => e.path === p)), 'invalid details rejected with field paths');
    r = await put('testimonials', [{ quote: 'Lovely', author: 'A.', source: null, consent: false }]);
    ok(r.status === 422, 'review without client consent is rejected');
    r = await put('gallery', { filters: state.data.gallery.filters, items: [{ src: 'img/gallery/../../../build.js', alt: 'x', permission: true }] });
    ok(r.status === 422, 'gallery path traversal rejected');
    r = await put('services', [{ id: 'a', name: 'A', services: [{ id: 'x', name: 'X', description: 'd' }, { id: 'x', name: 'Y', description: 'd' }] }]);
    j = await r.json();
    ok(r.status === 422 && j.errors.some((e) => /used twice/.test(e.message)), 'duplicate service IDs rejected');
    ok(JSON.parse(fs.readFileSync(path.join(dir, 'src/data/testimonials.json'), 'utf8')).length === 0, 'nothing written when validation fails');

    // ---------- Uploads ----------
    const up = (body) => raw('/api/upload', { method: 'POST', headers: A, body: JSON.stringify(body) });
    ok((await up({ folder: 'gallery', name: 'x.jpg', data: Buffer.from('hello').toString('base64') })).status === 415, 'non-image upload rejected');
    ok((await up({ folder: '../../', name: 'x.jpg', data: 'AAAA' })).status === 400, 'upload folder must be whitelisted');
    ok((await raw('/api/delete-image', { method: 'POST', headers: A, body: JSON.stringify({ src: 'img/../build.js' }) })).status === 400, 'delete outside img/ refused');

    // ---------- UI flow ----------
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('dialog', (d) => d.accept());
    await page.goto(BASE + '/admin/');
    await page.fill('#pw', 'wrong');
    await page.click('button[type=submit]');
    await page.waitForSelector('.login .err:not(:empty)');
    ok(true, 'UI shows wrong-password error');
    await page.fill('#pw', PASSWORD);
    await page.click('button[type=submit]');
    await page.waitForSelector('.checklist');
    ok(await page.isVisible('text=Visitors cannot send booking requests yet'), 'dashboard explains no booking channel yet');

    // Details
    await page.click('[data-tab="details"]');
    ok(await page.isDisabled('[data-save]'), 'save disabled with no changes');
    await page.fill('[data-path="site:contact.phone"] input', '123');
    ok(await page.isEnabled('[data-save]'), 'save enabled after edit');
    ok(await page.isVisible('.nav-badge.dirty'), 'nav shows unsaved marker');
    await page.click('[data-save]');
    await page.waitForSelector('[data-error-summary]');
    ok((await page.getAttribute('[data-path="site:contact.phone"] input', 'aria-invalid')) === 'true', 'invalid field marked aria-invalid');
    await page.fill('[data-path="site:contact.phone"] input', '(713) 555-0100');
    await page.check('[data-path="site:contact.phoneAcceptsTexts"] input');
    await page.fill('[data-path="site:booking.formEndpoint"] input', 'https://forms.example.test/f/abc');
    await page.fill('[data-path="site:contact.addressParts.street"] input', '100 Example St');
    await page.fill('[data-path="site:contact.addressParts.city"] input', 'Houston');
    await page.fill('[data-path="site:contact.addressParts.region"] input', 'TX');
    await page.fill('[data-path="site:contact.addressParts.postalCode"] input', '77002');
    await page.click('text=+ Add row');
    await page.fill('[data-path="site:hours.0.days"] input', 'Tuesday – Saturday');
    await page.fill('[data-path="site:hours.0.hours"] input', '10:00 am – 6:00 pm');
    await page.click('[data-save]');
    await page.waitForSelector('text=All changes saved');
    const site = JSON.parse(fs.readFileSync(path.join(dir, 'src/data/site.json'), 'utf8'));
    ok(site.contact.phone === '(713) 555-0100' && site.contact.address === '100 Example St, Houston, TX 77002' && site.hours.length === 1 && !site.hours[0].schema, 'details saved and normalised');
    const dist = fs.readFileSync(path.join(dir, 'dist/contact.html'), 'utf8');
    ok(dist.includes('tel:+17135550100') && dist.includes('id="booking-form"') && dist.includes('output=embed'), 'site rebuilt with phone, form and map');

    // Discard
    await page.fill('[data-path="site:contact.email"] input', 'temp@example.test');
    await page.click('[data-discard]');
    ok((await page.inputValue('[data-path="site:contact.email"] input')) === '', 'discard restores saved values');

    // Services with a photo generated in the browser
    const png = await page.evaluate(async () => {
      const c = document.createElement('canvas'); c.width = 900; c.height = 600;
      const x = c.getContext('2d'); x.fillStyle = '#d9c39f'; x.fillRect(0, 0, 900, 600);
      return c.toDataURL('image/png').split(',')[1];
    });
    const imgFile = path.join(dir, 'photo.png');
    fs.writeFileSync(imgFile, Buffer.from(png, 'base64'));
    await page.click('[data-tab="services"]');
    await page.click('text=+ Add category');
    await page.fill('[data-path="services:0.name"] input', 'Signature Treatments');
    await page.click('text=+ Add service');
    await page.fill('[data-path="services:0.services.0.name"] input', 'Test Ritual');
    await page.fill('[data-path="services:0.services.0.description"] textarea', 'A short description.');
    await page.setInputFiles('[data-path="services:0.services.0.image"] input[type=file]', imgFile);
    await page.waitForSelector('[data-path="services:0.services.0.imageAlt"] input');
    await page.fill('[data-path="services:0.services.0.imageAlt"] input', 'Test photo');
    await page.click('[data-save]');
    await page.waitForSelector('text=All changes saved');
    const services = JSON.parse(fs.readFileSync(path.join(dir, 'src/data/services.json'), 'utf8'));
    ok(services[0].id === 'signature-treatments' && services[0].services[0].id === 'test-ritual', 'IDs generated from names');
    const svcImg = services[0].services[0].image;
    ok(/^img\/services\/photo-[a-f0-9]{6}\.jpg$/.test(svcImg) && fs.existsSync(path.join(dir, 'src/static', svcImg)), 'service photo uploaded (converted to JPEG)');
    ok(fs.existsSync(path.join(dir, 'dist', svcImg)), 'service photo copied into the built site');

    // Replacing the photo deletes the old file after save
    await page.setInputFiles('[data-path="services:0.services.0.image"] input[type=file]', imgFile);
    await page.waitForFunction((old) => !document.querySelector('[data-path="services:0.services.0.image"] img').src.endsWith(old.slice(4)), svcImg);
    await page.click('[data-save]');
    await page.waitForSelector('text=All changes saved');
    await page.waitForTimeout(300);
    ok(!fs.existsSync(path.join(dir, 'src/static', svcImg)), 'replaced photo is cleaned up');
    ok((await raw('/api/delete-image', { method: 'POST', headers: A, body: JSON.stringify({ src: JSON.parse(fs.readFileSync(path.join(dir, 'src/data/services.json'), 'utf8'))[0].services[0].image }) })).status === 409, 'photo still in use cannot be deleted');

    // Gallery: needs permission
    await page.click('[data-tab="gallery"]');
    await page.setInputFiles('.page-head input[type=file]', imgFile);
    await page.waitForSelector('.gallery-admin .item');
    await page.fill('[data-path="gallery:items.0.alt"] input', 'Reception area');
    await page.click('[data-save]');
    await page.waitForSelector('[data-error-summary]');
    ok(await page.isVisible('text=Confirm this is the spa’s own photo'), 'gallery save blocked until permission confirmed');
    await page.check('[data-path="gallery:items.0.permission"] input');
    await page.click('[data-save]');
    await page.waitForSelector('text=All changes saved');
    ok(fs.readFileSync(path.join(dir, 'dist/gallery.html'), 'utf8').includes('Reception area'), 'gallery photo published');

    // Reviews
    await page.click('[data-tab="reviews"]');
    await page.click('text=+ Add review');
    await page.fill('[data-path="testimonials:0.quote"] textarea', 'Exact words.');
    await page.fill('[data-path="testimonials:0.author"] input', 'A. M.');
    await page.check('[data-path="testimonials:0.consent"] input');
    await page.click('[data-save]');
    await page.waitForSelector('text=All changes saved');
    ok(fs.readFileSync(path.join(dir, 'dist/index.html'), 'utf8').includes('Exact words.'), 'review published on homepage');

    // Website text
    await page.click('[data-tab="text"]');
    await page.fill('[data-path="copy:bookingCta.title"] input', 'Time for you');
    await page.click('[data-save]');
    await page.waitForSelector('text=All changes saved');
    ok(fs.readFileSync(path.join(dir, 'dist/index.html'), 'utf8').includes('Time for you'), 'website text updated');
    await page.fill('[data-path="copy:bookingCta.title"] input', '');
    await page.click('[data-save]');
    await page.waitForSelector('[data-error-summary]');
    ok(true, 'required website text cannot be emptied');
    await page.click('[data-discard]');

    // Dashboard reflects progress; mobile has no overflow
    await page.click('[data-tab="dashboard"]');
    await page.waitForSelector('.checklist');
    ok(await page.isVisible('text=Booking requests from the website form are sent to your form service'), 'dashboard shows form-service booking route');
    const done = await page.$$eval('.checklist li.done', (l) => l.length);
    ok(done >= 6, `checklist progress updated (${done} done)`);
    await page.setViewportSize({ width: 390, height: 844 });
    for (const t of ['dashboard', 'details', 'services', 'gallery', 'reviews', 'photos', 'text']) {
      await page.click(`[data-tab="${t}"]`);
      ok((await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 1, `no horizontal scroll on mobile: ${t}`);
    }
    ok(errors.length === 0, 'no page errors: ' + errors.join(' | '));
    await page.close();
  } finally {
    await browser.close();
    server.kill();
    fs.rmSync(dir, { recursive: true, force: true });
  }
  console.log(`\nAdmin: ${passes} passed, ${failures} failed`);
  process.exit(failures ? 1 : 0);
})();
