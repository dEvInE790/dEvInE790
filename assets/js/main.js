(function () {
  "use strict";

  /* ------------------------------------------------------------------
   * Analytics (optional). Forwards contact and gallery clicks to GA4 or
   * Plausible if their snippet has been added to index.html. Does
   * nothing otherwise.
   * ------------------------------------------------------------------ */
  function trackEvent(name, params) {
    try {
      if (typeof window.gtag === "function") {
        window.gtag("event", name, params || {});
      } else if (typeof window.plausible === "function") {
        window.plausible(name, { props: params || {} });
      }
    } catch (e) {
      /* analytics must never break the page */
    }
  }

  document.querySelectorAll("[data-track]").forEach(function (el) {
    el.addEventListener("click", function () {
      trackEvent(el.getAttribute("data-track"));
    });
  });

  var year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  initNav();
  initLightbox();

  /* ------------------------------------------------------------------
   * Mobile navigation toggle.
   * ------------------------------------------------------------------ */
  function initNav() {
    var toggle = document.querySelector(".nav-toggle");
    var nav = document.getElementById("site-nav");
    if (!toggle || !nav) return;

    function setOpen(open) {
      toggle.setAttribute("aria-expanded", String(open));
      nav.classList.toggle("is-open", open);
    }

    toggle.addEventListener("click", function () {
      setOpen(toggle.getAttribute("aria-expanded") !== "true");
    });

    nav.addEventListener("click", function (e) {
      if (e.target.closest("a")) setOpen(false);
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("is-open")) {
        setOpen(false);
        toggle.focus();
      }
    });
  }

  /* ------------------------------------------------------------------
   * Gallery lightbox: keyboard, tap and swipe friendly.
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
    var current = 0;
    var lastFocused = null;

    function show(index) {
      current = (index + items.length) % items.length;
      var item = items[current];
      var thumb = item.querySelector("img");
      imgEl.src = item.getAttribute("data-full") || thumb.src;
      imgEl.alt = thumb.alt;
      capEl.textContent = thumb.alt + "  (" + (current + 1) + " of " + items.length + ")";

      // Warm the cache for the next photo so swiping feels instant.
      var next = items[(current + 1) % items.length].getAttribute("data-full");
      if (next) new Image().src = next;
    }

    function open(index) {
      lastFocused = document.activeElement;
      show(index);
      lightbox.hidden = false;
      document.body.style.overflow = "hidden";
      closeBtn.focus();
      trackEvent("gallery_open", { photo: index + 1 });
    }

    function close() {
      lightbox.hidden = true;
      document.body.style.overflow = "";
      if (lastFocused) lastFocused.focus();
    }

    items.forEach(function (item, i) {
      item.setAttribute("aria-label", "View larger: " + item.querySelector("img").alt);
      item.addEventListener("click", function () {
        open(i);
      });
    });

    closeBtn.addEventListener("click", close);
    prevBtn.addEventListener("click", function () {
      show(current - 1);
    });
    nextBtn.addEventListener("click", function () {
      show(current + 1);
    });

    // Tapping the dark backdrop closes the viewer.
    lightbox.addEventListener("click", function (e) {
      if (e.target === lightbox || e.target.classList.contains("lightbox-figure")) close();
    });

    document.addEventListener("keydown", function (e) {
      if (lightbox.hidden) return;
      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft") show(current - 1);
      else if (e.key === "ArrowRight") show(current + 1);
      else if (e.key === "Tab") trapFocus(e);
    });

    function trapFocus(e) {
      var focusable = [closeBtn, prevBtn, nextBtn];
      var idx = focusable.indexOf(document.activeElement);
      e.preventDefault();
      var step = e.shiftKey ? -1 : 1;
      focusable[(idx + step + focusable.length) % focusable.length].focus();
    }

    var startX = null;
    var startY = null;
    lightbox.addEventListener("touchstart", function (e) {
      startX = e.changedTouches[0].clientX;
      startY = e.changedTouches[0].clientY;
    }, { passive: true });
    lightbox.addEventListener("touchend", function (e) {
      if (startX === null) return;
      var dx = e.changedTouches[0].clientX - startX;
      var dy = e.changedTouches[0].clientY - startY;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
        show(current + (dx < 0 ? 1 : -1));
      }
      startX = null;
    }, { passive: true });
  }
})();
