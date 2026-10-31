/**
 * Validation for every file the admin panel can save. Returns a cleaned copy of the
 * data plus a list of { path, message } errors; nothing is written if there are errors.
 * Empty strings become null so "left blank" always means "not confirmed yet".
 */
const fs = require('fs');
const path = require('path');

const STATIC = path.join(__dirname, '../src/static');
const ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const IMG_RE = /^img\/[a-z0-9][a-z0-9/_-]*\.(?:jpe?g|png|webp)$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const DAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

function validator() {
  const errors = [];
  const fail = (p, m) => errors.push({ path: p, message: m });

  /** Text field. Returns trimmed string or null. */
  const text = (p, v, { required = false, max = 500, label = 'This field' } = {}) => {
    if (v === undefined || v === null) v = '';
    if (typeof v !== 'string') { fail(p, `${label} must be text.`); return null; }
    v = v.trim();
    if (!v) { if (required) fail(p, `${label} is required.`); return null; }
    if (v.length > max) fail(p, `${label} must be ${max} characters or fewer.`);
    return v;
  };
  const url = (p, v, opts = {}) => {
    const s = text(p, v, { max: 500, ...opts });
    if (s === null) return null;
    let u;
    try { u = new URL(s); } catch { fail(p, `${opts.label || 'Link'} must be a full web address starting with https://`); return s; }
    if (u.protocol !== 'https:') fail(p, `${opts.label || 'Link'} must start with https://`);
    return s.replace(/\/+$/, opts.keepSlash ? '/' : '');
  };
  const bool = (v) => v === true;
  const image = (p, v, { required = false } = {}) => {
    const s = text(p, v, { required, max: 200, label: 'Photo' });
    if (s === null) return null;
    if (!IMG_RE.test(s)) fail(p, 'Photo path is not valid. Please upload the photo again.');
    else if (!fs.existsSync(path.join(STATIC, s))) fail(p, 'Photo file is missing. Please upload it again.');
    return s;
  };
  const list = (p, v, max = 200) => {
    if (v === null || v === undefined) return [];
    if (!Array.isArray(v)) { fail(p, 'Expected a list.'); return []; }
    if (v.length > max) fail(p, `At most ${max} items.`);
    return v;
  };
  return { errors, fail, text, url, bool, image, list };
}

const validators = {
  site(d) {
    const V = validator();
    const c = d.contact || {};
    const b = d.booking || {};
    const out = {
      name: V.text('name', d.name, { required: true, max: 80, label: 'Business name' }),
      shortName: V.text('shortName', d.shortName, { max: 40 }) || null,
      city: V.text('city', d.city, { required: true, max: 60, label: 'City' }),
      region: V.text('region', d.region, { required: true, max: 10, label: 'State' }),
      regionName: V.text('regionName', d.regionName, { required: true, max: 40, label: 'State name' }),
      siteUrl: V.url('siteUrl', d.siteUrl, { label: 'Website address' }),
      contact: {
        phone: V.text('contact.phone', c.phone, { max: 30, label: 'Phone' }),
        phoneAcceptsTexts: V.bool(c.phoneAcceptsTexts),
        email: V.text('contact.email', c.email, { max: 120, label: 'Email' }),
        instagram: V.text('contact.instagram', c.instagram, { max: 30, label: 'Instagram handle' }),
        address: V.text('contact.address', c.address, { max: 200, label: 'Address' }),
        addressParts: null,
        addressNote: V.text('contact.addressNote', c.addressNote, { max: 160, label: 'Address note' }),
      },
      hours: null,
      hoursNote: V.text('hoursNote', d.hoursNote, { max: 120, label: 'Hours note' }),
      booking: {
        externalUrl: V.url('booking.externalUrl', b.externalUrl, { label: 'Booking page link', keepSlash: true }),
        externalLabel: V.text('booking.externalLabel', b.externalLabel, { max: 40, label: 'Button text' }),
        formEndpoint: V.url('booking.formEndpoint', b.formEndpoint, { label: 'Form address', keepSlash: true }),
      },
      announcement: V.text('announcement', d.announcement, { max: 140, label: 'Announcement' }),
      googleBusinessUrl: V.url('googleBusinessUrl', d.googleBusinessUrl, { label: 'Google Business link', keepSlash: true }),
    };
    if (!out.shortName) out.shortName = out.name;
    const oc = out.contact;
    if (oc.phone) {
      const digits = oc.phone.replace(/\D/g, '');
      if (digits.length < 10 || digits.length > 11 || (digits.length === 11 && digits[0] !== '1')) V.fail('contact.phone', 'Please enter a US phone number with area code, e.g. (713) 555-0123.');
    }
    if (oc.phoneAcceptsTexts && !oc.phone) V.fail('contact.phoneAcceptsTexts', 'Add a phone number first.');
    if (oc.email && !EMAIL_RE.test(oc.email)) V.fail('contact.email', 'Please enter a valid email address.');
    if (oc.instagram) {
      oc.instagram = oc.instagram.replace(/^@/, '').replace(/^https?:\/\/(www\.)?instagram\.com\//, '').replace(/\/.*$/, '');
      if (!/^[A-Za-z0-9._]{1,30}$/.test(oc.instagram)) V.fail('contact.instagram', 'Instagram handles use letters, numbers, dots and underscores only.');
    }
    const ap = c.addressParts || {};
    const parts = {
      street: V.text('contact.addressParts.street', ap.street, { max: 120, label: 'Street' }),
      city: V.text('contact.addressParts.city', ap.city, { max: 60, label: 'City' }),
      region: V.text('contact.addressParts.region', ap.region, { max: 10, label: 'State' }),
      postalCode: V.text('contact.addressParts.postalCode', ap.postalCode, { max: 10, label: 'ZIP code' }),
    };
    if (parts.street) {
      if (!parts.city || !parts.region || !parts.postalCode) V.fail('contact.addressParts.street', 'Please fill in street, city, state and ZIP together.');
      if (parts.postalCode && !/^\d{5}(-\d{4})?$/.test(parts.postalCode)) V.fail('contact.addressParts.postalCode', 'ZIP code should look like 77002.');
      oc.addressParts = parts;
      if (!oc.address) oc.address = `${parts.street}, ${parts.city}, ${parts.region} ${parts.postalCode}`;
    }
    if (out.booking.externalLabel && !out.booking.externalUrl) out.booking.externalLabel = null;

    const hours = V.list('hours', d.hours, 14).map((h, i) => {
      const p = `hours.${i}`;
      const row = {
        days: V.text(`${p}.days`, h && h.days, { required: true, max: 40, label: 'Days' }),
        hours: V.text(`${p}.hours`, h && h.hours, { required: true, max: 40, label: 'Hours' }),
      };
      const s = h && h.schema;
      if (s && Array.isArray(s.days) && s.days.length) {
        const days = s.days.filter((x) => DAYS.includes(x));
        if (!TIME_RE.test(s.opens || '') || !TIME_RE.test(s.closes || '')) V.fail(`${p}.schema`, 'Opening and closing times are needed for Google (or untick all days).');
        else if (s.opens >= s.closes) V.fail(`${p}.schema`, 'Closing time must be after opening time.');
        row.schema = { days, opens: s.opens, closes: s.closes };
      }
      return row;
    });
    out.hours = hours.length ? hours : null;
    return { value: out, errors: V.errors };
  },

  services(d) {
    const V = validator();
    const ids = new Set();
    const uniq = (p, id, label) => {
      if (!id) return;
      if (!ID_RE.test(id)) V.fail(p, `${label} ID can only use lowercase letters, numbers and dashes.`);
      else if (ids.has(id)) V.fail(p, `${label} ID "${id}" is used twice.`);
      ids.add(id);
    };
    const value = V.list('', d, 30).map((cat, ci) => {
      const p = `${ci}`;
      const out = {
        id: V.text(`${p}.id`, cat.id, { required: true, max: 60, label: 'Category ID' }),
        name: V.text(`${p}.name`, cat.name, { required: true, max: 60, label: 'Category name' }),
        intro: V.text(`${p}.intro`, cat.intro, { max: 300, label: 'Introduction' }),
        services: V.list(`${p}.services`, cat.services, 60).map((s, si) => {
          const q = `${p}.services.${si}`;
          const svc = {
            id: V.text(`${q}.id`, s.id, { required: true, max: 60, label: 'Service ID' }),
            name: V.text(`${q}.name`, s.name, { required: true, max: 80, label: 'Service name' }),
            description: V.text(`${q}.description`, s.description, { required: true, max: 400, label: 'Description' }),
            price: V.text(`${q}.price`, s.price, { max: 30, label: 'Price' }),
            duration: V.text(`${q}.duration`, s.duration, { max: 30, label: 'Duration' }),
            image: V.image(`${q}.image`, s.image),
            imageAlt: V.text(`${q}.imageAlt`, s.imageAlt, { max: 200, label: 'Photo description' }),
            featured: V.bool(s.featured),
          };
          uniq(`${q}.id`, svc.id, 'Service');
          if (svc.image && !svc.imageAlt) V.fail(`${q}.imageAlt`, 'Describe the photo for visitors who cannot see it.');
          return svc;
        }),
      };
      uniq(`${p}.id`, out.id, 'Category');
      return out;
    });
    return { value, errors: V.errors };
  },

  gallery(d) {
    const V = validator();
    const filters = V.list('filters', d.filters, 10).map((f, i) => ({
      id: V.text(`filters.${i}.id`, f.id, { required: true, max: 30, label: 'Filter ID' }),
      label: V.text(`filters.${i}.label`, f.label, { required: true, max: 30, label: 'Filter label' }),
    }));
    const fids = filters.map((f) => f.id);
    const items = V.list('items', d.items, 200).map((g, i) => {
      const p = `items.${i}`;
      const item = {
        src: V.image(`${p}.src`, g.src, { required: true }),
        thumb: V.image(`${p}.thumb`, g.thumb),
        alt: V.text(`${p}.alt`, g.alt, { required: true, max: 200, label: 'Photo description' }),
        caption: V.text(`${p}.caption`, g.caption, { max: 120, label: 'Caption' }),
        category: V.text(`${p}.category`, g.category, { max: 30 }),
        tall: V.bool(g.tall),
        permission: V.bool(g.permission),
      };
      if (item.category && !fids.includes(item.category)) V.fail(`${p}.category`, 'Unknown category.');
      if (!item.permission) V.fail(`${p}.permission`, 'Confirm this is the spa’s own photo and you have permission to publish it.');
      return item;
    });
    return { value: { filters, items }, errors: V.errors };
  },

  testimonials(d) {
    const V = validator();
    const value = V.list('', d, 50).map((t, i) => {
      const r = {
        quote: V.text(`${i}.quote`, t.quote, { required: true, max: 800, label: 'Review' }),
        author: V.text(`${i}.author`, t.author, { required: true, max: 60, label: 'Name' }),
        source: V.text(`${i}.source`, t.source, { max: 60, label: 'Source' }),
        consent: V.bool(t.consent),
      };
      if (!r.consent) V.fail(`${i}.consent`, 'Confirm this is a real review and the client agreed to it being published.');
      return r;
    });
    return { value, errors: V.errors };
  },

  images(d) {
    const V = validator();
    const value = {};
    const current = require('../src/data/images.json');
    for (const slot of Object.keys(current)) {
      const s = (d && d[slot]) || {};
      const src = V.image(`${slot}.src`, s.src);
      const alt = V.text(`${slot}.alt`, s.alt, { max: 200, label: 'Photo description' });
      if (src && !alt) V.fail(`${slot}.alt`, 'Describe the photo for visitors who cannot see it.');
      value[slot] = { src, alt: alt || '', art: current[slot].art, caption: current[slot].caption };
    }
    return { value, errors: V.errors };
  },

  copy(d) {
    const V = validator();
    const t = (p, v, max = 600) => V.text(p, v, { required: true, max, label: 'This text' });
    const ap = d.aboutPreview || {}, pg = d.aboutPage || {}, bc = d.bookingCta || {}, h = d.hero || {};
    const value = {
      hero: { eyebrow: t('hero.eyebrow', h.eyebrow, 80), title: t('hero.title', h.title, 80), lead: t('hero.lead', h.lead, 240) },
      aboutPreview: {
        eyebrow: t('aboutPreview.eyebrow', ap.eyebrow, 60),
        title: t('aboutPreview.title', ap.title, 120),
        body: V.list('aboutPreview.body', ap.body, 4).map((x, i) => t(`aboutPreview.body.${i}`, x)),
      },
      aboutPage: {
        intro: t('aboutPage.intro', pg.intro, 400),
        sections: V.list('aboutPage.sections', pg.sections, 3).map((s, i) => ({ title: t(`aboutPage.sections.${i}.title`, s.title, 80), body: t(`aboutPage.sections.${i}.body`, s.body) })),
      },
      why: V.list('why', d.why, 3).map((w, i) => ({ icon: ['heart', 'leaf', 'calendar'].includes(w.icon) ? w.icon : 'leaf', title: t(`why.${i}.title`, w.title, 60), body: t(`why.${i}.body`, w.body, 240) })),
      bookingCta: { title: t('bookingCta.title', bc.title, 80), body: t('bookingCta.body', bc.body, 240) },
    };
    if (!value.aboutPreview.body.length) V.fail('aboutPreview.body', 'Add at least one paragraph.');
    if (value.aboutPage.sections.length !== 3) V.fail('aboutPage.sections', 'The About page has exactly three sections.');
    if (value.why.length !== 3) V.fail('why', 'There are exactly three "why choose us" points.');
    return { value, errors: V.errors };
  },
};

module.exports = { validators, IMG_RE };
