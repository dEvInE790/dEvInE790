/* Tush Beauty Spa — admin panel (vanilla JS, no dependencies). */
(function () {
  'use strict';

  var TOKEN = document.querySelector('meta[name="admin-token"]').content;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var main = $('[data-main]');
  var navEl = $('[data-nav]');
  var footEl = $('[data-sidebar-foot]');
  var toastsEl = $('[data-toasts]');

  var TABS = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'details', label: 'Business details', file: 'site' },
    { id: 'services', label: 'Services', file: 'services' },
    { id: 'gallery', label: 'Gallery', file: 'gallery' },
    { id: 'reviews', label: 'Reviews', file: 'testimonials' },
    { id: 'photos', label: 'Site photos', file: 'images' },
    { id: 'text', label: 'Website text', file: 'copy' },
  ];
  var SLOT_LABELS = { hero: 'Homepage hero (large)', heroDetail: 'Homepage hero (small detail)', about: 'About section', aboutAlt: 'About page, second photo', booking: 'Booking banner', ownerPortrait: 'Owner / team portrait (optional)' };
  var DAYS = [['Mo', 'Mon'], ['Tu', 'Tue'], ['We', 'Wed'], ['Th', 'Thu'], ['Fr', 'Fri'], ['Sa', 'Sat'], ['Su', 'Sun']];

  var S = { data: null, saved: null, errors: {}, checklist: [], build: null, protected: false, tab: 'dashboard', uploads: new Set(), saving: false, focusErrors: false };

  /* ---------------- helpers ---------------- */
  function h(tag, props) {
    var el = document.createElement(tag);
    Object.keys(props || {}).forEach(function (k) {
      var v = props[k];
      if (v === null || v === undefined || v === false) return;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k === 'value') el.value = v;
      else if (k === 'checked') el.checked = !!v;
      else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    });
    for (var i = 2; i < arguments.length; i++) append(el, arguments[i]);
    return el;
  }
  function append(el, c) {
    if (c === null || c === undefined || c === false) return;
    if (Array.isArray(c)) return c.forEach(function (x) { append(el, x); });
    el.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
  var clone = function (v) { return JSON.parse(JSON.stringify(v)); };
  var slugify = function (s) { return String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50); };
  var media = function (src) { return '/media/' + String(src).replace(/^img\//, ''); };
  var uid = 0;
  var nextId = function (p) { uid++; return p + '-' + uid; };

  // Normalised comparison: blank text, null and empty objects all mean "not set".
  function norm(v) {
    if (v === '' || v === undefined || v === false) return null;
    if (typeof v === 'string') return v.trim() || null;
    if (Array.isArray(v)) return v.length ? v.map(norm) : null;
    if (v && typeof v === 'object') {
      var o = {}, any = false;
      Object.keys(v).sort().forEach(function (k) { var n = norm(v[k]); if (n !== null) { o[k] = n; any = true; } });
      return any ? o : null;
    }
    return v;
  }
  function progressBar(done, total) {
    var bar = h('span');
    bar.style.width = Math.round((done / Math.max(total, 1)) * 100) + '%';
    return h('div', { class: 'progress', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(total), 'aria-valuenow': String(done), 'aria-label': 'Launch checklist progress' }, bar);
  }
  var isDirty = function (file) { return S.data && JSON.stringify(norm(S.data[file])) !== JSON.stringify(norm(S.saved[file])); };
  var anyDirty = function () { return TABS.some(function (t) { return t.file && isDirty(t.file); }); };

  function imagesIn(v, out) {
    out = out || new Set();
    if (typeof v === 'string' && v.indexOf('img/') === 0) out.add(v);
    else if (v && typeof v === 'object') Object.keys(v).forEach(function (k) { imagesIn(v[k], out); });
    return out;
  }

  function toast(msg, isError) {
    var t = h('div', { class: 'toast' + (isError ? ' error' : ''), role: isError ? 'alert' : 'status' }, msg);
    toastsEl.append(t);
    setTimeout(function () { t.remove(); }, isError ? 7000 : 3500);
  }

  async function call(method, route, body) {
    var res = await fetch('/api/' + route, {
      method: method,
      credentials: 'same-origin',
      headers: { 'X-Admin-Token': TOKEN, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    var json = {};
    try { json = await res.json(); } catch (e) { /* non-JSON */ }
    if (res.status === 401 && json.login) { renderLogin(); var le = new Error(json.error); le.handled = true; throw le; }
    if (!res.ok) { var err = new Error(json.error || 'Something went wrong. Please try again.'); err.status = res.status; err.json = json; throw err; }
    return json;
  }

  /* ---------------- photos ---------------- */
  function readAsDataURL(blob) {
    return new Promise(function (resolve, reject) { var r = new FileReader(); r.onload = function () { resolve(r.result); }; r.onerror = reject; r.readAsDataURL(blob); });
  }
  // Resize in the browser so photos stay fast on the website (no server-side image library needed).
  async function resize(file, max) {
    var bmp;
    try { bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }); }
    catch (e) { throw new Error('Could not read "' + file.name + '". Please use a JPEG, PNG or WebP photo.'); }
    var scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
    var c = document.createElement('canvas');
    c.width = Math.round(bmp.width * scale);
    c.height = Math.round(bmp.height * scale);
    var ctx = c.getContext('2d');
    ctx.fillStyle = '#fffdf9';
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(bmp, 0, 0, c.width, c.height);
    var blob = await new Promise(function (r) { c.toBlob(r, 'image/jpeg', 0.84); });
    return { data: await readAsDataURL(blob), width: c.width, height: c.height };
  }
  async function upload(file, folder, max, suffix) {
    var r = await resize(file, max);
    var res = await call('POST', 'upload', { folder: folder, name: file.name, data: r.data, suffix: suffix });
    S.uploads.add(res.src);
    return { src: res.src, width: r.width, height: r.height };
  }
  function uploadButton(label, opts, onFiles) {
    var input = h('input', { type: 'file', accept: 'image/jpeg,image/png,image/webp', multiple: opts.multiple || null, 'aria-label': label });
    var btn = h('label', { class: 'btn upload ' + (opts.cls || 'btn-quiet btn-sm') }, label, input);
    input.addEventListener('change', async function () {
      var files = Array.prototype.slice.call(input.files || []);
      input.value = '';
      if (!files.length) return;
      btn.classList.add('is-busy');
      btn.firstChild.textContent = 'Uploading…';
      try { await onFiles(files); }
      catch (e) { if (!e.handled) toast(e.message, true); }
      finally { render(true); }
    });
    return btn;
  }
  // Delete uploaded files that nothing points to any more (after save or discard).
  function cleanupUploads(extraCandidates) {
    var used = new Set();
    Object.keys(S.saved).forEach(function (f) { imagesIn(S.saved[f], used); imagesIn(S.data[f], used); });
    var candidates = new Set(S.uploads);
    (extraCandidates || []).forEach(function (s) { candidates.add(s); });
    candidates.forEach(function (src) {
      if (used.has(src)) return;
      S.uploads.delete(src);
      call('POST', 'delete-image', { src: src }).catch(function () { /* already gone or still referenced */ });
    });
  }

  /* ---------------- form building blocks ---------------- */
  function errFor(file, path) {
    var e = (S.errors[file] || []).find(function (x) { return x.path === path; });
    return e ? e.message : null;
  }
  function changed() { updateChrome(); }

  /** Text-like input bound to obj[key]. */
  function field(file, obj, key, path, label, o) {
    o = o || {};
    var id = nextId('f');
    var err = errFor(file, path);
    var describedBy = [o.hint ? id + '-hint' : null, err ? id + '-err' : null].filter(Boolean).join(' ') || null;
    var input;
    if (o.textarea) input = h('textarea', { id: id, rows: o.rows || 3 });
    else if (o.options) input = h('select', { id: id }, o.options.map(function (p) { return h('option', { value: p[0] }, p[1]); }));
    else input = h('input', { id: id, type: o.type || 'text', autocomplete: o.autocomplete || 'off', inputmode: o.inputmode || null });
    input.value = obj[key] === null || obj[key] === undefined ? '' : obj[key];
    if (o.placeholder) input.placeholder = o.placeholder;
    if (o.maxlength) input.maxLength = o.maxlength;
    if (describedBy) input.setAttribute('aria-describedby', describedBy);
    if (err) input.setAttribute('aria-invalid', 'true');
    if (o.required) input.setAttribute('aria-required', 'true');
    input.addEventListener(o.options ? 'change' : 'input', function () {
      var old = obj[key];
      obj[key] = input.value;
      if (o.onInput) o.onInput(input.value, old);
      changed();
    });
    return h('div', { class: 'field' + (err ? ' has-error' : '') + (o.cls ? ' ' + o.cls : ''), 'data-path': file + ':' + path },
      h('label', { for: id }, label, o.required ? h('span', { class: 'req', 'aria-hidden': 'true' }, ' *') : null),
      input,
      o.hint ? h('p', { class: 'hint', id: id + '-hint' }, o.hint) : null,
      err ? h('p', { class: 'err', id: id + '-err' }, err) : null);
  }
  function check(file, obj, key, path, label, o) {
    o = o || {};
    var err = errFor(file, path);
    var input = h('input', { type: 'checkbox', checked: !!obj[key] });
    if (err) input.setAttribute('aria-invalid', 'true');
    input.addEventListener('change', function () { obj[key] = input.checked; if (o.onChange) o.onChange(input.checked); changed(); });
    return h('div', { class: err ? 'has-error' : '', 'data-path': file + ':' + path },
      h('label', { class: 'check' + (o.consent ? ' consent' : '') }, input, h('span', null, label)),
      err ? h('p', { class: 'err' }, err) : null);
  }
  function moveButtons(list, i, what) {
    var mv = function (d) { return function () { var x = list.splice(i, 1)[0]; list.splice(i + d, 0, x); render(true); }; };
    return [
      h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Move ' + what + ' up', title: 'Move up', disabled: i === 0, onclick: mv(-1) }, '↑'),
      h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Move ' + what + ' down', title: 'Move down', disabled: i === list.length - 1, onclick: mv(1) }, '↓'),
    ];
  }
  function removeButton(list, i, what, confirmText) {
    return h('button', { type: 'button', class: 'btn btn-danger btn-sm', onclick: function () {
      if (confirmText && !window.confirm(confirmText)) return;
      list.splice(i, 1);
      render(true);
    } }, 'Remove', h('span', { class: 'sr-only' }, ' ' + what));
  }
  function errorSummary(file) {
    var errs = S.errors[file] || [];
    if (!errs.length) return null;
    return h('div', { class: 'error-summary', tabindex: '-1', role: 'alert', 'data-error-summary': '' },
      h('h2', null, 'Not saved: please fix ' + (errs.length === 1 ? 'this' : 'these ' + errs.length + ' things')),
      h('ul', null, errs.slice(0, 12).map(function (e) {
        return h('li', null, h('a', { href: '#', onclick: function (ev) {
          ev.preventDefault();
          var el = document.querySelector('[data-path="' + file + ':' + e.path + '"]');
          if (el) { el.scrollIntoView({ block: 'center' }); var inp = el.querySelector('input, textarea, select'); if (inp) inp.focus(); }
        } }, e.message));
      })));
  }
  function pageHead(eyebrow, title, intro, actions) {
    return h('div', { class: 'page-head' }, h('div', null, h('p', { class: 'eyebrow' }, eyebrow), h('h1', null, title), intro ? h('p', { class: 'muted' }, intro) : null), actions || null);
  }

  /* ---------------- save / discard ---------------- */
  async function save(file) {
    if (S.saving) return;
    S.saving = true;
    updateChrome();
    var before = S.saved[file];
    try {
      var r = await call('PUT', 'data/' + file, { value: S.data[file] });
      S.data[file] = r.value;
      S.saved[file] = clone(r.value);
      S.errors[file] = [];
      S.checklist = r.checklist;
      S.build = r.build;
      cleanupUploads(Array.from(imagesIn(before)));
      if (r.build.ok) toast('Saved. The website has been updated.');
      else toast('Saved, but rebuilding the website failed. Details are on the Dashboard.', true);
    } catch (e) {
      if (e.handled) return;
      if (e.status === 422) { S.errors[file] = e.json.errors || []; S.focusErrors = true; }
      toast(e.message, true);
    } finally {
      S.saving = false;
      render(true);
    }
  }
  function discard(file) {
    if (!window.confirm('Discard your unsaved changes on this page?')) return;
    S.data[file] = clone(S.saved[file]);
    S.errors[file] = [];
    cleanupUploads();
    render(true);
  }
  function saveBar(file) {
    var status = h('span', { class: 'status', 'data-save-status': '' });
    var discardBtn = h('button', { type: 'button', class: 'btn btn-quiet', 'data-discard': '', onclick: function () { discard(file); } }, 'Discard changes');
    var saveBtn = h('button', { type: 'button', class: 'btn btn-primary', 'data-save': '', onclick: function () { save(file); } }, 'Save & update website');
    return h('div', { class: 'savebar' }, status, discardBtn, saveBtn);
  }

  function updateChrome() {
    TABS.forEach(function (t) {
      var b = navEl.querySelector('[data-tab="' + t.id + '"] .nav-badge');
      if (!b) return;
      if (t.file && isDirty(t.file)) { b.hidden = false; b.className = 'nav-badge dirty'; b.textContent = '•'; b.title = 'Unsaved changes'; }
      else {
        var todo = S.checklist.filter(function (c) { return c.section === t.id && !c.done; }).length;
        b.hidden = !todo; b.className = 'nav-badge'; b.textContent = todo; b.title = todo + ' to do';
      }
    });
    var tab = TABS.find(function (t) { return t.id === S.tab; });
    var st = $('[data-save-status]');
    if (st && tab && tab.file) {
      var dirty = isDirty(tab.file);
      st.textContent = S.saving ? 'Saving and updating the website…' : dirty ? 'You have unsaved changes' : 'All changes saved';
      st.className = 'status' + (dirty ? ' dirty' : '');
      $('[data-save]').disabled = S.saving || !dirty;
      $('[data-discard]').disabled = S.saving || !dirty;
    }
  }

  /* ---------------- views ---------------- */
  function bookingRoute(site) {
    var c = site.contact || {}, b = site.booking || {};
    if (b.externalUrl) return { ok: true, text: 'Every "Book" button opens your booking platform: ' + b.externalUrl + '. Appointments are managed there.' };
    if (b.formEndpoint) return { ok: true, text: 'Booking requests from the website form are sent to your form service, which emails them to you. You can also see them in that service’s dashboard.' };
    if (c.email) return { ok: true, text: 'The booking form opens the visitor’s email app with a request addressed to ' + c.email + '. Tip: add a form-service address so requests arrive even if the visitor has no email app set up.' };
    if (c.phone && c.phoneAcceptsTexts) return { ok: true, text: 'The booking form opens the visitor’s messages app with a request texted to ' + c.phone + '.' };
    if (c.instagram) return { ok: true, text: 'The booking form prepares a message for the visitor to paste into an Instagram DM to @' + c.instagram + '.' };
    return { ok: false, text: 'Visitors cannot send booking requests yet, so the form is hidden on the website. Add a booking link, a form address, an email, a phone that accepts texts, or Instagram in Business details.' };
  }

  function viewDashboard() {
    var items = S.checklist;
    var done = items.filter(function (i) { return i.done; }).length;
    var route = bookingRoute(S.data.site);
    var b = S.build || {};
    var rebuild = h('button', { type: 'button', class: 'btn btn-quiet btn-sm', onclick: async function () {
      rebuild.disabled = true; rebuild.textContent = 'Rebuilding…';
      try { var r = await call('POST', 'rebuild'); S.build = r.build; S.checklist = r.checklist; toast(r.build.ok ? 'Website rebuilt.' : 'Rebuild failed. See the log below.', !r.build.ok); }
      catch (e) { if (!e.handled) toast(e.message, true); }
      render(true);
    } }, 'Rebuild now');

    return h('div', null,
      pageHead('Admin panel', 'Welcome back', 'Keep the website’s details, services, photos and reviews up to date. Every save updates the website files automatically.'),
      h('div', { class: 'stat-row' },
        h('div', { class: 'card' }, h('p', { class: 'eyebrow' }, 'Launch checklist'), h('p', { class: 'stat' }, done + ' / ' + items.length),
          progressBar(done, items.length),
          h('p', { class: 'small muted' }, done === items.length ? 'Everything is filled in.' : (items.length - done) + ' items still to add.')),
        h('div', { class: 'card' }, h('p', { class: 'eyebrow' }, 'Website'),
          h('div', { class: 'btn-row' }, h('a', { class: 'btn btn-primary btn-sm', href: '/site/', target: '_blank', rel: 'noopener' }, 'View website'), h('a', { class: 'btn btn-quiet btn-sm', href: '/preview/', target: '_blank', rel: 'noopener' }, 'Design preview')),
          h('p', { class: 'small muted mt' }, b.at ? (b.ok ? 'Last updated ' : 'Last update FAILED ') + new Date(b.at).toLocaleString() : 'Updating…'),
          rebuild)),
      h('div', { class: 'card' }, h('h2', null, 'Where booking requests go'),
        h('div', { class: 'note ' + (route.ok ? 'ok' : 'bad') }, h('p', null, route.text)),
        h('p', { class: 'small muted' }, 'The website itself is a set of static pages, so booking requests are not stored in this admin panel. They go to the destination above. The site always tells visitors that a request is not a confirmed appointment until you reply.')),
      h('div', { class: 'card' }, h('div', { class: 'card-head' }, h('h2', null, 'What the website still needs')),
        h('ul', { class: 'checklist' }, items.map(function (i) {
          var tab = TABS.find(function (t) { return t.id === i.section; });
          return h('li', { class: i.done ? 'done' : '' },
            h('span', { class: 'tick', 'aria-hidden': 'true' }, '✓'),
            h('span', { class: 'label' }, h('span', { class: 'sr-only' }, i.done ? 'Done: ' : 'To do: '), i.label, i.note ? h('span', { class: 'small muted' }, ' · ' + i.note) : null),
            h('button', { type: 'button', class: 'btn btn-quiet btn-sm', onclick: function () { go(i.section); } }, i.done ? 'Edit' : 'Add', h('span', { class: 'sr-only' }, ' in ' + tab.label)));
        }))),
      h('div', { class: 'card' }, h('h2', null, 'Publishing your changes'),
        h('p', null, 'Each save rebuilds the finished website in the ', h('code', null, 'dist/'), ' folder. To put it online, upload that folder to your web host, or commit and push if your host deploys from GitHub (Netlify, Cloudflare Pages and Vercel can do this automatically).'),
        h('p', { class: 'small muted' }, 'Only enter information you have confirmed. Anything left blank is hidden on the website or shown as "coming soon". It is never guessed.'),
        b.output ? h('details', null, h('summary', null, 'Technical build log'), h('pre', { class: 'log' }, b.output)) : null));
  }

  function viewDetails() {
    var F = 'site', d = S.data.site;
    d.contact = d.contact || {};
    d.booking = d.booking || {};
    if (!d.contact.addressParts) d.contact.addressParts = { street: null, city: null, region: null, postalCode: null };
    var ap = d.contact.addressParts;
    if (!Array.isArray(d.hours)) d.hours = [];

    var hoursRows = d.hours.map(function (row, i) {
      row.schema = row.schema || { days: [], opens: null, closes: null };
      var sch = row.schema;
      return h('div', { class: 'item' },
        h('div', { class: 'item-head' }, h('span', { class: 'title' }, row.days || 'New row'), moveButtons(d.hours, i, 'row'), removeButton(d.hours, i, 'hours row')),
        h('div', { class: 'grid-2' },
          field(F, row, 'days', 'hours.' + i + '.days', 'Days', { required: true, placeholder: 'e.g. Tuesday – Friday' }),
          field(F, row, 'hours', 'hours.' + i + '.hours', 'Hours', { required: true, placeholder: 'e.g. 10:00 am – 7:00 pm, or Closed' })),
        h('details', { open: sch.days.length ? true : null }, h('summary', null, 'Also tell Google these hours (optional)'),
          h('div', { 'data-path': F + ':hours.' + i + '.schema', class: errFor(F, 'hours.' + i + '.schema') ? 'has-error' : '' },
            h('fieldset', null, h('legend', null, 'Open on'), h('div', { class: 'days' }, DAYS.map(function (dd) {
              var cb = h('input', { type: 'checkbox', checked: sch.days.indexOf(dd[0]) > -1 });
              cb.addEventListener('change', function () {
                sch.days = DAYS.map(function (x) { return x[0]; }).filter(function (code) { return code === dd[0] ? cb.checked : sch.days.indexOf(code) > -1; });
                changed();
              });
              return h('label', { class: 'check' }, cb, dd[1]);
            }))),
            h('div', { class: 'grid-2 mt' },
              field(F, sch, 'opens', 'hours.' + i + '.opens', 'Opens', { type: 'time' }),
              field(F, sch, 'closes', 'hours.' + i + '.closes', 'Closes', { type: 'time' })),
            errFor(F, 'hours.' + i + '.schema') ? h('p', { class: 'err' }, errFor(F, 'hours.' + i + '.schema')) : null)));
    });

    return h('div', null,
      pageHead('Business details', 'Contact, location & booking', 'These details appear across the website, in the footer and in Google search results. Leave anything you are not sure about blank.'),
      errorSummary(F),
      h('div', { class: 'card' }, h('h2', null, 'Contact'),
        h('div', { class: 'grid-2' },
          field(F, d.contact, 'phone', 'contact.phone', 'Phone number', { type: 'tel', placeholder: '(713) 555-0123', hint: 'Becomes a tap-to-call button on phones.', inputmode: 'tel' }),
          field(F, d.contact, 'email', 'contact.email', 'Email address', { type: 'email', placeholder: 'hello@yourspa.com' })),
        check(F, d.contact, 'phoneAcceptsTexts', 'contact.phoneAcceptsTexts', 'This number accepts text messages (adds a "Text us" button)'),
        field(F, d.contact, 'instagram', 'contact.instagram', 'Instagram handle', { placeholder: 'yourspa', hint: 'Without the @. A full Instagram link also works.' })),
      h('div', { class: 'card' }, h('h2', null, 'Location'),
        field(F, ap, 'street', 'contact.addressParts.street', 'Street address', { placeholder: '123 Example St, Suite 4' }),
        h('div', { class: 'grid-3' },
          field(F, ap, 'city', 'contact.addressParts.city', 'City', { placeholder: 'Houston' }),
          field(F, ap, 'region', 'contact.addressParts.region', 'State', { placeholder: 'TX' }),
          field(F, ap, 'postalCode', 'contact.addressParts.postalCode', 'ZIP code', { placeholder: '77002', inputmode: 'numeric' })),
        field(F, d.contact, 'address', 'contact.address', 'Address as shown on the website', { hint: 'Leave blank to use the address above. The map appears once an address is saved.' }),
        field(F, d.contact, 'addressNote', 'contact.addressNote', 'Arrival note', { placeholder: 'e.g. Free parking behind the building' })),
      h('div', { class: 'card' }, h('div', { class: 'card-head' }, h('h2', null, 'Opening hours'),
          h('button', { type: 'button', class: 'btn btn-quiet btn-sm', onclick: function () { d.hours.push({ days: '', hours: '', schema: { days: [], opens: null, closes: null } }); render(true); } }, '+ Add row')),
        hoursRows.length ? hoursRows : h('p', { class: 'empty' }, 'No hours yet. The website says "Opening hours will be published here soon."'),
        field(F, d, 'hoursNote', 'hoursNote', 'Note under the hours', { placeholder: 'e.g. By appointment only' })),
      h('div', { class: 'card' }, h('h2', null, 'Booking'),
        h('p', { class: 'muted small' }, 'Choose how visitors book. If you already use an online booking system, paste its public link. Otherwise, a free form service such as Formspree can email booking requests to you.'),
        field(F, d.booking, 'externalUrl', 'booking.externalUrl', 'Online booking page link', { type: 'url', placeholder: 'https://…', hint: 'e.g. your Vagaro, Square, Fresha, Booksy or GlossGenius page. All "Book" buttons will open it.' }),
        field(F, d.booking, 'externalLabel', 'booking.externalLabel', 'Booking button text', { placeholder: 'Book Online' }),
        field(F, d.booking, 'formEndpoint', 'booking.formEndpoint', 'Form service address', { type: 'url', placeholder: 'https://formspree.io/f/…', hint: 'Booking requests from the website form are sent here and emailed to you.' })),
      h('div', { class: 'card' }, h('h2', null, 'Website & extras'),
        field(F, d, 'siteUrl', 'siteUrl', 'Website address', { type: 'url', placeholder: 'https://www.yourspa.com', hint: 'Your live domain. Needed for Google (sitemap and canonical links).' }),
        field(F, d, 'announcement', 'announcement', 'Announcement bar', { maxlength: 140, hint: 'A slim strip at the top of every page. Only verified news, such as availability. Leave blank to hide it.' }),
        field(F, d, 'googleBusinessUrl', 'googleBusinessUrl', 'Google Business Profile link', { type: 'url', placeholder: 'https://g.page/…' })),
      h('details', { class: 'card' }, h('summary', null, 'Business name & city'),
        h('div', { class: 'grid-2' },
          field(F, d, 'name', 'name', 'Business name', { required: true }),
          field(F, d, 'city', 'city', 'City', { required: true }),
          field(F, d, 'region', 'region', 'State (short)', { required: true }),
          field(F, d, 'regionName', 'regionName', 'State (full name)', { required: true }))),
      saveBar(F));
  }

  function photoPicker(F, obj, key, path, folder, max, label) {
    var src = obj[key];
    var err = errFor(F, path);
    return h('div', { 'data-path': F + ':' + path, class: err ? 'has-error' : '' },
      h('div', { class: 'thumb' }, src ? h('img', { src: media(src), alt: '' }) : 'No photo yet'),
      h('div', { class: 'thumb-actions' },
        uploadButton(src ? 'Replace photo' : 'Upload photo', {}, async function (files) { var r = await upload(files[0], folder, max); obj[key] = r.src; changed(); }),
        src ? h('button', { type: 'button', class: 'btn btn-danger btn-sm', onclick: function () { obj[key] = null; render(true); } }, 'Remove photo') : null),
      err ? h('p', { class: 'err' }, err) : null,
      label ? h('p', { class: 'hint' }, label) : null);
  }

  function viewServices() {
    var F = 'services', cats = S.data.services;
    var addCategory = h('button', { type: 'button', class: 'btn btn-primary btn-sm', onclick: function () { cats.push({ id: '', name: '', intro: null, services: [] }); render(true); } }, '+ Add category');
    var featuredCount = cats.reduce(function (n, c) { return n + c.services.filter(function (s) { return s.featured; }).length; }, 0);
    return h('div', null,
      pageHead('Services', 'Service menu', 'Group your treatments into categories. Only list services you actually offer. Leave price or duration blank if you would rather not show them.', addCategory),
      h('div', { class: 'note' }, h('p', null, 'Homepage: up to three services marked "Show on homepage" are featured (' + featuredCount + ' marked now). If none are marked, the first three are shown.')),
      errorSummary(F),
      cats.length ? null : h('p', { class: 'empty' }, 'No services yet. The website shows "Our full treatment menu is coming soon." Add a category to begin.'),
      cats.map(function (cat, ci) {
        var catTitle = h('h2', { class: 'title' }, cat.name || 'New category');
        return h('section', { class: 'card category', 'aria-label': 'Category ' + (ci + 1) },
          h('div', { class: 'item-head' }, catTitle, moveButtons(cats, ci, 'category'), removeButton(cats, ci, 'category', 'Remove this category and all of its services?')),
          h('div', { class: 'grid-2' },
            field(F, cat, 'name', ci + '.name', 'Category name', { required: true, placeholder: 'e.g. Facials', onInput: function (v, old) { if (!cat.id || cat.id === slugify(old)) cat.id = slugify(v); catTitle.textContent = v || 'New category'; } }),
            field(F, cat, 'intro', ci + '.intro', 'Short introduction', { placeholder: 'Optional' })),
          errFor(F, ci + '.id') ? h('p', { class: 'err', 'data-path': F + ':' + ci + '.id' }, errFor(F, ci + '.id')) : null,
          cat.services.map(function (s, si) {
            var p = ci + '.services.' + si;
            var svcTitle = h('span', { class: 'title' }, s.name || 'New service');
            return h('div', { class: 'item' },
              h('div', { class: 'item-head' }, svcTitle, moveButtons(cat.services, si, 'service'), removeButton(cat.services, si, 'service', 'Remove this service?')),
              h('div', { class: 'item-body' },
                photoPicker(F, s, 'image', p + '.image', 'services', 1400),
                h('div', null,
                  field(F, s, 'name', p + '.name', 'Service name', { required: true, onInput: function (v, old) { if (!s.id || s.id === slugify(old)) s.id = slugify(v); svcTitle.textContent = v || 'New service'; } }),
                  field(F, s, 'description', p + '.description', 'Description', { required: true, textarea: true, rows: 3, maxlength: 400, hint: 'One or two sentences in your own words.' }),
                  h('div', { class: 'grid-2' },
                    field(F, s, 'price', p + '.price', 'Price', { placeholder: 'e.g. $95 or From $60' }),
                    field(F, s, 'duration', p + '.duration', 'Duration', { placeholder: 'e.g. 60 min' })),
                  s.image ? field(F, s, 'imageAlt', p + '.imageAlt', 'Describe the photo', { required: true, hint: 'For visitors using screen readers, and for Google.' }) : null,
                  check(F, s, 'featured', p + '.featured', 'Show on homepage'),
                  errFor(F, p + '.id') ? h('p', { class: 'err', 'data-path': F + ':' + p + '.id' }, errFor(F, p + '.id')) : null)));
          }),
          h('button', { type: 'button', class: 'btn btn-quiet btn-sm', onclick: function () { cat.services.push({ id: '', name: '', description: '', price: null, duration: null, image: null, imageAlt: null, featured: false }); render(true); } }, '+ Add service'));
      }),
      saveBar(F));
  }

  function viewGallery() {
    var F = 'gallery', g = S.data.gallery;
    var cats = [['', 'No category']].concat(g.filters.map(function (f) { return [f.id, f.label]; }));
    var add = uploadButton('+ Upload photos', { multiple: true, cls: 'btn-primary btn-sm' }, async function (files) {
      for (var i = 0; i < files.length; i++) {
        var full = await upload(files[i], 'gallery', 1800);
        var thumb = await upload(files[i], 'gallery', 720, 'thumb');
        g.items.push({ src: full.src, thumb: thumb.src, alt: '', caption: null, category: '', tall: full.height > full.width * 1.15, permission: false });
      }
      toast(files.length + ' photo' + (files.length > 1 ? 's' : '') + ' added. Describe each one, confirm permission, then save.');
    });
    return h('div', null,
      pageHead('Gallery', 'Your photos', 'Show your real space and real work. Photos are resized automatically, and clicking one on the website opens it larger.', add),
      h('div', { class: 'note' }, h('p', null, 'Only add the spa’s own photos that you have permission to publish. Photos of clients’ results need the client’s consent. Please avoid edited or before-and-after images that could promise results.')),
      errorSummary(F),
      g.items.length ? null : h('p', { class: 'empty' }, 'No photos yet. The gallery page says it is being prepared.'),
      h('div', { class: 'gallery-admin' }, g.items.map(function (it, i) {
        var p = 'items.' + i;
        return h('div', { class: 'item' },
          h('div', { class: 'thumb' }, h('img', { src: media(it.thumb || it.src), alt: '' })),
          field(F, it, 'alt', p + '.alt', 'Describe the photo', { required: true, placeholder: 'e.g. Treatment room with soft lighting' }),
          field(F, it, 'caption', p + '.caption', 'Caption', { placeholder: 'Optional' }),
          field(F, it, 'category', p + '.category', 'Category', { options: cats }),
          check(F, it, 'tall', p + '.tall', 'Tall photo (takes two rows)'),
          check(F, it, 'permission', p + '.permission', 'This is the spa’s own photo and I have permission to publish it', { consent: true }),
          h('div', { class: 'btn-row' }, moveButtons(g.items, i, 'photo'), removeButton(g.items, i, 'photo', 'Remove this photo from the gallery?')));
      })),
      saveBar(F));
  }

  function viewReviews() {
    var F = 'testimonials', list = S.data.testimonials;
    var add = h('button', { type: 'button', class: 'btn btn-primary btn-sm', onclick: function () { list.push({ quote: '', author: '', source: null, consent: false }); render(true); } }, '+ Add review');
    return h('div', null,
      pageHead('Reviews', 'Client reviews', 'The reviews section only appears on the website once at least one review is saved. No star ratings are shown.', add),
      h('div', { class: 'note' }, h('p', null, 'Only add real reviews, quoted exactly as the client wrote them (for example from Google or Instagram), and only with the client’s agreement. Please never write or edit a review on someone’s behalf.')),
      errorSummary(F),
      list.length ? null : h('p', { class: 'empty' }, 'No reviews yet.'),
      list.map(function (t, i) {
        return h('div', { class: 'item' },
          h('div', { class: 'item-head' }, h('span', { class: 'title' }, t.author || 'New review'), moveButtons(list, i, 'review'), removeButton(list, i, 'review', 'Remove this review?')),
          field(F, t, 'quote', i + '.quote', 'Review (exact words)', { required: true, textarea: true, rows: 4, maxlength: 800 }),
          h('div', { class: 'grid-2' },
            field(F, t, 'author', i + '.author', 'Client name as they agreed', { required: true, placeholder: 'e.g. Ashley M.' }),
            field(F, t, 'source', i + '.source', 'Where it was posted', { placeholder: 'e.g. Google review' })),
          check(F, t, 'consent', i + '.consent', 'This is a real review and the client agreed to it being published', { consent: true }));
      }),
      saveBar(F));
  }

  function viewPhotos() {
    var F = 'images', imgs = S.data.images;
    return h('div', null,
      pageHead('Site photos', 'Photos around the website', 'Until a photo is added, each spot shows a soft line-drawing in the brand colours. Your own photos work best. Licensed stock is fine for mood shots (towels, plants, textures), but should not be passed off as your space or a client’s result.'),
      errorSummary(F),
      h('div', { class: 'slot-grid' }, Object.keys(imgs).map(function (slot) {
        var it = imgs[slot];
        return h('div', { class: 'card' },
          h('h3', null, SLOT_LABELS[slot] || slot),
          photoPicker(F, it, 'src', slot + '.src', 'photos', 2000, it.caption),
          it.src ? field(F, it, 'alt', slot + '.alt', 'Describe the photo', { required: true }) : null);
      })),
      saveBar(F));
  }

  function viewText() {
    var F = 'copy', c = S.data.copy;
    var ap = c.aboutPreview;
    return h('div', null,
      pageHead('Website text', 'Words on the website', 'Edit the main wording in your own voice. Please keep every sentence true of the spa, and avoid claims about awards, qualifications or years of experience unless you can show them.'),
      errorSummary(F),
      h('div', { class: 'card' }, h('h2', null, 'Homepage hero'),
        field(F, c.hero, 'eyebrow', 'hero.eyebrow', 'Small line above the headline', { required: true }),
        field(F, c.hero, 'title', 'hero.title', 'Headline', { required: true, hint: 'Sentences are placed on separate lines; the last one is shown in gold italics.' }),
        field(F, c.hero, 'lead', 'hero.lead', 'Supporting text', { required: true, textarea: true, rows: 2 })),
      h('div', { class: 'card' }, h('h2', null, 'Homepage "About" section'),
        field(F, ap, 'eyebrow', 'aboutPreview.eyebrow', 'Small label', { required: true }),
        field(F, ap, 'title', 'aboutPreview.title', 'Heading', { required: true }),
        ap.body.map(function (_, i) {
          return h('div', null, field(F, ap.body, i, 'aboutPreview.body.' + i, 'Paragraph ' + (i + 1), { required: true, textarea: true, rows: 3 }),
            ap.body.length > 1 ? removeButton(ap.body, i, 'paragraph') : null);
        }),
        ap.body.length < 4 ? h('button', { type: 'button', class: 'btn btn-quiet btn-sm', onclick: function () { ap.body.push(''); render(true); } }, '+ Add paragraph') : null),
      h('div', { class: 'card' }, h('h2', null, 'About page'),
        field(F, c.aboutPage, 'intro', 'aboutPage.intro', 'Introduction', { required: true, textarea: true, rows: 3 }),
        c.aboutPage.sections.map(function (s, i) {
          return h('div', { class: 'item' },
            field(F, s, 'title', 'aboutPage.sections.' + i + '.title', 'Section ' + (i + 1) + ' heading', { required: true }),
            field(F, s, 'body', 'aboutPage.sections.' + i + '.body', 'Section ' + (i + 1) + ' text', { required: true, textarea: true, rows: 3 }));
        })),
      h('div', { class: 'card' }, h('h2', null, '"Why clients choose us"'),
        c.why.map(function (w, i) {
          return h('div', { class: 'item' },
            field(F, w, 'title', 'why.' + i + '.title', 'Point ' + (i + 1), { required: true }),
            field(F, w, 'body', 'why.' + i + '.body', 'Explanation', { required: true, textarea: true, rows: 2 }));
        })),
      h('div', { class: 'card' }, h('h2', null, 'Booking banner'),
        field(F, c.bookingCta, 'title', 'bookingCta.title', 'Heading', { required: true }),
        field(F, c.bookingCta, 'body', 'bookingCta.body', 'Text', { required: true, textarea: true, rows: 2 })),
      saveBar(F));
  }

  var VIEWS = { dashboard: viewDashboard, details: viewDetails, services: viewServices, gallery: viewGallery, reviews: viewReviews, photos: viewPhotos, text: viewText };

  /* ---------------- shell ---------------- */
  function renderNav() {
    navEl.innerHTML = '';
    TABS.forEach(function (t) {
      navEl.append(h('li', null, h('button', { type: 'button', class: 'nav-item', 'data-tab': t.id, 'aria-current': S.tab === t.id ? 'page' : null, onclick: function () { go(t.id); } },
        h('span', null, t.label), h('span', { class: 'nav-badge', hidden: true }))));
    });
    footEl.innerHTML = '';
    footEl.append(h('a', { href: '/site/', target: '_blank', rel: 'noopener' }, 'View website ↗'), h('a', { href: '/preview/', target: '_blank', rel: 'noopener' }, 'Design preview ↗'));
    if (S.protected) footEl.append(h('button', { type: 'button', class: 'btn btn-quiet btn-sm', onclick: async function () { await call('POST', 'logout'); location.reload(); } }, 'Sign out'));
  }

  function go(tab) {
    if (!VIEWS[tab]) tab = 'dashboard';
    if (location.hash !== '#' + tab) location.hash = tab;
    else { S.tab = tab; render(false); }
  }

  function render(keepScroll) {
    if (!S.data) return;
    var y = window.scrollY;
    renderNav();
    var t = TABS.find(function (x) { return x.id === S.tab; });
    document.title = t.label + ' · Admin · Tush Beauty Spa';
    main.innerHTML = '';
    main.append(VIEWS[S.tab]());
    updateChrome();
    if (S.focusErrors) {
      S.focusErrors = false;
      var es = $('[data-error-summary]');
      if (es) { es.scrollIntoView({ block: 'start' }); es.focus(); return; }
    }
    if (keepScroll) window.scrollTo(0, y);
    else { window.scrollTo(0, 0); main.focus({ preventScroll: true }); }
  }

  function renderLogin() {
    S.data = null;
    navEl.innerHTML = '';
    main.innerHTML = '';
    var pw = h('input', { id: 'pw', type: 'password', autocomplete: 'current-password', required: true });
    var err = h('p', { class: 'err', role: 'alert' });
    var form = h('form', { class: 'card login', onsubmit: async function (e) {
      e.preventDefault();
      err.textContent = '';
      try { await call('POST', 'login', { password: pw.value }); await load(); }
      catch (ex) { err.textContent = ex.message; pw.focus(); }
    } },
      h('h1', null, 'Sign in'), h('p', { class: 'muted' }, 'Tush Beauty Spa admin panel'),
      h('div', { class: 'field' }, h('label', { for: 'pw' }, 'Password'), pw), err,
      h('button', { class: 'btn btn-primary', type: 'submit' }, 'Sign in'));
    main.append(form);
    pw.focus();
  }

  async function load() {
    try {
      var r = await call('GET', 'state');
      S.data = r.data;
      S.saved = clone(r.data);
      S.checklist = r.checklist;
      S.build = r.build;
      S.protected = r.passwordProtected;
      S.tab = VIEWS[location.hash.slice(1)] ? location.hash.slice(1) : 'dashboard';
      render(false);
    } catch (e) {
      if (e.handled) return;
      main.innerHTML = '';
      main.append(h('div', { class: 'note bad' }, h('p', null, e.message)));
    }
  }

  window.addEventListener('hashchange', function () {
    var tab = location.hash.slice(1);
    S.tab = VIEWS[tab] ? tab : 'dashboard';
    render(false);
  });
  window.addEventListener('beforeunload', function (e) {
    if (S.data && anyDirty()) { e.preventDefault(); e.returnValue = ''; }
  });
  // Ctrl/Cmd+S saves the current page.
  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      var t = TABS.find(function (x) { return x.id === S.tab; });
      if (t && t.file && S.data) { e.preventDefault(); if (isDirty(t.file)) save(t.file); }
    }
  });

  load();
})();
