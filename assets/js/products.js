(function () {
  "use strict";

  /* ------------------------------------------------------------------
   * Loads published products from Supabase and renders them into both
   * the "What We Build" grid (category-style cards) and the "Our Work"
   * gallery (lightbox thumbnails) — same data, two layouts, same cards
   * the site already used. Category filter buttons apply to the grid.
   * ------------------------------------------------------------------ */

  document.addEventListener("DOMContentLoaded", function () {
    if (!window.sb) {
      console.error("Supabase client not available — check supabase-config.js is loaded first.");
      showLoadError();
      return;
    }
    loadProducts();
  });

  function els() {
    return {
      filters: document.getElementById("category-filters"),
      categoryGrid: document.getElementById("category-grid"),
      categoryLoading: document.getElementById("category-loading"),
      categoryEmpty: document.getElementById("category-empty"),
      galleryGrid: document.getElementById("gallery-grid"),
      galleryLoading: document.getElementById("gallery-loading"),
      galleryEmpty: document.getElementById("gallery-empty")
    };
  }

  function showLoadError() {
    var e = els();
    [
      [e.categoryLoading, e.categoryEmpty],
      [e.galleryLoading, e.galleryEmpty]
    ].forEach(function (pair) {
      var loading = pair[0], empty = pair[1];
      if (loading) loading.hidden = true;
      if (empty) {
        empty.textContent = "Couldn't load our work right now — please message us on WhatsApp instead.";
        empty.hidden = false;
      }
    });
  }

  function loadProducts() {
    window.sb
      .from("products")
      .select("*")
      .eq("published", true)
      .order("sort_order", { ascending: true })
      .then(function (res) {
        if (res.error) throw res.error;
        var products = res.data || [];
        renderCategoryGrid(products);
        renderGallery(products);
      })
      .catch(function (err) {
        console.error("Failed to load products:", err);
        showLoadError();
      });
  }

  /* ---------- "What We Build" grid + filters ---------- */

  function renderCategoryGrid(products) {
    var e = els();
    if (e.categoryLoading) e.categoryLoading.hidden = true;

    if (!products.length) {
      if (e.categoryEmpty) e.categoryEmpty.hidden = false;
      return;
    }

    if (e.filters) renderFilters(e.filters, e.categoryGrid, products);

    e.categoryGrid.innerHTML = "";
    products.forEach(function (p) {
      e.categoryGrid.appendChild(buildCategoryCard(p));
    });
  }

  function renderFilters(filtersEl, categoryGrid, products) {
    var categories = [];
    products.forEach(function (p) {
      if (p.category && categories.indexOf(p.category) === -1) categories.push(p.category);
    });
    if (categories.length < 2) return;

    filtersEl.innerHTML = "";
    filtersEl.appendChild(makeFilterButton(filtersEl, categoryGrid, "all", "All", true));
    categories.forEach(function (cat) {
      filtersEl.appendChild(makeFilterButton(filtersEl, categoryGrid, cat, cat, false));
    });
    filtersEl.hidden = false;
  }

  function makeFilterButton(filtersEl, categoryGrid, value, label, active) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "filter-btn" + (active ? " is-active" : "");
    btn.textContent = label;
    btn.setAttribute("data-filter", value);
    btn.addEventListener("click", function () {
      Array.prototype.forEach.call(filtersEl.querySelectorAll(".filter-btn"), function (b) {
        b.classList.toggle("is-active", b === btn);
      });
      Array.prototype.forEach.call(categoryGrid.querySelectorAll(".category-card"), function (card) {
        card.hidden = value !== "all" && card.getAttribute("data-category") !== value;
      });
      if (window.SIT_trackEvent) window.SIT_trackEvent("category_filter_click", { category: value });
    });
    return btn;
  }

  function buildCategoryCard(p) {
    var card = document.createElement("article");
    card.className = "category-card";
    card.setAttribute("data-category", p.category || "");

    var thumb = document.createElement("div");
    thumb.className = "thumb";
    var img = document.createElement("img");
    img.src = p.image_url || "";
    img.alt = p.name ? p.name + " built by Simple Interior Tech" : "";
    img.loading = "lazy";
    img.width = 1000;
    img.height = 750;
    thumb.appendChild(img);

    var body = document.createElement("div");
    body.className = "body";
    var h3 = document.createElement("h3");
    h3.textContent = p.name || "";
    body.appendChild(h3);
    if (p.description) {
      var desc = document.createElement("p");
      desc.textContent = p.description;
      body.appendChild(desc);
    }

    card.appendChild(thumb);
    card.appendChild(body);
    return card;
  }

  /* ---------- "Our Work" gallery ---------- */

  function renderGallery(products) {
    var e = els();
    if (e.galleryLoading) e.galleryLoading.hidden = true;

    if (!products.length) {
      if (e.galleryEmpty) e.galleryEmpty.hidden = false;
      return;
    }

    e.galleryGrid.innerHTML = "";
    products.forEach(function (p) {
      e.galleryGrid.appendChild(buildGalleryItem(p));
    });

    if (typeof window.SIT_initLightbox === "function") window.SIT_initLightbox();
  }

  function buildGalleryItem(p) {
    var btn = document.createElement("button");
    btn.className = "gallery-item";
    btn.type = "button";
    btn.setAttribute("data-full", p.image_url || "");
    btn.setAttribute("data-caption", p.name || "");

    var img = document.createElement("img");
    img.src = p.image_url || "";
    img.alt = p.name ? p.name + " built by Simple Interior Tech" : "";
    img.loading = "lazy";
    img.width = 480;
    img.height = 360;

    var cap = document.createElement("span");
    cap.className = "cap";
    cap.textContent = p.name || "";

    btn.appendChild(img);
    btn.appendChild(cap);
    return btn;
  }
})();
