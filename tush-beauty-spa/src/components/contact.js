/** ContactSection + BookingForm. */
const { esc, real, isPlaceholder, telHref, smsHref, instagramUrl, mapsLink, mapsEmbed, booking, icon } = require('./helpers');
const { HoursList, contactLine } = require('./footer');

/** Which channels can actually deliver a booking enquiry, in order of preference. */
function enquiryChannels(ctx) {
  const c = ctx.config.contact;
  const ep = ctx.config.booking.formEndpoint;
  return {
    endpoint: ep === 'preview' || real(ep) ? ep : null,
    email: real(c.email) ? c.email : null,
    sms: real(c.phone) && c.phoneAcceptsTexts ? telHref(c.phone).slice(4) : null,
    instagram: real(c.instagram) ? c.instagram : null,
  };
}

function field({ id, label, type = 'text', required, autocomplete, hint, attrs = '' }) {
  return `<div class="field">
  <label for="${id}">${label}${required ? ' <span class="req" aria-hidden="true">*</span>' : ' <span class="optional">(optional)</span>'}</label>
  <input id="${id}" name="${id}" type="${type}"${required ? ' required aria-required="true"' : ''}${autocomplete ? ` autocomplete="${autocomplete}"` : ''} aria-describedby="${id}-error${hint ? ` ${id}-hint` : ''}"${attrs}>
  ${hint ? `<p class="hint" id="${id}-hint">${hint}</p>` : ''}
  <p class="error" id="${id}-error" data-error-for="${id}"></p>
</div>`;
}

function BookingForm(ctx) {
  const ch = enquiryChannels(ctx);
  const c = ctx.config.contact;
  if (!ch.endpoint && !ch.email && !ch.sms && !ch.instagram) {
    // No way for a request to reach the spa yet, so no form is shown (rather than a form that goes nowhere).
    const call = real(c.phone) ? `<a class="btn btn-primary" href="${telHref(c.phone)}">${icon('phone')} Call ${esc(c.phone)}</a>` : '';
    return `<div class="notice-panel notice-panel--left">
  <p class="notice-title">Online appointment requests are opening soon.</p>
  <p>${call ? 'Until then, the quickest way to book is to give us a call.' : 'Our booking details are being finalised. Please check back shortly.'}</p>
  ${call}
</div>`;
  }

  const groups = ctx.services
    .map((cat) => `<optgroup label="${esc(cat.name)}">${cat.services.map((s) => `<option value="${esc(s.id)}">${esc(s.name)}</option>`).join('')}</optgroup>`)
    .join('');
  const nextStep = ch.endpoint
    ? 'Your request goes straight to the spa.'
    : ch.email
      ? 'Sending opens your email app with your request ready to go.'
      : ch.sms
        ? 'Sending opens your messages app with your request ready to go.'
        : 'Sending copies your request so you can paste it into an Instagram message to us.';

  return `<form class="booking-form" id="booking-form" novalidate
  data-endpoint="${esc(ch.endpoint || '')}" data-email="${esc(ch.email || '')}" data-sms="${esc(ch.sms || '')}" data-instagram="${esc(ch.instagram || '')}"
  data-phone-display="${esc(real(c.phone) ? c.phone : '')}" data-spa="${esc(ctx.config.name)}">
  <div class="form-grid">
    ${field({ id: 'name', label: 'Full name', required: true, autocomplete: 'name' })}
    ${field({ id: 'phone', label: 'Phone', type: 'tel', autocomplete: 'tel', hint: 'Phone or email: we need at least one.', attrs: ' inputmode="tel"' })}
    ${field({ id: 'email', label: 'Email', type: 'email', autocomplete: 'email' })}
    <div class="field">
      <label for="service">Requested service <span class="req" aria-hidden="true">*</span></label>
      <select id="service" name="service" required aria-required="true" aria-describedby="service-error">
        <option value="">Choose a service…</option>
        ${groups}
        <option value="advice">Not sure yet, I would like advice</option>
      </select>
      <p class="error" id="service-error" data-error-for="service"></p>
    </div>
    ${field({ id: 'date', label: 'Preferred date', type: 'date', required: true })}
    <div class="field">
      <label for="time">Preferred time <span class="req" aria-hidden="true">*</span></label>
      <select id="time" name="time" required aria-required="true" aria-describedby="time-error">
        <option value="">Choose a time…</option>
        <option>Morning</option>
        <option>Midday</option>
        <option>Afternoon</option>
        <option>Evening</option>
        <option>I'm flexible</option>
      </select>
      <p class="error" id="time-error" data-error-for="time"></p>
    </div>
  </div>
  <fieldset class="field field--choices">
    <legend>Best way to reach you</legend>
    <div class="choices">
      <label><input type="radio" name="contactPref" value="Phone call" checked> Phone call</label>
      <label><input type="radio" name="contactPref" value="Text message"> Text message</label>
      <label><input type="radio" name="contactPref" value="Email"> Email</label>
    </div>
    <p class="error" data-error-for="contactPref" id="contactPref-error"></p>
  </fieldset>
  <div class="field">
    <label for="message">Anything we should know? <span class="optional">(optional)</span></label>
    <textarea id="message" name="message" rows="4" maxlength="1500" placeholder="E.g. first visit, sensitivities, a flexible time window…"></textarea>
  </div>
  <div class="hp" aria-hidden="true"><label for="company">Leave this empty</label><input id="company" name="company" type="text" tabindex="-1" autocomplete="off"></div>
  <div class="form-foot">
    <button class="btn btn-primary btn-lg" type="submit" data-submit><span data-submit-label>Send Booking Request</span></button>
    <p class="small muted">This sends a request, not a confirmed booking. We will contact you to confirm your appointment. ${esc(nextStep)}</p>
  </div>
  <div class="form-status" role="alert" aria-live="assertive" data-form-error hidden></div>
</form>
<div class="form-success" data-form-success hidden tabindex="-1">
  ${icon('check', 'icon icon-xl')}
  <h3 data-success-title>Thank you</h3>
  <div data-success-body></div>
  <button type="button" class="btn btn-outline" data-form-reset>Send another request</button>
</div>`;
}

function ContactSection(ctx) {
  const c = ctx.config.contact;
  const b = booking(ctx);
  const ig = c.instagram ? (isPlaceholder(c.instagram) ? c.instagram : '@' + c.instagram) : null;
  const items = [
    contactLine(c.phone, real(c.phone) ? telHref(c.phone) : '', 'phone', ' data-track="call_contact"'),
    real(c.phone) && c.phoneAcceptsTexts ? contactLine(`Text ${c.phone}`, smsHref(c.phone), 'message', ' data-track="sms_contact"') : '',
    contactLine(c.email, `mailto:${c.email}`, 'mail', ' data-track="email_contact"'),
    contactLine(ig, real(c.instagram) ? instagramUrl(c.instagram) : '', 'instagram', ' target="_blank" rel="noopener" data-track="instagram_contact"'),
  ].join('');

  const address = c.address
    ? `<address>${isPlaceholder(c.address) ? `<span class="is-placeholder">${esc(c.address)}</span>` : `<a href="${mapsLink(c.address)}" target="_blank" rel="noopener">${esc(c.address)}</a>`}${c.addressNote ? `<br><span class="muted small">${esc(c.addressNote)}</span>` : ''}</address>`
    : `<p class="muted">Our address will be shared here soon. We are based in ${esc(ctx.config.city)}, ${esc(ctx.config.regionName)}.</p>`;

  const map = real(c.address)
    ? `<div class="map"><iframe title="Map showing ${esc(ctx.config.name)}" src="${mapsEmbed(c.address)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe></div>`
    : `<div class="map map--pending"><p>${icon('pin', 'icon icon-lg')}<span>Map will appear once our address is confirmed.</span></p></div>`;

  const externalBlock = b.external
    ? `<div class="notice-panel notice-panel--left">
  <p class="notice-title">Book online in a few clicks</p>
  <p>Choose your treatment and an available time on our booking page.</p>
  <a class="btn btn-primary btn-lg" href="${b.href}"${b.attrs} data-track="book_contact_external">${esc(ctx.config.booking.externalLabel || 'Book Online')}</a>
  <p class="small muted">Prefer to ask first? Send us a request below.</p>
</div>`
    : '';

  return `<section class="section" aria-labelledby="contact-details-title">
  <div class="container contact-grid">
    <div class="contact-info">
      <h2 id="contact-details-title" class="h3">Get in touch</h2>
      ${items ? `<ul class="contact-list">${items}</ul>` : `<p class="muted">Phone, email and Instagram details are coming soon.</p>`}
      <h3 class="h4">Location</h3>
      ${address}
      <h3 class="h4">Opening hours</h3>
      ${HoursList(ctx)}
    </div>
    ${map}
  </div>
</section>
<section class="section section--ivory" id="booking" aria-labelledby="booking-title">
  <div class="container narrow">
    <div class="section-head center">
      <p class="eyebrow">Appointments</p>
      <h2 id="booking-title">Request an appointment</h2>
      <p class="lead">Share a few details and your preferred time. We will get back to you to confirm.</p>
    </div>
    ${externalBlock}
    ${BookingForm(ctx)}
  </div>
</section>`;
}

module.exports = { ContactSection, BookingForm, enquiryChannels };
