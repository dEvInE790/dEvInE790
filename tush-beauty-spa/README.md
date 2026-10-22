# Tush Beauty Spa — website

A five-page website for Tush Beauty Spa, Houston, TX: **Home, Services, About, Gallery, Contact & Booking**, plus a 404 page.

It is a static site with no runtime dependencies. A small Node build script (`build.js`, also no dependencies) assembles the pages from reusable components and a single file of business details.

```
npm run build      # builds dist/ (the real site) and preview/ (design preview)
npm run check      # lists every business detail that still needs the owner's input
npm run serve      # http://localhost:8080 (dist/)
npm run serve:preview   # http://localhost:8081 (preview/)
npm test           # end-to-end tests (needs Playwright; see below)
```

- **`dist/`** is the website to deploy. Upload the folder to any static host (Netlify, Cloudflare Pages, Vercel, GitHub Pages, S3…).
- **`preview/`** is a design preview. Every empty slot is filled with clearly labelled `[placeholder]` text and image notes, so the full layout can be reviewed. It is marked `noindex` and has a "Design preview" banner. **Never deploy `preview/` as the live site.**

## Honest-content rules built into the site

The brief asked for no invented facts, and the code enforces it:

| If this is missing… | the site does this |
|---|---|
| Services | Shows "menu coming soon" with an "Ask about a treatment" link. No assumed treatments. |
| Gallery photos | Hides the homepage gallery (or links to Instagram once a handle is set). The Gallery page shows "being prepared". Stock photos are **not** used here. |
| Reviews | Hides the testimonials section entirely. No star ratings are ever shown. |
| Phone / address / hours | Shows a "coming soon" line. No map until the address is set. These are left out of structured data. |
| Any way to receive bookings | Shows a notice instead of the booking form, so there is never a form that goes nowhere. |
| Photos for hero, about, etc. | Shows quiet line-art panels in the brand colours, not imitation photography. |
| Announcement | Hides the announcement bar. |

## Going live: what the owner needs to supply

Run `npm run check` at any time for the current list. Everything is edited in **`src/site.config.js`** and **`src/content/`**:

1. **Contact details** (`site.config.js`): phone (and whether it accepts texts), email, Instagram handle, full address (+ `addressParts` for Google), opening hours.
2. **Booking** (`site.config.js → booking`):
   - If the spa already uses a booking platform (Vagaro, Square, Fresha, Booksy, GlossGenius, Acuity…), paste its public link into `externalUrl`. Every "Book" button then goes straight there, and the "how booking works" copy switches to the instant-booking version.
   - Otherwise, create a free form endpoint (e.g. [Formspree](https://formspree.io)) and paste it into `formEndpoint`. Booking requests then arrive in the owner's inbox.
   - With neither set, the form falls back to opening the visitor's **email app**, then **text message**, then an **Instagram DM**, using whichever details exist. Each of these clearly tells the visitor that they still need to press send, and that the request is not a confirmed booking.
3. **Services** (`content/services.js`): name, short description, and price / duration only if confirmed, plus a photo. Group them into categories. Mark 3 as `featured` for the homepage.
4. **Photos**: put files in `src/static/img/` and reference them as `img/...`.
   - `content/images.js`: hero, about, booking-banner photos. The spa's own photos are best. Licensed stock is acceptable for mood shots only.
   - `content/gallery.js`: **only** the spa's own photos, with permission. Results photos need client consent. No misleading before/after images.
   - Export JPEGs at roughly 1600px on the long edge and 80% quality, to keep the site fast.
5. **Reviews** (`content/testimonials.js`): real, approved reviews, quoted exactly.
6. **Copy** (`content/copy.js`): read every sentence and keep only what is true of the spa. The "Why choose us" points come from the brief (personalised care, a welcoming space, simple booking). Confirm they describe the business.
7. **Domain**: set `siteUrl` to enable canonical links, absolute Open Graph URLs, `sitemap.xml` and the sitemap line in `robots.txt`.
8. Optional: `announcement` (verified updates only, e.g. availability; no invented offers) and `googleBusinessUrl`.

Then run `npm run build` and deploy `dist/`.

## Code map

```
build.js                 Build script (dist/, preview/, --check)
serve.js                 Local static server for testing
src/site.config.js       ★ All business facts
src/content/             ★ services, gallery, testimonials, images, editable copy
src/content/preview-sample.js   Placeholder data used ONLY by the preview build
src/components/
  layout.js              <head> SEO/Open Graph, LocalBusiness JSON-LD (verified fields only), page shell, mobile booking bar
  navbar.js              Navbar, AnnouncementBar
  footer.js              Footer, hours list
  sections.js            Hero, ServiceCard, ServicesPreview/Catalogue, AboutSection, WhyChooseUs,
                         BookingSteps, GalleryGrid, Lightbox, Testimonials, BookingSection, PageHeader
  contact.js             ContactSection, BookingForm (channel chosen from config)
  art.js                 Line-art placeholder panels (SVG)
  helpers.js, icons.js
src/pages/pages.js       The five pages + 404: content order, titles, meta descriptions
src/static/              Copied as-is: CSS (design tokens at the top), JS, self-hosted fonts, icons, og-image
tools/brand-images.js    Regenerates favicons + og-image.jpg (Playwright)
tests/e2e.js             End-to-end tests
```

**Design tokens** (colours, type scale, spacing, shadows, breakpoints) are CSS custom properties at the top of `src/static/assets/css/styles.css`. Fonts are Cormorant Garamond and Jost, self-hosted (SIL Open Font License, see `assets/fonts/`).

**Analytics**: buttons carry `data-track` names. If a GA4 (`gtag`) or Plausible snippet is added to `<head>` in `layout.js`, those clicks and booking-request submissions are forwarded automatically.

## Tests

`tests/e2e.js` builds four variants: production as-is, preview, a fully configured test fixture, and an email-only fixture. It runs them in Chromium at 1440px and 390px. It checks:

- every page and internal link returns 200, with no console errors or broken images;
- one `h1` per page, alt text on every image, labelled form controls, and no horizontal scroll;
- the mobile menu, mobile booking bar, gallery filters and lightbox (keyboard included);
- form validation, focus management, pre-selecting a service via `?service=`, and the endpoint's loading, success and error states;
- the mailto fallback;
- that structured data and empty states never show unverified information.

```
npm i -D playwright   # or use a global install: NODE_PATH=$(npm root -g) npm test
npm test
```
