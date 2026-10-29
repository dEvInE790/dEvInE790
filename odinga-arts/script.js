/* ==========================================================================
   Odinga Arts & Sculpture — script.js
   1. Header & mobile navigation
   2. Active section highlighting
   3. Image placeholders
   4. Project filters & lightbox
   5. Scroll reveal
   6. Contact form (validation + delivery)
   ========================================================================== */
(function () {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  /* 1. Header & mobile navigation ---------------------------------------- */
  const header = $(".site-header");
  const nav = $("#primary-nav");
  const toggle = $(".nav-toggle");
  const toggleLabel = $(".visually-hidden", toggle);

  const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 8);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  function setMenu(open) {
    nav.classList.toggle("is-open", open);
    document.body.classList.toggle("nav-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggleLabel.textContent = open ? "Close menu" : "Open menu";
  }

  toggle.addEventListener("click", () => setMenu(!nav.classList.contains("is-open")));
  nav.addEventListener("click", (e) => {
    if (e.target.closest("a")) setMenu(false);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && nav.classList.contains("is-open")) {
      setMenu(false);
      toggle.focus();
    }
  });
  window.matchMedia("(min-width: 961px)").addEventListener("change", (e) => {
    if (e.matches) setMenu(false);
  });

  /* 2. Active section highlighting --------------------------------------- */
  const navLinks = $$('.primary-nav a[href^="#"]:not(.btn)');
  const sections = navLinks
    .map((a) => document.getElementById(a.getAttribute("href").slice(1)))
    .filter(Boolean);

  if ("IntersectionObserver" in window) {
    const spy = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          navLinks.forEach((a) =>
            a.classList.toggle("is-active", a.getAttribute("href") === "#" + entry.target.id)
          );
        });
      },
      { rootMargin: "-45% 0px -50% 0px" }
    );
    sections.forEach((s) => spy.observe(s));
  }

  /* 3. Image placeholders -------------------------------------------------
     Each .media box shows a labelled placeholder. When its <img> loads, the
     photo fades in on top; if the file is missing the placeholder stays. */
  $$(".media img").forEach((img) => {
    const box = img.closest(".media");
    const loaded = () => box.classList.add("is-loaded");
    const missing = () => box.classList.add("is-missing");
    if (img.complete) {
      img.naturalWidth > 0 ? loaded() : missing();
    } else {
      img.addEventListener("load", loaded, { once: true });
      img.addEventListener("error", missing, { once: true });
    }
  });

  /* 4. Project filters & lightbox ---------------------------------------- */
  const filters = $$(".filter");
  const items = $$(".gallery-item");

  filters.forEach((btn) => {
    btn.addEventListener("click", () => {
      const cat = btn.dataset.filter;
      filters.forEach((b) => {
        const active = b === btn;
        b.classList.toggle("is-active", active);
        b.setAttribute("aria-pressed", String(active));
      });
      items.forEach((item) => {
        item.hidden = cat !== "all" && item.dataset.category !== cat;
        if (!item.hidden) item.classList.add("is-visible");
      });
    });
  });

  const lightbox = $("#lightbox");
  const lbImg = $("img", lightbox);
  const lbCap = $("figcaption", lightbox);
  let lastFocus = null;

  function openLightbox(img, caption) {
    lastFocus = document.activeElement;
    lbImg.src = img.currentSrc || img.src;
    lbImg.alt = img.alt;
    lbCap.textContent = caption;
    lightbox.hidden = false;
    document.body.style.overflow = "hidden";
    $(".lightbox-close", lightbox).focus();
  }
  function closeLightbox() {
    lightbox.hidden = true;
    lbImg.removeAttribute("src");
    document.body.style.overflow = "";
    if (lastFocus) lastFocus.focus();
  }

  items.forEach((item) => {
    const box = $(".media", item);
    const img = $("img", item);
    const caption = $("figcaption", item).textContent.trim();
    const open = () => {
      if (box.classList.contains("is-loaded")) openLightbox(img, caption);
    };
    box.addEventListener("click", open);
    box.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        open();
      }
    });
    // Make real photos keyboard-reachable once they have loaded.
    img.addEventListener("load", () => {
      box.tabIndex = 0;
      box.setAttribute("role", "button");
      box.setAttribute("aria-label", "View larger: " + img.alt);
    });
    if (box.classList.contains("is-loaded")) img.dispatchEvent(new Event("load"));
  });

  lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox || e.target.closest(".lightbox-close")) closeLightbox();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !lightbox.hidden) closeLightbox();
  });

  /* 5. Scroll reveal ------------------------------------------------------ */
  const reveals = $$(".reveal");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
    );
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add("is-visible"));
  }

  /* 6. Contact form ------------------------------------------------------- */
  const form = $("#contact-form");
  const status = $("#form-status");
  const serviceSelect = $("#f-service");

  // "Enquire about this" links pre-select the service.
  $$("[data-service]").forEach((link) => {
    link.addEventListener("click", () => {
      serviceSelect.value = link.dataset.service;
      clearError(serviceSelect);
    });
  });

  const rules = {
    name: (v) => (v.trim().length >= 2 ? "" : "Please enter your full name."),
    phone: (v) => {
      const digits = v.replace(/\D/g, "");
      if (!v.trim()) return "Please enter a phone number so we can reach you.";
      if (!/^[+\d\s()-]+$/.test(v) || digits.length < 10 || digits.length > 15)
        return "Please enter a valid phone number, e.g. 0803 000 0000 or +234 803 000 0000.";
      return "";
    },
    email: (v) =>
      !v.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim())
        ? ""
        : "Please enter a valid email address, or leave this blank.",
    service: (v) => (v ? "" : "Please choose the service you need."),
    message: (v) =>
      v.trim().length >= 15 ? "" : "Please tell us a little more about your project (at least 15 characters).",
  };

  function showError(field, msg) {
    field.setAttribute("aria-invalid", "true");
    $("#" + field.id + "-err").textContent = msg;
  }
  function clearError(field) {
    field.removeAttribute("aria-invalid");
    $("#" + field.id + "-err").textContent = "";
  }
  function validateField(field) {
    const msg = rules[field.name](field.value);
    msg ? showError(field, msg) : clearError(field);
    return !msg;
  }

  const fields = Object.keys(rules).map((name) => form.elements[name]);
  fields.forEach((field) => {
    field.addEventListener("blur", () => {
      if (field.value || field.hasAttribute("aria-invalid")) validateField(field);
    });
    field.addEventListener("input", () => {
      if (field.hasAttribute("aria-invalid")) validateField(field);
    });
  });

  function setStatus(msg, type) {
    status.textContent = msg;
    status.className = "form-status" + (type ? " is-" + type : "");
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    setStatus("", "");

    const invalid = fields.filter((f) => !validateField(f));
    if (invalid.length) {
      invalid[0].focus();
      setStatus("Please check the highlighted fields.", "error");
      return;
    }
    if (form.elements.company.value) return; // spam trap filled in

    const data = Object.fromEntries(new FormData(form));
    delete data.company;
    const endpoint = form.getAttribute("action");
    const whatsapp = (form.dataset.whatsapp || "").replace(/\D/g, "");
    const submitBtn = $('button[type="submit"]', form);

    // Option A: a form endpoint (e.g. Formspree) is set in the action attribute.
    if (endpoint) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Sending…";
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { Accept: "application/json" },
          body: new FormData(form),
        });
        if (!res.ok) throw new Error(res.statusText);
        form.reset();
        setStatus("Thank you, " + data.name.split(" ")[0] + ". Your inquiry has been sent — we will be in touch soon.", "success");
      } catch (err) {
        setStatus("Sorry, your inquiry could not be sent. Please try again, or contact us by phone or WhatsApp.", "error");
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Submit Inquiry";
      }
      return;
    }

    // Option B: open WhatsApp with the inquiry pre-filled.
    if (whatsapp) {
      const text = [
        "Hello Odinga Arts & Sculpture, I would like a quote.",
        "",
        "Name: " + data.name,
        "Phone: " + data.phone,
        data.email ? "Email: " + data.email : null,
        "Service: " + data.service,
        "",
        data.message,
      ]
        .filter((line) => line !== null)
        .join("\n");
      window.open("https://wa.me/" + whatsapp + "?text=" + encodeURIComponent(text), "_blank", "noopener");
      setStatus("WhatsApp has opened with your inquiry — just press send to reach us.", "success");
      return;
    }

    // Neither is configured yet (see README).
    console.warn("Contact form: set the form's action (endpoint) or data-whatsapp number in index.html.");
    setStatus("Online inquiries are not connected yet. Please contact us using the details on this page.", "error");
  });

  /* Footer year */
  const year = $("#year");
  if (year) year.textContent = new Date().getFullYear();
})();
