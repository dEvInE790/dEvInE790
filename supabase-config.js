/* ------------------------------------------------------------------
 * Supabase client setup — shared by the public site and the admin area.
 * Loaded after the supabase-js CDN script, before any other app script.
 * Uses the anon key only; it is safe to expose in client-side code
 * because Row Level Security on each table controls what it can do.
 * ------------------------------------------------------------------ */
(function () {
  "use strict";

  var SUPABASE_URL = "https://ofjrhpchgkqovkxvbtip.supabase.co";
  var SUPABASE_ANON_KEY = "sb_publishable_EfmgqBGoWor0MGsKF7_T2Q_dDl7BvLQ";

  if (typeof window.supabase === "undefined" || !window.supabase.createClient) {
    console.error(
      "Supabase client library not found — make sure the supabase-js CDN script is included before supabase-config.js."
    );
    return;
  }

  window.sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
})();
