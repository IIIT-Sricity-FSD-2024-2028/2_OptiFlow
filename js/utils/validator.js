// js/utils/validator.js

// ─────────────────────────────────────────
// PART 1: The Advanced PM Validator
// ─────────────────────────────────────────
window.Validator = {
  rules: {
    required(val) {
      return val !== null && val !== undefined && String(val).trim().length > 0;
    },
    minLength(val, n) {
      return String(val).trim().length >= n;
    },
    maxLength(val, n) {
      return String(val).trim().length <= n;
    },
    email(val) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(val).trim());
    },
    numeric(val) {
      return !isNaN(Number(val)) && String(val).trim() !== "";
    },
    min(val, n) {
      return Number(val) >= n;
    },
    max(val, n) {
      return Number(val) <= n;
    },
    date(val) {
      return !isNaN(Date.parse(val));
    },
    futureDate(val) {
      return Date.parse(val) > Date.now();
    },
    phone(val) {
      return /^[\+]?[\d\s\-\(\)]{7,15}$/.test(String(val).trim());
    },
    noSpecialChars(val) {
      return /^[a-zA-Z0-9\s\-_\.]+$/.test(String(val).trim());
    },
  },

  messages: {
    required: "This field is required.",
    minLength: (n) => `Must be at least ${n} characters.`,
    maxLength: (n) => `Must be no more than ${n} characters.`,
    email: "Enter a valid email address.",
    numeric: "Must be a number.",
    min: (n) => `Must be at least ${n}.`,
    max: (n) => `Must be no more than ${n}.`,
    date: "Enter a valid date.",
    futureDate: "Date must be in the future.",
    phone: "Enter a valid phone number.",
    noSpecialChars: "No special characters allowed.",
  },

  validate(el, config) {
    const val = el.value;
    for (const [rule, param] of Object.entries(config)) {
      if (rule === "required" && param === true && !this.rules.required(val))
        return { valid: false, error: this.messages.required };
      if (
        rule === "email" &&
        param === true &&
        this.rules.required(val) &&
        !this.rules.email(val)
      )
        return { valid: false, error: this.messages.email };
      // (Add other specific rule checks here if needed by the PM module)
    }
    return { valid: true, error: "" };
  },

  validateForm(fields) {
    let valid = true;
    const errors = {};
    for (const [id, config] of Object.entries(fields)) {
      const el = document.getElementById(id);
      if (!el) continue;
      const result = this.validate(el, config);
      errors[id] = result.error;
      const errorEl = document.getElementById(`${id}-error`);
      if (!result.valid) {
        valid = false;
        el.classList.add("error");
        if (errorEl) {
          errorEl.textContent = result.error;
          errorEl.classList.remove("hidden");
        }
      } else {
        el.classList.remove("error");
        if (errorEl) {
          errorEl.textContent = "";
          errorEl.classList.add("hidden");
        }
      }
    }
    return { valid, errors };
  },
};

// ─────────────────────────────────────────
// PART 2: The Legacy Validators (For older pages)
// ─────────────────────────────────────────
function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

function validateRequired(text) {
  return text && text.trim().length > 0;
}

function showError(elementId, isValid) {
  const el = document.getElementById(elementId);
  if (!el) return;
  if (isValid) {
    el.classList.remove("is-invalid");
  } else {
    el.classList.add("is-invalid");
  }
  return isValid;
}
