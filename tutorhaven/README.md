# TutorHaven

> Find the right tutor. Unlock your potential.

A mobile-first tutoring marketplace for students, parents, tutors and admins. It's built with React, Vite, Tailwind CSS v4 and Motion (Framer Motion for React), with Supabase for authentication, data and business rules.

## Quick start

```bash
cd tutorhaven
npm install
# 1. Put your Supabase Project URL and anon key in .env (see below)
# 2. Run the SQL in supabase/ against your project (see below)
npm run dev
```

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
2. `supabase/seed.sql` adds six demo tutors with availability. It is optional; delete those accounts before launch.

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
| Checkout | `/checkout/:id` | 20-minute slot hold with countdown, member discount, success animation, calendar (.ics) export |
| Pricing | `/pricing` | Plans, subscribe flow, FAQ |
| Onboarding | `/onboarding` | Animated, role-specific steps (tutors publish their listing and availability here) |
| Student dashboard | `/dashboard` | Next session, learning-hours chart, sessions to review, favourites, recommendations |
| Parent dashboard | `/dashboard` | Linked learners, family spending chart, booking on a child's behalf |
| Tutor dashboard | `/dashboard`, `/dashboard/listing` | Earnings chart, sessions to complete, profile strength, listing and availability editor |
| Admin dashboard | `/dashboard`, `/dashboard/users` | Revenue chart, bookings and user mix, tutor approvals, role management |
| Shared | `/dashboard/sessions`, `/billing`, `/settings` | Cancel, complete and review sessions; payment history; profile and password |

### Business rules (enforced in Postgres)

- Prices are calculated on the server from the tutor's rate. Clients can't set them.
- Double-booking is impossible: an exclusion constraint prevents overlapping sessions for the same tutor.
- Bookings must fall inside the tutor's availability, in the tutor's own timezone.
- Unpaid checkouts release their slot after 20 minutes.
- Plus gives 10% off sessions and Family gives 15%. Both allow cancellation up to 2 hours before a session; pay-as-you-go allows up to 24 hours.
- Cancelling a paid session refunds its payment. Only the tutor can mark a session complete, and only after it has started.
- Users can't change their own role, and tutors can't change their own approval status or ratings.

### Payments

Checkout and subscriptions currently run in **test mode**. The `pay_for_booking` and `subscribe` RPCs record payments and confirm bookings without charging a card, and the UI labels this clearly. To take real payments, create a Stripe Checkout session from a Supabase Edge Function. Then move the "confirm booking + insert payment" logic from `pay_for_booking` into the Stripe webhook handler, so the confirmation happens server-side.

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
