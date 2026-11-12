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

## Deploying to Cloudflare (Workers)

The site runs as a Cloudflare **Worker**, built with the official Next.js adapter [OpenNext](https://opennext.js.org/cloudflare). The enquiry form needs server code, so the dashboard's "Upload your static files" option **can't** be used.

### Option A — connect GitHub (recommended, auto-deploys on every push)

1. Cloudflare dashboard → **Workers & Pages** → **Create** → **Import a repository** → connect GitHub and pick this repository.
2. Fill in the build settings:
   - **Project name:** `de-law-furniture` (must match `name` in `wrangler.jsonc`)
   - **Root directory / Path:** `de-law-furniture`
   - **Build command:** `npx opennextjs-cloudflare build`
   - **Deploy command:** `npx opennextjs-cloudflare deploy`
   - **Branch:** the branch that holds this code
3. Under **Build variables**, add `NEXT_PUBLIC_SITE_URL` with the site's address. Before you have a custom domain, use the `https://de-law-furniture.<your-subdomain>.workers.dev` address Cloudflare shows after the first deploy, then redeploy.
4. Deploy. Then open the Worker → **Settings → Variables and Secrets** and add the enquiry email settings below, using the **Secret** type for API keys and passwords.

### Option B — deploy from your own computer

```bash
cd de-law-furniture
npm install
npx wrangler login        # opens the browser to sign in to Cloudflare
npm run deploy            # builds and deploys
```

`npm run preview` runs the production build locally in Cloudflare's runtime. For local email testing, put the variables in a `.dev.vars` file; it's git-ignored.

### Email delivery on Cloudflare

Use **Resend**. It sends over HTTPS, which Workers fully support. For a quick start without a domain, sign up at resend.com with the inbox that should receive enquiries, then set:

| Variable | Value |
|---|---|
| `ENQUIRY_TO_EMAIL` | that same inbox |
| `RESEND_FROM` | `DE. LAW Website <onboarding@resend.dev>` |
| `RESEND_API_KEY` | your API key, as a **Secret** |

Resend's test sender only delivers to your own account address, which is exactly what this needs. If you later verify your domain in Resend, you can change `RESEND_FROM` to an address on it.

SMTP also worked in a local test of the Cloudflare runtime, but encrypted SMTP (such as Gmail on port 465) hasn't been verified on Cloudflare's network. That's why Resend is the safer choice there.

### Other hosts

The site is built for Cloudflare, because the admin area needs Cloudflare's D1 database and KV storage. On other Node hosts (Vercel, Netlify) the public site still runs, but it shows the built-in starting content and the admin area can't save changes. GitHub Pages can't run this site, because it only serves static files.

## Admin area (/admin)

Staff can manage the website's content at **`/admin`** without touching code:

| Section | What you can do |
|---|---|
| **Projects** | Upload photos or videos (MP4, up to 24 MB) of completed work, with title, category, description and tile size. Reorder with the arrows: the first five appear in "Featured Projects" on the homepage. Hide or delete projects. |
| **Collections** | Edit each furniture collection (name, tagline, introduction, cover photo, customisation options), add or remove collections, and manage each collection's products (up to 8 photos, description, features). |
| **Testimonials** | Add genuine customer reviews. They appear on the homepage straight away. |

Changes go live immediately.

### Setting it up (one-time)

1. In Cloudflare: open the **de-law-furniture** Worker, go to **Settings → Variables and Secrets → Add**, and create a **Secret** named `ADMIN_PASSWORD` with a strong password (at least 8 characters). Share it only with staff who need it.
2. Visit `https://<your-site>/admin` and sign in.

On the first deploy, Wrangler creates the database (**D1**, `de-law-furniture-db`) and the media storage (**KV**) automatically. On the first visit, the site fills the database with the content that was previously hard-coded. Both services are free within Cloudflare's free-plan limits, and neither needs a payment card.

**Security:**
- **Login:** the session cookie is signed and HttpOnly and lasts 7 days. Changing `ADMIN_PASSWORD` signs everyone out.
- **Rate limiting:** 5 wrong passwords lock that IP address out for 15 minutes.
- **Requests:** every admin action re-checks the session and validates its input on the server, and cross-site requests are rejected.
- **Uploads:** checked by file content, not just the file name.

### How it works

| Part | Where |
|---|---|
| Database schema, automatic setup and seeding | `src/lib/db.ts` |
| Content queries used by the website and admin | `src/lib/content.ts` |
| Login and sessions | `src/lib/auth.ts`, `src/app/api/admin/login` |
| Uploads (KV) and serving with Range support | `src/app/api/admin/media`, `src/app/media/[...key]` |
| Admin actions (save, delete, reorder, show/hide) | `src/app/admin/actions.ts` |
| Admin pages | `src/app/admin` |

To try the admin locally:
1. Create `.dev.vars` containing `ADMIN_PASSWORD=some-local-password`.
2. Run `npm run preview`. This uses a local database and storage under `.wrangler/`.

## Content you'll want to update

Projects, collections, products and testimonials are managed at **`/admin`** (see above). The files `src/lib/seed-*.ts` only hold the starting content that is copied into the database on first run. Everything else is in `src/lib/`:

| File | What it controls |
|---|---|
| `site.ts` | Business details: address, phones, WhatsApp, hours, plus `email` and `socials` (both empty until supplied, so they're hidden), WhatsApp message templates, and the `USING_PLACEHOLDER_PHOTOS` flag |
| `images.ts` | **Every photograph on the site.** They're currently temporary Unsplash stock photos, except the hero. To swap one, put your photo in `public/images/` and change its `src` to `/images/your-photo.jpg`. Local photos are served as-is, so export them at about 1600px wide (2400px for the hero) as JPEGs. If any photo fails to load, the site shows a styled placeholder panel. |

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
- Pages are rendered on request from the database, so admin changes appear immediately
