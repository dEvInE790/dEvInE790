/* Tush Beauty Spa — site behaviour. No dependencies. */
(function () {
  'use strict';

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Analytics hook (forwards to GA4 / Plausible if installed) ---------- */
  function track(name, props) {
    try {
      if (typeof window.gtag === 'function') window.gtag('event', name, props || {});
      if (typeof window.plausible === 'function') window.plausible(name, { props: props || {} });
    } catch (e) { /* never break the page for analytics */ }
  }
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-track]');
    if (el) track(el.getAttribute('data-track'), { page: document.body.dataset.page });
  });

  /* ---------- Header ---------- */
  var header = $('[data-header]');
  var onScroll = function () { if (header) header.classList.toggle('is-scrolled', window.scrollY > 8); };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Mobile menu ---------- */
  var toggle = $('[data-menu-toggle]');
  var menu = $('[data-menu]');
  function setMenu(open) {
    if (!toggle || !menu) return;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menu.hidden = !open;
    if (open) { var first = $('a', menu); if (first) first.focus(); }
  }
  if (toggle && menu) {
    toggle.addEventListener('click', function () { setMenu(toggle.getAttribute('aria-expanded') !== 'true'); });
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') { setMenu(false); toggle.focus(); }
    });
    window.addEventListener('resize', function () { if (window.innerWidth >= 1100) setMenu(false); });
  }

  /* ---------- Mobile booking bar: appears after the first screen, hides over the booking form ---------- */
  var bar = $('[data-mobile-bar]');
  if (bar) {
    var formInView = false;
    var updateBar = function () { bar.classList.toggle('is-visible', window.scrollY > window.innerHeight * 0.5 && !formInView); };
    window.addEventListener('scroll', updateBar, { passive: true });
    var bookingEl = $('#booking');
    if (bookingEl && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) { formInView = entries[0].isIntersecting; updateBar(); }).observe(bookingEl);
    }
    updateBar();
  }

  /* ---------- Gentle reveal on scroll ---------- */
  if (!reduceMotion && 'IntersectionObserver' in window) {
    var targets = $$('.section-head, .service-card, .why-item, .steps li, .story-row, .about-grid > *, .testimonial, .booking-cta-card, .notice-panel');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    targets.forEach(function (t) {
      if (t.getBoundingClientRect().top < window.innerHeight) return; // already on screen: leave as-is
      t.classList.add('reveal');
      io.observe(t);
    });
  }

  /* ---------- Gallery: filters + lightbox ---------- */
  var grid = $('[data-gallery]');
  var lb = $('[data-lightbox]');
  if (grid) {
    var status = $('[data-gallery-status]');
    $$('[data-filter]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var f = btn.getAttribute('data-filter');
        $$('[data-filter]').forEach(function (b) { var on = b === btn; b.classList.toggle('is-active', on); b.setAttribute('aria-pressed', String(on)); });
        var shown = 0;
        $$('.gallery-item', grid).forEach(function (it) {
          var match = f === 'all' || it.getAttribute('data-category') === f;
          it.hidden = !match;
          if (match) shown++;
        });
        if (status) status.textContent = 'Showing ' + shown + ' image' + (shown === 1 ? '' : 's');
      });
    });
  }

  if (grid && lb && typeof lb.showModal === 'function') {
    var lbImg = $('[data-lightbox-img]', lb);
    var lbCap = $('[data-lightbox-caption]', lb);
    var current = 0;
    var opener = null;
    var visible = function () { return $$('.gallery-item:not([hidden]) .gallery-btn', grid); };
    var show = function (i) {
      var items = visible();
      if (!items.length) return;
      current = (i + items.length) % items.length;
      var b = items[current];
      lbImg.classList.remove('is-error');
      lbImg.src = b.getAttribute('data-full');
      lbImg.alt = b.getAttribute('data-alt') || '';
      lbCap.textContent = b.getAttribute('data-caption') || '';
      var single = items.length < 2;
      $('[data-lightbox-prev]', lb).hidden = single;
      $('[data-lightbox-next]', lb).hidden = single;
    };
    lbImg.addEventListener('error', function () { lbCap.textContent = 'Sorry, this image could not be loaded.'; });
    grid.addEventListener('click', function (e) {
      var b = e.target.closest('.gallery-btn');
      if (!b) return;
      opener = b;
      show(visible().indexOf(b));
      lb.showModal();
      document.documentElement.style.overflow = 'hidden';
      track('gallery_open');
    });
    $('[data-lightbox-close]', lb).addEventListener('click', function () { lb.close(); });
    $('[data-lightbox-prev]', lb).addEventListener('click', function () { show(current - 1); });
    $('[data-lightbox-next]', lb).addEventListener('click', function () { show(current + 1); });
    lb.addEventListener('click', function (e) { if (e.target === lb) lb.close(); });
    lb.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') show(current + 1);
      if (e.key === 'ArrowLeft') show(current - 1);
    });
    lb.addEventListener('close', function () { document.documentElement.style.overflow = ''; if (opener) opener.focus(); });
    var sx = null;
    lb.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', function (e) {
      if (sx === null) return;
      var dx = e.changedTouches[0].clientX - sx;
      if (Math.abs(dx) > 50) show(current + (dx < 0 ? 1 : -1));
      sx = null;
    });
  }

  /* ---------- Booking enquiry form ---------- */
  var form = $('#booking-form');
  if (!form) return;

  var successEl = $('[data-form-success]');
  var errorEl = $('[data-form-error]');
  var submitBtn = $('[data-submit]', form);
  var submitLabel = $('[data-submit-label]', form);
  var cfg = form.dataset;

  // Pre-select a service from ?service=<id> (used by "Book this service" links).
  var params = new URLSearchParams(window.location.search);
  var pre = params.get('service');
  var serviceSel = form.elements.service;
  if (pre && serviceSel && $$('option', serviceSel).some(function (o) { return o.value === pre; })) serviceSel.value = pre;

  // Earliest date is today (local time).
  var today = new Date();
  var iso = function (d) { return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
  form.elements.date.min = iso(today);

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  function setError(name, msg) {
    var input = form.elements[name];
    var out = $('[data-error-for="' + name + '"]', form);
    if (out) out.textContent = msg || '';
    if (input && input.setAttribute && !(input instanceof RadioNodeList)) {
      if (msg) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
    }
    return !msg;
  }

  function validate() {
    var f = form.elements;
    var name = f.name.value.trim();
    var phone = f.phone.value.trim();
    var email = f.email.value.trim();
    var pref = (form.querySelector('input[name="contactPref"]:checked') || {}).value;
    var ok = true;
    var problems = [];
    var check = function (field, msg) { if (!setError(field, msg)) { ok = false; problems.push(field); } };

    check('name', name.length < 2 ? 'Please enter your name.' : '');
    var phoneDigits = phone.replace(/\D/g, '');
    var phoneMsg = '';
    if (phone && (phoneDigits.length < 10 || phoneDigits.length > 15)) phoneMsg = 'Please enter a valid phone number, including area code.';
    else if (!phone && !email) phoneMsg = 'Please add a phone number or an email address so we can reach you.';
    else if (!phone && (pref === 'Phone call' || pref === 'Text message')) phoneMsg = 'Please add a phone number, or choose email as the best way to reach you.';
    check('phone', phoneMsg);
    var emailMsg = '';
    if (email && !EMAIL_RE.test(email)) emailMsg = 'Please enter a valid email address.';
    else if (!email && pref === 'Email') emailMsg = 'Please add your email address, or choose another way to reach you.';
    check('email', emailMsg);
    check('service', f.service.value ? '' : 'Please choose a service, or "Not sure yet".');
    var dateMsg = '';
    if (!f.date.value) dateMsg = 'Please choose a preferred date.';
    else if (f.date.value < f.date.min) dateMsg = 'Please choose today or a later date.';
    check('date', dateMsg);
    check('time', f.time.value ? '' : 'Please choose a preferred time.');

    if (!ok) {
      var first = form.elements[problems[0]];
      if (first && first.focus) first.focus();
    }
    return ok;
  }

  // Re-validate a field as soon as the visitor fixes it.
  form.addEventListener('input', function (e) {
    if (e.target.getAttribute && e.target.getAttribute('aria-invalid') === 'true') validateQuietly();
  });
  form.addEventListener('change', function (e) {
    if (e.target.name === 'contactPref' || (e.target.getAttribute && e.target.getAttribute('aria-invalid') === 'true')) validateQuietly();
  });
  function validateQuietly() {
    var active = document.activeElement;
    var hadErrors = $$('[aria-invalid="true"]', form).map(function (el) { return el.name; });
    validate();
    // Only keep messages for fields that were already flagged, so we don't nag about untouched fields.
    ['name', 'phone', 'email', 'service', 'date', 'time'].forEach(function (n) { if (hadErrors.indexOf(n) === -1) setError(n, ''); });
    if (active && active.focus) active.focus();
  }

  function formatDate(v) {
    var p = v.split('-');
    var d = new Date(+p[0], +p[1] - 1, +p[2]);
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  }

  function summary() {
    var f = form.elements;
    var svc = f.service.options[f.service.selectedIndex].text;
    var pref = (form.querySelector('input[name="contactPref"]:checked') || {}).value;
    var lines = [
      'Appointment request: ' + cfg.spa,
      '',
      'Name: ' + f.name.value.trim(),
      f.phone.value.trim() ? 'Phone: ' + f.phone.value.trim() : null,
      f.email.value.trim() ? 'Email: ' + f.email.value.trim() : null,
      'Service: ' + svc,
      'Preferred date: ' + formatDate(f.date.value),
      'Preferred time: ' + f.time.value,
      'Best way to reach me: ' + pref,
      f.message.value.trim() ? '\nNotes: ' + f.message.value.trim() : null,
    ];
    return { text: lines.filter(function (l) { return l !== null; }).join('\n'), name: f.name.value.trim().split(' ')[0], pref: pref, service: svc };
  }

  function el(tag, attrs, text) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (text) n.textContent = text;
    return n;
  }

  function copyBlock(text) {
    var wrap = el('div');
    var ta = el('textarea', { readonly: '', 'aria-label': 'Your request' });
    ta.value = text;
    var btn = el('button', { type: 'button', class: 'btn btn-outline' }, 'Copy request');
    btn.addEventListener('click', function () { copyText(text, ta).then(function (ok) { btn.textContent = ok ? 'Copied' : 'Select the text above and copy it'; }); });
    wrap.appendChild(ta);
    wrap.appendChild(btn);
    return wrap;
  }

  function copyText(text, ta) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).then(function () { return true; }, function () { return fallbackCopy(ta); });
    }
    return Promise.resolve(fallbackCopy(ta));
  }
  function fallbackCopy(ta) {
    if (!ta) return false;
    ta.select();
    try { return document.execCommand('copy'); } catch (e) { return false; }
  }

  function showSuccess(title, paragraphs, extra) {
    $('[data-success-title]', successEl).textContent = title;
    var body = $('[data-success-body]', successEl);
    body.innerHTML = '';
    paragraphs.forEach(function (p) { body.appendChild(el('p', {}, p)); });
    if (extra) body.appendChild(extra);
    form.hidden = true;
    successEl.hidden = false;
    successEl.focus();
    successEl.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
  }

  function showError(msg) {
    errorEl.innerHTML = '';
    errorEl.appendChild(el('p', {}, msg));
    var alt = [];
    if (cfg.phoneDisplay) alt.push('call us on ' + cfg.phoneDisplay);
    if (cfg.email) alt.push('email ' + cfg.email);
    if (cfg.instagram) alt.push('message @' + cfg.instagram + ' on Instagram');
    if (alt.length) errorEl.appendChild(el('p', {}, 'You can also ' + alt.join(', or ') + '.'));
    errorEl.hidden = false;
  }

  function setLoading(on) {
    submitBtn.disabled = on;
    submitBtn.setAttribute('aria-busy', String(on));
    submitLabel.textContent = on ? 'Sending…' : 'Send Booking Request';
    var sp = $('.spinner', submitBtn);
    if (on && !sp) submitBtn.insertBefore(el('span', { class: 'spinner', 'aria-hidden': 'true' }), submitLabel);
    if (!on && sp) sp.remove();
  }

  var notConfirmed = 'Please note this is a request, not a confirmed booking. Your appointment is confirmed once we have been in touch with you.';

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    errorEl.hidden = true;
    if (form.elements.company.value) return; // spam bot filled the hidden field
    if (!validate()) return;
    var s = summary();
    var reach = s.pref === 'Email' ? 'by email' : s.pref === 'Text message' ? 'by text message' : 'by phone';
    track('booking_request_submit', { service: s.service });

    // 1) Form service endpoint (or the design-preview simulation).
    if (cfg.endpoint) {
      setLoading(true);
      if (cfg.endpoint === 'preview') {
        setTimeout(function () {
          setLoading(false);
          showSuccess('Thank you, ' + s.name, ['Design preview: this request was NOT sent anywhere. On the live site it goes straight to the spa.', 'We will contact you ' + reach + ' to confirm your appointment. ' + notConfirmed]);
        }, 900);
        return;
      }
      var data = new FormData(form);
      data.delete('company');
      data.append('summary', s.text);
      data.append('_subject', 'Appointment request from ' + form.elements.name.value.trim());
      var ctrl = 'AbortController' in window ? new AbortController() : null;
      var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 15000);
      fetch(cfg.endpoint, { method: 'POST', body: data, headers: { Accept: 'application/json' }, signal: ctrl ? ctrl.signal : undefined })
        .then(function (res) {
          clearTimeout(timer);
          setLoading(false);
          if (!res.ok) throw new Error('HTTP ' + res.status);
          track('booking_request_sent');
          showSuccess('Thank you, ' + s.name, ['Your request has been sent to ' + cfg.spa + '. We will contact you ' + reach + ' to confirm your appointment.', notConfirmed]);
        })
        .catch(function () {
          clearTimeout(timer);
          setLoading(false);
          showError('Sorry, we could not send your request just now. Please check your connection and try again.');
        });
      return;
    }

    // 2) Email app.
    if (cfg.email) {
      var mail = 'mailto:' + cfg.email + '?subject=' + encodeURIComponent('Appointment request: ' + form.elements.name.value.trim()) + '&body=' + encodeURIComponent(s.text);
      window.location.href = mail;
      showSuccess('Almost there, ' + s.name, ['Your email app should now be open with your request ready to go. Please press send. We only receive your request once it has been sent.', 'If nothing opened, copy your request below and email it to ' + cfg.email + '.', notConfirmed], copyBlock(s.text));
      return;
    }

    // 3) Text message.
    if (cfg.sms) {
      window.location.href = 'sms:' + cfg.sms + '?&body=' + encodeURIComponent(s.text);
      showSuccess('Almost there, ' + s.name, ['Your messages app should now be open with your request ready to go. Please press send.', 'If nothing opened (for example on a computer), copy your request below and text it to ' + cfg.phoneDisplay + '.', notConfirmed], copyBlock(s.text));
      return;
    }

    // 4) Instagram direct message.
    if (cfg.instagram) {
      var block = copyBlock(s.text);
      var ta = $('textarea', block);
      var dm = el('a', { class: 'btn btn-primary', href: 'https://ig.me/m/' + cfg.instagram, target: '_blank', rel: 'noopener' }, 'Open Instagram message');
      block.appendChild(dm);
      showSuccess('One last step, ' + s.name, ['Your request is ready. Copy it below, then paste it into an Instagram message to @' + cfg.instagram + ' and press send.', notConfirmed], block);
      copyText(s.text, ta).then(function (ok) { if (ok) $('button', block).textContent = 'Copied'; });
    }
  });

  $('[data-form-reset]', successEl).addEventListener('click', function () {
    form.reset();
    form.elements.date.min = iso(new Date());
    successEl.hidden = true;
    form.hidden = false;
    form.elements.name.focus();
  });
})();
