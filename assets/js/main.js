(function () {
  "use strict";

  /* ------------------------------------------------------------------
   * Analytics: provider-agnostic click/pageview tracking.
   * Wire up a real provider (GA4, Plausible, Fathom...) by dropping its
   * snippet in index.html <head> — this just forwards events to whatever
   * it finds (window.gtag or window.plausible), and always logs to
   * console + localStorage so it works before analytics is configured.
   * ------------------------------------------------------------------ */
  function trackEvent(name, params) {
    params = params || {};
    try {
      if (typeof window.gtag === "function") {
        window.gtag("event", name, params);
      } else if (typeof window.plausible === "function") {
        window.plausible(name, { props: params });
      }
    } catch (e) {
      /* analytics must never break the page */
    }
    try {
      var log = JSON.parse(localStorage.getItem("sit_events") || "[]");
      log.push({ name: name, params: params, t: Date.now() });
      localStorage.setItem("sit_events", JSON.stringify(log.slice(-50)));
    } catch (e) {
      /* storage unavailable (private mode, quota) — ignore */
    }
  }
  window.SIT_trackEvent = trackEvent;

  document.addEventListener("DOMContentLoaded", function () {
    trackEvent("page_view", { path: location.pathname });

    // Track every outbound WhatsApp / email / phone / social click.
    document.querySelectorAll("[data-track]").forEach(function (el) {
      el.addEventListener("click", function () {
        trackEvent(el.getAttribute("data-track"), {
          href: el.getAttribute("href") || ""
        });
      });
    });

    initHeaderScroll();
    initLightbox();
    initContactForm();
  });

  /* ------------------------------------------------------------------
   * Header: solid background once the hero photo has scrolled past.
   * ------------------------------------------------------------------ */
  function initHeaderScroll() {
    var header = document.querySelector(".site-header");
    if (!header) return;
    var toggle = function () {
      header.classList.toggle("is-scrolled", window.scrollY > 40);
    };
    toggle();
    window.addEventListener("scroll", toggle, { passive: true });
  }

  /* ------------------------------------------------------------------
   * Lightbox gallery — keyboard + touch friendly, no dependencies.
   * ------------------------------------------------------------------ */
  function initLightbox() {
    var items = Array.prototype.slice.call(document.querySelectorAll(".gallery-item"));
    var lightbox = document.getElementById("lightbox");
    if (!items.length || !lightbox) return;

    var imgEl = lightbox.querySelector("img");
    var capEl = lightbox.querySelector("figcaption");
    var closeBtn = lightbox.querySelector(".lightbox-close");
    var prevBtn = lightbox.querySelector(".lightbox-prev");
    var nextBtn = lightbox.querySelector(".lightbox-next");
    var currentIndex = 0;
    var lastFocused = null;

    function show(index) {
      currentIndex = (index + items.length) % items.length;
      var el = items[currentIndex];
      var full = el.getAttribute("data-full") || el.querySelector("img").src;
      var caption = el.getAttribute("data-caption") || "";
      imgEl.src = full;
      imgEl.alt = el.querySelector("img").alt || caption;
      capEl.textContent = caption;
    }

    function open(index) {
      lastFocused = document.activeElement;
      show(index);
      lightbox.hidden = false;
      document.body.style.overflow = "hidden";
      closeBtn.focus();
      trackEvent("gallery_open", { index: index });
    }

    function close() {
      lightbox.hidden = true;
      document.body.style.overflow = "";
      if (lastFocused) lastFocused.focus();
    }

    items.forEach(function (el, i) {
      el.addEventListener("click", function () {
        open(i);
      });
    });

    closeBtn.addEventListener("click", close);
    prevBtn.addEventListener("click", function () {
      show(currentIndex - 1);
    });
    nextBtn.addEventListener("click", function () {
      show(currentIndex + 1);
    });

    lightbox.addEventListener("click", function (e) {
      if (e.target === lightbox) close();
    });

    document.addEventListener("keydown", function (e) {
      if (lightbox.hidden) return;
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") show(currentIndex - 1);
      if (e.key === "ArrowRight") show(currentIndex + 1);
    });

    // basic swipe support
    var touchStartX = null;
    lightbox.addEventListener(
      "touchstart",
      function (e) {
        touchStartX = e.changedTouches[0].clientX;
      },
      { passive: true }
    );
    lightbox.addEventListener(
      "touchend",
      function (e) {
        if (touchStartX === null) return;
        var dx = e.changedTouches[0].clientX - touchStartX;
        if (Math.abs(dx) > 40) show(currentIndex + (dx < 0 ? 1 : -1));
        touchStartX = null;
      },
      { passive: true }
    );
  }

  /* ------------------------------------------------------------------
   * Contact form.
   *
   * No backend/CMS is in scope for v1, so this posts to an external form
   * endpoint if one is configured (recommended: https://formspree.io or
   * similar — put the endpoint in the form's action attribute in
   * index.html). If no endpoint is configured, it falls back to opening
   * the visitor's email client with the message pre-filled so nothing is
   * silently lost — see README "Contact form" section before launch.
   * ------------------------------------------------------------------ */
  function initContactForm() {
    var form = document.getElementById("contact-form");
    if (!form) return;
    var status = document.getElementById("form-status");
    var endpoint = form.getAttribute("action") || "";
    var usesRealEndpoint = /^https?:\/\//.test(endpoint) && endpoint.indexOf("REPLACE_WITH") === -1;

    form.addEventListener("submit", function (e) {
      var name = form.elements["name"].value.trim();
      var contact = form.elements["contact"].value.trim();
      var message = form.elements["message"].value.trim();

      if (!name || !contact || !message) {
        e.preventDefault();
        setStatus("Please fill in your name, a way to reach you, and a short message.", "error");
        return;
      }

      if (!usesRealEndpoint) {
        e.preventDefault();
        var to = form.getAttribute("data-fallback-email") || "";
        var subject = encodeURIComponent("Quote request from website — " + name);
        var body = encodeURIComponent(
          "Name: " + name + "\nContact: " + contact + "\n\n" + message
        );
        window.location.href = "mailto:" + to + "?subject=" + subject + "&body=" + body;
        setStatus("Opening your email app to send this — if nothing opens, email us directly below.", "success");
        trackEvent("contact_form_mailto_fallback");
        return;
      }

      e.preventDefault();
      setStatus("Sending…", "");
      fetch(endpoint, {
        method: "POST",
        headers: { Accept: "application/json" },
        body: new FormData(form)
      })
        .then(function (res) {
          if (res.ok) {
            setStatus("Thanks — we've received your message and will reply soon.", "success");
            form.reset();
            trackEvent("contact_form_submit");
          } else {
            throw new Error("Form endpoint returned " + res.status);
          }
        })
        .catch(function () {
          setStatus("Something went wrong sending that. Please WhatsApp or email us directly instead.", "error");
          trackEvent("contact_form_error");
        });
    });

    function setStatus(text, state) {
      status.textContent = text;
      status.setAttribute("data-state", state || "");
    }
  }
})();
