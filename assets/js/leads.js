(function () {
  "use strict";

  /* ------------------------------------------------------------------
   * Contact form: populates the "interest" dropdown from published
   * product categories, then saves submissions straight into the
   * Supabase leads table (name, phone, email, interest, message).
   * ------------------------------------------------------------------ */

  var NAME_MAX = 100;
  var PHONE_MAX = 30;
  var EMAIL_MAX = 254;
  var MESSAGE_MAX = 2000;

  document.addEventListener("DOMContentLoaded", function () {
    var form = document.getElementById("contact-form");
    if (!form) return;

    populateInterestOptions();
    bindSubmit(form);
  });

  function populateInterestOptions() {
    var select = document.getElementById("interest");
    if (!select || !window.sb) return;

    window.sb
      .from("products")
      .select("category")
      .eq("published", true)
      .then(function (res) {
        if (res.error || !res.data) return;
        var categories = [];
        res.data.forEach(function (row) {
          if (row.category && categories.indexOf(row.category) === -1) categories.push(row.category);
        });
        if (!categories.length) return;

        var otherOption = select.querySelector('option[value="Other"]');
        categories.sort().forEach(function (cat) {
          var opt = document.createElement("option");
          opt.value = cat;
          opt.textContent = cat;
          select.insertBefore(opt, otherOption);
        });
      })
      .catch(function () {
        /* dropdown still works with "Other" only if this fails */
      });
  }

  function bindSubmit(form) {
    var status = document.getElementById("form-status");

    function setStatus(text, state) {
      if (!status) return;
      status.textContent = text;
      status.setAttribute("data-state", state || "");
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      // Honeypot — real visitors never see or fill this field.
      var honeypot = form.elements["company"];
      if (honeypot && honeypot.value.trim() !== "") {
        form.reset();
        setStatus("Thanks — we'll get back to you shortly.", "success");
        return;
      }

      var name = form.elements["name"].value.trim();
      var phone = form.elements["phone"].value.trim();
      var email = form.elements["email"].value.trim();
      var interest = form.elements["interest"].value;
      var message = form.elements["message"].value.trim();

      if (!name) {
        setStatus("Please enter your name.", "error");
        return;
      }
      if (!phone) {
        setStatus("Please enter a phone or WhatsApp number.", "error");
        return;
      }
      if (
        name.length > NAME_MAX ||
        phone.length > PHONE_MAX ||
        email.length > EMAIL_MAX ||
        message.length > MESSAGE_MAX
      ) {
        setStatus("One of your answers is too long — please shorten it and try again.", "error");
        return;
      }
      if (!window.sb) {
        setStatus("Something went wrong sending that. Please WhatsApp or email us directly instead.", "error");
        return;
      }

      setStatus("Sending…", "");

      window.sb
        .from("leads")
        .insert({
          name: name,
          phone: phone,
          email: email || null,
          interest: interest || null,
          message: message
        })
        .then(function (res) {
          if (res.error) throw res.error;
          form.reset();
          setStatus("Thanks — we'll get back to you shortly.", "success");
          if (window.SIT_trackEvent) window.SIT_trackEvent("contact_form_submit");
        })
        .catch(function (err) {
          console.error("Failed to save lead:", err);
          setStatus("Something went wrong sending that. Please WhatsApp or email us directly instead.", "error");
          if (window.SIT_trackEvent) window.SIT_trackEvent("contact_form_error");
        });
    });
  }
})();
