# Tush Beauty Spa — website

A five-page website for Tush Beauty Spa, Houston, TX: **Home, Services, About, Gallery, Contact & Booking**, plus a 404 page.

It is a static site with no runtime dependencies. A small Node build script (`build.js`, also no dependencies) assembles the pages from reusable components and a single file of business details.

```
npm run admin      # admin panel → http://localhost:4000 (edit everything without touching code)
npm run build      # builds dist/ (the real site) and preview/ (design preview)
npm run check      # lists every business detail that still needs the owner's input
npm run serve      # http://localhost:8080 (dist/)
npm run serve:preview   # http://localhost:8081 (preview/)
npm test           # end-to-end tests (needs Playwright; see below)
```

- **`dist/`** is the website to deploy. Upload the folder to any static host (Netlify, Cloudflare Pages, Vercel, GitHub Pages, S3…).
- **`preview/`** is a design preview. Every empty slot is filled with clearly labelled `[placeholder]` text and image notes, so the full layout can be reviewed. It is marked `noindex` and has a "Design preview" banner. **Never deploy `preview/` as the live site.**

## Admin panel

```
npm run admin                       # http://localhost:4000
ADMIN_PASSWORD='choose-one' npm run admin   # require a password to sign in
```

A local admin app (Node, no dependencies) for the owner or whoever manages the site:

- **Dashboard**: launch checklist with progress, where booking requests currently go, links to view the built site and design preview, a rebuild button and the build log.
- **Business details**: phone (and texts), email, Instagram, address (the map appears automatically), opening hours (optionally also sent to Google), booking platform link or form-service address, domain, announcement bar, Google Business link.
- **Services**: categories and services, with photo upload, price and duration (both optional), "show on homepage" and reordering.
- **Gallery**: multi-photo upload. Photos are resized in the browser to fast web sizes, with thumbnails. Each photo needs a description, a category, a tall-photo option, and a **permission confirmation** before it can be saved.
- **Reviews**: exact quotes only. Each review needs a **client-consent confirmation** before it can be saved.
- **Site photos**: replace the line-art placeholders (hero, about, booking banner, portrait).
- **Website text**: hero, about, "why choose us" and the booking banner.

Every save is validated on the server. Problems are listed at the top with links to each field, and nothing is written until they are fixed. Saves write to `src/data/*.json` atomically and rebuild `dist/` and `preview/`. Replaced or removed photos are cleaned up. Unsaved changes are marked in the menu, can be discarded, and trigger a warning before leaving. Ctrl/Cmd+S saves.

**Where it runs.** On the computer that holds this project, not on the public website. The public site stays plain static files, which are fast, cheap to host, and have no login page for anyone to attack. After saving, publish `dist/` as usual (upload it, or push to GitHub if the host deploys from there).

**Booking requests are not stored in the admin panel.** A static site has no database, so requests go wherever the site is configured to send them: the booking platform, a form service such as Formspree (which has its own inbox), the owner's email, or text messages. The dashboard always says which.

**Security.** By default the panel listens on `127.0.0.1` only, so it can't be reached from other devices. Every API call needs a per-session token that only the admin page can read, and the Host header must be `localhost`. Together these block other websites from sending requests to it (CSRF and DNS-rebinding attacks).
- With `ADMIN_PASSWORD` set, a sign-in is required, using an HttpOnly, SameSite=Strict session cookie.
- Uploads are limited to JPEG, PNG and WebP, checked by file content rather than file name, with a 12 MB limit and a fixed set of folders.
- To expose the panel on a network (`ADMIN_HOST=0.0.0.0`), a password is mandatory. Even then, only do it behind HTTPS.

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

Run `npm run check` (or open the admin dashboard) at any time for the current list. Everything can be entered in the **admin panel**. The data lives in **`src/data/*.json`** (field reference: `src/data/README.md`):

1. **Contact details** (`site.json`): phone (and whether it accepts texts), email, Instagram handle, full address (+ `addressParts` for Google), opening hours.
2. **Booking** (`site.json → booking`):
   - If the spa already uses a booking platform (Vagaro, Square, Fresha, Booksy, GlossGenius, Acuity…), paste its public link into `externalUrl`. Every "Book" button then goes straight there, and the "how booking works" copy switches to the instant-booking version.
   - Otherwise, create a free form endpoint (e.g. [Formspree](https://formspree.io)) and paste it into `formEndpoint`. Booking requests then arrive in the owner's inbox.
   - With neither set, the form falls back to opening the visitor's **email app**, then **text message**, then an **Instagram DM**, using whichever details exist. Each of these clearly tells the visitor that they still need to press send, and that the request is not a confirmed booking.
3. **Services** (`data/services.json`): name, short description, and price / duration only if confirmed, plus a photo. Group them into categories. Mark 3 as `featured` for the homepage.
4. **Photos**: put files in `src/static/img/` and reference them as `img/...`.
   - `data/images.json`: hero, about, booking-banner photos. The spa's own photos are best. Licensed stock is acceptable for mood shots only.
   - `data/gallery.json`: **only** the spa's own photos, with permission. Results photos need client consent. No misleading before/after images.
   - Export JPEGs at roughly 1600px on the long edge and 80% quality, to keep the site fast.
5. **Reviews** (`data/testimonials.json`): real, approved reviews, quoted exactly.
6. **Copy** (`data/copy.json`): read every sentence and keep only what is true of the spa. The "Why choose us" points come from the brief (personalised care, a welcoming space, simple booking). Confirm they describe the business.
7. **Domain**: set `siteUrl` to enable canonical links, absolute Open Graph URLs, `sitemap.xml` and the sitemap line in `robots.txt`.
8. Optional: `announcement` (verified updates only, e.g. availability; no invented offers) and `googleBusinessUrl`.

Then run `npm run build` and deploy `dist/`.

## Code map

```
build.js                 Build script (dist/, preview/, --check)
serve.js                 Local static server for testing
admin/                   Admin panel: server.js (API + static), validate.js (rules for every save), public/ (UI)
src/data/*.json          ★ All business facts and content (edited by the admin panel)
src/data/README.md       Field reference
src/site.config.js, src/content/*.js   Thin loaders for the JSON
src/checklist.js         Launch checklist (shared by `npm run check` and the dashboard)
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

`npm test` runs both suites. `tests/admin.js` runs the admin panel against a temporary copy of the project (real content is never touched). It covers:
- the token, Host-header and password checks;
- validation, including the consent and permission rules;
- upload checks and photo cleanup;
- every editing screen end to end, checking that the rebuilt site shows each change;
- the mobile layout.

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
