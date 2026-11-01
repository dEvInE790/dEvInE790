# TutorHaven for iOS (Expo)

The native TutorHaven app for students, parents and tutors, built with Expo SDK 58, Expo Router and Reanimated. It runs in **Expo Go** on your iPhone and uses the same Supabase database as the web app. Prices are in **naira**, and payments go through **Paystack**.

Admins manage the platform in the web admin panel (`/admin` in the `tutorhaven` web app). If an admin signs in on the phone, the app points them there.

## 1. One-time backend setup

Do this once per Supabase project. The web app and the iOS app share everything here.

1. **Database.** In the Supabase SQL editor, run these in order:
   - `tutorhaven/supabase/migrations/20261030000000_init.sql`
   - `tutorhaven/supabase/migrations/20261101000000_naira_paystack_admin.sql`
   - optionally `tutorhaven/supabase/seed.sql`, which adds six demo Nigerian tutors
2. **Paystack keys.** Create a free account at paystack.com. Use the **test** secret key (`sk_test_…`) until you're ready to go live.
3. **Edge Functions.** These handle Paystack on the server. Install the [Supabase CLI](https://supabase.com/docs/guides/cli), then run from the `tutorhaven` folder:

   ```bash
   supabase login
   supabase link --project-ref <your-project-ref>
   supabase secrets set PAYSTACK_SECRET_KEY=sk_test_xxx APP_URLS=http://localhost:5173
   supabase functions deploy paystack-init
   supabase functions deploy paystack-verify
   supabase functions deploy paystack-refund
   supabase functions deploy paystack-callback --no-verify-jwt
   supabase functions deploy paystack-webhook --no-verify-jwt
   ```

   `APP_URLS` lists the web origins allowed after payment, comma-separated; add your live website later. The app's own `exp://` and `tutorhaven://` links are always allowed.
4. **Paystack webhook.** In Paystack Dashboard → Settings → API Keys & Webhooks, set the webhook URL to `https://<your-project-ref>.supabase.co/functions/v1/paystack-webhook`.
5. **Make yourself admin.** Sign up once, then run in the SQL editor:

   ```sql
   update public.profiles set role = 'admin'
   where id = (select id from auth.users where email = 'you@example.com');
   ```

6. **Optional, for faster testing:** in Supabase → Authentication → Providers → Email, turn off **Confirm email**. New accounts can then sign in immediately.

## 2. Run it on your iPhone

1. Install **Expo Go** from the App Store.
2. On your computer:

   ```bash
   cd tutorhaven-mobile
   npm install
   ```

3. Put your Supabase details in `tutorhaven-mobile/.env`. These are the same values as `tutorhaven/.env`:

   ```
   EXPO_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon public key>
   ```

4. Start Expo:

   ```bash
   npx expo start
   ```

5. Scan the QR code with your iPhone camera; it opens in Expo Go. Your phone and computer must be on the same Wi-Fi. If they aren't, or the QR code won't connect, use `npx expo start --tunnel`.

## Paying with Paystack

Tapping **Pay** opens Paystack's secure checkout (card, bank transfer or USSD) in an in-app browser. Here's what happens:

1. The server works out the exact naira amount, including any membership discount.
2. Once Paystack confirms the payment, the server verifies it and confirms the booking or activates the membership.
3. You land back in the app.

The webhook confirms payments even if someone closes the browser early.

To test, use Paystack's test cards, for example `4084 0840 8408 4081`, any future expiry, CVV `408`, PIN `0000`, OTP `123456`.

Admins can switch on **Test mode** in the web admin panel (Settings). Payments are then simulated without Paystack, which is useful before your keys are set up.

## What's in the app

| Tab or screen | Students & parents | Tutors |
|---|---|---|
| Home | Next session, stats, learning-hours or family-spending chart, sessions to review, recommendations; parents link children | Earnings chart, sessions to complete, profile strength |
| Find tutors | Search, subject chips, level and price filters, sorting | — |
| Tutor profile | Weekly availability, reviews, favourites, Book | Preview of your own listing |
| Booking | Subject, learner (parents), length, day and time slots in your time zone | — |
| Checkout | Slot hold countdown, member discount, Paystack | — |
| Sessions | Upcoming, past and cancelled; pay, cancel, review | Complete or cancel sessions |
| Listing | — | Headline, bio, ₦ rate, subjects, levels, languages, weekly availability grid |
| Account | Membership (Plus/Family), payment history with refund status, name, password | Name, password |

Animation is built with Reanimated: an animated logo, staggered card entrances, spring press feedback with haptics, floating illustrations, count-up stats, growing chart bars, a bottom sheet and slide transitions in onboarding. Everything respects the iPhone's **Reduce Motion** setting.

## Checks

```bash
npx expo lint                         # ESLint (Expo config, React Compiler rules)
npx expo export --platform ios        # Hermes bundle, as shipped to devices
```

`e2e/run.mjs` drives the app's web build at iPhone size against the web app's demo backend, covering every role's main flows. See the comment at the top of that file for how to run it.

## Shipping to the App Store

When you're ready, build with EAS instead of Expo Go: `npx eas-cli@latest build -p ios`, then `npx eas-cli@latest submit -p ios`. The bundle identifier is set to `ng.tutorhaven.app` in `app.json`; change it to your own.
