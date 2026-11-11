# Google Play listing kit for TutorHaven

Everything Play Console asks for, ready to copy. Graphics are in `store/google-play/`.

## 1. Create the app

Play Console → **Create app**

| Field | Answer |
|---|---|
| App name | `TutorHaven: Find a Tutor` |
| Default language | English (United Kingdom) – en-GB |
| App or game | App |
| Free or paid | Free |
| Declarations | Tick both (Developer Program Policies, US export laws) |

The package name is fixed by the build: `ng.tutorhaven.app`.

## 2. Main store listing (Grow → Store presence → Main store listing)

**App name** (max 30): `TutorHaven: Find a Tutor`

**Short description** (max 80):

```
Book verified tutors, pay securely in naira and track your child's progress.
```

**Full description** (max 4000):

```
TutorHaven connects students and parents in Nigeria with verified tutors for one-to-one lessons in Maths, English, Physics, Chemistry, Biology, Economics and more, from primary school to WAEC, NECO, JAMB, IGCSE and university.

Find the right tutor
- Search by subject, level and price
- Every tutor is reviewed by our team before they are listed
- Verified qualifications are clearly marked
- Honest ratings: only learners who completed a paid lesson can leave a review

Book and pay safely
- See each tutor's real weekly availability and book in a few taps
- Pay securely with Paystack: card, bank transfer or USSD, in naira
- A booking is confirmed only after Paystack confirms your payment
- Free cancellation up to 24 hours before a lesson, with a full refund

For parents
- Link your children's accounts and book lessons for them
- See every child's sessions, tutors and feedback in one place

For tutors
- Create your profile, set your own rates and weekly availability
- Get paid straight to your Nigerian bank account
- Reply to reviews and add lesson feedback for your learners

TutorHaven Plus
Members get an AI Learning Assistant, learning analytics and goals, monthly progress reports for families, personal tutor matching and priority support. Plus is available on our website.

Messages and notifications
Message tutors before you book, and get notified about bookings, payments and feedback.

Support: tutorhaven737@gmail.com | WhatsApp 0802 813 9086
TutorHaven is operated by Ojigbani Divine, Lagos, Nigeria.
```

**Graphics** (from `store/google-play/`):

| Asset | File | Size |
|---|---|---|
| App icon | `icon-512.png` | 512 × 512 |
| Feature graphic | `feature-graphic.png` | 1024 × 500 |
| Phone screenshots (2–8) | `screenshot-1.png` … | 1080 × 1920 |

The screenshots show the app with sample test accounts. Replace them with screenshots of your real app whenever you like.

**Category:** Education. **Tags:** Education, Tutoring.
**Contact details:** email `tutorhaven737@gmail.com`, phone `+2348028139086`, website `https://tutorhaven.pages.dev`.

## 3. App content (Policy → App content)

| Section | Answer |
|---|---|
| Privacy policy | `https://tutorhaven.pages.dev/privacy` |
| Ads | No, my app does not contain ads |
| App access | All or some functionality is restricted → add the reviewer login below |
| Content rating | Run the questionnaire (see below) |
| Target audience | 13–15, 16–17, 18 and over (not under 13) |
| News app | No |
| Data safety | See below |
| Government app | No |
| Financial features | My app doesn't provide any financial features |
| Health | No health features |

### Reviewer login (App access)

Create a normal **student** account on the website for Google's reviewers, e.g. `playreview.tutorhaven@gmail.com`, give it a strong password, and enter it in Play Console with this note:

```
Sign in with the email and password above. Students can browse and search tutors, open tutor profiles and reviews, message tutors, and book a lesson (payment opens Paystack's secure page; reviewers don't need to complete a payment). Account → Delete account permanently deletes the account.
```

### Content rating questionnaire

- Category: **Reference, News, or Educational**
- Violence, sexuality, language, controlled substances, gambling: **No** to all
- Users can interact or exchange information (messages between learners and tutors): **Yes**
- Shares the user's physical location: **No**
- Allows users to purchase digital goods: **No** (lessons are a real-world service paid through Paystack's web checkout; Plus isn't sold in the app)

### Data safety

- Does your app collect or share any of the required user data types? **Yes**
- Is all user data encrypted in transit? **Yes**
- Do you provide a way for users to request that their data is deleted? **Yes**, in-app and at `https://tutorhaven.pages.dev/delete-account`

Data **collected** (none of it is **shared**: Paystack and our AI provider act as service providers on our behalf):

| Data type | Collected | Optional? | Purposes |
|---|---|---|---|
| Personal info → Name | Yes | Required | App functionality, Account management |
| Personal info → Email address | Yes | Required | App functionality, Account management |
| Personal info → User IDs | Yes | Required | App functionality, Account management |
| Financial info → Purchase history | Yes | Required | App functionality |
| Financial info → Other financial info (tutors' bank account for payouts) | Yes | Optional | App functionality |
| Messages → Other in-app messages | Yes | Optional | App functionality |
| App activity → Other user-generated content (reviews, goals) | Yes | Optional | App functionality |

Not collected: location, contacts, photos, audio, health, device or other IDs, crash logs, diagnostics, web browsing. Card details are entered on Paystack's page and never reach TutorHaven.

## 4. Build and release

1. Production build (an `.aab` for Play):
   ```
   npx eas-cli@latest build -p android --profile production
   ```
2. Download the `.aab` from the build page.
3. Play Console → **Test and release → Testing → Closed testing** → create a track → **Create release** → upload the `.aab`.
   - Release name: `1.0.0`
   - Release notes: `First release of TutorHaven.`
4. **Testers:** add an email list with at least 12 Gmail addresses, then share the opt-in link. Testers must stay opted in for **14 days**.
5. After 14 days: **Dashboard → Apply for production**, answer the questions about your test, and submit. When it's approved, create a production release from the same build.

Later updates: run the production build again (the version code goes up by itself) and upload the new `.aab` to the track you want.
