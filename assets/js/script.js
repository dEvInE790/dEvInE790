/* =========================================================
   DIVINE — shared site script
   Handles: product data, mobile nav, shopping cart (localStorage),
   cart page rendering, and the contact form.
   ========================================================= */

/* ---------- Product catalogue ----------
   Single source of truth. Both the homepage (featured products)
   and the cart page (to look up name/price/image by id) read this. */
const PRODUCTS = [
  { id: 1, name: "Noir A-Line Dress",   price: 89.00,  image: "assets/img/product-dress.svg" },
  { id: 2, name: "Structured Blazer",   price: 129.00, image: "assets/img/product-jacket.svg" },
  { id: 3, name: "Tailored Trousers",   price: 74.00,  image: "assets/img/product-trousers.svg" },
  { id: 4, name: "Classic Poplin Shirt",price: 59.00,  image: "assets/img/product-shirt.svg" },
  { id: 5, name: "Pleated Midi Skirt",  price: 68.00,  image: "assets/img/product-skirt.svg" },
  { id: 6, name: "Oversized Wool Coat", price: 189.00, image: "assets/img/product-coat.svg" },
  { id: 7, name: "Monochrome Sneakers", price: 99.00,  image: "assets/img/product-sneakers.svg" },
  { id: 8, name: "Structured Tote Bag", price: 79.00,  image: "assets/img/product-bag.svg" },
];

/* ---------- Cart storage helpers ----------
   The cart is just an array of { id, qty } saved to localStorage,
   so it survives a page reload but stays on this one browser. */
function getCart() {
  const raw = localStorage.getItem("divine_cart");
  return raw ? JSON.parse(raw) : [];
}

function saveCart(cart) {
  localStorage.setItem("divine_cart", JSON.stringify(cart));
  updateCartCount();
}

function addToCart(productId) {
  const cart = getCart();
  const existing = cart.find((item) => item.id === productId);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({ id: productId, qty: 1 });
  }
  saveCart(cart);
}

function removeFromCart(productId) {
  const cart = getCart().filter((item) => item.id !== productId);
  saveCart(cart);
  renderCartPage();
}

function setQuantity(productId, qty) {
  const cart = getCart();
  const item = cart.find((i) => i.id === productId);
  if (!item) return;
  item.qty = Math.max(1, qty);
  saveCart(cart);
  renderCartPage();
}

function cartItemCount() {
  return getCart().reduce((total, item) => total + item.qty, 0);
}

function updateCartCount() {
  document.querySelectorAll("[data-cart-count]").forEach((el) => {
    el.textContent = cartItemCount();
  });
}

/* ---------- Homepage: render featured products ---------- */
function renderProductGrid() {
  const grid = document.getElementById("product-grid");
  if (!grid) return;

  grid.innerHTML = PRODUCTS.map((product) => `
    <article class="product-card">
      <div class="product-card__image">
        <img src="${product.image}" alt="${product.name}" loading="lazy" />
      </div>
      <h3 class="product-card__name">${product.name}</h3>
      <p class="product-card__price">$${product.price.toFixed(2)}</p>
      <button class="btn btn--outline" data-add-to-cart="${product.id}">
        Add to Cart
      </button>
    </article>
  `).join("");

  grid.querySelectorAll("[data-add-to-cart]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = Number(button.getAttribute("data-add-to-cart"));
      addToCart(id);
      const original = button.textContent;
      button.textContent = "Added ✓";
      setTimeout(() => (button.textContent = original), 1200);
    });
  });
}

/* ---------- Cart page: render full cart ---------- */
function renderCartPage() {
  const container = document.getElementById("cart-container");
  if (!container) return;

  const cart = getCart();

  if (cart.length === 0) {
    container.innerHTML = `
      <div class="cart-empty">
        <p>Your cart is empty.</p>
        <a href="index.html#shop" class="btn btn--solid">Continue Shopping</a>
      </div>
    `;
    const summary = document.getElementById("cart-summary");
    if (summary) summary.innerHTML = "";
    return;
  }

  const rows = cart.map((item) => {
    const product = PRODUCTS.find((p) => p.id === item.id);
    if (!product) return "";
    const lineTotal = product.price * item.qty;
    return `
      <div class="cart-row">
        <div class="cart-row__image">
          <img src="${product.image}" alt="${product.name}" />
        </div>
        <div class="cart-row__details">
          <h3>${product.name}</h3>
          <p class="cart-row__price">$${product.price.toFixed(2)}</p>
        </div>
        <div class="cart-row__qty">
          <button class="qty-btn" data-decrease="${product.id}" aria-label="Decrease quantity">−</button>
          <input type="number" min="1" value="${item.qty}" data-qty-input="${product.id}" aria-label="Quantity" />
          <button class="qty-btn" data-increase="${product.id}" aria-label="Increase quantity">+</button>
        </div>
        <div class="cart-row__total">$${lineTotal.toFixed(2)}</div>
        <button class="cart-row__remove" data-remove="${product.id}" aria-label="Remove item">✕</button>
      </div>
    `;
  }).join("");

  container.innerHTML = rows;

  container.querySelectorAll("[data-remove]").forEach((btn) => {
    btn.addEventListener("click", () => removeFromCart(Number(btn.getAttribute("data-remove"))));
  });
  container.querySelectorAll("[data-increase]").forEach((btn) => {
    const id = Number(btn.getAttribute("data-increase"));
    btn.addEventListener("click", () => {
      const current = getCart().find((i) => i.id === id);
      setQuantity(id, current.qty + 1);
    });
  });
  container.querySelectorAll("[data-decrease]").forEach((btn) => {
    const id = Number(btn.getAttribute("data-decrease"));
    btn.addEventListener("click", () => {
      const current = getCart().find((i) => i.id === id);
      setQuantity(id, current.qty - 1);
    });
  });
  container.querySelectorAll("[data-qty-input]").forEach((input) => {
    const id = Number(input.getAttribute("data-qty-input"));
    input.addEventListener("change", () => setQuantity(id, Number(input.value)));
  });

  const subtotal = cart.reduce((total, item) => {
    const product = PRODUCTS.find((p) => p.id === item.id);
    return total + (product ? product.price * item.qty : 0);
  }, 0);

  const summary = document.getElementById("cart-summary");
  if (summary) {
    const shipping = subtotal > 0 ? 9.0 : 0;
    const total = subtotal + shipping;
    summary.innerHTML = `
      <div class="summary-row"><span>Subtotal</span><span>$${subtotal.toFixed(2)}</span></div>
      <div class="summary-row"><span>Shipping</span><span>$${shipping.toFixed(2)}</span></div>
      <div class="summary-row summary-row--total"><span>Total</span><span>$${total.toFixed(2)}</span></div>
      <button class="btn btn--solid btn--full" id="checkout-btn">Checkout</button>
    `;
    document.getElementById("checkout-btn").addEventListener("click", () => {
      alert("This is a demo store — checkout isn't connected to real payments yet.");
    });
  }
}

/* ---------- Mobile nav toggle ---------- */
function initMobileNav() {
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.querySelector(".site-nav");
  if (!toggle || !nav) return;

  toggle.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
  });

  nav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      nav.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
    });
  });
}

/* ---------- Contact form (no backend — demo only) ---------- */
function initContactForm() {
  const form = document.getElementById("contact-form");
  if (!form) return;

  const status = document.getElementById("form-status");

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const name = form.querySelector("#name").value.trim();
    const email = form.querySelector("#email").value.trim();
    const message = form.querySelector("#message").value.trim();

    if (!name || !email || !message) {
      status.textContent = "Please fill in all fields.";
      status.className = "form-status form-status--error";
      return;
    }

    // No backend is connected — this just confirms the form works.
    // See the README for how to hook this up to a real email service.
    status.textContent = `Thanks, ${name}! Your message has been received. We'll reply to ${email} soon.`;
    status.className = "form-status form-status--success";
    form.reset();
  });
}

/* ---------- Init on every page ---------- */
document.addEventListener("DOMContentLoaded", () => {
  updateCartCount();
  initMobileNav();
  renderProductGrid();
  renderCartPage();
  initContactForm();

  // set the footer year automatically
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();
});
