(function () {
  "use strict";

  var MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
  var PRODUCTS_BUCKET = "products";

  var editingId = null; // null = adding a new product; otherwise the id being edited
  var editingImageUrl = ""; // existing image_url kept if no new file is chosen on edit
  var selectedFile = null;

  document.addEventListener("DOMContentLoaded", function () {
    window.AdminAuth.requireAdminOrRedirect().then(function (result) {
      if (!result) return; // already redirected to login
      document.getElementById("loading-screen").hidden = true;
      document.getElementById("admin-app").hidden = false;
      initTabs();
      initLogout();
      initProductForm();
      loadProducts();
      loadLeads();
    });
  });

  /* ---------- Shell: tabs + logout ---------- */

  function initTabs() {
    var tabs = document.querySelectorAll(".admin-tab");
    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        tabs.forEach(function (t) {
          t.classList.toggle("is-active", t === tab);
        });
        document.getElementById("panel-products").hidden = tab.getAttribute("data-tab") !== "products";
        document.getElementById("panel-leads").hidden = tab.getAttribute("data-tab") !== "leads";
      });
    });
  }

  function initLogout() {
    document.getElementById("logout-btn").addEventListener("click", function () {
      window.AdminAuth.signOut("login.html");
    });
  }

  /* ---------- Products: list ---------- */

  function loadProducts() {
    var loading = document.getElementById("products-loading");
    var empty = document.getElementById("products-empty");
    var list = document.getElementById("products-list");

    loading.hidden = false;
    empty.hidden = true;

    window.sb
      .from("products")
      .select("*")
      .order("sort_order", { ascending: true })
      .then(function (res) {
        loading.hidden = true;
        if (res.error) throw res.error;
        var products = res.data || [];
        list.innerHTML = "";
        if (!products.length) {
          empty.hidden = false;
          return;
        }
        products.forEach(function (p) {
          list.appendChild(buildProductCard(p));
        });
      })
      .catch(function (err) {
        loading.hidden = true;
        empty.textContent = "Couldn't load products: " + (err.message || "unknown error");
        empty.hidden = false;
      });
  }

  function buildProductCard(p) {
    var card = document.createElement("div");
    card.className = "item-card";

    var img = document.createElement("img");
    img.className = "item-thumb";
    img.src = p.image_url || "";
    img.alt = "";
    card.appendChild(img);

    var body = document.createElement("div");
    body.className = "item-body";

    var title = document.createElement("p");
    title.className = "item-title";
    title.appendChild(document.createTextNode(p.name || "(untitled)"));
    var badge = document.createElement("span");
    badge.className = "badge " + (p.published ? "badge-published" : "badge-draft");
    badge.textContent = p.published ? "Published" : "Draft";
    title.appendChild(badge);
    body.appendChild(title);

    var meta = document.createElement("p");
    meta.className = "item-meta";
    meta.textContent = [p.category, p.price].filter(Boolean).join(" · ");
    body.appendChild(meta);

    if (p.description) {
      var desc = document.createElement("p");
      desc.className = "item-desc";
      desc.textContent = p.description;
      body.appendChild(desc);
    }

    card.appendChild(body);

    var actions = document.createElement("div");
    actions.className = "item-actions";

    var toggleRow = document.createElement("label");
    toggleRow.className = "toggle-row";
    var toggleInput = document.createElement("input");
    toggleInput.type = "checkbox";
    toggleInput.checked = !!p.published;
    toggleInput.addEventListener("change", function () {
      toggleInput.disabled = true;
      window.sb
        .from("products")
        .update({ published: toggleInput.checked })
        .eq("id", p.id)
        .then(function (res) {
          if (res.error) throw res.error;
          p.published = toggleInput.checked;
          badge.className = "badge " + (p.published ? "badge-published" : "badge-draft");
          badge.textContent = p.published ? "Published" : "Draft";
          toggleInput.disabled = false;
        })
        .catch(function (err) {
          alert("Couldn't update: " + (err.message || "unknown error"));
          toggleInput.checked = !toggleInput.checked;
          toggleInput.disabled = false;
        });
    });
    toggleRow.appendChild(toggleInput);
    toggleRow.appendChild(document.createTextNode("Published"));
    actions.appendChild(toggleRow);

    var sortRow = document.createElement("label");
    sortRow.className = "toggle-row";
    sortRow.appendChild(document.createTextNode("Sort"));
    var sortInput = document.createElement("input");
    sortInput.type = "number";
    sortInput.step = "1";
    sortInput.className = "sort-input";
    sortInput.value = p.sort_order != null ? p.sort_order : 0;
    sortInput.addEventListener("change", function () {
      var value = parseInt(sortInput.value, 10) || 0;
      sortInput.disabled = true;
      window.sb
        .from("products")
        .update({ sort_order: value })
        .eq("id", p.id)
        .then(function (res) {
          if (res.error) throw res.error;
          p.sort_order = value;
          sortInput.disabled = false;
        })
        .catch(function (err) {
          alert("Couldn't update sort order: " + (err.message || "unknown error"));
          sortInput.value = p.sort_order != null ? p.sort_order : 0;
          sortInput.disabled = false;
        });
    });
    sortRow.appendChild(sortInput);
    actions.appendChild(sortRow);

    var btnRow = document.createElement("div");
    btnRow.className = "item-actions-row";

    var editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "btn btn-outline btn-small";
    editBtn.textContent = "Edit";
    editBtn.addEventListener("click", function () {
      openProductForm(p);
    });
    btnRow.appendChild(editBtn);

    var deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "btn btn-danger btn-small";
    deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("click", function () {
      if (!window.confirm('Delete "' + (p.name || "this product") + '"? This can\'t be undone.')) return;
      deleteBtn.disabled = true;
      window.sb
        .from("products")
        .delete()
        .eq("id", p.id)
        .then(function (res) {
          if (res.error) throw res.error;
          loadProducts();
        })
        .catch(function (err) {
          alert("Couldn't delete: " + (err.message || "unknown error"));
          deleteBtn.disabled = false;
        });
    });
    btnRow.appendChild(deleteBtn);

    actions.appendChild(btnRow);
    card.appendChild(actions);
    return card;
  }

  /* ---------- Products: add / edit form ---------- */

  function initProductForm() {
    var form = document.getElementById("product-form");
    var addBtn = document.getElementById("add-product-btn");
    var cancelBtn = document.getElementById("product-cancel-btn");
    var imageInput = document.getElementById("product-image");
    var imagePreview = document.getElementById("product-image-preview");
    var imageHint = document.getElementById("product-image-hint");

    addBtn.addEventListener("click", function () {
      openProductForm(null);
    });
    cancelBtn.addEventListener("click", closeProductForm);

    imageInput.addEventListener("change", function () {
      imageHint.textContent = "";
      var file = imageInput.files && imageInput.files[0];
      if (!file) {
        selectedFile = null;
        return;
      }
      if (file.type.indexOf("image/") !== 0) {
        imageHint.textContent = "Please choose an image file.";
        imageInput.value = "";
        selectedFile = null;
        return;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        imageHint.textContent = "That file is too large — the limit is 5MB.";
        imageInput.value = "";
        selectedFile = null;
        return;
      }
      selectedFile = file;
      imagePreview.src = URL.createObjectURL(file);
      imagePreview.hidden = false;
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      saveProduct();
    });
  }

  function openProductForm(product) {
    var form = document.getElementById("product-form");
    var title = document.getElementById("product-form-title");
    var status = document.getElementById("product-form-status");
    var imagePreview = document.getElementById("product-image-preview");
    var imageInput = document.getElementById("product-image");

    editingId = product ? product.id : null;
    editingImageUrl = product && product.image_url ? product.image_url : "";
    selectedFile = null;
    imageInput.value = "";
    status.textContent = "";

    document.getElementById("product-name").value = product ? product.name || "" : "";
    document.getElementById("product-category").value = product ? product.category || "" : "";
    document.getElementById("product-price").value = product ? product.price || "" : "";
    document.getElementById("product-sort-order").value = product && product.sort_order != null ? product.sort_order : 0;
    document.getElementById("product-description").value = product ? product.description || "" : "";
    document.getElementById("product-published").checked = product ? !!product.published : false;

    if (editingImageUrl) {
      imagePreview.src = editingImageUrl;
      imagePreview.hidden = false;
    } else {
      imagePreview.hidden = true;
      imagePreview.src = "";
    }

    title.textContent = product ? "Edit product" : "Add product";
    form.hidden = false;
    form.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function closeProductForm() {
    var form = document.getElementById("product-form");
    form.reset();
    document.getElementById("product-image-preview").hidden = true;
    document.getElementById("product-form-status").textContent = "";
    editingId = null;
    editingImageUrl = "";
    selectedFile = null;
    form.hidden = true;
  }

  function saveProduct() {
    var status = document.getElementById("product-form-status");
    var saveBtn = document.getElementById("product-save-btn");

    var name = document.getElementById("product-name").value.trim();
    var category = document.getElementById("product-category").value.trim();
    var price = document.getElementById("product-price").value.trim();
    var sortOrder = parseInt(document.getElementById("product-sort-order").value, 10) || 0;
    var description = document.getElementById("product-description").value.trim();
    var published = document.getElementById("product-published").checked;

    if (!name) {
      status.textContent = "Please enter a product name.";
      status.setAttribute("data-state", "error");
      return;
    }
    if (!category) {
      status.textContent = "Please enter a category.";
      status.setAttribute("data-state", "error");
      return;
    }

    saveBtn.disabled = true;
    status.setAttribute("data-state", "");
    status.textContent = selectedFile ? "Uploading photo…" : "Saving…";

    uploadImageIfNeeded()
      .then(function (imageUrl) {
        var record = {
          name: name,
          category: category,
          price: price || null,
          description: description || null,
          sort_order: sortOrder,
          published: published,
          image_url: imageUrl
        };

        var query = editingId
          ? window.sb.from("products").update(record).eq("id", editingId)
          : window.sb.from("products").insert(record);

        return query;
      })
      .then(function (res) {
        if (res.error) throw res.error;
        closeProductForm();
        loadProducts();
      })
      .catch(function (err) {
        status.setAttribute("data-state", "error");
        status.textContent = "Couldn't save: " + (err.message || "unknown error");
        saveBtn.disabled = false;
      });
  }

  function uploadImageIfNeeded() {
    if (!selectedFile) {
      return Promise.resolve(editingImageUrl || null);
    }
    var ext = (selectedFile.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    var path = Date.now() + "-" + Math.random().toString(36).slice(2) + "." + ext;

    return window.sb.storage
      .from(PRODUCTS_BUCKET)
      .upload(path, selectedFile, { contentType: selectedFile.type, upsert: true })
      .then(function (res) {
        if (res.error) throw res.error;
        var publicUrlResult = window.sb.storage.from(PRODUCTS_BUCKET).getPublicUrl(res.data.path);
        return publicUrlResult.data.publicUrl;
      });
  }

  /* ---------- Leads ---------- */

  function loadLeads() {
    var loading = document.getElementById("leads-loading");
    var empty = document.getElementById("leads-empty");
    var list = document.getElementById("leads-list");

    loading.hidden = false;
    empty.hidden = true;

    window.sb
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false })
      .then(function (res) {
        loading.hidden = true;
        if (res.error) throw res.error;
        var leads = res.data || [];
        list.innerHTML = "";
        if (!leads.length) {
          empty.hidden = false;
          return;
        }
        leads.forEach(function (lead) {
          list.appendChild(buildLeadCard(lead));
        });
      })
      .catch(function (err) {
        loading.hidden = true;
        empty.textContent = "Couldn't load leads: " + (err.message || "unknown error");
        empty.hidden = false;
      });
  }

  function buildLeadCard(lead) {
    var card = document.createElement("div");
    card.className = "item-card";

    var body = document.createElement("div");
    body.className = "item-body";

    var title = document.createElement("p");
    title.className = "item-title";
    title.appendChild(document.createTextNode(lead.name || "(no name)"));
    var badge = document.createElement("span");
    badge.className = "badge " + (lead.handled ? "badge-handled" : "badge-unhandled");
    badge.textContent = lead.handled ? "Handled" : "New";
    title.appendChild(badge);
    body.appendChild(title);

    var metaParts = [];
    if (lead.interest) metaParts.push(lead.interest);
    if (lead.created_at) metaParts.push(formatDate(lead.created_at));
    if (metaParts.length) {
      var meta = document.createElement("p");
      meta.className = "item-meta";
      meta.textContent = metaParts.join(" · ");
      body.appendChild(meta);
    }

    if (lead.email) {
      var emailP = document.createElement("p");
      emailP.className = "item-meta";
      emailP.textContent = lead.email;
      body.appendChild(emailP);
    }

    if (lead.message) {
      var msg = document.createElement("p");
      msg.className = "item-desc";
      msg.textContent = lead.message;
      body.appendChild(msg);
    }

    if (lead.phone) {
      var linkRow = document.createElement("div");
      linkRow.className = "lead-contact-links";

      var callLink = document.createElement("a");
      callLink.className = "call";
      callLink.href = "tel:" + lead.phone.replace(/\s+/g, "");
      callLink.textContent = "📞 " + lead.phone;
      linkRow.appendChild(callLink);

      var digits = lead.phone.replace(/\D/g, "");
      var waLink = document.createElement("a");
      waLink.className = "whatsapp";
      waLink.href = "https://wa.me/" + digits;
      waLink.target = "_blank";
      waLink.rel = "noopener";
      waLink.textContent = "WhatsApp";
      linkRow.appendChild(waLink);

      body.appendChild(linkRow);
    }

    card.appendChild(body);

    var actions = document.createElement("div");
    actions.className = "item-actions";
    var handleBtn = document.createElement("button");
    handleBtn.type = "button";
    handleBtn.className = "btn btn-small " + (lead.handled ? "btn-outline" : "btn-dark");
    handleBtn.textContent = lead.handled ? "Mark unhandled" : "Mark handled";
    handleBtn.addEventListener("click", function () {
      var newValue = !lead.handled;
      handleBtn.disabled = true;
      window.sb
        .from("leads")
        .update({ handled: newValue })
        .eq("id", lead.id)
        .then(function (res) {
          if (res.error) throw res.error;
          lead.handled = newValue;
          badge.className = "badge " + (lead.handled ? "badge-handled" : "badge-unhandled");
          badge.textContent = lead.handled ? "Handled" : "New";
          handleBtn.className = "btn btn-small " + (lead.handled ? "btn-outline" : "btn-dark");
          handleBtn.textContent = lead.handled ? "Mark unhandled" : "Mark handled";
          handleBtn.disabled = false;
        })
        .catch(function (err) {
          alert("Couldn't update: " + (err.message || "unknown error"));
          handleBtn.disabled = false;
        });
    });
    actions.appendChild(handleBtn);
    card.appendChild(actions);

    return card;
  }

  function formatDate(iso) {
    try {
      return new Date(iso).toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch (e) {
      return iso;
    }
  }
})();
