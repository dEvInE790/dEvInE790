/**
 * Page sections: Hero, ServiceCard, ServicesSection, AboutSection, WhyChooseUs,
 * BookingSteps, GalleryGrid, Testimonials, BookingSection, PageHeader.
 */
const { esc, real, booking, picture, icon, instagramUrl } = require('./helpers');

function PageHeader({ eyebrow, title, lead }) {
  return `<section class="page-header">
  <div class="container narrow">
    ${eyebrow ? `<p class="eyebrow">${esc(eyebrow)}</p>` : ''}
    <h1>${esc(title)}</h1>
    ${lead ? `<p class="lead">${esc(lead)}</p>` : ''}
  </div>
</section>`;
}

function Hero(ctx) {
  const h = ctx.copy.hero;
  const b = booking(ctx);
  return `<section class="hero">
  <div class="container hero-grid">
    <div class="hero-copy">
      <p class="eyebrow">${esc(h.eyebrow)}</p>
      <h1 class="hero-title">${h.title.split('. ').map((s, i, a) => `<span>${esc(s)}${i < a.length - 1 ? '.' : ''}</span>`).join(' ')}</h1>
      <p class="lead">${esc(h.lead)}</p>
      <div class="actions">
        <a class="btn btn-primary btn-lg" href="${b.href}"${b.attrs} data-track="book_hero">Book Your Appointment</a>
        <a class="btn btn-outline btn-lg" href="services.html">Explore Our Services</a>
      </div>
    </div>
    <div class="hero-media">
      ${picture(ctx, ctx.images.hero, { className: 'hero-main', tone: 'sand', eager: true })}
      ${picture(ctx, ctx.images.heroDetail, { className: 'hero-detail', tone: 'ivory' })}
    </div>
  </div>
</section>`;
}

function ServiceCard(ctx, s, { headingLevel = 3 } = {}) {
  const b = booking(ctx);
  const h = `h${headingLevel}`;
  const meta = [s.duration && `<span>${icon('clock')}${esc(s.duration)}</span>`, s.price && `<span class="price">${esc(s.price)}</span>`]
    .filter(Boolean)
    .join('');
  const bookHref = b.external ? b.href : `contact.html?service=${encodeURIComponent(s.id)}#booking`;
  const img = s.image ? { src: s.image, alt: s.imageAlt || s.name } : { art: s.art || 'sprig', caption: ctx.preview ? 'Service photo' : '' };
  return `<article class="service-card" id="${esc(s.id)}">
  ${picture(ctx, img, { className: 'service-media', tone: s.tone || 'ivory' })}
  <div class="service-body">
    <${h} class="service-name">${esc(s.name)}</${h}>
    <p>${esc(s.description)}</p>
    ${meta ? `<p class="service-meta">${meta}</p>` : ''}
    <a class="link-arrow" href="${bookHref}"${b.attrs} aria-label="Book ${esc(s.name)}" data-track="book_service">Book this service ${icon('arrow')}</a>
  </div>
</article>`;
}

function emptyServices(ctx) {
  return `<div class="notice-panel">
  <p class="eyebrow">Service menu</p>
  <p class="notice-title">Our full treatment menu is coming to the website soon.</p>
  <p>In the meantime, tell us what you are looking for and we will be happy to help.</p>
  <a class="btn btn-outline" href="contact.html#booking">Ask about a treatment</a>
</div>`;
}

/** Homepage preview: featured services (or the first few). */
function ServicesPreview(ctx) {
  const all = ctx.services.flatMap((c) => c.services);
  const featured = (all.filter((s) => s.featured).length ? all.filter((s) => s.featured) : all).slice(0, 3);
  return `<section class="section" aria-labelledby="services-title">
  <div class="container">
    <div class="section-head split">
      <div>
        <p class="eyebrow">Services</p>
        <h2 id="services-title">Treatments shaped around you</h2>
      </div>
      ${featured.length ? `<a class="link-arrow" href="services.html">View all services ${icon('arrow')}</a>` : ''}
    </div>
    ${featured.length ? `<div class="service-grid">${featured.map((s) => ServiceCard(ctx, s)).join('')}</div>` : emptyServices(ctx)}
  </div>
</section>`;
}

/** Full services catalogue, grouped by category. */
function ServicesCatalogue(ctx) {
  if (!ctx.services.length) return `<section class="section"><div class="container">${emptyServices(ctx)}</div></section>`;
  const tabs = ctx.services.length > 1
    ? `<nav class="category-nav" aria-label="Service categories"><ul>${ctx.services.map((c) => `<li><a href="#cat-${esc(c.id)}">${esc(c.name)}</a></li>`).join('')}</ul></nav>`
    : '';
  return `${tabs}
${ctx.services
  .map(
    (c) => `<section class="section service-category" id="cat-${esc(c.id)}" aria-labelledby="cat-${esc(c.id)}-title">
  <div class="container">
    <div class="section-head">
      <h2 id="cat-${esc(c.id)}-title">${esc(c.name)}</h2>
      ${c.intro ? `<p class="lead">${esc(c.intro)}</p>` : ''}
    </div>
    <div class="service-grid">${c.services.map((s) => ServiceCard(ctx, s)).join('')}</div>
  </div>
</section>`
  )
  .join('\n')}`;
}

function AboutSection(ctx) {
  const a = ctx.copy.aboutPreview;
  return `<section class="section section--sand" aria-labelledby="about-title">
  <div class="container about-grid">
    <div class="about-media">
      ${picture(ctx, ctx.images.about, { className: 'about-main', tone: 'ivory' })}
    </div>
    <div class="about-copy">
      <p class="eyebrow">${esc(a.eyebrow)}</p>
      <h2 id="about-title">${esc(a.title)}</h2>
      ${a.body.map((p) => `<p>${esc(p)}</p>`).join('')}
      <a class="link-arrow" href="about.html">Our approach ${icon('arrow')}</a>
    </div>
  </div>
</section>`;
}

function WhyChooseUs(ctx) {
  const items = ctx.copy.why.map((w) =>
    w.icon === 'calendar' && booking(ctx).external
      ? { ...w, body: 'Choose a time that suits you online, in just a few clicks.' }
      : w
  );
  return `<section class="section" aria-labelledby="why-title">
  <div class="container">
    <div class="section-head center">
      <p class="eyebrow">Why clients choose us</p>
      <h2 id="why-title">Thoughtful care, from hello to goodbye</h2>
    </div>
    <ul class="why-grid">
      ${items.map((w) => `<li class="why-item">${icon(w.icon, 'icon icon-lg')}<h3>${esc(w.title)}</h3><p>${esc(w.body)}</p></li>`).join('')}
    </ul>
  </div>
</section>`;
}

function BookingSteps(ctx) {
  const ext = booking(ctx).external;
  const steps = ext
    ? [
        ['Choose your treatment', 'Browse the service menu and pick what you would like.'],
        ['Pick a time online', 'Select a date and time that suits you on our booking page.'],
        ['Relax, you are booked', 'You will receive a confirmation from the booking system.'],
      ]
    : [
        ['Choose your treatment', 'Browse the menu, or tell us what you have in mind if you are unsure.'],
        ['Send a request', 'Share your preferred date and time using the short booking form.'],
        ['We confirm personally', 'We will get back to you to confirm your appointment. Your time is not booked until we do.'],
      ];
  return `<section class="section section--ivory" aria-labelledby="steps-title">
  <div class="container">
    <div class="section-head center">
      <p class="eyebrow">How booking works</p>
      <h2 id="steps-title">Three simple steps</h2>
    </div>
    <ol class="steps">
      ${steps.map(([t, d], i) => `<li><span class="step-num" aria-hidden="true">0${i + 1}</span><h3>${esc(t)}</h3><p>${esc(d)}</p></li>`).join('')}
    </ol>
  </div>
</section>`;
}

function galleryItem(ctx, g, i) {
  const thumb = g.thumb || g.src;
  return `<li class="gallery-item${g.tall ? ' is-tall' : ''}" data-category="${esc(g.category || '')}">
  <button type="button" class="gallery-btn" data-lightbox-index="${i}" data-full="${esc(g.src)}" data-caption="${esc(g.caption || '')}" data-alt="${esc(g.alt)}" aria-label="View larger: ${esc(g.alt)}">
    <img src="${esc(thumb)}" alt="${esc(g.alt)}" loading="lazy" decoding="async">
    ${g.caption ? `<span class="gallery-caption">${esc(g.caption)}</span>` : ''}
  </button>
</li>`;
}

function GalleryGrid(ctx, { limit, filters = false } = {}) {
  const items = limit ? ctx.gallery.items.slice(0, limit) : ctx.gallery.items;
  const used = new Set(items.map((g) => g.category));
  const usable = ctx.gallery.filters.filter((f) => used.has(f.id));
  const filterBar =
    filters && usable.length > 1
      ? `<div class="filters" role="group" aria-label="Filter gallery">
  <button type="button" class="filter is-active" aria-pressed="true" data-filter="all">All</button>
  ${usable.map((f) => `<button type="button" class="filter" aria-pressed="false" data-filter="${esc(f.id)}">${esc(f.label)}</button>`).join('')}
</div>`
      : '';
  return `${filterBar}
<ul class="gallery-grid" data-gallery>
  ${items.map((g, i) => galleryItem(ctx, g, i)).join('')}
</ul>
<p class="sr-only" aria-live="polite" data-gallery-status></p>`;
}

function Lightbox() {
  return `<dialog class="lightbox" data-lightbox aria-label="Image viewer">
  <figure>
    <img alt="" data-lightbox-img>
    <figcaption data-lightbox-caption></figcaption>
  </figure>
  <button type="button" class="lb-btn lb-close" data-lightbox-close aria-label="Close">${icon('close')}</button>
  <button type="button" class="lb-btn lb-prev" data-lightbox-prev aria-label="Previous image">${icon('prev')}</button>
  <button type="button" class="lb-btn lb-next" data-lightbox-next aria-label="Next image">${icon('next')}</button>
</dialog>`;
}

function GallerySection(ctx) {
  const ig = ctx.config.contact.instagram;
  if (!ctx.gallery.items.length) {
    if (!real(ig)) return '';
    return `<section class="section" aria-labelledby="gallery-title">
  <div class="container notice-panel">
    <p class="eyebrow">Gallery</p>
    <h2 id="gallery-title" class="notice-title">See our latest work on Instagram</h2>
    <a class="btn btn-outline" href="${instagramUrl(ig)}" target="_blank" rel="noopener">${icon('instagram')} @${esc(ig)}</a>
  </div>
</section>`;
  }
  return `<section class="section" aria-labelledby="gallery-title">
  <div class="container">
    <div class="section-head split">
      <div>
        <p class="eyebrow">Gallery</p>
        <h2 id="gallery-title">Inside Tush Beauty Spa</h2>
      </div>
      <a class="link-arrow" href="gallery.html">View the gallery ${icon('arrow')}</a>
    </div>
    ${GalleryGrid(ctx, { limit: 6 })}
  </div>
</section>
${Lightbox()}`;
}

function Testimonials(ctx) {
  if (!ctx.testimonials.length) return ''; // Never shown without real, approved reviews.
  return `<section class="section section--sand" aria-labelledby="reviews-title">
  <div class="container">
    <div class="section-head center">
      <p class="eyebrow">Kind words</p>
      <h2 id="reviews-title">From our clients</h2>
    </div>
    <ul class="testimonial-grid">
      ${ctx.testimonials
        .map(
          (t) => `<li><figure class="testimonial">
        <blockquote><p>${esc(t.quote)}</p></blockquote>
        <figcaption><span class="t-author">${esc(t.author)}</span>${t.source ? `<span class="t-source">${esc(t.source)}</span>` : ''}</figcaption>
      </figure></li>`
        )
        .join('')}
    </ul>
  </div>
</section>`;
}

function BookingSection(ctx) {
  const b = booking(ctx);
  const cta = ctx.copy.bookingCta;
  return `<section class="booking-cta" aria-labelledby="booking-cta-title">
  ${picture(ctx, ctx.images.booking, { className: 'booking-cta-media', tone: 'taupe' })}
  <div class="container">
    <div class="booking-cta-card">
      <p class="eyebrow">Book your visit</p>
      <h2 id="booking-cta-title">${esc(cta.title)}</h2>
      <p>${esc(b.external ? 'Choose your treatment and a time that suits you. It only takes a minute.' : cta.body)}</p>
      <div class="actions">
        <a class="btn btn-primary btn-lg" href="${b.href}"${b.attrs} data-track="book_cta_band">Book Your Appointment</a>
        <a class="btn btn-outline btn-lg" href="contact.html">Contact Us</a>
      </div>
    </div>
  </div>
</section>`;
}

module.exports = {
  PageHeader, Hero, ServiceCard, ServicesPreview, ServicesCatalogue, AboutSection, WhyChooseUs,
  BookingSteps, GalleryGrid, GallerySection, Lightbox, Testimonials, BookingSection,
};
