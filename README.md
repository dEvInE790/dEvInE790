# Simple Interior Tech — Website

A single-page website for Simple Interior Tech, a bespoke furniture and custom joinery
business. It is plain HTML, CSS and JavaScript, with no build step and no framework.

```
index.html              The whole page
assets/css/styles.css   All styling
assets/js/main.js       Mobile menu, gallery lightbox, optional analytics
assets/img/source/      Original photos (not published)
assets/img/projects/    Web-optimised photos generated from source/
assets/img/og-image.jpg Link preview image for WhatsApp/social (1200×630)
assets/icons/           Favicon and app icons
scripts/                Image optimisation script
wrangler.jsonc          Cloudflare Workers deploy config
.assetsignore           Files Cloudflare should not publish
```

## Sections

Hero → What We Build (service cards) → Our Work (gallery + lightbox) →
How It Works → Contact (WhatsApp + email) → Footer, plus a floating WhatsApp
button.

The Testimonials section is left out on purpose. Add it only when genuine
customer reviews are available. An HTML comment in `index.html` marks where
it goes, and its styles already exist (`.testimonial-grid`, `.testimonial`).

## Photos

Only use photos of work Simple Interior Tech has actually built. Never use
stock images presented as company projects.

To add or replace a photo:

1. Put the original in `assets/img/source/` with a short descriptive name,
   e.g. `walnut-coffee-table.jpg`.
2. Run `python3 scripts/optimize_images.py` (needs Pillow: `pip install Pillow`).
   It writes `<name>.jpg` (max 1280px, for the lightbox) and `<name>-sm.jpg`
   (600px wide, for cards/grid) to `assets/img/projects/`, trims black side
   bars, and rebuilds `og-image.jpg`.
3. In `index.html`, copy a gallery `<li>` in the "Our Work" section, point
   it at the new files, set `width`/`height` to the `-sm` image's size, and
   write an `alt` description. The alt text is also the lightbox caption.

The gallery looks best with a multiple of 12 photos (it uses 2, 3 or 4
columns depending on screen width).

## Contact details

- WhatsApp / phone: `+234 813 692 5971` (`2348136925971` in `wa.me` links)
- Email: `simpleinteriortech@gmail.com`

These appear in the hero, contact section, footer, floating button and the
JSON-LD block in `<head>`. Search and replace all instances when updating.

## Analytics (optional)

Paste a GA4 or Plausible snippet into `<head>` where the "Analytics" comment
is. `main.js` then reports WhatsApp, email, phone and gallery clicks as
events automatically. Nothing is tracked until a snippet is added.

## Deployment

The site is deployed with Cloudflare Workers (static assets) from this
repository. `wrangler.jsonc` serves the repo root, and `.assetsignore`
keeps source photos, scripts and config out of the published site.

The custom domain `simpleinterior.com` is set in the Cloudflare project's
**Domains & Routes** settings. Cloudflare issues and renews the HTTPS
certificate automatically once the domain is attached. To check:

- `https://simpleinterior.com` loads with a padlock.
- `http://simpleinterior.com` redirects to HTTPS. If it doesn't, enable
  **Always Use HTTPS** under SSL/TLS → Edge Certificates.

## Before going live

- [ ] Tap every WhatsApp and email link on a real phone
- [ ] Share the URL in a WhatsApp chat to check the link preview
- [ ] Confirm HTTPS works on the custom domain
