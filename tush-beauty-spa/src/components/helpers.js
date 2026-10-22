/** Small shared helpers used by every component. */

const esc = (v) =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

// Values wrapped in [square brackets] are preview placeholders: shown as text, never linked.
const isPlaceholder = (v) => typeof v === 'string' && v.trim().startsWith('[');
const has = (v) => v !== null && v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0);
const real = (v) => has(v) && !isPlaceholder(v);

const digits = (phone) => String(phone || '').replace(/[^\d+]/g, '');
function telHref(phone) {
  let d = digits(phone).replace(/^\+/, '');
  if (d.length === 10) d = '1' + d; // US numbers
  return `tel:+${d}`;
}
const smsHref = (phone, body) => `sms:${telHref(phone).slice(4)}${body ? `?&body=${encodeURIComponent(body)}` : ''}`;
const instagramUrl = (handle) => `https://www.instagram.com/${String(handle).replace(/^@/, '')}/`;
const instagramDm = (handle) => `https://ig.me/m/${String(handle).replace(/^@/, '')}`;
const mapsLink = (address) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
const mapsEmbed = (address) => `https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed`;

/** Where "Book" buttons go: the external booking platform if set, otherwise the enquiry form. */
function booking(ctx) {
  const url = ctx.config.booking.externalUrl;
  if (real(url)) return { href: url, attrs: ' target="_blank" rel="noopener"', external: true };
  return { href: 'contact.html#booking', attrs: '', external: false };
}

/**
 * An image slot: real photo if one is configured, otherwise a line-art panel.
 * In the preview build, art panels carry a small label saying what photo belongs there.
 */
function picture(ctx, img, { className = '', tone = 'ivory', eager = false, sizes } = {}) {
  const loading = eager ? 'eager" fetchpriority="high' : 'lazy';
  if (img && real(img.src)) {
    return `<figure class="photo ${className}"><img src="${esc(img.src)}" alt="${esc(img.alt)}" loading="${loading}" decoding="async"${sizes ? ` sizes="${sizes}"` : ''}></figure>`;
  }
  const motif = (img && img.art) || 'arch';
  const label = ctx.preview && img && img.caption ? `<figcaption class="photo-todo">${esc(img.caption)}</figcaption>` : '';
  return `<figure class="photo photo--art ${className}"><img src="assets/art/${motif}-${tone}.svg" alt="" loading="${loading}" decoding="async">${label}</figure>`;
}

const icon = require('./icons');

module.exports = { esc, has, real, isPlaceholder, telHref, smsHref, instagramUrl, instagramDm, mapsLink, mapsEmbed, booking, picture, icon };
