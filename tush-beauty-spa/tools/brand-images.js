#!/usr/bin/env node
/**
 * One-off generator for favicon PNGs and the social share image (og-image.jpg),
 * rendered with the site's own fonts. Output goes to src/static/assets/.
 * Requires Playwright (dev-only): NODE_PATH=$(npm root -g) node tools/brand-images.js
 */
const path = require('path');
const fs = require('fs');
const os = require('os');
const { chromium } = require('playwright');

// Pages are loaded from a temp file so file:// font URLs are allowed.
async function render(page, html) {
  const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'brand-')), 'p.html');
  fs.writeFileSync(f, html);
  await page.goto('file://' + f);
  await page.evaluate(() => document.fonts.ready);
}

const OUT = path.join(__dirname, '../src/static/assets');
const fonts = path.join(OUT, 'fonts');
const face = (w, s = 'normal') => `@font-face{font-family:C;font-weight:${w};font-style:${s};src:url('file://${fonts}/cormorant-garamond-latin-${w}-${s}.woff2')}`;
const css = `${face(500)}${face(500, 'italic')}@font-face{font-family:J;font-weight:400;src:url('file://${fonts}/jost-latin-400-normal.woff2')}*{margin:0}body{background:transparent}`;

const icon = (size) => `<html><head><style>${css}
div{width:${size}px;height:${size}px;display:grid;place-items:center;background:#2a211b;border-radius:${size * 0.18}px;color:#e3cfab;font:500 ${size * 0.72}px/1 C;padding-bottom:${size * 0.06}px;box-sizing:border-box}</style></head><body><div>T</div></body></html>`;

const og = `<html><head><style>${css}
body{width:1200px;height:630px;background:linear-gradient(160deg,#faf6ef,#ebe2d4);display:grid;place-items:center;font-family:J;color:#2a211b;position:relative;overflow:hidden}
.arch{position:absolute;right:64px;bottom:0;width:250px;height:440px;border:1.5px solid #b8976a;border-bottom:0;border-radius:125px 125px 0 0}
.arch2{position:absolute;right:89px;bottom:0;width:200px;height:400px;border:1px solid #d9c39f;border-bottom:0;border-radius:100px 100px 0 0}
.wrap{position:absolute;left:96px;top:0;bottom:0;display:flex;flex-direction:column;justify-content:center}
.k{font-size:20px;letter-spacing:.36em;text-transform:uppercase;color:#7f6237;margin-bottom:28px}
h1{font:500 92px/1 C;margin-bottom:28px}
h2{font:500 italic 44px/1.15 C;color:#7f6237}
p{margin-top:36px;font-size:22px;letter-spacing:.14em;text-transform:uppercase;color:#5d5148}</style></head>
<body><div class="arch"></div><div class="arch2"></div><div class="wrap"><div class="k">Houston, Texas</div><h1>Tush Beauty Spa</h1><h2>Your Beauty. Your Ritual. Your Moment.</h2><p>Beauty &amp; self-care</p></div></body></html>`;

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
  const page = await browser.newPage();
  for (const [name, size] of [['favicon-32.png', 32], ['apple-touch-icon.png', 180], ['icon-192.png', 192], ['icon-512.png', 512]]) {
    await page.setViewportSize({ width: size, height: size });
    await render(page, icon(size));
    await page.screenshot({ path: path.join(OUT, name), omitBackground: name !== 'apple-touch-icon.png' });
  }
  await page.setViewportSize({ width: 1200, height: 630 });
  await render(page, og);
  await page.screenshot({ path: path.join(OUT, 'og-image.jpg'), type: 'jpeg', quality: 88 });
  await browser.close();
  console.log('Brand images written to', path.relative(process.cwd(), OUT));
})();
