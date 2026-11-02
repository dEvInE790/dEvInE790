# TutorHaven

> Find the right tutor. Unlock your potential.

A mobile-first tutoring marketplace for students, parents, tutors and admins. It's built with React, Vite, Tailwind CSS v4 and Motion (Framer Motion for React), with Supabase for authentication, data and business rules. Prices are in **naira**, and payments go through **Paystack**.

The iOS app (Expo Go) lives in `../tutorhaven-mobile` and shares this database; see its README. Admins use the web admin panel at `/admin`.

## Quick start

```bash
cd tutorhaven
npm install
# 1. Put your Supabase Project URL and anon key in .env (see below)
# 2. Run the SQL in supabase/migrations against your project (see below)
# 3. Deploy the Paystack Edge Functions (see "Payments")
npm run dev
```

There is no demo mode: every tutor, booking and payment you see comes from your database. When no tutors are listed yet, the app says so and invites visitors to apply or to invite a tutor.

### Environment variables

| Where | Variable | Value |
|---|---|---|
| `tutorhaven/.env` (web) | `VITE_SUPABASE_URL` | `https://<project-ref>.supabase.co` |
| | `VITE_SUPABASE_ANON_KEY` | anon public key (Project Settings → API) |
| `tutorhaven-mobile/.env` (iOS) | `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` | the same two values |
| Supabase secrets (Edge Functions) | `PAYSTACK_SECRET_KEY` | `sk_test_…` while testing; `sk_live_…` only when going live |
| | `APP_URLS` | comma-separated web origins allowed after payment, e.g. `https://tutorhaven.ng,http://localhost:5173` |
| Provided by Supabase automatically | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | nothing to set |

The anon key is designed to be public, because Row Level Security protects the data. **Never** put the `service_role` key or the Paystack secret key in either `.env` file: they belong only in Supabase secrets. The Paystack *public* key is not needed, because checkout runs on Paystack's hosted page.

### 1. Create the database

In the Supabase **SQL editor**, run these files in order (each one is safe to run again):

1. `supabase/migrations/20261030000000_init.sql`
2. `supabase/migrations/20261101000000_naira_paystack_admin.sql`
3. `supabase/migrations/20261102000000_production_payments.sql` adds subscription plans, tutor subscriptions, the payment event log, messaging, qualification review, suspension and scheduled maintenance. It also removes simulated "test mode" payments.
4. `supabase/migrations/20261103000000_tutor_payouts.sql` adds tutor payout accounts and Paystack split payments (15% commission by default).
5. `supabase/migrations/20261104000000_business_info.sql` adds the business contact details and the editable Terms, Privacy and Refund Policy pages.

After running a migration, run `notify pgrst, 'reload schema';` so the API sees the new columns straight away.

If you ever re-run an older file, re-run every later file after it, in order.

Then turn on scheduled maintenance. It expires subscriptions, sends renewal reminders and abandons stale checkouts.

1. Open **Database → Extensions** and enable **pg_cron**.
2. Run:

   ```sql
   select cron.schedule('tutorhaven-maintenance', '*/15 * * * *', 'select public.run_maintenance()');
   ```

If pg_cron was already enabled when you ran migration 3, the job was created for you.

### 2. Remove old demo data (only if you used the old seed or test mode)

1. Run `supabase/cleanup/01_inspect_demo_data.sql`. It is **read-only** and lists what it found:
   - the six seeded `@demo.tutorhaven.app` tutors
   - their bookings and reviews
   - simulated test-mode payments
   - test-mode memberships
   - and, separately, your real accounts and real Paystack payments
2. If the numbers look right, run `supabase/cleanup/02_remove_demo_data.sql`. It runs in one transaction and stops without changing anything if a demo account has a real payment. Real accounts and real Paystack payments are never deleted. A real payment made to a demo tutor is kept and put in the refund queue.

### 3. Auth settings

- **Authentication → URL Configuration:** set the Site URL to your deployed origin, and add `http://localhost:5173/**` to the redirect URLs for local development.
- Email confirmation can stay on. After signing up, people see a "check your inbox" screen.

### 4. Make yourself an admin

Sign up through the app, then run:

```sql
update public.profiles set role = 'admin'
where id = (select id from auth.users where email = 'you@example.com');
```

Nobody can choose the admin role at sign-up; the database ignores it.

## What's inside

| Area | Route | Highlights |
|---|---|---|
| Landing | `/` | Animated logo intro, hero search, live platform stats, featured tutors, real reviews |
| Discovery | `/tutors` | Debounced search, subject/level/price filters synced to the URL, sorting, mobile filter sheet |
| Tutor profile | `/tutors/:id` | Weekly availability preview in the viewer's timezone, reviews, favourites |
| Booking | `/book/:tutorId` | Timezone-aware slot picker, session length, booking for a linked child, member pricing |
| Checkout | `/checkout/:id` | Paystack in naira, slot hold with countdown, member discount, calendar (.ics) export |
| Payment result | `/payment/return` | Server-verified outcome: booked, plan active, still processing, failed or not completed |
| Pricing | `/pricing` | Plans from the database, subscribe flow, tutor plans, FAQ |
| Messages | `/dashboard/messages` | Learners message tutors; tutors reply; unread badges |
| Onboarding | `/onboarding` | Animated, role-specific steps (tutors publish their listing and availability here) |
| Student dashboard | `/dashboard` | Next session, learning-hours chart, sessions to review, favourites, recommendations |
| Parent dashboard | `/dashboard` | Linked learners, family spending chart, booking on a child's behalf |
| Tutor dashboard | `/dashboard`, `/dashboard/listing`, `/dashboard/subscription` | Earnings chart, sessions to complete, listing and availability editor, qualifications, subscription and renewals |
| Admin panel | `/admin/*` | Overview, tutors, users, bookings, payments & refunds, settings (see below) |
| Shared | `/dashboard/sessions`, `/billing`, `/settings` | Cancel, complete and review sessions; payments and every checkout attempt; notifications bell; profile and password |

### Business rules (enforced in Postgres)

- Prices are calculated on the server from the tutor's rate. Clients can't set them.
- Double-booking is impossible: an exclusion constraint prevents overlapping sessions for the same tutor.
- Bookings must fall inside the tutor's availability, in the tutor's own timezone.
- Unpaid checkouts release their slot after the hold time (30 minutes by default).
- Membership discounts come from the plan (editable in Admin → Plans & prices) and apply on the server. Members can cancel up to 2 hours before a session; pay-as-you-go allows up to 24 hours.
- Only listed tutors can be booked: approved, not suspended and (if required) with an active subscription.
- Hourly rates must be between ₦1,000 and ₦1,000,000.
- Cancelling a paid session queues a full refund for an admin to issue through Paystack. Only the tutor can mark a session complete, and only after it has started.
- Users can't change their own role, and tutors can't change their own approval status or ratings.

### Payments (Paystack, naira)

Every payment goes through **Paystack**. Nothing is ever simulated, and the browser or app never decides that a payment succeeded.

```
App ──► paystack-init ──► start_checkout()        server prices the booking or plan
  │                         └─► Paystack /transaction/initialize
  └──► Paystack checkout (card, transfer, USSD)
         ├─► paystack-callback ──► Paystack /transaction/verify ──► fulfill_payment()
         └─► paystack-webhook  ──► signature check ─► de-duplicate ─► verify ─► fulfill_payment()
App ──► /payment/return ──► paystack-verify ──► shows the server's answer
```

| Function | Role |
|---|---|
| `paystack-init` | Calls `start_checkout`, which prices the session or plan in the database, then creates the Paystack transaction. If Paystack is unreachable, the attempt is marked failed |
| `paystack-callback` | Paystack returns the customer here. It verifies the payment with Paystack and redirects back to the web or iOS app |
| `paystack-verify` | The apps call this after checkout. It asks Paystack and records `succeeded`, `failed`, `abandoned` or `pending` |
| `paystack-webhook` | Paystack's server-to-server events. The HMAC-SHA512 signature is checked; each event is processed once (`payment_events.idempotency_key`); `charge.success` is re-verified through the API; `refund.processed` and `refund.failed` complete refunds |
| `paystack-refund` | Admins only: starts a Paystack refund. The payment shows *Refund processing* until Paystack's webhook confirms it |
| `paystack-reconcile` | Admins only: re-checks pending payments with Paystack in case a webhook never arrived |

Safeguards:

- Only the service role can mark a payment as paid (`fulfill_payment`, `mark_payment_unsuccessful`, `record_refund`). Users can read their own payments but can never write them.
- Fulfilment is idempotent and locks the payment row, so a callback, a verify call and a webhook arriving together produce exactly one payment.
- Short amounts and non-NGN payments are recorded as failed and flagged in the event log.
- If a slot was taken while someone was paying, the payment goes to the refund queue and the learner is told.
- Every step is logged in `payment_events` (Admin → Payments → Event log).

**Deploy.** Install the [Supabase CLI](https://supabase.com/docs/guides/cli), then from this folder run:

```bash
supabase login
supabase link --project-ref <your-project-ref>
supabase secrets set PAYSTACK_SECRET_KEY=sk_test_xxx APP_URLS=http://localhost:5173,https://your-domain
supabase functions deploy paystack-init
supabase functions deploy paystack-verify
supabase functions deploy paystack-refund
supabase functions deploy paystack-reconcile
supabase functions deploy paystack-payout-account
supabase functions deploy paystack-callback --no-verify-jwt
supabase functions deploy paystack-webhook --no-verify-jwt
```

Then, in Paystack Dashboard → Settings → API Keys & Webhooks, set the webhook URL to `https://<your-project-ref>.supabase.co/functions/v1/paystack-webhook`. Set it for test mode now, and for live mode when you go live.

### Tutor payouts (split payments)

- Each tutor connects a bank account in **Dashboard → Payouts**. Paystack checks the account name, and TutorHaven creates a Paystack **subaccount** for the tutor.
- Every session payment is **split by Paystack**:
  - The tutor receives their listed price minus the commission. With the default 15%, that's 85%. It settles to their bank, usually the next working day.
  - TutorHaven keeps the rest and **pays Paystack's fees** from it.
- Membership discounts come out of TutorHaven's commission, not the tutor's share. TutorHaven always keeps at least Paystack's fee, so a discount larger than the commission can reduce the tutor's share slightly.
- Admins change the commission and choose whether a bank account is required to be listed in **Admin → Settings**. **Admin → Tutor payouts** shows each tutor's account and earnings, plus any amounts to pay by hand (payments made before a tutor connected a bank).
- Refunds are taken from TutorHaven's Paystack balance. If the tutor's share had already settled, recover it from the tutor separately.

### Subscriptions

- **Learners** (Plus, Family) pay monthly for a discount on every session and a shorter cancellation window.
- **Tutors** (Tutor Pro) pay monthly to appear in search and take paid bookings. Admins can make this optional in Settings.
- Statuses:
  - **pending:** checkout started
  - **active:** paid
  - **cancelled:** benefits continue until the period ends
  - **expired:** the period ended
- Nothing is charged automatically. Learners and tutors get a reminder three days before the end. Paying early adds the time to the current period.
- Prices, discounts, billing period and plan names are edited in Admin → Plans & prices. New checkouts use the new price immediately.

See **TESTING.md** for the automated tests and the manual Paystack test checklist.

### Going live

Do these only after every item in TESTING.md passes with test keys.

1. Complete Paystack business verification, then switch the dashboard to **Live**.
2. `supabase secrets set PAYSTACK_SECRET_KEY=sk_live_…` (the functions pick it up on their next request).
3. Set the **live** webhook URL in Paystack (the same `…/paystack-webhook` address).
4. Add your production web origin to `APP_URLS`, and set the Supabase Auth Site URL to it.
5. Confirm pg_cron is running `tutorhaven-maintenance`.
6. Run `supabase/cleanup/01_inspect_demo_data.sql` once more; it should report no demo data.
7. Make a small real payment, refund it from the admin panel, and check both in the Paystack dashboard.

## Web admin panel (`/admin`)

| Section | What admins can do |
|---|---|
| Overview | Users, revenue split (sessions, tutor subscriptions, memberships, refunds), listed tutors, payments in progress, failed or abandoned payments, alerts for refunds and qualifications |
| Tutors | Approve or reject applications; suspend or reinstate live tutors |
| Users | Search accounts, change roles, suspend or reinstate accounts (with a reason shown to the user), see subscription status |
| Bookings | Every session, filtered by status; cancel or complete |
| Qualifications | Open tutors' certificates through short-lived private links; verify or reject them with a note |
| Payments | Confirmed payments and refunds (refund through Paystack, or mark refunded); every checkout attempt with its failure reason; the full payment event log |
| Subscriptions | Every learner and tutor subscription with status, period and days left |
| Plans & prices | Create and edit plans: price, billing period, session discount, features, on sale or hidden |
| Business & policies | Business name, operator, support email, phone, WhatsApp number and location; edit, preview or reset the Terms, Privacy Policy and Refund Policy (placeholders such as `{{support_email}}` stay in sync with the details) |
| Settings | Checkout hold time, whether tutors need a subscription, commission, manual maintenance, and "Check with Paystack" for pending payments |

### Business information and policies

The confirmed business details live in `platform_settings`. Anyone can read them, and only admins can change them, through `admin_update_settings`. They appear in:

- the site footer, with a WhatsApp chat link
- `/contact`, `/terms`, `/privacy` and `/refunds`
- the dashboard's Settings and Billing support sections
- payment result pages
- the mobile app's Account → Help & legal

Refund and renewal terms sit next to every Pay button: session checkout, the membership upgrade dialog and tutor subscriptions, on web and mobile. Each one links to the Refund Policy and the Terms.

The built-in policy text is in `src/lib/business.js`. Saving custom text in the admin panel overrides it, and saving an empty text reverts to it. No registered company name, CAC number or street address is shown. Add them in the admin panel once you have them.

The session rules match what the database enforces:

| Situation | Refund |
|---|---|
| Learner cancels 24+ hours before the session | Full |
| Learner with a membership cancels 2+ hours before | Full |
| Learner tries to cancel later than that | Blocked |
| Tutor cancels | Full |
| Slot was taken while the learner paid | Full, automatically queued |
| Duplicate or mistaken payment | Admin refunds it from Admin → Payments |

Memberships and tutor subscriptions never renew automatically and are not refunded when cancelled. Access runs to the end of the paid period. An admin can still refund any payment when the law requires it.

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
npm run dev        # local dev server
npm run build      # production build to dist/
npm run preview    # serve the production build
npm run stack      # local test stack (see TESTING.md); --fixture adds test accounts
npm run test:e2e   # browser tests against the local test stack
```

Deploy `dist/` to any static host (Vercel, Netlify, Cloudflare Pages). Configure the host to rewrite all paths to `index.html` so client-side routes work.

`e2e/stack/` is test-only. It is a stand-in for Supabase's HTTP APIs on a local Postgres with the real migrations, plus a Paystack simulator, and is never part of a build. To click through the real app locally without a Supabase project:

```bash
sudo bash supabase/tests/db/setup.sh
npm run stack -- --fixture          # test accounts use the password test-password-123
VITE_SUPABASE_URL=http://localhost:54321 VITE_SUPABASE_ANON_KEY=local-stack-anon-key-not-a-secret-0123456789 npm run dev
```
