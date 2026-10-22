const { esc, real, picture, icon, instagramUrl, booking } = require('../components/helpers');
const S = require('../components/sections');
const { ContactSection } = require('../components/contact');

const place = (ctx) => `${ctx.config.city}, ${ctx.config.region}`;
const serviceNames = (ctx) => ctx.services.flatMap((c) => c.services.map((s) => s.name));

function home(ctx) {
  const names = serviceNames(ctx);
  return {
    path: 'index.html',
    title: `${ctx.config.name} | Beauty & Self-Care in ${place(ctx)}`,
    description: names.length
      ? `${ctx.config.name} in ${ctx.config.city}, Texas: ${names.slice(0, 4).join(', ')} and more, in a calm space designed around you. Request your appointment online.`
      : `${ctx.config.name} in ${ctx.config.city}, Texas: a personalised approach to beauty and self-care in a calm space designed around you. Request your appointment online.`,
    body: [
      S.Hero(ctx),
      S.ServicesPreview(ctx),
      S.AboutSection(ctx),
      S.GallerySection(ctx),
      S.WhyChooseUs(ctx),
      S.Testimonials(ctx),
      S.BookingSteps(ctx),
      S.BookingSection(ctx),
    ].join('\n'),
  };
}

function services(ctx) {
  const names = serviceNames(ctx);
  return {
    path: 'services.html',
    title: `Services & Treatments | ${ctx.config.name} ${ctx.config.city}`,
    description: names.length
      ? `Explore the treatment menu at ${ctx.config.name} in ${ctx.config.city}, TX: ${names.slice(0, 5).join(', ')}. Request an appointment online.`
      : `Explore beauty and self-care treatments at ${ctx.config.name} in ${ctx.config.city}, TX, and request an appointment online.`,
    body: [
      S.PageHeader({ eyebrow: 'Services', title: 'Our treatment menu', lead: 'Every treatment is tailored to you. If you are not sure which to choose, send us a request and we will help you decide.' }),
      S.ServicesCatalogue(ctx),
      S.BookingSteps(ctx),
      S.BookingSection(ctx),
    ].join('\n'),
  };
}

function about(ctx) {
  const a = ctx.copy.aboutPage;
  const portrait = real(ctx.images.ownerPortrait.src)
    ? `<section class="section"><div class="container narrow center">${picture(ctx, ctx.images.ownerPortrait, { className: 'portrait' })}</div></section>`
    : '';
  return {
    path: 'about.html',
    title: `About Us | ${ctx.config.name} ${ctx.config.city}`,
    description: `Learn about ${ctx.config.name} in ${ctx.config.city}, Texas: our personal, unhurried approach to beauty, relaxation and client care.`,
    body: [
      S.PageHeader({ eyebrow: 'About us', title: 'Beauty, as a ritual', lead: a.intro }),
      `<section class="section">
  <div class="container story">
    ${a.sections
      .map(
        (s, i) => `<div class="story-row${i % 2 ? ' is-reversed' : ''}">
      ${picture(ctx, i === 0 ? ctx.images.about : i === 1 ? ctx.images.aboutAlt : ctx.images.heroDetail, { className: 'story-media', tone: ['ivory', 'sand', 'ivory'][i] })}
      <div class="story-copy">
        <p class="eyebrow">0${i + 1}</p>
        <h2>${esc(s.title)}</h2>
        <p>${esc(s.body)}</p>
      </div>
    </div>`
      )
      .join('\n')}
  </div>
</section>`,
      portrait,
      S.WhyChooseUs(ctx),
      S.Testimonials(ctx),
      S.BookingSection(ctx),
    ].join('\n'),
  };
}

function gallery(ctx) {
  const ig = ctx.config.contact.instagram;
  const empty = `<section class="section"><div class="container notice-panel">
  <p class="notice-title">Our gallery is being prepared.</p>
  <p>Photos of our space and our work will be shared here soon.</p>
  ${real(ig) ? `<a class="btn btn-outline" href="${instagramUrl(ig)}" target="_blank" rel="noopener">${icon('instagram')} Follow @${esc(ig)}</a>` : `<a class="btn btn-outline" href="services.html">Explore our services</a>`}
</div></section>`;
  return {
    path: 'gallery.html',
    title: `Gallery | ${ctx.config.name} ${ctx.config.city}`,
    description: `Take a look inside ${ctx.config.name} in ${ctx.config.city}, Texas: our space, our treatments and our work.`,
    body: [
      S.PageHeader({ eyebrow: 'Gallery', title: 'A look inside', lead: 'Our space, our treatments and the details that make each visit feel like yours.' }),
      ctx.gallery.items.length
        ? `<section class="section section--tight"><div class="container">${S.GalleryGrid(ctx, { filters: true })}
  ${real(ig) ? `<p class="center more-on-ig"><a class="link-arrow" href="${instagramUrl(ig)}" target="_blank" rel="noopener">More on Instagram @${esc(ig)} ${icon('arrow')}</a></p>` : ''}
</div></section>${S.Lightbox()}`
        : empty,
      S.BookingSection(ctx),
    ].join('\n'),
  };
}

function contact(ctx) {
  return {
    path: 'contact.html',
    title: `Contact & Book an Appointment | ${ctx.config.name} ${ctx.config.city}`,
    description: `Contact ${ctx.config.name} in ${ctx.config.city}, TX, and request an appointment. Choose your service and preferred time, and we will confirm with you personally.`,
    body: [
      S.PageHeader({ eyebrow: 'Contact', title: 'Contact & booking', lead: 'We would love to hear from you. Reach out with a question, or request your next appointment below.' }),
      ContactSection(ctx),
    ].join('\n'),
  };
}

function notFound(ctx) {
  const b = booking(ctx);
  return {
    path: '404.html',
    title: `Page not found | ${ctx.config.name}`,
    description: `This page could not be found. Visit the ${ctx.config.name} homepage.`,
    body: `<section class="page-header page-header--full"><div class="container narrow center">
  <p class="eyebrow">404</p>
  <h1>This page has drifted away</h1>
  <p class="lead">The page you are looking for may have moved. Let us take you somewhere calmer.</p>
  <div class="actions center"><a class="btn btn-primary" href="index.html">Back to home</a><a class="btn btn-outline" href="${b.href}"${b.attrs}>Book an Appointment</a></div>
</div></section>`,
  };
}

module.exports = [home, services, about, gallery, contact, notFound];
