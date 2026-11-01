# Testing TutorHaven payments

There are two layers of testing:

1. **Automated tests.** They run without Paystack or Supabase, on your computer or in CI. They use a real Postgres with every migration and the real Edge Function code. Only Paystack's servers are simulated.
2. **A manual run with your Paystack test keys** (`sk_test_…`) against your Supabase project. Do it before you switch to live keys.

> These tests use only Paystack **test** keys or the built-in simulator. Do not put a live key (`sk_live_…`) anywhere until every item in part 2 passes.

## 1. Automated tests

You need Postgres 16 on the machine, Node 22 or newer, and the `playwright` package with Chromium for the browser tests.

```bash
# One-off local database: creates a throwaway cluster and applies all migrations
sudo bash supabase/tests/db/setup.sh

# Database + Edge Function tests (33 cases)
cd supabase/tests && npm install && npm test

# Web app in a real browser (desktop, tablet and phone sizes), plus a click-every-button crawl
cd ../.. && npm run test:e2e

# iOS app (its web build at iPhone size)
cd ../tutorhaven-mobile && node --experimental-strip-types e2e/run.mjs
```

What the automated tests cover:

| Area | Cases |
|---|---|
| Successful payment | Booking confirmed only after the server verifies the payment with Paystack; amount stored; learner and tutor notified |
| Failed payment | Declined card leaves the booking unpaid and records the reason. A retry gets a new reference and succeeds |
| Abandoned payment | Closing the checkout marks the attempt `abandoned`. Paying later through the same link is still confirmed by the webhook. Checkouts older than 24h are abandoned by maintenance |
| Pending payment | Paystack `ongoing` keeps the attempt `pending`. If Paystack can't be reached the result is `pending`, never `failed` |
| Forged success | A hand-made return URL with `status=success`, a direct call to `fulfill_payment`, or a direct table update confirms nothing |
| Webhook security | Bad or missing `x-paystack-signature` is rejected with 401 and logged |
| Duplicate webhooks | The same event delivered twice is processed once (one payment row, one notification) |
| Races | Callback, webhook and verify arriving together create exactly one payment |
| Wrong amount or currency | Underpayment or non-NGN is recorded as failed and never fulfilled |
| Slot taken while paying | The payment goes to the refund queue, and the learner is told |
| Refunds | Admin refund through Paystack, then `refund.processed` marks it refunded. `refund.failed` puts it back in the queue. Double refunds are blocked |
| Subscriptions | Pending → active, discounts applied, cancel keeps access to period end, renewal extends from the current end, reminder 3 days before (once), expiry, tutor delisted on expiry and relisted on renewal |
| Access rules | Unsubscribed or suspended tutors are hidden and can't be booked. Suspended users can't book, pay or message. Users can't change their own role or suspension |
| Admin | Plan prices, subscription requirement toggle, reports, payment attempts, event log, qualification review with private documents |

## 2. Manual run with Paystack test keys

### Set up (test mode)

1. In the Paystack Dashboard, make sure the **Test mode** toggle (top bar) is on. Copy the **test secret key** from Settings → API Keys & Webhooks.
2. Deploy the functions and set the secrets as described in the README (`PAYSTACK_SECRET_KEY=sk_test_…`).
3. In the same Paystack page, set the **Test Webhook URL** to `https://<project-ref>.supabase.co/functions/v1/paystack-webhook`.
4. Sign up as a tutor and make yourself admin in a second browser (see README). Approve the tutor in Admin → Tutors.

Test cards are listed at <https://paystack.com/docs/payments/test-payments/>. The usual success card is `4084 0840 8408 4081`, any future expiry, CVV `408`, PIN `0000`, OTP `123456`. Use the declined card from the same page for failure tests.

### Checklist

Tick each item. For every payment, open **Admin → Payments → Event log** and look up the reference to see what the server did.

- [ ] **Tutor subscription activates.** As the tutor, open Subscription and pay with the success card. You return to "Your plan is active". Admin → Subscriptions shows it active with an end date about one month away. The tutor now appears in Find tutors.
- [ ] **Session payment succeeds.** As a student, book the tutor and pay. You see "You're booked!". The booking shows *Confirmed*, Billing lists the payment with its `TH-…` reference, and both student and tutor have a notification.
- [ ] **Failed payment.** Book again and pay with the declined test card. You see "Payment failed" with Paystack's reason, and the booking stays *Awaiting payment*. Billing → All attempts shows it *Failed*.
- [ ] **Abandoned payment.** Start a checkout, then close the Paystack page (or press Cancel). You see "Payment not completed". The attempt shows *Not completed*, and no money moved.
- [ ] **Webhook confirmation.** Start a checkout and pay, but close the tab *before* Paystack redirects back. Within a few seconds the booking still turns *Confirmed*: the webhook did it. The event log shows `webhook.charge.success`.
- [ ] **Duplicate webhook.** In Paystack (Transactions → the payment → *Resend webhook*, if offered), resend the event. The event log shows no second `payment.fulfilled`, and Billing still has one payment.
- [ ] **Webhook signature.** Send a fake request with `curl -X POST https://<ref>.supabase.co/functions/v1/paystack-webhook -d '{"event":"charge.success"}'`. It returns `401 Invalid signature`, and Admin → Event log shows `webhook.rejected`.
- [ ] **Learner membership.** As a student, buy Plus on Pricing. Billing shows it active, and a new booking shows the member discount at checkout.
- [ ] **Refund.** Cancel a paid session more than 24 hours ahead. In Admin → Payments it appears under *Refunds waiting*. Press **Refund → Issue refund**. It shows *Refund processing*, then *Refunded* once Paystack sends `refund.processed`. In test mode this can take a few minutes.
- [ ] **Subscription expiry.** In the SQL editor, shorten the tutor's period, then run maintenance:

  ```sql
  update subscriptions set current_period_end = now() + interval '2 days' where audience = 'tutor';
  select public.run_maintenance();   -- sends the renewal reminder
  update subscriptions set current_period_end = now() - interval '1 minute' where audience = 'tutor';
  select public.run_maintenance();   -- expires it
  ```

  The tutor gets a reminder, then an "expired" notification, and disappears from Find tutors. Renewing brings them back.
- [ ] **Booking confirmation in the iOS app.** In Expo Go, book and pay. Paystack opens in the in-app browser. When it closes, the app shows the server's result.
- [ ] **Admin price change.** In Admin → Plans & prices, change Tutor Pro's price. The next checkout charges the new amount, and the amount on Paystack's page matches.
- [ ] **Scheduled job.** Database → Cron Jobs (pg_cron) lists `tutorhaven-maintenance` running every 15 minutes.

When everything above passes, follow "Going live" in the README.
