# DIVINE — Fashion Website

A modern, black-and-white fashion website for a clothing brand called
**DIVINE**. Plain HTML, CSS and JavaScript — no build step, no framework,
no installs required.

## What's here

```
index.html              Homepage — hero banner + product section
about.html               About Us page
contact.html             Contact page with a working (demo) form
cart.html                Shopping cart page
assets/css/style.css     All styling (black-and-white theme, responsive)
assets/js/script.js      Product data, cart logic, nav menu, contact form
assets/img/              Hero graphic, page graphic, and product icons (SVG)
```

## How to run it on your laptop

You don't need to install anything special — it's just static files.

**Easiest way:**
1. Download / clone this project folder onto your laptop.
2. Double-click `index.html`. It will open in your default web browser.
3. Click around — Home, Shop, About, Contact, Cart all work locally.

**Better way (recommended), using a local server:**
Opening the file directly works fine for this site, but running a tiny local
server avoids a few browser quirks and is good practice for web projects.

- If you have [VS Code](https://code.visualstudio.com/), install the
  **Live Server** extension, right-click `index.html`, and choose
  "Open with Live Server".
- If you have Python installed, open a terminal in this folder and run:
  ```
  python3 -m http.server 8000
  ```
  then visit `http://localhost:8000` in your browser.
- If you have Node.js installed:
  ```
  npx serve .
  ```

## How the site works

- **Homepage (`index.html`)** — full-width hero banner (background image is
  `assets/img/hero-bg.svg`) plus a "Shop Best Sellers" section that lists
  products.
- **Products** — defined once, as a plain JavaScript array (`PRODUCTS`) at
  the top of `assets/js/script.js`. Both the homepage and the cart page read
  from this same list, so you only ever update a product in one place.
- **Shopping cart** — clicking "Add to Cart" saves the item to the browser's
  `localStorage`, so the cart remembers your items even after a page reload
  (on the same browser/device). The cart icon in the header always shows the
  current item count. The cart page (`cart.html`) lets you change quantities,
  remove items, and see a subtotal/shipping/total breakdown.
- **Checkout** — this is a front-end demo, so the "Checkout" button just
  shows a message. To take real payments you'd connect it to a service like
  Stripe Checkout or Shopify.
- **Contact form** — works entirely in the browser (no backend), so
  submitting it just shows a confirmation message and doesn't actually send
  an email yet. To make it send real emails, sign up for a free form service
  like [Formspree](https://formspree.io) and point the form's `action`
  attribute at your Formspree endpoint in `contact.html`.

## Customizing

- **Products**: edit the `PRODUCTS` array at the top of `assets/js/script.js`
  (name, price, image path).
- **Product images**: currently simple line-art SVG icons in `assets/img/`
  so the site works instantly with no photos needed. Swap in real product
  photography by replacing those files (or changing the `image` path in
  `PRODUCTS` to point at your own `.jpg`/`.png` files).
- **Colors**: all colors are defined as CSS variables at the top of
  `assets/css/style.css` (`:root { --black: ...; --white: ...; }`) — change
  them there to re-theme the whole site.
- **Text/branding**: search each HTML file for "DIVINE" / "Divine" to update
  copy, and edit the contact details directly in `contact.html`.

## Browser support

Works in all modern browsers (Chrome, Firefox, Safari, Edge). No Internet
connection is required to browse the site itself — the only external
resource is the Google Fonts stylesheet, and the site falls back to a
system font automatically if that can't load.
