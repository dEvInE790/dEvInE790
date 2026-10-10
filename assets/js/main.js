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
  // Re-run after dynamically-inserted gallery items appear (see products.js) —
  // safe to call more than once since it only binds listeners to items found
  // at call time (the initial DOMContentLoaded call is a no-op: 0 items yet).
  window.SIT_initLightbox = initLightbox;

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

  // Contact form submission (save to Supabase leads table) lives in
  // assets/js/leads.js, loaded after this file.
})();
