#!/usr/bin/env node
/**
 * Tush Beauty Spa — local admin panel. Zero dependencies.
 *
 *   npm run admin                         → http://localhost:4000
 *   ADMIN_PORT=4100 npm run admin         → different port
 *   ADMIN_PASSWORD=… npm run admin        → require a password to sign in
 *
 * Edits src/data/*.json, stores uploaded photos in src/static/img/, and rebuilds
 * dist/ (live site) and preview/ after every save.
 *
 * Security: listens on 127.0.0.1 only (set ADMIN_HOST to change it, which then requires
 * ADMIN_PASSWORD). Every API call needs a per-run token that only the admin page can read,
 * and the Host header must be localhost, which blocks other websites (CSRF / DNS rebinding).
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFile } = require('child_process');
const { validators } = require('./validate');

const ROOT = path.join(__dirname, '..');
const DATA = path.join(ROOT, 'src/data');
const STATIC = path.join(ROOT, 'src/static');
const PUBLIC = path.join(__dirname, 'public');
const PORT = Number(process.env.ADMIN_PORT || 4000);
const HOST = process.env.ADMIN_HOST || '127.0.0.1';
const PASSWORD = process.env.ADMIN_PASSWORD || '';
const LOCAL = ['127.0.0.1', 'localhost', '::1'].includes(HOST);
const FILES = ['site', 'services', 'gallery', 'testimonials', 'images', 'copy'];
const UPLOAD_FOLDERS = ['services', 'gallery', 'photos'];
const MAX_UPLOAD = 12 * 1024 * 1024;

if (!LOCAL && !PASSWORD) {
  console.error('Refusing to listen on a network address without ADMIN_PASSWORD. Set ADMIN_PASSWORD or use the default (localhost only).');
  process.exit(1);
}

const TOKEN = crypto.randomBytes(24).toString('hex');
const sessions = new Set();

const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8', '.ico': 'image/x-icon' };

/* ---------------- data ---------------- */
const readData = (name) => JSON.parse(fs.readFileSync(path.join(DATA, `${name}.json`), 'utf8'));
function writeData(name, value) {
  const file = path.join(DATA, `${name}.json`);
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2) + '\n');
  fs.renameSync(tmp, file); // atomic: the file is never half-written
}
function allData() {
  return Object.fromEntries(FILES.map((n) => [n, readData(n)]));
}
function checklistNow() {
  // Fresh copies so the checklist reflects what is on disk right now.
  for (const k of Object.keys(require.cache)) if (k.startsWith(DATA) || k.includes(`${path.sep}src${path.sep}content${path.sep}`) || k.endsWith('site.config.js')) delete require.cache[k];
  const { checklist } = require('../src/checklist');
  const d = allData();
  return checklist({ config: d.site, services: d.services, gallery: d.gallery, testimonials: d.testimonials, images: d.images });
}

/* ---------------- build (serialised) ---------------- */
let lastBuild = { ok: null, at: null, output: 'Not built yet in this session.' };
let buildChain = Promise.resolve();
function runBuild() {
  const run = () =>
    new Promise((resolve) => {
      const started = Date.now();
      execFile(process.execPath, ['build.js'], { cwd: ROOT }, (e1, o1, err1) => {
        execFile(process.execPath, ['build.js', '--preview'], { cwd: ROOT }, (e2, o2, err2) => {
          lastBuild = { ok: !e1 && !e2, at: new Date().toISOString(), ms: Date.now() - started, output: [o1, err1, o2, err2].filter(Boolean).join('\n').trim() };
          resolve(lastBuild);
        });
      });
    });
  buildChain = buildChain.then(run, run);
  return buildChain;
}

/* ---------------- uploads ---------------- */
function sniff(buf) {
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buf.slice(0, 4).toString() === 'RIFF' && buf.slice(8, 12).toString() === 'WEBP') return 'webp';
  return null;
}
const slug = (s) => String(s || 'photo').toLowerCase().replace(/\.[a-z0-9]+$/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'photo';

function referencedImages() {
  const refs = new Set();
  const walk = (v) => {
    if (typeof v === 'string' && v.startsWith('img/')) refs.add(v);
    else if (v && typeof v === 'object') Object.values(v).forEach(walk);
  };
  walk(allData());
  return refs;
}

/* ---------------- http helpers ---------------- */
function send(res, status, body, headers = {}) {
  const isJson = typeof body !== 'string' && !Buffer.isBuffer(body);
  res.writeHead(status, {
    'Content-Type': isJson ? 'application/json; charset=utf-8' : headers['Content-Type'] || 'text/plain; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    ...headers,
  });
  res.end(isJson ? JSON.stringify(body) : body);
}
function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) { reject(Object.assign(new Error('Too large'), { status: 413 })); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')); } catch { reject(Object.assign(new Error('Invalid JSON'), { status: 400 })); }
    });
    req.on('error', reject);
  });
}
function serveFile(res, base, rel) {
  const file = path.normalize(path.join(base, rel));
  if (!file.startsWith(base + path.sep) && file !== base) return send(res, 403, 'Forbidden');
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) return send(res, 404, 'Not found');
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    fs.createReadStream(file).pipe(res);
  });
}
const cookies = (req) => Object.fromEntries((req.headers.cookie || '').split(';').map((c) => c.trim().split('=')).filter((p) => p[0]));
const signedIn = (req) => !PASSWORD || sessions.has(cookies(req).tush_admin);
const sameText = (a, b) => {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

/* ---------------- routes ---------------- */
async function api(req, res, route) {
  if (req.headers['x-admin-token'] !== TOKEN) return send(res, 403, { error: 'This page is out of date. Please reload the admin panel.' });

  if (route === 'login' && req.method === 'POST') {
    const { password } = await readBody(req, 4096);
    if (!PASSWORD || !sameText(password || '', PASSWORD)) {
      await new Promise((r) => setTimeout(r, 600)); // slow down guessing
      return send(res, 401, { error: 'Incorrect password.' });
    }
    const sid = crypto.randomBytes(24).toString('hex');
    sessions.add(sid);
    return send(res, 200, { ok: true }, { 'Set-Cookie': `tush_admin=${sid}; HttpOnly; SameSite=Strict; Path=/` });
  }
  if (!signedIn(req)) return send(res, 401, { error: 'Please sign in.', login: true });

  if (route === 'logout' && req.method === 'POST') {
    sessions.delete(cookies(req).tush_admin);
    return send(res, 200, { ok: true }, { 'Set-Cookie': 'tush_admin=; Max-Age=0; Path=/' });
  }
  if (route === 'state' && req.method === 'GET') {
    return send(res, 200, { data: allData(), checklist: checklistNow(), build: lastBuild, passwordProtected: !!PASSWORD });
  }
  const m = route.match(/^data\/([a-z]+)$/);
  if (m && req.method === 'PUT') {
    const name = m[1];
    if (!FILES.includes(name)) return send(res, 404, { error: 'Unknown section.' });
    const body = await readBody(req, 2 * 1024 * 1024);
    const { value, errors } = validators[name](body.value);
    if (errors.length) return send(res, 422, { error: 'Please fix the highlighted fields.', errors });
    writeData(name, value);
    const build = await runBuild();
    return send(res, 200, { ok: true, value, checklist: checklistNow(), build });
  }
  if (route === 'upload' && req.method === 'POST') {
    const body = await readBody(req, Math.ceil(MAX_UPLOAD * 1.4) + 4096);
    const folder = UPLOAD_FOLDERS.includes(body.folder) ? body.folder : null;
    if (!folder) return send(res, 400, { error: 'Unknown upload folder.' });
    const b64 = String(body.data || '').replace(/^data:[^,]+,/, '');
    const buf = Buffer.from(b64, 'base64');
    if (!buf.length || buf.length > MAX_UPLOAD) return send(res, 413, { error: 'Photos must be under 12 MB.' });
    const ext = sniff(buf);
    if (!ext) return send(res, 415, { error: 'Please upload a JPEG, PNG or WebP photo.' });
    const name = `${slug(body.name)}-${crypto.randomBytes(3).toString('hex')}${body.suffix === 'thumb' ? '-thumb' : ''}.${ext}`;
    fs.mkdirSync(path.join(STATIC, 'img', folder), { recursive: true });
    fs.writeFileSync(path.join(STATIC, 'img', folder, name), buf);
    return send(res, 200, { src: `img/${folder}/${name}`, bytes: buf.length });
  }
  if (route === 'delete-image' && req.method === 'POST') {
    const { src } = await readBody(req, 4096);
    if (typeof src !== 'string' || !/^img\/(services|gallery|photos)\/[a-z0-9-]+\.(jpg|png|webp)$/.test(src)) return send(res, 400, { error: 'Invalid photo.' });
    if (referencedImages().has(src)) return send(res, 409, { error: 'This photo is still used on the site. Save your changes first.' });
    fs.rmSync(path.join(STATIC, src), { force: true });
    return send(res, 200, { ok: true });
  }
  if (route === 'rebuild' && req.method === 'POST') {
    return send(res, 200, { build: await runBuild(), checklist: checklistNow() });
  }
  return send(res, 404, { error: 'Not found.' });
}

const server = http.createServer(async (req, res) => {
  try {
    // Only answer requests addressed to this machine (blocks DNS-rebinding attacks).
    const host = String(req.headers.host || '').replace(/:\d+$/, '').replace(/^\[|\]$/g, '');
    if (LOCAL && !['localhost', '127.0.0.1', '::1'].includes(host)) return send(res, 403, 'Forbidden host');

    const url = new URL(req.url, 'http://local');
    const p = decodeURIComponent(url.pathname);
    if (p.startsWith('/api/')) return await api(req, res, p.slice(5));
    if (p === '/' || p === '/admin') return send(res, 302, '', { Location: '/admin/' });
    if (p === '/admin/') {
      const html = fs.readFileSync(path.join(PUBLIC, 'index.html'), 'utf8').replace('__ADMIN_TOKEN__', TOKEN);
      return send(res, 200, html, { 'Content-Type': TYPES['.html'], 'Content-Security-Policy': "default-src 'self'; img-src 'self' data: blob:; style-src 'self'; script-src 'self'; frame-ancestors 'none'", 'X-Frame-Options': 'DENY' });
    }
    if (p.startsWith('/admin/fonts/')) return serveFile(res, path.join(STATIC, 'assets/fonts'), p.slice(13));
    if (p === '/admin/favicon.svg') return serveFile(res, path.join(STATIC, 'assets'), 'favicon.svg');
    if (p.startsWith('/admin/')) return serveFile(res, PUBLIC, p.slice(7));
    if (!signedIn(req)) return send(res, 401, 'Please sign in to the admin panel first.');
    if (p.startsWith('/media/')) return serveFile(res, path.join(STATIC, 'img'), p.slice(7));
    for (const [prefix, dir] of [['/site/', 'dist'], ['/preview/', 'preview']]) {
      if (p === prefix.slice(0, -1)) return send(res, 302, '', { Location: prefix });
      if (p.startsWith(prefix)) {
        let rel = p.slice(prefix.length) || 'index.html';
        if (rel.endsWith('/')) rel += 'index.html';
        return serveFile(res, path.join(ROOT, dir), rel);
      }
    }
    return send(res, 404, 'Not found');
  } catch (e) {
    send(res, e.status || 500, { error: e.status ? e.message : 'Something went wrong. Please try again.' });
    if (!e.status) console.error(e);
  }
});

server.listen(PORT, HOST, () => {
  console.log(`\n  Tush Beauty Spa admin → http://${HOST === '127.0.0.1' ? 'localhost' : HOST}:${PORT}/admin/`);
  console.log(PASSWORD ? '  Password protection: on' : '  Password protection: off (localhost only). Set ADMIN_PASSWORD to require one.');
  console.log('  Press Ctrl+C to stop.\n');
  runBuild();
});
