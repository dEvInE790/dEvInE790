#!/usr/bin/env node
/**
 * Zero-dependency static site build.
 *
 *   node build.js            → dist/     production site (real, owner-verified content only)
 *   node build.js --preview  → preview/  design preview with labelled sample placeholders
 *   node build.js --check    → list business details that still need the owner's input
 */
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SRC = path.join(ROOT, 'src');
const args = process.argv.slice(2);
const PREVIEW = args.includes('--preview');
const CHECK_ONLY = args.includes('--check');
const outArg = args.indexOf('--out');
const OUT = outArg > -1 ? path.resolve(args[outArg + 1]) : path.join(ROOT, PREVIEW ? 'preview' : 'dist');
// Test-only: a JSON file deep-merged over site.config.js (used by tests/e2e.js).
const OVERRIDE = process.env.TUSH_CONFIG_OVERRIDE;

const { Layout } = require('./src/components/layout');
const { artSvg, MOTIFS, TONES } = require('./src/components/art');
const { real } = require('./src/components/helpers');
const pages = require('./src/pages/pages');

function deepMerge(base, extra) {
  if (!extra || typeof extra !== 'object' || Array.isArray(extra)) return extra === undefined ? base : extra;
  const out = { ...base };
  for (const k of Object.keys(extra)) out[k] = base && typeof base[k] === 'object' && !Array.isArray(base[k]) && base[k] !== null ? deepMerge(base[k], extra[k]) : extra[k];
  return out;
}

function loadContext() {
  const ctx = {
    preview: PREVIEW,
    config: require('./src/site.config'),
    services: require('./src/content/services'),
    gallery: require('./src/content/gallery'),
    testimonials: require('./src/content/testimonials'),
    images: require('./src/content/images'),
    copy: require('./src/content/copy'),
  };
  if (PREVIEW) {
    const sample = require('./src/content/preview-sample');
    ctx.config = deepMerge(ctx.config, sample.config);
    ctx.services = sample.services;
    ctx.gallery = { ...ctx.gallery, items: sample.gallery.items };
    ctx.testimonials = sample.testimonials;
  }
  if (OVERRIDE) ctx.config = deepMerge(ctx.config, JSON.parse(fs.readFileSync(OVERRIDE, 'utf8')));
  return ctx;
}

/** Owner checklist: every business detail that is still missing. */
function missing(ctx) {
  const c = ctx.config;
  const list = [];
  const need = (cond, msg) => cond || list.push(msg);
  need(real(c.siteUrl), 'site.config.js → siteUrl (live domain; enables canonical URLs + sitemap.xml)');
  need(real(c.contact.phone), 'site.config.js → contact.phone');
  need(real(c.contact.email), 'site.config.js → contact.email');
  need(real(c.contact.instagram), 'site.config.js → contact.instagram (handle)');
  need(real(c.contact.address), 'site.config.js → contact.address (+ addressParts) — enables the map');
  need(c.hours && c.hours.length, 'site.config.js → hours');
  need(real(c.booking.externalUrl) || real(c.booking.formEndpoint), 'site.config.js → booking.externalUrl (booking platform) or booking.formEndpoint (form service)');
  need(ctx.services.length, 'src/content/services.js → verified services (names, descriptions, prices, durations, photos)');
  need(ctx.gallery.items.length, 'src/content/gallery.js → the spa’s own approved photos');
  need(ctx.testimonials.length, 'src/content/testimonials.js → real, approved client reviews (section hidden until then)');
  for (const [slot, img] of Object.entries(ctx.images)) need(real(img.src), `src/content/images.js → ${slot} photo`);
  return list;
}

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const e of fs.readdirSync(from, { withFileTypes: true })) {
    if (e.name === '.gitkeep') continue;
    const a = path.join(from, e.name), b = path.join(to, e.name);
    e.isDirectory() ? copyDir(a, b) : fs.copyFileSync(a, b);
  }
}

function build() {
  const ctx = loadContext();
  const todo = missing(ctx);

  if (CHECK_ONLY) {
    console.log(todo.length ? `Still needs the owner's input (${todo.length}):\n  - ${todo.join('\n  - ')}` : 'All business details are filled in.');
    return;
  }

  fs.rmSync(OUT, { recursive: true, force: true });
  copyDir(path.join(SRC, 'static'), OUT);

  // Line-art panels used for image slots without a photo yet.
  fs.mkdirSync(path.join(OUT, 'assets/art'), { recursive: true });
  for (const m of MOTIFS) for (const t of TONES) fs.writeFileSync(path.join(OUT, `assets/art/${m}-${t}.svg`), artSvg(m, t));

  const written = [];
  for (const def of pages) {
    ctx.page = def.name === 'notFound' ? 'none' : def.name;
    const p = def(ctx);
    fs.writeFileSync(path.join(OUT, p.path), Layout(ctx, p));
    written.push(p.path);
  }

  const c = ctx.config;
  fs.writeFileSync(
    path.join(OUT, 'site.webmanifest'),
    JSON.stringify({ name: c.name, short_name: c.shortName, start_url: 'index.html', display: 'browser', background_color: '#f7f2ea', theme_color: '#f7f2ea', icons: [{ src: 'assets/icon-192.png', sizes: '192x192', type: 'image/png' }, { src: 'assets/icon-512.png', sizes: '512x512', type: 'image/png' }] }, null, 2)
  );

  if (PREVIEW) {
    fs.writeFileSync(path.join(OUT, 'robots.txt'), 'User-agent: *\nDisallow: /\n');
  } else if (real(c.siteUrl)) {
    const urls = written.filter((p) => p !== '404.html').map((p) => `  <url><loc>${c.siteUrl}/${p === 'index.html' ? '' : p}</loc></url>`);
    fs.writeFileSync(path.join(OUT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`);
    fs.writeFileSync(path.join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${c.siteUrl}/sitemap.xml\n`);
  } else {
    fs.writeFileSync(path.join(OUT, 'robots.txt'), 'User-agent: *\nAllow: /\n');
  }

  console.log(`Built ${written.length} pages → ${path.relative(process.cwd(), OUT) || '.'}${PREVIEW ? ' (design preview with sample placeholders)' : ''}`);
  if (!PREVIEW && todo.length) console.log(`\n⚠ ${todo.length} business details still need the owner's input — run \`npm run check\` for the list.`);
}

build();
