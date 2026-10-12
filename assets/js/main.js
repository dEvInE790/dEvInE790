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
  // Re-run after dynamically-inserted gallery/category items appear (see
  // products.js) — safe to call more than once since each only binds
  // listeners to items found at call time (the initial DOMContentLoaded
  // call is a no-op: 0 items yet).
  window.SIT_initLightbox = initLightbox;
  window.SIT_initProductModal = initProductModal;

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
    initProductModal();
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
   * Product details popup — opened from "What We Build" cards. Reads
   * data-* attributes set on each card by products.js (same pattern as
   * the gallery lightbox above, which reads data-full/data-caption).
   * ------------------------------------------------------------------ */
  var WHATSAPP_NUMBER = "2348136925971"; // same number used site-wide

  function initProductModal() {
    var cards = Array.prototype.slice.call(document.querySelectorAll(".category-card"));
    var modal = document.getElementById("product-modal");
    if (!cards.length || !modal) return;

    var imgEl = modal.querySelector(".product-modal-img");
    var categoryEl = document.getElementById("product-modal-category");
    var nameEl = document.getElementById("product-modal-name");
    var descEl = document.getElementById("product-modal-desc");
    var waEl = document.getElementById("product-modal-whatsapp");
    var closeBtn = modal.querySelector(".lightbox-close");
    var lastFocused = null;

    function open(card) {
      var name = card.getAttribute("data-name") || "";
      var category = card.getAttribute("data-category") || "";
      var description = card.getAttribute("data-description") || "";
      var image = card.getAttribute("data-full") || "";

      imgEl.src = image;
      imgEl.alt = name;
      categoryEl.textContent = category;
      categoryEl.hidden = !category;
      nameEl.textContent = name;
      descEl.textContent = description;
      descEl.hidden = !description;
      waEl.href =
        "https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent("Hi, I'm interested in " + name);

      lastFocused = document.activeElement;
      modal.hidden = false;
      document.body.style.overflow = "hidden";
      closeBtn.focus();
      trackEvent("product_modal_open", { name: name });
    }

    function close() {
      modal.hidden = true;
      document.body.style.overflow = "";
      if (lastFocused) lastFocused.focus();
    }

    cards.forEach(function (card) {
      card.addEventListener("click", function () {
        open(card);
      });
      card.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
          e.preventDefault();
          open(card);
        }
      });
    });

    closeBtn.addEventListener("click", close);
    modal.addEventListener("click", function (e) {
      if (e.target === modal) close();
    });
    document.addEventListener("keydown", function (e) {
      if (modal.hidden) return;
      if (e.key === "Escape") close();
    });
  }

  // Contact form submission (save to Supabase leads table) lives in
  // assets/js/leads.js, loaded after this file.
})();
