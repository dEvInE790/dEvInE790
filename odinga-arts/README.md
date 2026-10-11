# Odinga Arts & Sculpture — Website

A single-page website for Odinga Arts & Sculpture (founder: Odilli Gabriel,
Asaba, Delta State). Plain HTML, CSS and JavaScript: no build step and no
framework. Open `index.html` in a browser, or upload this folder to any
static host.

```
odinga-arts/
├── index.html      All page content (sections are marked with comments)
├── style.css       All styling, organised by section (see index at the top)
├── script.js       Menu, filters, lightbox, animations, form validation
└── images/
    ├── favicon.svg
    ├── hero.jpg                 ← add
    ├── about.jpg                ← add
    ├── og-image.jpg             ← add (social share preview)
    ├── services/*.jpg           ← add
    └── projects/*.jpg           ← add
```

To find everything that still needs real content, search `index.html` for
`EDIT:` and `is-placeholder`.

## 1. Photos

Every image slot shows a labelled placeholder until its photo file exists.
**Drop a photo in with the matching filename and it appears on its own.**
You don't need to edit any code. Only use real photos of Odinga's work.

| Slot | File | Suggested size |
|---|---|---|
| Hero (arched frame) | `images/hero.jpg` | 1200×1500, portrait |
| About (studio / founder) | `images/about.jpg` | 1000×1250, portrait |
| Service cards | `images/services/wall-relief.jpg`, `wall-painting.jpg`, `statues.jpg`, `fence-designs.jpg`, `window-hood.jpg`, `pillars.jpg`, `fountains.jpg`, `portraits.jpg`, `flower-caps.jpg` | 900×675, landscape |
| Projects gallery | `images/projects/relief-01.jpg`, `sculpture-01.jpg`, … (see `index.html`) | any, about 1200px wide |
| Social preview | `images/og-image.jpg` | 1200×630 |

Once a photo is added, update its `alt` text. In the gallery, also update
its `<figcaption>` (replace "Photo to be added" with a short description,
such as the location or type of piece).

**Adding more gallery photos:** copy one `<figure class="gallery-item">`
block inside `#gallery`. Set `data-category` to one of `relief`,
`sculpture`, `window`, `pillar`, `fountain`, `painting`, `fence` or
`portrait` so the filter buttons work. Then pick an aspect class for
variety: `media--portrait`, `media--square` or `media--landscape`.

Compress photos before uploading (e.g. with squoosh.app, around 200–400 KB
each) to keep the site fast on mobile data.

When the gallery has real photos, you can also update the intro text in
the Projects section ("Our project gallery is being prepared…").

## 2. Contact details

No contact details were supplied, so none were made up. Replace the
placeholders in two places:

- **Contact section** (`#contact`): WhatsApp, phone, email and street
  address. The HTML comment above the list shows the link format for each.
- **Footer** "Contact" and "Follow" columns: the same details plus social
  media links. Change each `<span class="is-placeholder">` into an
  `<a href="…">` link.

Delete the `is-placeholder` class once a real value is in place.

## 3. Contact form

The form validates before submitting. Name, phone, service and description
are required. Email is optional, but it's checked if filled in. Choose one
way to deliver submissions by editing the `<form id="contact-form">` tag:

1. **Form service (recommended):** create a free form at e.g.
   [Formspree](https://formspree.io) and put its URL in `action="…"`.
   Submissions arrive by email.
2. **WhatsApp:** put the business WhatsApp number in `data-whatsapp="…"`
   (digits only, country code first, e.g. `2348030000000`). Submitting opens
   WhatsApp with the inquiry already written out.

If neither is set, the form tells visitors to use the contact details on
the page instead. It never claims that a message was sent.

"Enquire about this" links on each service card jump to the form with that
service already selected.

## 4. Content rules this site follows

As requested in the brief, the site doesn't include testimonials, client
logos, project counts, years of experience, awards or guarantees. The CAC
registration is described only as "registered with the Corporate Affairs
Commission (CAC), Nigeria", with no registration number. Add any of these
only once they're confirmed and real.

## 5. Editing in Zed

Open the `odinga-arts` folder in Zed. Each section of `index.html` starts
with a `<!-- ===== NAME ===== -->` comment, and `style.css` has a numbered
index at the top. To preview, open `index.html` in a browser, or run
`python3 -m http.server` in this folder and visit http://localhost:8000.

Colours and fonts are defined once, as variables at the top of `style.css`
(`--bronze`, `--ivory`, `--charcoal`, etc.).
