const { esc, real, isPlaceholder, telHref, instagramUrl, mapsLink, booking, icon } = require('./helpers');
const { NAV } = require('./navbar');

/** A contact value: linked when real, plain text when a preview placeholder, omitted when missing. */
function contactLine(value, href, iconName, extra = '') {
  if (!value) return '';
  const inner = `${icon(iconName)}<span>${esc(value)}</span>`;
  if (isPlaceholder(value)) return `<li class="is-placeholder">${inner}</li>`;
  return `<li><a href="${href}"${extra}>${inner}</a></li>`;
}

function HoursList(ctx, cls = 'hours') {
  const { hours, hoursNote } = ctx.config;
  if (!hours || !hours.length) {
    return `<p class="muted">Opening hours will be published here soon.${hoursNote ? ` ${esc(hoursNote)}.` : ''}</p>`;
  }
  return `<dl class="${cls}">${hours
    .map((h) => `<div><dt>${esc(h.days)}</dt><dd>${esc(h.hours)}</dd></div>`)
    .join('')}</dl>${hoursNote ? `<p class="muted small">${esc(hoursNote)}</p>` : ''}`;
}

function Footer(ctx) {
  const c = ctx.config.contact;
  const b = booking(ctx);
  const lines = [
    contactLine(c.phone, real(c.phone) ? telHref(c.phone) : '', 'phone', ' data-track="call_footer"'),
    contactLine(c.email, `mailto:${c.email}`, 'mail', ' data-track="email_footer"'),
    contactLine(c.address, real(c.address) ? mapsLink(c.address) : '', 'pin', ' target="_blank" rel="noopener"'),
    contactLine(c.instagram ? (isPlaceholder(c.instagram) ? c.instagram : '@' + c.instagram) : null, real(c.instagram) ? instagramUrl(c.instagram) : '', 'instagram', ' target="_blank" rel="noopener" data-track="instagram_footer"'),
  ].join('');

  return `<footer class="site-footer">
  <div class="container footer-grid">
    <div class="footer-brand">
      <a class="logo logo--light" href="index.html"><span class="logo-word">Tush</span><span class="logo-sub">Beauty Spa</span></a>
      <p>A personal approach to beauty and self-care in ${esc(ctx.config.city)}, ${esc(ctx.config.regionName)}.</p>
      <a class="btn btn-gold" href="${b.href}"${b.attrs} data-track="book_footer">Book an Appointment</a>
    </div>
    <div>
      <h2 class="footer-title">Visit &amp; contact</h2>
      ${lines ? `<ul class="footer-contact">${lines}</ul>` : `<p class="muted">Contact details coming soon.</p>`}
    </div>
    <div>
      <h2 class="footer-title">Hours</h2>
      ${HoursList(ctx, 'hours hours--footer')}
    </div>
    <div>
      <h2 class="footer-title">Explore</h2>
      <ul class="footer-nav">
        ${NAV.map((n) => `<li><a href="${n.href}">${n.label}</a></li>`).join('')}
        ${real(ctx.config.googleBusinessUrl) ? `<li><a href="${esc(ctx.config.googleBusinessUrl)}" target="_blank" rel="noopener">Google reviews</a></li>` : ''}
      </ul>
    </div>
  </div>
  <div class="container footer-base">
    <p>&copy; ${new Date().getFullYear()} ${esc(ctx.config.name)}, ${esc(ctx.config.city)}, ${esc(ctx.config.region)}</p>
    <a href="#top" class="to-top">Back to top</a>
  </div>
</footer>`;
}

module.exports = { Footer, HoursList, contactLine };
