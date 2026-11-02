// Business contact details and policy text. Values come from platform_settings
// (editable in Admin → Business & policies); the defaults below match the
// confirmed details and are used until the settings have loaded.

export const BUSINESS_DEFAULTS = {
  business_name: 'TutorHaven',
  operator_name: 'Ojigbani Divine',
  support_email: 'tutorhaven737@gmail.com',
  support_phone: '+2348028139086',
  whatsapp_number: '+2348028139086',
  business_city: 'Lagos',
  business_state: 'Lagos State',
  business_country: 'Nigeria',
}

export function businessInfo(settings = {}) {
  const b = { ...BUSINESS_DEFAULTS }
  for (const k of Object.keys(b)) if (settings[k]) b[k] = settings[k]
  const commission = Math.round(Number(settings.commission_rate ?? 0.15) * 100)
  return {
    ...b,
    location: `${b.business_city}, ${b.business_state}, ${b.business_country}`,
    phoneDisplay: localPhone(b.support_phone),
    whatsappDisplay: localPhone(b.whatsapp_number),
    commission,
    tutorShare: 100 - commission,
    updatedAt: settings.policies_updated_at,
  }
}

/** +2348028139086 → 0802 813 9086 (how Nigerians write it); other numbers unchanged. */
export function localPhone(intl = '') {
  const m = intl.match(/^\+234(\d{3})(\d{3})(\d{4})$/)
  return m ? `0${m[1]} ${m[2]} ${m[3]}` : intl
}

export const whatsappLink = (number, text = '') =>
  `https://wa.me/${String(number).replace(/\D/g, '')}${text ? `?text=${encodeURIComponent(text)}` : ''}`

export const telLink = (number) => `tel:${number}`
export const mailLink = (email, subject = '') => `mailto:${email}${subject ? `?subject=${encodeURIComponent(subject)}` : ''}`

/** Replaces {{placeholders}} in policy text with live business details. */
export function fillPlaceholders(text, info) {
  const values = {
    business_name: info.business_name,
    operator_name: info.operator_name,
    support_email: info.support_email,
    support_phone: info.phoneDisplay,
    support_phone_intl: info.support_phone,
    whatsapp: info.whatsappDisplay,
    location: info.location,
    commission: `${info.commission}%`,
    tutor_share: `${info.tutorShare}%`,
  }
  return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (m, key) => values[key] ?? m)
}

export const PLACEHOLDER_HELP = '{{business_name}}, {{operator_name}}, {{support_email}}, {{support_phone}}, {{whatsapp}}, {{location}}, {{commission}}, {{tutor_share}}'

// ---------------------------------------------------------------------------
// Default policy text. Format: "## " headings, "- " bullets, blank lines between
// paragraphs, **bold**. Admins can replace any of these in the admin panel.
// ---------------------------------------------------------------------------
export const DEFAULT_POLICIES = {
  refund: `This Refund Policy explains when you can get your money back for payments made on {{business_name}}. All prices and refunds are in Nigerian Naira (NGN).

## Tutoring sessions
- **Cancelled at least 24 hours before the start:** full refund.
- **Members (Plus or Family plan):** full refund if you cancel at least **2 hours** before the start.
- **Cancelled by the tutor:** full refund, whenever the tutor cancels.
- **Duplicate or mistaken payments:** if you were charged twice or charged in error, we refund the extra payment once we have confirmed it with our payment provider, Paystack.
- **If a slot was taken while you were paying,** your payment is refunded in full automatically.
- After those times a session can no longer be cancelled or refunded, except where the law requires it. If something goes wrong with a session, contact us.

You can cancel an upcoming session yourself from **Sessions** in your dashboard. The app shows whether it still qualifies for a refund before you confirm.

## Memberships and tutor subscriptions
- Membership subscriptions (Plus, Family) are **non-refundable once paid**, except where required by applicable law.
- Tutor subscriptions are **non-refundable once paid**, except where required by applicable law.
- **Nothing renews automatically.** Each payment covers the period shown at checkout. We remind you before it ends, and you choose whether to renew.
- If you cancel, your benefits continue until the end of the period you have already paid for.

## How refunds are paid
Refunds go back to the card or account you paid with, through Paystack. Once we issue a refund, banks usually take 5 to 10 working days to show it.

## Asking for a refund
Contact us with your **payment reference** (it starts with TH-, and you can find it under Billing):
- Email: {{support_email}}
- WhatsApp or phone: {{whatsapp}}

We also process any other refunds required by applicable Nigerian consumer protection law.`,

  terms: `These Terms and Conditions apply when you use {{business_name}}, a tutoring marketplace operated by {{operator_name}} from {{location}}. By creating an account or making a payment, you agree to them.

## What TutorHaven does
{{business_name}} connects learners and parents with independent tutors. Tutors set their own rates, subjects and availability. Learners book and pay for sessions through the platform. Tutors are independent and are not employees of {{business_name}}.

## Accounts
- You must give accurate information and keep your password safe.
- Parents can link and book for their children. Learners under 18 should use {{business_name}} with a parent or guardian's permission.
- You can't choose the admin role, and you may only use your own account.

## Bookings and payments
- Prices are shown in Nigerian Naira (NGN) before you pay. They include any membership discount you are entitled to.
- Payments are processed securely by Paystack. {{business_name}} never sees or stores your full card details.
- A booking is confirmed only after Paystack confirms the payment to us.
- Cancellations and refunds follow our **Refund Policy**, which you can read before every payment.

## Memberships and tutor subscriptions
- Plans are paid in advance for the period shown, and nothing renews automatically.
- They are non-refundable once paid, except where the law requires otherwise. Benefits continue until the end of the paid period.

## For tutors
- Your profile, qualifications and availability must be accurate. Qualifications are checked by our team before they are shown as verified.
- To be listed, you may need an approved profile, an active tutor subscription and a connected bank account.
- For each paid session you receive **{{tutor_share}}** of your listed price, paid to your bank by Paystack. {{business_name}} keeps **{{commission}}** as its commission and pays Paystack's fees from it.
- You must attend booked sessions or cancel in good time. If you cancel, the learner is refunded in full.

## Acceptable use
Be respectful in sessions and messages. Harassment, fraud, sharing other people's personal data, or trying to arrange payment outside the platform to avoid fees may lead to suspension or removal of your account.

## Suspension
We may suspend accounts that break these terms, for example during a payment dispute. Suspended accounts cannot book, pay or send messages. Contact us if you think a suspension is a mistake.

## Liability
We work hard to keep {{business_name}} available and accurate, but tutors provide their own lessons and we can't guarantee particular results. Nothing in these terms limits rights you have under Nigerian law.

## Changes and contact
We may update these terms, and the date at the top shows the latest version. These terms are governed by the laws of the Federal Republic of Nigeria. Questions: {{support_email}} or {{whatsapp}} (WhatsApp).`,

  privacy: `This Privacy Policy explains how {{business_name}}, operated by {{operator_name}} from {{location}}, collects and uses personal data. We follow the Nigeria Data Protection Act 2023.

## What we collect
- **Account details:** your name, email address, role (student, parent, tutor) and password (stored securely by our authentication provider; we can't see it).
- **Learning and tutor profiles:** subjects, levels, goals, tutor bio, rates, availability and qualifications, including documents tutors upload for verification.
- **Bookings and messages:** sessions you book or teach, reviews, and messages you send on the platform.
- **Payments:** amounts, dates, payment references and status. Card and bank details are handled by **Paystack**; we never receive your full card number.
- **Tutor payouts:** the bank name, account name and the last 4 digits of the account number. The full account number is held by Paystack to pay you.
- **Technical data:** basic information needed to keep you signed in and keep the service secure.

## How we use it
- To run your account, bookings, payments, refunds and tutor payouts.
- To show tutor profiles to learners. Only verified qualifications are shown publicly; documents stay private.
- To send in-app notifications about bookings, payments and plan renewals.
- To prevent fraud, resolve disputes and meet legal obligations.

We do not sell your personal data.

## Who we share it with
- **Paystack:** to process payments, refunds and tutor payouts.
- **Supabase:** our database and hosting provider, which stores the data securely.
- **Cloudflare:** hosts our website.
- **Tutors and learners:** see only what they need for a booking, such as names, session details and messages between them.
- **Authorities:** when the law requires it.

## How long we keep it
We keep your data while your account is active, and payment records for as long as financial and tax rules require. You can ask us to delete your account.

## Your rights
You can ask to see, correct or delete your personal data, or object to how we use it. Contact us at {{support_email}}. You can also complain to the Nigeria Data Protection Commission.

## Contact
{{business_name}}, {{location}}. Email: {{support_email}}. WhatsApp or phone: {{whatsapp}}.`,
}

export const POLICY_KINDS = {
  terms: { title: 'Terms and Conditions', path: '/terms' },
  privacy: { title: 'Privacy Policy', path: '/privacy' },
  refund: { title: 'Refund Policy', path: '/refunds' },
}

export function policyText(kind, settings = {}) {
  const custom = settings[`${kind}_text`]
  return fillPlaceholders(custom?.trim() ? custom : DEFAULT_POLICIES[kind], businessInfo(settings))
}
