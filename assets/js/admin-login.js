(function () {
  "use strict";

  var RESET_REDIRECT_URL = "https://simpleinteriortech.com/admin/reset-password.html";

  document.addEventListener("DOMContentLoaded", function () {
    // Already signed in as admin? Skip straight to the dashboard.
    window.AdminAuth.getAdminSession().then(function (result) {
      if (result) window.location.replace("index.html");
    });

    var loginPanel = document.getElementById("login-panel");
    var forgotPanel = document.getElementById("forgot-panel");
    var showForgot = document.getElementById("show-forgot");
    var showLogin = document.getElementById("show-login");

    showForgot.addEventListener("click", function () {
      loginPanel.hidden = true;
      forgotPanel.hidden = false;
    });
    showLogin.addEventListener("click", function () {
      forgotPanel.hidden = true;
      loginPanel.hidden = false;
    });

    bindLoginForm();
    bindForgotForm();
  });

  function setStatus(el, text, state) {
    el.textContent = text;
    el.setAttribute("data-state", state || "");
  }

  function bindLoginForm() {
    var form = document.getElementById("login-form");
    var status = document.getElementById("login-status");

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var email = form.elements["email"].value.trim();
      var password = form.elements["password"].value;

      if (!email || !password) {
        setStatus(status, "Enter your email and password.", "error");
        return;
      }

      setStatus(status, "Signing in…", "");
      var submitBtn = form.querySelector('button[type="submit"]');
      submitBtn.disabled = true;

      window.sb.auth
        .signInWithPassword({ email: email, password: password })
        .then(function (res) {
          if (res.error) throw res.error;
          return window.AdminAuth.getAdminSession();
        })
        .then(function (result) {
          if (!result) {
            setStatus(status, "This account doesn't have admin access.", "error");
            submitBtn.disabled = false;
            return;
          }
          window.location.replace("index.html");
        })
        .catch(function (err) {
          setStatus(status, err.message || "Couldn't sign in — check your email and password.", "error");
          submitBtn.disabled = false;
        });
    });
  }

  function bindForgotForm() {
    var form = document.getElementById("forgot-form");
    var status = document.getElementById("forgot-status");

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var email = form.elements["email"].value.trim();
      if (!email) {
        setStatus(status, "Enter your email.", "error");
        return;
      }

      setStatus(status, "Sending…", "");
      var submitBtn = form.querySelector('button[type="submit"]');
      submitBtn.disabled = true;

      window.sb.auth
        .resetPasswordForEmail(email, { redirectTo: RESET_REDIRECT_URL })
        .then(function () {
          // Same message whether or not the email is registered, so this
          // can't be used to probe which admin accounts exist.
          setStatus(
            status,
            "If an account exists for that email, a reset link is on its way.",
            "success"
          );
          form.reset();
          submitBtn.disabled = false;
        })
        .catch(function () {
          setStatus(
            status,
            "If an account exists for that email, a reset link is on its way.",
            "success"
          );
          form.reset();
          submitBtn.disabled = false;
        });
    });
  }
})();
