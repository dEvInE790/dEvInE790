/* =====================================================================
   DIVINEBUILDS — SITE DATA
   ---------------------------------------------------------------------
   This is the only file you need to edit to update the site.

   1. CONFIG   — your contact details and social links.
   2. APPS     — your app store. One object per app.
   3. WEBSITES — sites you have built. One object per site.

   The page reads these arrays and builds the cards automatically.
   ===================================================================== */


/* ---------------------------------------------------------------------
   1. CONFIG
   Your contact details. The Contact section shows an Email, WhatsApp and
   YouTube button, plus the email and phone number as plain text.
   Extra social links: leave as "" (empty) to hide that button.
   --------------------------------------------------------------------- */
const CONFIG = {
  email: "ojigbanidivine607@gmail.com",
  whatsapp: "2348028139086",                   // digits only, with country code, no + or spaces (used for the wa.me link)
  phoneDisplay: "+234 802 813 9086",           // how the number is shown on the page
  whatsappMessage: "Hi Divine, I saw Divinebuilds and I'd like to talk about a project.",
  youtube: "https://www.youtube.com/@ojigbanidivine",
  socials: {
    github: "",      // TODO: e.g. "https://github.com/yourname"
    x: "",           // TODO: e.g. "https://x.com/yourname"
    instagram: "",   // TODO: e.g. "https://instagram.com/yourname"
    linkedin: "",    // TODO: e.g. "https://linkedin.com/in/yourname"
    tiktok: ""       // TODO: e.g. "https://tiktok.com/@yourname"
  }
};


/* ---------------------------------------------------------------------
   2. APPS
   To add an app, copy one object below, paste it after the last one
   (don't forget the comma between objects) and fill it in.

   name          App name shown on the card.
   description   One short line about what it does.
   tags          A few short labels, e.g. ["Expo", "Offline-first"].
   icon          Path to a square icon image (e.g. "img/apps/my-app.png"),
                 or "" to show the app's first letter instead.
   apkUrl        Link to the Android .apk file, or "" for "Coming soon".
                 Either a file in the downloads/ folder ("downloads/my-app.apk",
                 downloads straight away) or a full link such as an Expo
                 build page (opens in a new tab).
   testflightUrl Your public TestFlight invite link
                 (https://testflight.apple.com/join/XXXXXX), or "" for "Coming soon".
   status        "live", "beta" or "in-progress" — shown as a small badge.
   --------------------------------------------------------------------- */
const APPS = [
  {
    name: "Money Trail",
    description: "An offline money tracker for people who earn cash daily.",
    tags: ["Expo", "React Native", "Offline-first"],
    icon: "",
    apkUrl: "https://expo.dev/accounts/divineisfly/projects/money-trail/builds/9c454bcb-1c46-4399-8459-5c7f55a63443",
    testflightUrl: "",   // TODO: e.g. "https://testflight.apple.com/join/XXXXXX"
    status: "in-progress"
  }
];


/* ---------------------------------------------------------------------
   3. WEBSITES
   name         Site name shown on the card.
   description  One or two short lines about the project.
   tags         A few short labels.
   image        Path to a screenshot (e.g. "img/sites/my-site.jpg", 16:10 works best),
                or "" to show a placeholder.
   url          The live site address, or "" to show "Coming soon".
   --------------------------------------------------------------------- */
const WEBSITES = [
  {
    name: "Odinga Arts / Sculpture",
    description: "Portfolio website for an artist, with a Supabase admin area for managing content, images and login.",
    tags: ["HTML/CSS/JS", "Supabase", "Admin panel"],
    image: "",
    url: "https://odingasculpture.com"
  },
  {
    name: "Simple Interior Tech",
    description: "Website for a furniture store, with an admin area built on Supabase.",
    tags: ["HTML/CSS/JS", "Supabase", "Admin panel"],
    image: "img/sites/simple-interior-tech.jpg",
    url: "https://simpleinteriortech.co"
  }
];
