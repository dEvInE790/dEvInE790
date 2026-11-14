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

Vercel and Netlify also work: use `npm run build` with root directory `de-law-furniture`, and set the same `SUPABASE_*` and email variables there. GitHub Pages can't run this site, because it only serves static files.

## Admin area (/admin), powered by Supabase

Staff manage the website's content at **`/admin`**, from a phone or a computer, without touching code:

| Section | What you can do |
|---|---|
| **Projects** | Upload photos or videos (MP4, up to 50 MB) of completed work, with title, category, description and tile size. Reorder with the arrows: the first five visible projects appear in "Featured Projects" on the homepage. Hide or delete projects. |
| **Collections** | Edit each furniture collection (name, tagline, introduction, cover photo, customisation options), add or remove collections, and manage each collection's products (up to 8 photos, description, features). |
| **Testimonials** | Add genuine customer reviews. They appear on the homepage straight away. |

Content lives in **Supabase**: its database, its Storage (for photos and videos) and its Auth (for staff logins). The website itself stays on Cloudflare. Until Supabase is connected, the website shows its built-in starting content, and `/admin` explains how to connect it.

### One-time setup (about 10 minutes)

1. **Create a Supabase project.** Go to [supabase.com](https://supabase.com) → **New project** (the free plan is fine). Pick a region close to your visitors and wait for the project to finish setting up.

2. **Create the database.** Open **SQL Editor → New query**, paste the whole of [`supabase/setup.sql`](supabase/setup.sql) and click **Run**. This creates the tables, the security rules and the `media` storage bucket, and adds the website's current content. It's safe to run again later.

3. **Turn off public sign-ups.** Open **Authentication → Sign In / Providers** (named **Providers** or **Settings** in some versions) and switch off **Allow new users to sign up**. Staff accounts are created by you, not by visitors.

4. **Create staff logins.** Open **Authentication → Users → Add user → Create new user**. Enter each person's email and a password, and tick **Auto Confirm User**.

5. **Make them admins.** Back in **SQL Editor**, run this once for each person, using their email:

   ```sql
   insert into public.admin_users (user_id, email)
   select id, email from auth.users where lower(email) = lower('name@example.com')
   on conflict (user_id) do nothing;
   ```

   To remove someone's admin access:

   ```sql
   delete from public.admin_users where lower(email) = lower('name@example.com');
   ```

6. **Connect the website.** In Supabase, open **Project Settings → API** (or **API Keys**) and copy the **Project URL** and the **anon / publishable** key. In Cloudflare, open the **de-law-furniture** Worker → **Settings → Variables and Secrets** and add:

   | Name | Value |
   |---|---|
   | `SUPABASE_URL` | the Project URL, e.g. `https://abcdefgh.supabase.co` |
   | `SUPABASE_ANON_KEY` | the anon / publishable key |

   This key is designed to be public, so storing it as a plain variable is fine. **Never** use the `service_role` / secret key here.

7. **Sign in.** Visit `https://<your-site>/admin` and sign in with a staff email and password. "Forgot password?" sends a reset link by email.

8. **For password-reset links:** in Supabase, open **Authentication → URL Configuration** and set the **Site URL** to your website's address.

### Security

- **Row-level security in the database.** The rules live in Supabase itself, so they apply however someone connects:
  - The public can only **read** visible content.
  - Only signed-in users on the `admin_users` list (with a confirmed email) can add, change, delete or reorder anything, or upload and delete files.
- **Admin rights belong to accounts, not emails.** They're tied to an existing account ID, so nobody can gain them by later signing up with an admin's email address.
- **Database rules reject bad data:** text that's too long, unknown categories, or badly formed web addresses.
- **The storage bucket only accepts** JPEG, PNG and WebP photos and MP4/MOV videos, up to 50 MB.
- These rules were checked against a real local Supabase with 38 tests covering anonymous visitors, strangers who sign up, signed-in staff not on the list, and admins.

### Good to know (Supabase free plan)

- The free plan includes 500 MB of database, 1 GB of file storage and 5 GB of downloads a month. That's plenty for this site; photos are compressed in the browser before upload.
- **Supabase pauses free projects after about a week with no activity.** Normal website traffic counts as activity. If the project is ever paused, the website keeps working with its built-in starting content until you click **Restore project** in Supabase. Upgrading to Supabase Pro avoids pausing completely.

### How it works

| Part | Where |
|---|---|
| Database tables, security rules, storage bucket | `supabase/schema.sql` |
| The file you run (schema + starting content) | `supabase/setup.sql`, generated with `npm run supabase:sql` |
| Public pages reading content (anon key) | `src/lib/content.ts`, `src/lib/supabase-config.ts` |
| Admin sign-in, admin check, page shell | `src/components/admin/AdminApp.tsx` |
| Admin reads and writes, uploads | `src/lib/admin-api.ts` (runs in the browser as the signed-in user) |
| Admin pages | `src/app/admin` |

**To try it locally with your Supabase project:** create `.dev.vars` containing the two `SUPABASE_*` lines above, then run `npm run preview`.

## Content you'll want to update

Projects, collections, products and testimonials are managed at **`/admin`** (see above). The files `src/lib/seed-*.ts` only hold the starting content: it's built into `supabase/setup.sql`, and it's what the site shows when Supabase isn't connected. Everything else is in `src/lib/`:

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
- Pages are rendered on request from Supabase, so admin changes appear immediately
