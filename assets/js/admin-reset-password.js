(function () {
  "use strict";

  var MIN_PASSWORD_LENGTH = 10;

  var checkingPanel = document.getElementById("checking-panel");
  var invalidPanel = document.getElementById("invalid-panel");
  var resetPanel = document.getElementById("reset-panel");
  var donePanel = document.getElementById("done-panel");
  var resolved = false;

  function showPanel(panel) {
    [checkingPanel, invalidPanel, resetPanel, donePanel].forEach(function (p) {
      p.hidden = p !== panel;
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    // Clicking the emailed reset link lands here with a recovery token in
    // the URL; supabase-js parses it automatically and fires this event.
    window.sb.auth.onAuthStateChange(function (event, session) {
      if (resolved) return;
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        resolved = true;
        showPanel(resetPanel);
      }
    });

    // Fallback in case the event doesn't fire (bad/expired/reused link).
    setTimeout(function () {
      if (resolved) return;
      window.sb.auth.getSession().then(function (res) {
        if (resolved) return;
        resolved = true;
        showPanel(res.data.session ? resetPanel : invalidPanel);
      });
    }, 2500);

    bindResetForm();
  });

  function setStatus(el, text, state) {
    el.textContent = text;
    el.setAttribute("data-state", state || "");
  }

  function bindResetForm() {
    var form = document.getElementById("reset-form");
    var status = document.getElementById("reset-status");

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var password = form.elements["password"].value;
      var confirm = form.elements["confirm"].value;

      if (password.length < MIN_PASSWORD_LENGTH) {
        setStatus(status, "Password must be at least " + MIN_PASSWORD_LENGTH + " characters.", "error");
        return;
      }
      if (password !== confirm) {
        setStatus(status, "Passwords don't match.", "error");
        return;
      }

      var submitBtn = form.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      setStatus(status, "Updating…", "");

      window.sb.auth
        .updateUser({ password: password })
        .then(function (res) {
          if (res.error) throw res.error;
          return window.sb.auth.signOut();
        })
        .then(function () {
          showPanel(donePanel);
        })
        .catch(function (err) {
          setStatus(status, err.message || "Couldn't update your password. Try the reset link again.", "error");
          submitBtn.disabled = false;
        });
    });
  }
})();
