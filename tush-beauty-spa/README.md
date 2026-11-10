# Tush Beauty Spa Houston — Website

A luxury single-page website for Tush Beauty Spa Houston. Plain HTML/CSS/JS with
no build step: open `index.html` or upload this folder as-is to any static host
(GitHub Pages, Netlify, Cloudflare Pages, etc.).

## What's here

```
index.html                 All page content (SEO-friendly, works without JavaScript)
assets/css/main.css        Design system + all styling
assets/js/main.js          Motion, navigation, dialogs, gallery, enquiry form
assets/vendor/             GSAP + ScrollTrigger (animation), Lenis (smooth scroll) — self-hosted
assets/fonts/              Cormorant Garamond, Pinyon Script, Jost (self-hosted woff2)
assets/img/                Optimised photos (WebP + JPEG), favicon, social share image
```

## Sections

Cinematic intro → Hero → Services (7 treatments, each with a Learn More dialog and
Book Now) → About → The Spa Experience gallery (with lightbox) → How booking works →
Booking & Contact (clickable phone numbers + enquiry form) → Footer. A sticky
Call / Book Now bar appears on phones.

## Before publishing — please check

1. **"Deena Planning"** is shown exactly as written on the spa's flyer. Confirm the
   exact service name with the business. Search `Deena Planning` in `index.html`:
   it appears in the service card, the scrolling marquee, the form dropdown and the
   JSON-LD block.
2. **Service descriptions** are written to avoid prices and medical claims. Have the
   business review them.
3. **Photos.** Every photograph on the site is a crop of the spa's own treatment-room
   photo. No stock photos are used. Service cards use original gold line-art instead
   of photos. To add real treatment photos later, put an image inside a card's
   `.service-card__media`:
   `<img class="service-card__photo" src="assets/img/hydrafacial.webp" alt="…" loading="lazy">`
   (higher-resolution originals of the room photo would also sharpen the gallery).

## Enquiry form — where enquiries go

By default the form does **not** send anything to a server. When a visitor submits,
it builds a ready-written text message and opens their phone's Messages app,
addressed to **346-315-5575**. On a computer, it shows the message with Copy and
Call buttons. The note under the form explains this to visitors.

To receive enquiries by email instead, create a form endpoint (for example Formspree)
and either set `formEndpoint` in the `CONFIG` block at the top of `assets/js/main.js`
or add `data-endpoint="https://…"` to the `<form id="enquiryForm">`. The note under the
form updates automatically, and if sending fails, the visitor falls back to the text
message option.

To change the text-message number, edit `smsNumber` / `smsDisplay` in `CONFIG`.

## Customer reviews

No reviews are shown and none have been invented. To show genuine reviews, add them
to the `REVIEWS` array at the top of `assets/js/main.js`:

```js
const REVIEWS = [
  { quote: 'Exact words from the client…', name: 'Client name', detail: 'HydraFacial' },
];
```

The "Kind Words" section appears automatically when the array has entries.

## Social media

No social links are shown because no account URLs were provided. (The flyer shows
the handle "Tushbeautyspa_".) To add one, uncomment the example in the footer of
`index.html` and use the real profile URL.

## Accessibility & performance notes

- Keyboard accessible: skip link, visible focus, Esc closes menu/dialogs, arrow keys in the gallery.
- Respects "reduce motion": no intro, no smooth-scroll or parallax, and all content shows immediately.
- Works without JavaScript (content, phone links and navigation still work).
- Fonts and libraries are self-hosted. Images are lazy-loaded WebP with JPEG fallback.
- Once the site has a domain, add `<link rel="canonical" href="https://your-domain/">` and
  absolute URLs for `og:image` in `index.html`.
