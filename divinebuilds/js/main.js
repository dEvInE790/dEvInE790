/* Divinebuilds — renders the cards from data.js and runs the small UI effects.
   You normally don't need to edit this file: change data.js instead. */
(function () {
  "use strict";
  document.documentElement.classList.remove("no-js");

  // Escape text from data.js before putting it into HTML.
  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function tagsHtml(tags) {
    if (!tags || !tags.length) return "";
    return '<ul class="tags" aria-label="Tags">' +
      tags.map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("") + "</ul>";
  }

  // A real link when url is set, otherwise a disabled "Coming soon" button.
  function linkButton(url, label, extraAttrs, cls) {
    cls = cls || "btn btn--primary";
    if (!url) {
      return '<span class="' + cls + '" role="link" aria-disabled="true">' +
        esc(label) + " · Coming soon</span>";
    }
    return '<a class="' + cls + '" href="' + esc(url) + '"' + (extraAttrs || "") + ">" + esc(label) + "</a>";
  }

  var STATUS_LABELS = { "live": "Live", "beta": "Beta", "in-progress": "In progress" };

  function renderApps() {
    var grid = document.getElementById("apps-grid");
    if (!grid || typeof APPS === "undefined") return;

    grid.innerHTML = APPS.map(function (app) {
      var icon = app.icon
        ? '<img src="' + esc(app.icon) + '" alt="' + esc(app.name) + ' app icon" width="56" height="56" loading="lazy">'
        : '<span aria-hidden="true">' + esc((app.name || "?").charAt(0)) + "</span>";
      var status = STATUS_LABELS[app.status]
        ? '<span class="badge badge--' + esc(app.status) + '">' + STATUS_LABELS[app.status] + "</span>"
        : "";
      // A file hosted with the site downloads directly; a full link (e.g. an
      // Expo build page) opens in a new tab, where the browser ignores "download".
      var apkExternal = /^https?:\/\//i.test(app.apkUrl || "");
      var apkAttrs = apkExternal
        ? ' target="_blank" rel="noopener"'
        : ' download="' + esc(app.apkUrl ? app.apkUrl.split("/").pop() : "") + '"';

      return '' +
        '<article class="card app reveal">' +
          '<div class="app__top">' +
            '<div class="app__icon">' + icon + "</div>" +
            "<div><h3>" + esc(app.name) + "</h3>" + status + "</div>" +
          "</div>" +
          '<p class="card__desc">' + esc(app.description) + "</p>" +
          tagsHtml(app.tags) +
          '<div class="app__downloads">' +
            '<div class="download">' +
              linkButton(app.apkUrl, "Download for Android (APK)", apkAttrs) +
              '<p class="download__note">Your phone may ask you to allow installs from this source. Tap Settings and allow it, then open the file.</p>' +
            "</div>" +
            '<div class="download">' +
              linkButton(app.testflightUrl, "Get on iPhone (TestFlight)", ' target="_blank" rel="noopener"', "btn btn--ghost") +
              '<p class="download__note">Opens TestFlight. Install the free TestFlight app first.</p>' +
            "</div>" +
          "</div>" +
        "</article>";
    }).join("");
  }

  function renderSites() {
    var grid = document.getElementById("sites-grid");
    if (!grid || typeof WEBSITES === "undefined") return;

    grid.innerHTML = WEBSITES.map(function (site) {
      var shot = site.image
        ? '<img src="' + esc(site.image) + '" alt="Screenshot of the ' + esc(site.name) + ' website" loading="lazy">'
        : '<span aria-hidden="true">screenshot coming soon</span>';
      return '' +
        '<article class="card site reveal">' +
          '<div class="site__shot">' + shot + "</div>" +
          "<h3>" + esc(site.name) + "</h3>" +
          '<p class="card__desc">' + esc(site.description) + "</p>" +
          tagsHtml(site.tags) +
          '<div class="site__link">' +
            linkButton(site.url, "Visit site", ' target="_blank" rel="noopener"', "btn btn--ghost btn--block") +
          "</div>" +
        "</article>";
    }).join("");
  }

  function renderContact() {
    if (typeof CONFIG === "undefined") return;
    var actions = document.getElementById("contact-actions");
    var socials = document.getElementById("contact-socials");

    var html = "";
    if (CONFIG.email) {
      html += '<a class="btn btn--primary" href="mailto:' + esc(CONFIG.email) + '">Email me</a>';
    }
    if (CONFIG.whatsapp) {
      var wa = "https://wa.me/" + encodeURIComponent(CONFIG.whatsapp) +
        (CONFIG.whatsappMessage ? "?text=" + encodeURIComponent(CONFIG.whatsappMessage) : "");
      html += '<a class="btn btn--ghost" href="' + esc(wa) + '" target="_blank" rel="noopener">' +
        "WhatsApp " + esc(CONFIG.phoneDisplay || "+" + CONFIG.whatsapp) + "</a>";
    }
    if (CONFIG.youtube) {
      html += '<a class="btn btn--ghost" href="' + esc(CONFIG.youtube) + '" target="_blank" rel="noopener">YouTube</a>';
    }
    if (actions) actions.innerHTML = html;

    // Plain-text details so people can copy them.
    var details = document.getElementById("contact-details");
    if (details) {
      var rows = "";
      if (CONFIG.email) rows += "<div><dt>Email</dt><dd>" + esc(CONFIG.email) + "</dd></div>";
      if (CONFIG.whatsapp) rows += "<div><dt>Phone / WhatsApp</dt><dd>" + esc(CONFIG.phoneDisplay || "+" + CONFIG.whatsapp) + "</dd></div>";
      details.innerHTML = rows;
    }

    var names = { github: "GitHub", x: "X", instagram: "Instagram", linkedin: "LinkedIn", tiktok: "TikTok" };
    var links = Object.keys(CONFIG.socials || {}).filter(function (k) { return CONFIG.socials[k]; });
    if (socials) {
      socials.innerHTML = links.map(function (k) {
        return '<a href="' + esc(CONFIG.socials[k]) + '" target="_blank" rel="noopener">' + esc(names[k] || k) + "</a>";
      }).join("");
    }
  }

  function setupNav() {
    var toggle = document.querySelector(".nav__toggle");
    var links = document.getElementById("nav-links");
    if (!toggle || !links) return;

    function setOpen(open) {
      links.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    }
    toggle.addEventListener("click", function () {
      setOpen(toggle.getAttribute("aria-expanded") !== "true");
    });
    links.addEventListener("click", function (e) {
      if (e.target.closest("a")) setOpen(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") setOpen(false);
    });
  }

  function typeTagline() {
    var el = document.querySelector(".typed");
    if (!el) return;
    var text = el.getAttribute("data-text") || "";
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.textContent = text;
      return;
    }
    var i = 0;
    (function step() {
      el.textContent = text.slice(0, i);
      if (i++ < text.length) setTimeout(step, 45 + Math.random() * 45);
    })();
  }

  function setupReveal() {
    var items = document.querySelectorAll(".reveal");
    if (!("IntersectionObserver" in window)) {
      items.forEach(function (el) { el.classList.add("is-visible"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    items.forEach(function (el) { io.observe(el); });
  }

  renderApps();
  renderSites();
  renderContact();
  setupNav();
  typeTagline();
  setupReveal();
  document.getElementById("year").textContent = new Date().getFullYear();
})();
