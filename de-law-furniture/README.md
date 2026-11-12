# DE. LAW FURNITURE LTD — Website

*Crafting Comfort. Defining Spaces.*

The website for DE. LAW FURNITURE LTD, a furniture manufacturer and furnishing company in Egbe, Lagos (established 10 January 2015). It's built with Next.js 15 (App Router), TypeScript, Tailwind CSS v4, Framer Motion, GSAP + ScrollTrigger, Lenis smooth scrolling and Lucide icons.

## Pages

| Route | What's there |
|---|---|
| `/` | Cinematic intro loader, GSAP hero, editorial about, pinned horizontal collections scroller, why choose us, craftsmanship and process, featured projects, custom-furniture CTA, testimonials, contact and map |
| `/about` | Company story (est. 2015), materials (wood, fabrics, plywood), manufacturing process, services, why choose us |
| `/collections` | Full catalogue: all 9 categories, 27 made-to-order designs, customisation details, enquiry buttons |
| `/collections/[category]` | One page per category (sofas, kitchen cabinets, bed frames, window blinds, curtains, wardrobes, dining sets, TV consoles, office furniture) |
| `/collections/[category]/[product]` | Product detail with gallery, features, customisation options, Request a Quote, WhatsApp enquiry and call |
| `/projects` | Portfolio with category filters, animated grid and a full-screen lightbox (keyboard and swipe) |
| `/contact` | Address, both phone numbers, WhatsApp, opening hours, enquiry form, Google Map |
| `/quote` | Custom quotation form. Product and category pages pre-fill it. |

No prices appear anywhere. Every enquiry leads to a personalised quotation.

## Running locally

```bash
cd de-law-furniture
npm install
cp .env.example .env.local   # then fill in the enquiry email settings
npm run dev                  # http://localhost:3000
```

Other scripts: `npm run build`, `npm start`, `npm run lint` and `npm run typecheck`.

## ⚠️ Before launch: turn on enquiry delivery

The quotation and contact forms send each enquiry by email to the business inbox. **They never pretend to succeed.** Until delivery is configured, a visitor who submits a form is told that online submission is unavailable and that their enquiry was not sent. They then get a one-tap button that opens WhatsApp with their details already typed in.

To turn on email delivery, set these environment variables in your hosting dashboard (see `.env.example`):

- `ENQUIRY_TO_EMAIL`: the inbox that should receive enquiries (comma-separate several).
- Then **one** of these delivery methods:
  - **SMTP** (Gmail or Google Workspace with an [App Password](https://support.google.com/accounts/answer/185833), Zoho, or your host's mailbox): `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, and optionally `SMTP_FROM`.
    - Example for Gmail: `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=465`, `SMTP_SECURE=true`.
  - **Resend**: `RESEND_API_KEY` and `RESEND_FROM` (an address on a domain you've verified in Resend).

Each email includes:
- a reference number
- every field the customer filled in
- reply-to set to the customer's email (if they gave one)
- up to 3 reference photos as attachments (the browser compresses them before upload)
- a direct WhatsApp link to the customer's number

**Security measures:**
- the same validation runs in the browser and on the server (`src/lib/enquiry.ts`)
- uploads are checked by file content, not just extension
- customer text is HTML-escaped in emails
- a honeypot field catches bots
- best-effort rate limiting: 5 submissions per IP every 10 minutes

## Deploying

The site needs a Node.js host because `/api/enquiry` is a server route. **Vercel** is the simplest option:

1. Import this GitHub repository in Vercel.
2. Set **Root Directory** to `de-law-furniture`.
3. Add the environment variables above, plus `NEXT_PUBLIC_SITE_URL` (for example `https://www.your-domain.com`). This value is used for SEO metadata, the sitemap and social previews.
4. Deploy. Netlify and any other Node host that supports Next.js also work.

> GitHub Pages can't run this site: it only serves static files, and the enquiry form needs a server.

## Content you'll want to update

All editable content lives in `src/lib/`:

| File | What it controls |
|---|---|
| `site.ts` | Business details: address, phones, WhatsApp, hours, plus `email` and `socials` (both empty until supplied, so they're hidden), WhatsApp message templates, and the `USING_PLACEHOLDER_PHOTOS` flag |
| `images.ts` | **Every photograph on the site.** They're currently temporary Unsplash stock photos. To swap one, put your photo in `public/images/` and change its `src` to `/images/your-photo.jpg`. If any photo fails to load, the site shows a styled placeholder panel. |
| `catalogue.ts` | The 9 categories and the made-to-order designs in each: names, descriptions, features, customisation options |
| `projects.ts` | Portfolio entries for the Projects page and the homepage |
| `testimonials.ts` | **Empty on purpose.** Only add genuine reviews, with the customer's permission. Until there are some, the site invites customers to share their experience on WhatsApp. |

**Photos and honesty:** while `USING_PLACEHOLDER_PHOTOS` is `true`, the project sections show a small note saying the photos are representative. Once the company's own photographs are in place, set it to `false`.

## Motion system

| Effect | Where |
|---|---|
| Intro loader | `components/layout/Loader.tsx`. Wordmark rises letter by letter, a gold hairline draws across, then the panel lifts away (about 2.3 s). Plays in full once per browser session; after that it's a quick fade. |
| Hero | `components/sections/HomeHero.tsx`. A GSAP timeline (image zoom and fade, masked headline words, then copy and buttons) plus ScrollTrigger parallax. |
| Page transitions | `components/providers/PageTransition.tsx`. An espresso curtain covers the page, the route changes behind it, then the curtain lifts. All internal links get this automatically. |
| Scroll reveals | `components/motion/` contains these building blocks: `Reveal` / `Stagger` (fade-up), `SplitText` (masked word reveals), `ClipImage` (clip-path reveal + scale + parallax), `Parallax`, `ScrollText` (words brighten as you scroll). |
| Featured collections | Pinned horizontal scroll with GSAP on desktop; a native swipe row with scroll-snap on touch devices |
| Product cards | Pointer-tracked tilt and depth, image zoom, enquiry actions that slide in. On touch screens the actions are always visible. |
| Header | Transparent over the hero, frosted ivory once you scroll. Hides when scrolling down and returns when scrolling up. Animated full-screen mobile menu. |

**Performance and accessibility:**
- Only GPU-friendly properties are animated (transform, opacity, clip-path).
- Visitors who prefer reduced motion get instant, static content: no loader sequence, no parallax, no smooth scrolling, no curtain.
- Lenis smooth scrolling is turned off on touch devices.
- The Google Map only loads when it scrolls near the screen.
- Without JavaScript, all content is still visible.

## SEO

- Per-page metadata and canonical URLs
- Open Graph image generated at `/opengraph-image`
- `FurnitureStore` JSON-LD (address, phones, opening hours, founding date, catalogue) and `Product` JSON-LD on product pages
- `sitemap.xml` and `robots.txt`
- Every page except the API is pre-rendered as static HTML
