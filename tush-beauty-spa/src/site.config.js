/**
 * Tush Beauty Spa — business information.
 *
 * EVERY fact shown on the website, in SEO metadata and in structured data
 * comes from this file (plus the lists in src/content/). Nothing else in the
 * codebase hard-codes business details.
 *
 * Rule: only fill a field with information the owner has confirmed.
 * Leave anything unconfirmed as `null` (or an empty list) — the site hides
 * or softens the related UI automatically instead of showing a guess.
 *
 * Run `npm run check` to list every field that still needs the owner's input.
 */
module.exports = {
  name: 'Tush Beauty Spa',
  shortName: 'Tush Beauty Spa',
  // Supplied in the project brief. Used for local SEO wording ("Houston, Texas").
  city: 'Houston',
  region: 'TX',
  regionName: 'Texas',

  // Public URL of the live site, no trailing slash, e.g. 'https://www.tushbeautyspa.com'.
  // Needed for canonical links, Open Graph URLs and sitemap.xml.
  siteUrl: null,

  contact: {
    // Display format, e.g. '(713) 555-0123'. The tel: link is derived from it.
    phone: null,
    // Set to true if the same number accepts text messages (enables an SMS button).
    phoneAcceptsTexts: false,
    email: null,
    // Instagram username without the @, e.g. 'tushbeautyspa'.
    instagram: null,
    // Full street address on one line, as it should be displayed. The map only appears once this is set.
    address: null,
    // The same address split up, for search-engine structured data:
    // { street: '…', city: 'Houston', region: 'TX', postalCode: '…' }
    addressParts: null,
    // Optional: a short note such as 'Free parking behind the building'.
    addressNote: null,
  },

  // Opening hours. null = "Hours coming soon".
  // Example: [{ days: 'Tuesday – Friday', hours: '10:00 am – 7:00 pm', schema: { days: ['Tu','We','Th','Fr'], opens: '10:00', closes: '19:00' } },
  //           { days: 'Saturday', hours: '9:00 am – 5:00 pm', schema: { days: ['Sa'], opens: '09:00', closes: '17:00' } },
  //           { days: 'Sunday – Monday', hours: 'Closed' }]
  // `schema` is optional and only used for search-engine structured data.
  hours: null,
  // e.g. 'By appointment only' — shown next to the hours when set.
  hoursNote: null,

  booking: {
    // If the spa already uses an online booking platform (Vagaro, Square Appointments,
    // Fresha, Booksy, GlossGenius, Acuity…), paste the public booking link here.
    // Every "Book" button will then open it directly.
    externalUrl: null,
    externalLabel: null, // e.g. 'Book on Vagaro'

    // Optional form service endpoint (e.g. https://formspree.io/f/xxxxxx) so the
    // booking enquiry form sends straight to the owner's inbox.
    // Without it, the form falls back to: email app → text message → Instagram DM,
    // using whichever contact details above are set.
    formEndpoint: null,
  },

  // Slim strip at the very top of every page. Use only for verified information
  // (e.g. 'Now taking appointments for December'). null hides it.
  announcement: null,

  // Optional link to the Google Business Profile (shown in the footer).
  googleBusinessUrl: null,
};
