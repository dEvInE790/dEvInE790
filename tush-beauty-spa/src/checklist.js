/**
 * Launch checklist: every business detail the site still needs from the owner.
 * Shared by `npm run check` (build.js) and the admin dashboard.
 * `section` matches an admin panel tab; `file` is where the value is stored.
 */
const { real } = require('./components/helpers');

const IMAGE_LABELS = { hero: 'Homepage hero photo', heroDetail: 'Hero detail photo', about: 'About photo', aboutAlt: 'Second about photo', booking: 'Booking banner photo', ownerPortrait: 'Owner / team portrait (optional)' };

function checklist(ctx) {
  const c = ctx.config;
  const items = [
    ['details', 'site.json', 'Website address (domain)', real(c.siteUrl), 'Enables canonical links and sitemap.xml.'],
    ['details', 'site.json', 'Phone number', real(c.contact.phone)],
    ['details', 'site.json', 'Email address', real(c.contact.email)],
    ['details', 'site.json', 'Instagram handle', real(c.contact.instagram)],
    ['details', 'site.json', 'Street address', real(c.contact.address), 'Enables the map.'],
    ['details', 'site.json', 'Opening hours', !!(c.hours && c.hours.length)],
    ['details', 'site.json', 'How booking requests reach you', real(c.booking.externalUrl) || real(c.booking.formEndpoint), 'A booking platform link or a form-service address.'],
    ['services', 'services.json', 'Service menu', ctx.services.some((cat) => cat.services.length)],
    ['gallery', 'gallery.json', 'Gallery photos', ctx.gallery.items.length > 0],
    ['reviews', 'testimonials.json', 'Client reviews (optional)', ctx.testimonials.length > 0, 'The section stays hidden until there is at least one.'],
    ...Object.entries(ctx.images).map(([slot, img]) => ['photos', 'images.json', IMAGE_LABELS[slot] || `${slot} photo`, real(img.src)]),
  ];
  return items.map(([section, file, label, done, note]) => ({ section, file, label, done: !!done, note: note || null }));
}

module.exports = { checklist };
