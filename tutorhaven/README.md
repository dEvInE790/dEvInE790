# TutorHaven

> Find the right tutor. Unlock your potential.

A mobile-first tutoring marketplace for students, parents, tutors and admins. It's built with React, Vite, Tailwind CSS v4 and Motion (Framer Motion for React), with Supabase for authentication, data and business rules. Prices are in **naira**, and payments go through **Paystack**.

The iOS app (Expo Go) lives in `../tutorhaven-mobile` and shares this database; see its README. Admins use the web admin panel at `/admin`.

## Quick start

```bash
cd tutorhaven
npm install
# 1. Put your Supabase Project URL and anon key in .env (see below)
# 2. Run the SQL in supabase/ against your project (see below)
npm run dev
```

### Try it without Supabase (demo mode)

```bash
npm run dev:demo        # http://localhost:5173 with seeded demo data
```

Demo mode swaps Supabase for an in-browser backend that applies the same rules as the database. It comes with six tutors, sessions, reviews and payments already in place. The sign-in page offers one-click demo accounts (student, parent, tutor, admin); every demo password is `demo1234`. You can also sign up with any email to try onboarding. Data is saved in your browser; use the **Demo** badge (top right on phones, bottom right on desktop) to reset it.

For a phone-framed preview, open **http://localhost:5173/phone.html** while `npm run dev:demo` is running. It shows the live app at true phone width inside a device frame, with device-size switches (iPhone 15, iPhone 15 Pro Max, Pixel 8, iPhone SE), quick links and a reset button.

`npm run build:demo` produces a static copy in `dist-demo/`. It uses hash URLs, so it works on any static host. Production builds (`npm run build`) contain none of the demo code.

### Automated checks

```bash
npm run build:demo
npm run test:e2e                 # role-based end-to-end flows + click-every-button crawl
npm run test:e2e -- --shots      # also saves mobile/tablet/desktop screenshots to e2e/screenshots
```

The tests need the `playwright` package and Chromium (`npm i -D playwright && npx playwright install chromium`).

### 1. Connect Supabase

Open **Project Settings → API** in your Supabase project and copy the values into `tutorhaven/.env`:

```
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon public key>
```

The anon key is designed to be public, because Row Level Security protects the data. Never put the `service_role` key in this file. If you prefer not to commit keys, put them in `.env.local` instead; it is git-ignored and overrides `.env`.

Until real keys are present, the app still runs. It shows a setup banner, and the sign-in pages explain what's missing.

### 2. Create the database

In the Supabase **SQL editor**, run:

1. `supabase/migrations/20261030000000_init.sql` creates the tables, Row Level Security policies, triggers and RPCs. It is required.
2. `supabase/migrations/20261101000000_naira_paystack_admin.sql` adds naira pricing, Paystack payments, the refund queue and admin settings. It is required.
3. `supabase/seed.sql` adds six demo Nigerian tutors with availability. It is optional; delete those accounts before launch.

If you use the Supabase CLI instead, run `supabase db push` and the migration applies directly.

### 3. Auth settings

- **Authentication → URL Configuration:** set the Site URL to your deployed origin, and add `http://localhost:5173/**` to the redirect URLs for local development.
- Email confirmation can stay on. After signing up, people see a "check your inbox" screen, and the confirmation link brings them back to onboarding.

### 4. Make yourself an admin

Sign up through the app, then run:

```sql
update public.profiles set role = 'admin'
where id = (select id from auth.users where email = 'you@example.com');
```

Nobody can choose the admin role at sign-up; the database trigger ignores it.

## What's inside

| Area | Route | Highlights |
|---|---|---|
| Landing | `/` | Animated logo intro, hero search, live platform stats, featured tutors, real reviews |
| Discovery | `/tutors` | Debounced search, subject/level/price filters synced to the URL, sorting, mobile filter sheet |
| Tutor profile | `/tutors/:id` | Weekly availability preview in the viewer's timezone, reviews, favourites |
| Booking | `/book/:tutorId` | Timezone-aware slot picker, session length, booking for a linked child, member pricing |
| Checkout | `/checkout/:id` | Paystack in naira, slot hold with countdown, member discount, success animation, calendar (.ics) export |
| Pricing | `/pricing` | Plans, subscribe flow, FAQ |
| Onboarding | `/onboarding` | Animated, role-specific steps (tutors publish their listing and availability here) |
| Student dashboard | `/dashboard` | Next session, learning-hours chart, sessions to review, favourites, recommendations |
| Parent dashboard | `/dashboard` | Linked learners, family spending chart, booking on a child's behalf |
| Tutor dashboard | `/dashboard`, `/dashboard/listing` | Earnings chart, sessions to complete, profile strength, listing and availability editor |
| Admin panel | `/admin/*` | Overview, tutors, users, bookings, payments & refunds, settings (see below) |
| Shared | `/dashboard/sessions`, `/billing`, `/settings` | Cancel, complete and review sessions; payment history; profile and password |

### Business rules (enforced in Postgres)

- Prices are calculated on the server from the tutor's rate. Clients can't set them.
- Double-booking is impossible: an exclusion constraint prevents overlapping sessions for the same tutor.
- Bookings must fall inside the tutor's availability, in the tutor's own timezone.
- Unpaid checkouts release their slot after the hold time (30 minutes by default).
- Plus and Family discounts (10% and 15% by default, editable in Admin → Settings) apply on the server. Members can cancel up to 2 hours before a session; pay-as-you-go allows up to 24 hours.
- Hourly rates must be between ₦1,000 and ₦1,000,000.
- Cancelling a paid session queues a full refund for an admin to issue. Only the tutor can mark a session complete, and only after it has started.
- Users can't change their own role, and tutors can't change their own approval status or ratings.

### Payments (Paystack, naira)

Checkout and memberships use **Paystack**. Five Supabase Edge Functions in `supabase/functions/` do the work:

| Function | Role |
|---|---|
| `paystack-init` | Calls `start_checkout`, which prices the session or plan on the server, then creates the Paystack transaction |
| `paystack-callback` | Paystack returns the customer here; it verifies the payment and redirects back to the web or iOS app |
| `paystack-verify` | The apps call this after checkout to confirm the result |
| `paystack-webhook` | Paystack's server-to-server notice. Its HMAC signature is verified, so payments are confirmed even if the customer closes the browser |
| `paystack-refund` | Admins only: refunds through Paystack and records the refund |

Only the server can mark a payment as paid: `fulfill_payment` can be called by the service role alone. Fulfilment is idempotent, and it refuses underpayments. If a slot was taken while someone was paying, the payment goes to the refund queue.

**Deploy:** install the Supabase CLI, then from this folder run:

```bash
supabase link --project-ref <your-project-ref>
supabase secrets set PAYSTACK_SECRET_KEY=sk_test_xxx APP_URLS=http://localhost:5173,https://your-domain
supabase functions deploy paystack-init
supabase functions deploy paystack-verify
supabase functions deploy paystack-refund
supabase functions deploy paystack-callback --no-verify-jwt
supabase functions deploy paystack-webhook --no-verify-jwt
```

Then set the webhook URL in Paystack Dashboard → Settings → API Keys & Webhooks to `https://<your-project-ref>.supabase.co/functions/v1/paystack-webhook`.

Cancelling a paid session puts its payment in the **refund queue** (Admin → Payments). There, an admin refunds it through Paystack, or marks it refunded if the money was returned another way.

**Test mode** (Admin → Settings) simulates payments without Paystack. It's useful before your keys are ready, but keep it off in production.

## Web admin panel (`/admin`)

| Section | What admins can do |
|---|---|
| Overview | Users, revenue, memberships, bookings mix, revenue chart, pending applications, refund alerts |
| Tutors | Approve or reject applications; suspend or reinstate live tutors; search by name, subject or city |
| Users | Search accounts; change roles |
| Bookings | Every session, filtered by status and searchable; cancel or complete |
| Payments | Every Paystack and test payment, with totals; refund through Paystack or mark refunded |
| Settings | Plus/Family monthly prices and discounts (₦), checkout hold time, test mode |

## Design system

- **Colour:** deep navy (`navy-50…950`) for trust, soft mint (`mint-50…900`) for growth, warm white (`cream-50…300`) for the canvas. All tokens are defined in `src/index.css`.
- **Type:** Plus Jakarta Sans (display) and Inter (body), self-hosted via Fontsource.
- **Surfaces:** `card` gives rounded 24px corners, a hairline border and a soft layered shadow; interactive cards lift on hover.
- **UI kit:** `src/components/ui/` contains Button, Input/Select/Textarea/ChipGroup, Badge, Avatar, Skeleton, Modal (bottom sheet on mobile), Dropdown (keyboard accessible), Tabs, StarRating and EmptyState.

## Motion system

Reusable pieces live in `src/motion/`:

| Component | Use |
|---|---|
| `PageTransition` | Fade/slide for routed pages (with `AnimatePresence` in `App.jsx`) |
| `Reveal`, `Stagger`, `StaggerItem` | Scroll-triggered reveals, once per element |
| `Float` | Gentle looping motion for illustrations |
| `AnimatedNumber` | Count-up statistics when they scroll into view |
| `LogoMark`, `LogoIntro` | Self-drawing logo and first-visit brand intro |
| `variants.js` | Shared easing, springs and variants |

Every animation uses transforms and opacity only. `MotionConfig reducedMotion="user"` and a CSS media query respect the operating system's reduced-motion setting: the intro is skipped, floating stops, and counters jump straight to their values.

## Scripts

```bash
npm run dev       # local dev server
npm run build     # production build to dist/
npm run preview   # serve the production build
```

Deploy `dist/` to any static host (Vercel, Netlify, Cloudflare Pages). Configure the host to rewrite all paths to `index.html` so client-side routes work.
