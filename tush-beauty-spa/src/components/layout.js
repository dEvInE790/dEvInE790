const { esc, real, telHref, booking, icon } = require('./helpers');
const { Navbar, AnnouncementBar } = require('./navbar');
const { Footer } = require('./footer');

/**
 * LocalBusiness structured data, built ONLY from fields the owner has filled in.
 * Unset fields (address, phone, hours…) are simply left out.
 */
function structuredData(ctx) {
  const c = ctx.config;
  const data = {
    '@context': 'https://schema.org',
    '@type': 'HealthAndBeautyBusiness',
    name: c.name,
    areaServed: { '@type': 'City', name: `${c.city}, ${c.region}` },
  };
  if (real(c.siteUrl)) {
    data.url = c.siteUrl + '/';
    data.image = c.siteUrl + '/assets/og-image.jpg';
  }
  if (real(c.contact.phone)) data.telephone = telHref(c.contact.phone).slice(4);
  if (real(c.contact.email)) data.email = c.contact.email;
  const a = c.contact.addressParts;
  if (a && real(a.street)) {
    data.address = { '@type': 'PostalAddress', streetAddress: a.street, addressLocality: a.city, addressRegion: a.region, postalCode: a.postalCode, addressCountry: 'US' };
  }
  const sameAs = [];
  if (real(c.contact.instagram)) sameAs.push(`https://www.instagram.com/${c.contact.instagram}/`);
  if (real(c.googleBusinessUrl)) sameAs.push(c.googleBusinessUrl);
  if (sameAs.length) data.sameAs = sameAs;
  const specs = (c.hours || []).filter((h) => h.schema).map((h) => ({
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: h.schema.days.map((d) => ({ Mo: 'Monday', Tu: 'Tuesday', We: 'Wednesday', Th: 'Thursday', Fr: 'Friday', Sa: 'Saturday', Su: 'Sunday' })[d]),
    opens: h.schema.opens,
    closes: h.schema.closes,
  }));
  if (specs.length) data.openingHoursSpecification = specs;
  return data;
}

function MobileBookBar(ctx) {
  const b = booking(ctx);
  const phone = ctx.config.contact.phone;
  const call = real(phone)
    ? `<a class="btn btn-ghost" href="${telHref(phone)}" data-track="call_mobile_bar">${icon('phone')}<span>Call</span></a>`
    : '';
  return `<div class="mobile-bar${call ? ' mobile-bar--two' : ''}" data-mobile-bar>
  ${call}<a class="btn btn-primary" href="${b.href}"${b.attrs} data-track="book_mobile_bar">${icon('calendar')}<span>Book an Appointment</span></a>
</div>`;
}

function Layout(ctx, { title, description, path, body, extraHead = '' }) {
  const c = ctx.config;
  const url = real(c.siteUrl) ? `${c.siteUrl}/${path === 'index.html' ? '' : path}` : null;
  const og = real(c.siteUrl) ? `${c.siteUrl}/assets/og-image.jpg` : 'assets/og-image.jpg';
  const fullTitle = title;
  return `<!DOCTYPE html>
<html lang="en-US">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(description)}">
${ctx.preview ? '<meta name="robots" content="noindex, nofollow">' : ''}
${url ? `<link rel="canonical" href="${esc(url)}">` : ''}
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(c.name)}">
<meta property="og:title" content="${esc(fullTitle)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${esc(og)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
${url ? `<meta property="og:url" content="${esc(url)}">` : ''}
<meta property="og:locale" content="en_US">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#f7f2ea">
<link rel="icon" href="assets/favicon.svg" type="image/svg+xml">
<link rel="icon" href="assets/favicon-32.png" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="assets/apple-touch-icon.png">
<link rel="manifest" href="site.webmanifest">
<link rel="preload" href="assets/fonts/cormorant-garamond-latin-500-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="assets/fonts/jost-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="assets/css/styles.css">
<script type="application/ld+json">${JSON.stringify(structuredData(ctx))}</script>
${extraHead}
</head>
<body data-page="${ctx.page}" id="top">
<a class="skip-link" href="#main">Skip to content</a>
${ctx.preview ? `<div class="preview-flag" role="note"><strong>Design preview</strong> Bracketed text and labelled image panels are placeholders for the owner's real details, photos and reviews. This is not the live site.</div>` : ''}
${AnnouncementBar(ctx)}
${Navbar(ctx)}
<main id="main">
${body}
</main>
${Footer(ctx)}
${MobileBookBar(ctx)}
<script src="assets/js/main.js" defer></script>
</body>
</html>
`;
}

module.exports = { Layout, structuredData };
