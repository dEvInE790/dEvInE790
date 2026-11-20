# KRAZY HOURS — Apartment Party website

Event site, ticket booking, PalmPay bank-transfer checkout, digital tickets and an
organiser dashboard for **KRAZY HOURS** (TribeWave Records × Motion Boys Squad),
December 17, 4 PM – 10 PM, Isheri, Lagos. Limit: 35 people.

**Stack:** Next.js 15 (App Router) on Cloudflare Workers (OpenNext) · React 19 · Tailwind CSS · Framer Motion · GSAP
ScrollTrigger · Lenis smooth scroll · Supabase (Postgres, Auth, private Storage).

---

## How it works (read this first)

**Step 1 — Register.** A guest picks **Girls ₦3,000** or **Boys ₦4,000** and enters name,
phone and email. One registration = one person. It's saved straight away and appears in the
admin dashboard as **Registered · unpaid**. Registration closes automatically at **35**.

**Step 2 — Pay.** In the separate Payment section the guest sees the PalmPay account
(**8141276327 · Awal Ayomide Balogun**) and their exact amount, transfers the money, then
uploads the receipt and enters the transfer reference. Status becomes **Payment to verify**.

**Step 3 — Verify.** An organiser opens the receipt in the dashboard **and checks the PalmPay
app to make sure the money actually arrived**, then taps **Verify**. Only then does the guest's
ticket (QR + check-in code) appear. **Reject payment** sends them back to "unpaid" so they can
pay again; **Remove** deletes their registration and frees the spot for someone else.

Nothing is ever confirmed automatically. A screenshot can be faked; the PalmPay app is the
source of truth.

## What's protected

| Rule | Where it's enforced |
|---|---|
| Never more than 35 registrations (registered + paying + confirmed) | `kh_register()` in Postgres, with a row lock so simultaneous sign-ups queue up |
| Price comes from the database, never the browser | `kh_register()` |
| One registration per email and per phone number | `kh_register()` + unique indexes |
| A transfer reference or receipt file can't be reused | `kh_submit_payment()` + unique indexes |
| Payment never confirms itself | `kh_submit_payment()` only sets "pending"; only an admin can confirm |
| Receipts must really be JPG/PNG/WEBP/HEIC/PDF, ≤ 5 MB | `/api/payments` checks the file's bytes, not just its name |
| Receipts are private | Private Supabase bucket; organisers view them through 2-minute signed links |
| Database can't be read from the browser | RLS on, no public policies, functions revoked from `anon` |
| Dashboard and admin APIs | Supabase login **and** listed in the `admins` table, re-checked on every request |
| Limit can't be lowered below people already registered | `kh_update_settings()` |
| Private links can't be guessed | Each guest link carries a 48-character secret token |

---

## Setup (about 20 minutes)

You need: a free [Supabase](https://supabase.com) account, a free [Cloudflare](https://cloudflare.com)
account, and this repository on GitHub.

### 1. Create the Supabase project
1. In Supabase, click **New project**. Pick the region closest to Nigeria (e.g. *West EU*).
2. When it's ready, open **SQL Editor → New query**.
3. Paste the whole of `supabase/migrations/0001_krazy_hours.sql` and click **Run**.
   You should see *Success. No rows returned*.
   This creates the tables, the Girls/Boys categories, the 35-person limit, the PalmPay details and
   the private `receipts` storage bucket.

### 2. Create the organiser login(s)
1. Supabase → **Authentication → Users → Add user → Create new user**.
   Enter the organiser's email and a strong password, and tick **Auto Confirm User**.
2. Back in **SQL Editor**, run (with that email):
   ```sql
   insert into public.admins (user_id)
   select id from auth.users where email = 'organiser@example.com';
   ```
   Repeat for each organiser. Removing someone = `delete from public.admins where user_id = ...`.
3. Recommended: in **Authentication** settings (menu names vary slightly between Supabase versions), turn **off**
   "Allow new users to sign up". Organisers are added by hand only.

### 3. Deploy to Cloudflare (recommended)
The app runs on Cloudflare Workers through the OpenNext adapter (`wrangler.jsonc`,
`open-next.config.ts`).

1. Cloudflare dashboard → **Workers & Pages → Create → Import a repository** and pick this GitHub repo.
2. Settings:

   | Setting | Value |
   |---|---|
   | Project / Worker name | `krazy-hours` (must match `name` in `wrangler.jsonc`) |
   | Root directory | `krazy-hours` |
   | Build command | `npx opennextjs-cloudflare build` |
   | Deploy command | `npx opennextjs-cloudflare deploy` |

3. Add the variables from Supabase → Project Settings → API in **two places**:
   - **Build variables** (they are baked into the browser code at build time):
     `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`
   - **Runtime variables & secrets** (Worker → Settings → Variables and Secrets):
     the same three, plus `SUPABASE_SERVICE_ROLE_KEY` as a **Secret** — never share this key.
4. Deploy. After changing any `NEXT_PUBLIC_` value, redeploy so it's rebuilt.
5. Optional: Worker → Settings → **Domains & Routes** → add your own domain.

CLI alternative: `npx wrangler login`, put the runtime values in `.dev.vars` (local) or
`npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY`, then `npm run cf:deploy`.
Test locally in the Cloudflare runtime with `npm run cf:preview` (http://localhost:8787).

### 3b. Or deploy to Vercel
Import the repo, set **Root Directory** to `krazy-hours`, add the four variables from the
table in step 3, and deploy.

### 4. Before you share the link
- Make a real ₦3,000 test booking from your phone, verify it in the dashboard, check the
  ticket appears, then **Cancel** it so the spot goes back.
- Paste the link into WhatsApp to see the preview card (`public/og.jpg`).

---

## Using the dashboard (`/admin`)

- **Overview** — registered x / 35 (girls/boys split), not paid yet, payments to verify,
  confirmed tickets and verified revenue, checked in.
- **Bookings** — filter by *Not paid yet / Payment to verify / Confirmed / Cancelled*, search by
  name/phone/ID/reference, view receipts, **Verify**, **Reject payment**, **Remove**, **Restore**,
  **Check in**, and **⬇ CSV** download.
- **Check-in** — at the door, scan the guest's QR (Android Chrome) or type their check-in
  code / Booking ID. Unpaid or unverified guests show a red "do not admit". A ticket can only
  be admitted once.
- **Settings** — registration limit, open/close registration, PalmPay bank name, account
  number and account name, ticket categories and prices (price changes only affect new
  registrations).

Guests can come back any time: the Payment section and `/ticket` both accept their Booking ID +
the email or phone they registered with.

## Replacing artwork

Everything visual is built in code so it loads fast on mobile data. To use real photos/logos,
put files in `public/media/` or `public/sponsors/` and set the paths in `src/lib/media.ts`:

- `heroImage` — a dark party photo layered under the animated hero.
- `expect.drinks` … `expect.more` — photos for the five "What to expect" cards.
- `sponsors.tribewave`, `sponsors.motionboys` — logo files (PNG/SVG, transparent background).

Event facts (date, time, address, map search) live in `src/lib/event.ts`.

---

## Local development

```bash
npm install
cp .env.example .env.local   # fill in your Supabase keys
npm run dev
```

With Docker you can run a full local Supabase instead of a cloud project:

```bash
npx supabase start            # applies supabase/migrations automatically
```

Then put the printed API URL, anon key and service-role key in `.env.local`.

### Tests

`scripts/e2e-api.mjs` runs 30 checks against a running app + database: registration, server-side
pricing, validation, receipt sniffing, duplicate email/phone/reference/receipt, payment can't
self-confirm, a concurrent rush for the last spots (stops at exactly 35), anon-key lockout and
admin 401s.
**It creates real bookings — only run it against a local database.**

```bash
npm run build && npm start &
npm run test:e2e
```

## Motion & accessibility notes

- Preloader plays once per browser session.
- All motion (Lenis smooth scroll, parallax, glitch, embers, crowd, strobe) is disabled or
  reduced when the visitor's device has **Reduce Motion** turned on.
- The light flash is a single soft pulse every few seconds, well under photosensitivity limits.
- Canvas particles pause when off-screen or when the tab is hidden.

## Known limits

- Payments are verified by a person, by design. There is no automatic PalmPay confirmation.
- No email/SMS is sent when a ticket is confirmed; guests check `/ticket` (pending pages
  refresh themselves every 30 s). Tell guests to keep their Booking ID.
- Unpaid registrations hold their spot until you **Remove** them. Chase or remove people who
  register but never pay, otherwise the 35 spots can fill with non-payers.
- No request rate-limiting beyond the bot honeypot; add Vercel Firewall rules if you see abuse.
