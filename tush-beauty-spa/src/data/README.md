# Site content (JSON)

All business details and content live here. The easiest way to edit them is the admin panel:

```
npm run admin      # then open http://localhost:4000
```

The admin panel validates every change, writes these files, and rebuilds `dist/` and `preview/`.
Hand edits work too; run `npm run build` afterwards.

**Only enter information the owner has confirmed.** Anything left `null` or empty is hidden or
shown as "coming soon" on the site. It is never guessed.

## site.json

| Field | Meaning |
|---|---|
| `siteUrl` | Live domain, no trailing slash (`https://www.example.com`). Enables canonical links + sitemap. |
| `contact.phone` | Display format, e.g. `(713) 555-0123`. The click-to-call link is derived from it. |
| `contact.phoneAcceptsTexts` | `true` adds a text-message button and lets the booking form fall back to SMS. |
| `contact.email` | Public email address. |
| `contact.instagram` | Handle without `@`. |
| `contact.address` | One-line address as displayed. Enables the map. |
| `contact.addressParts` | `{ street, city, region, postalCode }` for Google structured data. |
| `contact.addressNote` | e.g. parking info. |
| `hours` | List of `{ days, hours, schema? }`. `schema` = `{ days: ['Tu','We'], opens: '10:00', closes: '19:00' }` (optional, for Google). |
| `hoursNote` | e.g. `By appointment only`. |
| `booking.externalUrl` | Public link to an existing booking platform (Vagaro, Square, Fresha…). All Book buttons go there. |
| `booking.externalLabel` | Button text for it, e.g. `Book on Vagaro`. |
| `booking.formEndpoint` | Form-service URL (e.g. Formspree) that emails booking requests to the owner. |
| `announcement` | Slim top bar. Verified updates only; no invented offers. |
| `googleBusinessUrl` | Google Business Profile link (footer). |

## services.json
List of categories `{ id, name, intro, services: [...] }`. Each service:
`{ id, name, description, price|null, duration|null, image|null, imageAlt, featured }`.
`id` is lowercase-with-dashes and unique. Up to three `featured` services appear on the homepage.

## gallery.json
`{ filters: [{id,label}], items: [{ src, thumb, alt, caption, category, tall }] }`.
**Only the spa's own photos**, with permission. Results photos need client consent. No misleading before/after images.

## testimonials.json
`[{ quote, author, source }]`. **Only real reviews the client agreed to publish**, quoted exactly.

## images.json
Fixed photo slots (`hero`, `heroDetail`, `about`, `aboutAlt`, `booking`, `ownerPortrait`): `{ src|null, alt, art, caption }`.
While `src` is null, a line-art panel is shown. `art`/`caption` only control that placeholder.

## copy.json
Editable website text (hero, about, why-choose-us, booking call-to-action). It makes no factual claims about
history, qualifications or awards. Keep it that way, and keep only sentences that are true of the spa.
