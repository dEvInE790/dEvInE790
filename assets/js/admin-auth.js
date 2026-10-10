/* ------------------------------------------------------------------
 * Shared admin auth helpers — used by login.html, reset-password.html
 * and admin/index.html. Relies on window.sb (see supabase-config.js)
 * and the "profiles" table (id, role) to confirm admin access; the
 * anon key + the signed-in user's session is all that's used, RLS on
 * profiles/products/leads/storage does the actual access control.
 * ------------------------------------------------------------------ */
window.AdminAuth = (function () {
  "use strict";

  function getSession() {
    return window.sb.auth.getSession().then(function (res) {
      return res.data.session || null;
    });
  }

  // Resolves to { session, profile } if the current session belongs to
  // an admin, otherwise resolves to null (and signs out any non-admin
  // session so a stale/wrong-role session can't linger).
  function getAdminSession() {
    return getSession().then(function (session) {
      if (!session) return null;
      return window.sb
        .from("profiles")
        .select("id, role")
        .eq("id", session.user.id)
        .single()
        .then(function (res) {
          if (res.error || !res.data || res.data.role !== "admin") {
            return window.sb.auth.signOut().then(function () {
              return null;
            });
          }
          return { session: session, profile: res.data };
        });
    });
  }

  // For admin/index.html: redirects to login if there's no admin
  // session, otherwise resolves with { session, profile }.
  function requireAdminOrRedirect() {
    return getAdminSession().then(function (result) {
      if (!result) {
        window.location.replace("login.html");
        return null;
      }
      return result;
    });
  }

  function signOut(redirectTo) {
    return window.sb.auth.signOut().then(function () {
      window.location.replace(redirectTo || "login.html");
    });
  }

  return {
    getSession: getSession,
    getAdminSession: getAdminSession,
    requireAdminOrRedirect: requireAdminOrRedirect,
    signOut: signOut
  };
})();
